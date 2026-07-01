/**
 * Stocktake state & rules engine — a framework-agnostic mirror of
 * spec/stocktakes/03-state-rules.md. These rules are enforced server-side; the UI mirrors
 * them for good UX (disable/warn early) but must not assume it is the only guard. Pure
 * functions, unit-tested in rules.test.ts (each test cites the AC-* it exercises).
 */
import type { ReasonOption, ReasonOptionType, Stocktake, StocktakeLine } from './types';

// ── Editability (03 › Editability rules) ─────────────────────────────────────

/** A stocktake is editable iff status = NEW and not locked (AC-E1). This one condition
 *  gates every edit affordance in the UI. */
export function isEditable(s: Pick<Stocktake, 'status' | 'isLocked'>): boolean {
  return s.status === 'NEW' && !s.isLocked;
}

/** Why editing is blocked, for the explanatory banner (S3 / S5). null when editable.
 *  Distinguishes the reversible `locked` state from the permanent `finalised` state. */
export type EditBlock = 'finalised' | 'locked' | null;
export function editBlockReason(s: Pick<Stocktake, 'status' | 'isLocked'>): EditBlock {
  if (s.status === 'FINALISED') return 'finalised';
  if (s.isLocked) return 'locked';
  return null;
}

// ── Difference & adjustment direction ────────────────────────────────────────

export function isCounted(line: Pick<StocktakeLine, 'countedNumberOfPacks'>): boolean {
  return line.countedNumberOfPacks != null;
}

/** Displayed difference = counted − snapshot, in packs; 0 when uncounted (AC-E4). */
export function packDifference(
  line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>
): number {
  if (line.countedNumberOfPacks == null) return 0;
  return line.countedNumberOfPacks - line.snapshotNumberOfPacks;
}

/**
 * Adjustment direction, from the deliberately-confusing sign convention in 03:
 *   reductionAmount = snapshot − counted
 * A positive reductionAmount ⇒ stock went DOWN (a negative adjustment); a negative
 * reductionAmount ⇒ stock went UP (a positive adjustment). Uncounted ⇒ none.
 */
export type AdjustmentDirection = 'positive' | 'negative' | 'none';

export function adjustmentDirection(
  line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>
): AdjustmentDirection {
  if (line.countedNumberOfPacks == null) return 'none';
  const reductionAmount = line.snapshotNumberOfPacks - line.countedNumberOfPacks;
  if (reductionAmount > 0) return 'negative'; // stock down
  if (reductionAmount < 0) return 'positive'; // stock up
  return 'none';
}

// ── Adjustment-reason rules (03 › Adjustment-reason rules) ────────────────────

/** Reason types valid for a NEGATIVE adjustment (stock down). */
const NEGATIVE_REASON_TYPES: ReasonOptionType[] = [
  'NEGATIVE_INVENTORY_ADJUSTMENT',
  'OPEN_VIAL_WASTAGE',
  'CLOSED_VIAL_WASTAGE'
];

/** Whether a reason option's type matches an adjustment direction (AC-R2). */
export function reasonTypeMatchesDirection(
  type: ReasonOptionType,
  dir: AdjustmentDirection
): boolean {
  if (dir === 'positive') return type === 'POSITIVE_INVENTORY_ADJUSTMENT';
  if (dir === 'negative') return NEGATIVE_REASON_TYPES.includes(type);
  return false;
}

function hasActiveReasonForDirection(reasons: ReasonOption[], dir: AdjustmentDirection): boolean {
  return reasons.some((r) => r.isActive && reasonTypeMatchesDirection(r.type, dir));
}

export type ReasonError = 'AdjustmentReasonNotProvided' | 'AdjustmentReasonNotValid' | null;

/**
 * Reason validation for a line at save time (AC-R1/R2/R3):
 * - if a reason is provided, its type must match the direction, else NotValid;
 * - otherwise it is required only when active reasons exist for that direction (NotProvided);
 * - no active reasons configured for a direction ⇒ none required.
 */
export function reasonError(line: StocktakeLine, activeReasons: ReasonOption[]): ReasonError {
  const dir = adjustmentDirection(line);
  if (dir === 'none') return null;

  if (line.reasonOption) {
    return reasonTypeMatchesDirection(line.reasonOption.type, dir) ? null : 'AdjustmentReasonNotValid';
  }
  return hasActiveReasonForDirection(activeReasons, dir) ? 'AdjustmentReasonNotProvided' : null;
}

