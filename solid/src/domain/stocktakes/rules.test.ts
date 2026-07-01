/**
 * Unit tests for the stocktake rules engine. Each test cites the acceptance criterion it
 * exercises (spec/stocktakes/06-acceptance.md). Pure functions, no network.
 */
import { describe, it, expect } from 'vitest';
import {
  isEditable,
  editBlockReason,
  isCounted,
  packDifference,
  adjustmentDirection,
  reasonTypeMatchesDirection,
  reasonError,
  wouldReduceBelowZero,
  snapshotMismatch,
  finaliseCheck,
  errorSurface
} from './rules';
import type { ReasonOption, StocktakeLine } from './types';

/** Minimal line factory — only the fields the rules read. */
function line(over: Partial<StocktakeLine> = {}): StocktakeLine {
  return {
    id: 'l1',
    stocktakeId: 's1',
    item: { id: 'i1', code: 'X', name: 'X', isVaccine: false, doses: 1, defaultPackSize: 1 },
    itemId: 'i1',
    itemName: 'X',
    snapshotNumberOfPacks: 100,
    countedNumberOfPacks: null,
    packSize: 1,
    ...over
  };
}

const posReason: ReasonOption = { id: 'p', reason: 'Found', type: 'POSITIVE_INVENTORY_ADJUSTMENT', isActive: true };
const negReason: ReasonOption = { id: 'n', reason: 'Lost', type: 'NEGATIVE_INVENTORY_ADJUSTMENT', isActive: true };
const openVial: ReasonOption = { id: 'o', reason: 'Open vial', type: 'OPEN_VIAL_WASTAGE', isActive: true };

describe('editability (AC-E1)', () => {
  it('editable only when NEW and unlocked', () => {
    expect(isEditable({ status: 'NEW', isLocked: false })).toBe(true);
    expect(isEditable({ status: 'NEW', isLocked: true })).toBe(false);
    expect(isEditable({ status: 'FINALISED', isLocked: false })).toBe(false);
    expect(isEditable({ status: 'FINALISED', isLocked: true })).toBe(false);
  });
  it('reports the block reason, distinguishing locked from finalised', () => {
    expect(editBlockReason({ status: 'FINALISED', isLocked: false })).toBe('finalised');
    expect(editBlockReason({ status: 'NEW', isLocked: true })).toBe('locked');
    expect(editBlockReason({ status: 'NEW', isLocked: false })).toBeNull();
    // finalised wins over locked (permanent trumps reversible)
    expect(editBlockReason({ status: 'FINALISED', isLocked: true })).toBe('finalised');
  });
});

describe('difference (AC-E4)', () => {
  it('is counted − snapshot, 0 when uncounted', () => {
    expect(packDifference(line({ countedNumberOfPacks: 120 }))).toBe(20);
    expect(packDifference(line({ countedNumberOfPacks: 80 }))).toBe(-20);
    expect(packDifference(line({ countedNumberOfPacks: 100 }))).toBe(0);
    expect(packDifference(line({ countedNumberOfPacks: null }))).toBe(0);
    expect(isCounted(line({ countedNumberOfPacks: 0 }))).toBe(true); // 0 is counted
    expect(isCounted(line({ countedNumberOfPacks: null }))).toBe(false);
  });
});

describe('adjustment direction (03 sign convention)', () => {
  it('counted > snapshot ⇒ positive (stock up)', () => {
    expect(adjustmentDirection(line({ countedNumberOfPacks: 120 }))).toBe('positive');
  });
  it('counted < snapshot ⇒ negative (stock down)', () => {
    expect(adjustmentDirection(line({ countedNumberOfPacks: 80 }))).toBe('negative');
  });
  it('counted = snapshot or uncounted ⇒ none', () => {
    expect(adjustmentDirection(line({ countedNumberOfPacks: 100 }))).toBe('none');
    expect(adjustmentDirection(line({ countedNumberOfPacks: null }))).toBe('none');
  });
});

describe('reason type matching (AC-R2)', () => {
  it('positive adjustment needs a positive reason', () => {
    expect(reasonTypeMatchesDirection('POSITIVE_INVENTORY_ADJUSTMENT', 'positive')).toBe(true);
    expect(reasonTypeMatchesDirection('NEGATIVE_INVENTORY_ADJUSTMENT', 'positive')).toBe(false);
  });
  it('negative adjustment accepts negative / open-vial / closed-vial wastage', () => {
    expect(reasonTypeMatchesDirection('NEGATIVE_INVENTORY_ADJUSTMENT', 'negative')).toBe(true);
    expect(reasonTypeMatchesDirection('OPEN_VIAL_WASTAGE', 'negative')).toBe(true);
    expect(reasonTypeMatchesDirection('CLOSED_VIAL_WASTAGE', 'negative')).toBe(true);
    expect(reasonTypeMatchesDirection('POSITIVE_INVENTORY_ADJUSTMENT', 'negative')).toBe(false);
  });
});

