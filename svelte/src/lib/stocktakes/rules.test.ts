/**
 * Unit tests for the stocktake rules engine. Each test cites the acceptance
 * criterion it exercises (spec/stocktakes/06-acceptance.md). Pure functions, no network.
 */
import { describe, it, expect } from 'vitest';
import {
	isEditable,
	editBlockReason,
	packDifference,
	adjustmentDirection,
	reasonError,
	wouldReduceBelowZero,
	snapshotMismatch,
	finaliseCheck
} from './rules';
import type { ReasonOption, StocktakeLine } from './types';

// Minimal line factory — only the fields the rules read.
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

const posReason: ReasonOption = { id: 'p', reason: 'Found', type: 'PositiveInventoryAdjustment', isActive: true };
const negReason: ReasonOption = { id: 'n', reason: 'Lost', type: 'NegativeInventoryAdjustment', isActive: true };

describe('editability (AC-E1)', () => {
	it('editable only when NEW and unlocked', () => {
		expect(isEditable({ status: 'NEW', isLocked: false })).toBe(true);
		expect(isEditable({ status: 'NEW', isLocked: true })).toBe(false);
		expect(isEditable({ status: 'FINALISED', isLocked: false })).toBe(false);
	});
	it('reports the block reason', () => {
		expect(editBlockReason({ status: 'FINALISED', isLocked: false })).toBe('finalised');
		expect(editBlockReason({ status: 'NEW', isLocked: true })).toBe('locked');
		expect(editBlockReason({ status: 'NEW', isLocked: false })).toBeNull();
	});
});

describe('difference (AC-E4)', () => {
	it('is counted − snapshot, 0 when uncounted', () => {
		expect(packDifference(line({ countedNumberOfPacks: 120 }))).toBe(20);
		expect(packDifference(line({ countedNumberOfPacks: 80 }))).toBe(-20);
		expect(packDifference(line({ countedNumberOfPacks: null }))).toBe(0);
	});
});

describe('adjustment direction (sign convention in 03)', () => {
	it('counted > snapshot ⇒ positive (stock up)', () => {
		expect(adjustmentDirection(line({ countedNumberOfPacks: 120 }))).toBe('positive');
	});
	it('counted < snapshot ⇒ negative (stock down)', () => {
		expect(adjustmentDirection(line({ countedNumberOfPacks: 80 }))).toBe('negative');
	});
	it('equal or uncounted ⇒ none', () => {
		expect(adjustmentDirection(line({ countedNumberOfPacks: 100 }))).toBe('none');
		expect(adjustmentDirection(line({ countedNumberOfPacks: null }))).toBe('none');
	});
});

describe('reason rules (AC-R1/R2/R3)', () => {
	it('required when active reasons exist for the direction and none given (AC-R1)', () => {
		expect(reasonError(line({ countedNumberOfPacks: 120 }), [posReason])).toBe('AdjustmentReasonNotProvided');
	});
	it('must match direction (AC-R2)', () => {
		// positive adjustment given a negative reason
		expect(reasonError(line({ countedNumberOfPacks: 120, reasonOption: negReason }), [posReason, negReason])).toBe('AdjustmentReasonNotValid');
		// correct pairing passes
		expect(reasonError(line({ countedNumberOfPacks: 120, reasonOption: posReason }), [posReason])).toBeNull();
	});
	it('no active reasons for a direction ⇒ none required (AC-R3)', () => {
		expect(reasonError(line({ countedNumberOfPacks: 120 }), [negReason])).toBeNull();
	});
});

describe('finalise preconditions', () => {
	it('reduce-below-zero detected (AC-F2)', () => {
		const l = line({
			countedNumberOfPacks: 0,
			snapshotNumberOfPacks: 10,
			stockLine: { id: 'sl', totalNumberOfPacks: 5, availableNumberOfPacks: 5, packSize: 1 }
		});
		// delta = 0 − 10 = −10; 5 + (−10) = −5 < 0
		expect(wouldReduceBelowZero(l)).toBe(true);
	});
	it('snapshot mismatch detected (AC-F3)', () => {
		const l = line({
			countedNumberOfPacks: 10,
			snapshotNumberOfPacks: 100,
			stockLine: { id: 'sl', totalNumberOfPacks: 90, availableNumberOfPacks: 90, packSize: 1 }
		});
		expect(snapshotMismatch(l)).toBe(true);
	});
	it('blocks finalise with no counted lines (AC-F1) and passes a clean count', () => {
		const uncounted = [line({ id: 'a' }), line({ id: 'b' })];
		expect(finaliseCheck({ status: 'NEW', isLocked: false }, uncounted, []).blockers).toContain('noCountedLines');

		const clean = [line({ id: 'a', countedNumberOfPacks: 100 })]; // no adjustment, no reason needed
		const check = finaliseCheck({ status: 'NEW', isLocked: false }, clean, []);
		expect(check.canFinalise).toBe(true);
	});
	it('flags a line missing a required reason', () => {
		const lines = [line({ id: 'a', countedNumberOfPacks: 120 })]; // +20, positive reason required
		const check = finaliseCheck({ status: 'NEW', isLocked: false }, lines, [posReason]);
		expect(check.canFinalise).toBe(false);
		expect(check.lineErrors['a']).toContain('reasonRequired');
	});
});