// ── Finalise preconditions (03 › Finalise preconditions) ─────────────────────

/** Would finalising this line drive its stock line's total or available packs below zero
 *  (AC-F2)? Only meaningful for counted lines on existing stock. */
export function wouldReduceBelowZero(line: StocktakeLine): boolean {
  if (line.countedNumberOfPacks == null || !line.stockLine) return false;
  const delta = line.countedNumberOfPacks - line.snapshotNumberOfPacks;
  return line.stockLine.totalNumberOfPacks + delta < 0 || line.stockLine.availableNumberOfPacks + delta < 0;
}

/** Has the snapshot drifted from current stock (AC-F3)? A counted line on existing stock
 *  must still have snapshot === the stock line's current total. Uncounted and new-batch
 *  lines are exempt. The server is authoritative — stock may have moved server-side beyond
 *  what the client holds. */
export function snapshotMismatch(line: StocktakeLine): boolean {
  if (line.countedNumberOfPacks == null || !line.stockLine) return false;
  return line.snapshotNumberOfPacks !== line.stockLine.totalNumberOfPacks;
}

export type LineProblem = 'reduceBelowZero' | 'snapshotMismatch' | 'reasonRequired' | 'reasonInvalid';
export type FinaliseBlocker = 'notEditable' | 'noCountedLines';

export interface FinaliseCheck {
  canFinalise: boolean;
  /** Whole-stocktake blockers (banner/toast). */
  blockers: FinaliseBlocker[];
  /** Per-line problems, keyed by line id (surfaced inline on the offending row). */
  lineErrors: Record<string, LineProblem[]>;
}

/**
 * Client-side pre-flight for finalise, mirroring the server checks so the UI can block
 * early and mark offending lines. The server still validates atomically (AC-F4) — this is
 * an optimisation, not the guard. Uncounted lines are trimmed on finalise, so they are not
 * validated here (AC-F9).
 */
export function finaliseCheck(
  stocktake: Pick<Stocktake, 'status' | 'isLocked'>,
  lines: StocktakeLine[],
  activeReasons: ReasonOption[]
): FinaliseCheck {
  const blockers: FinaliseBlocker[] = [];
  if (!isEditable(stocktake)) blockers.push('notEditable');
  // UI blocks finalise when no line is counted; NoLines also covers zero lines (AC-F1).
  if (!lines.some(isCounted)) blockers.push('noCountedLines');

  const lineErrors: Record<string, LineProblem[]> = {};
  for (const line of lines) {
    if (!isCounted(line)) continue;
    const errs: LineProblem[] = [];
    if (wouldReduceBelowZero(line)) errs.push('reduceBelowZero');
    if (snapshotMismatch(line)) errs.push('snapshotMismatch');
    const re = reasonError(line, activeReasons);
    if (re === 'AdjustmentReasonNotProvided') errs.push('reasonRequired');
    if (re === 'AdjustmentReasonNotValid') errs.push('reasonInvalid');
    if (errs.length) lineErrors[line.id] = errs;
  }

  return {
    canFinalise: blockers.length === 0 && Object.keys(lineErrors).length === 0,
    blockers,
    lineErrors
  };
}

// ── Error surface mapping (02 › Error model, 05 › S5) ─────────────────────────

export type ErrorSurface = 'banner' | 'line' | 'toast';

/** Where a typed API error is shown (spec 05-ui-surface › S5 Error surfaces). */
export function errorSurface(typename: string): ErrorSurface {
  switch (typename) {
    case 'CannotEditStocktake':
    case 'CannotEditFinalised':
    case 'StocktakeIsLocked':
    case 'InvalidStore':
      return 'banner';
    case 'NoLines':
      return 'toast';
    case 'StockLineReducedBelowZero':
    case 'StockLinesReducedBelowZero':
    case 'SnapshotCountCurrentCountMismatch':
    case 'SnapshotCountCurrentCountMismatchLine':
    case 'AdjustmentReasonNotProvided':
    case 'AdjustmentReasonNotValid':
      return 'line';
    default:
      return 'banner';
  }
}