describe('reason validation (AC-R1/R2/R3)', () => {
  it('required when active reasons exist for the direction and none provided (AC-R1)', () => {
    expect(reasonError(line({ countedNumberOfPacks: 120 }), [posReason])).toBe('AdjustmentReasonNotProvided');
    expect(reasonError(line({ countedNumberOfPacks: 80 }), [negReason])).toBe('AdjustmentReasonNotProvided');
  });
  it('rejects a mismatched reason (AC-R2)', () => {
    expect(reasonError(line({ countedNumberOfPacks: 120, reasonOption: negReason }), [posReason, negReason])).toBe(
      'AdjustmentReasonNotValid'
    );
    expect(reasonError(line({ countedNumberOfPacks: 80, reasonOption: posReason }), [posReason, negReason])).toBe(
      'AdjustmentReasonNotValid'
    );
  });
  it('accepts a matching reason', () => {
    expect(reasonError(line({ countedNumberOfPacks: 120, reasonOption: posReason }), [posReason])).toBeNull();
    expect(reasonError(line({ countedNumberOfPacks: 80, reasonOption: openVial }), [negReason])).toBeNull();
  });
  it('no active reasons configured for a direction ⇒ none required (AC-R3)', () => {
    expect(reasonError(line({ countedNumberOfPacks: 120 }), [])).toBeNull();
    expect(reasonError(line({ countedNumberOfPacks: 120 }), [negReason])).toBeNull(); // only negative configured
  });
  it('no reason ever required for a zero-delta or uncounted line', () => {
    expect(reasonError(line({ countedNumberOfPacks: 100 }), [posReason, negReason])).toBeNull();
    expect(reasonError(line({ countedNumberOfPacks: null }), [posReason, negReason])).toBeNull();
  });
});

describe('reduce below zero (AC-F2)', () => {
  const withStock = (counted: number, total: number, available = total) =>
    line({
      countedNumberOfPacks: counted,
      snapshotNumberOfPacks: total,
      stockLine: { id: 'sl', totalNumberOfPacks: total, availableNumberOfPacks: available, packSize: 1 }
    });
  it('flags a count that drives total or available below zero', () => {
    // count 0 against snapshot 100 but available only 3 ⇒ delta −100 ⇒ available −97
    expect(wouldReduceBelowZero(withStock(0, 100, 3))).toBe(true);
  });
  it('accepts a count within stock', () => {
    expect(wouldReduceBelowZero(withStock(90, 100, 100))).toBe(false);
    expect(wouldReduceBelowZero(withStock(120, 100, 100))).toBe(false); // increase
  });
  it('ignores uncounted / new-batch lines', () => {
    expect(wouldReduceBelowZero(line({ countedNumberOfPacks: null }))).toBe(false);
    expect(wouldReduceBelowZero(line({ countedNumberOfPacks: 0, stockLine: null }))).toBe(false);
  });
});

describe('snapshot mismatch (AC-F3)', () => {
  it('flags when snapshot no longer equals current stock total', () => {
    expect(
      snapshotMismatch(
        line({
          countedNumberOfPacks: 90,
          snapshotNumberOfPacks: 100,
          stockLine: { id: 'sl', totalNumberOfPacks: 95, availableNumberOfPacks: 95, packSize: 1 }
        })
      )
    ).toBe(true);
  });
  it('is exempt for uncounted and new-batch lines', () => {
    expect(
      snapshotMismatch(
        line({
          countedNumberOfPacks: null,
          stockLine: { id: 'sl', totalNumberOfPacks: 95, availableNumberOfPacks: 95, packSize: 1 }
        })
      )
    ).toBe(false);
    expect(snapshotMismatch(line({ countedNumberOfPacks: 5, stockLine: null }))).toBe(false);
  });
});

describe('finalise pre-flight (AC-F1/F2/F3/F4 mirror)', () => {
  it('blocks when no line is counted (AC-F1)', () => {
    const r = finaliseCheck({ status: 'NEW', isLocked: false }, [line(), line()], []);
    expect(r.canFinalise).toBe(false);
    expect(r.blockers).toContain('noCountedLines');
  });
  it('blocks when not editable', () => {
    const r = finaliseCheck({ status: 'FINALISED', isLocked: false }, [line({ countedNumberOfPacks: 5 })], []);
    expect(r.blockers).toContain('notEditable');
  });
  it('marks the offending line and blocks finalise (AC-F2)', () => {
    const bad = line({
      id: 'bad',
      countedNumberOfPacks: 0,
      snapshotNumberOfPacks: 100,
      stockLine: { id: 'sl', totalNumberOfPacks: 100, availableNumberOfPacks: 2, packSize: 1 }
    });
    const r = finaliseCheck({ status: 'NEW', isLocked: false }, [bad], []);
    expect(r.canFinalise).toBe(false);
    expect(r.lineErrors['bad']).toContain('reduceBelowZero');
  });
  it('passes a clean counted stocktake', () => {
    const ok = line({
      id: 'ok',
      countedNumberOfPacks: 100,
      snapshotNumberOfPacks: 100,
      stockLine: { id: 'sl', totalNumberOfPacks: 100, availableNumberOfPacks: 100, packSize: 1 }
    });
    const r = finaliseCheck({ status: 'NEW', isLocked: false }, [ok], []);
    expect(r.canFinalise).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });
  it('does not validate uncounted lines (AC-F9 — they are trimmed)', () => {
    const counted = line({ id: 'c', countedNumberOfPacks: 100, snapshotNumberOfPacks: 100 });
    const uncounted = line({
      id: 'u',
      countedNumberOfPacks: null,
      snapshotNumberOfPacks: 100,
      stockLine: { id: 'sl', totalNumberOfPacks: 5, availableNumberOfPacks: 5, packSize: 1 }
    });
    const r = finaliseCheck({ status: 'NEW', isLocked: false }, [counted, uncounted], []);
    expect(r.lineErrors['u']).toBeUndefined();
    expect(r.canFinalise).toBe(true);
  });
});

describe('error surface mapping (05 › S5)', () => {
  it('maps typed errors to banner / line / toast', () => {
    expect(errorSurface('StocktakeIsLocked')).toBe('banner');
    expect(errorSurface('CannotEditFinalised')).toBe('banner');
    expect(errorSurface('NoLines')).toBe('toast');
    expect(errorSurface('StockLinesReducedBelowZero')).toBe('line');
    expect(errorSurface('SnapshotCountCurrentCountMismatch')).toBe('line');
    expect(errorSurface('AdjustmentReasonNotProvided')).toBe('line');
  });
});
