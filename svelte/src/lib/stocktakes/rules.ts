/**
 * Stocktake state & rules engine — a framework-agnostic mirror of
 * spec/stocktakes/03-state-rules.md. These rules are enforced server-side; the UI
 * mirrors them for good UX (disable/warn early) but must not assume it is the only
 * guard. Pure functions, unit-tested — see rules.test.ts (cites AC-* IDs).
 */
import type { ReasonOption, ReasonOptionType, Stocktake, StocktakeLine } from './types';

// ── Editability (03 › Editability rules) ─────────────────────────────────────

/** A stocktake is editable only when NEW and not locked (AC-E1). */
export function isEditable(s: Pick<Stocktake, 'status' | 'isLocked'>): boolean {
	return s.status === 'NEW' && !s.isLocked;
}

/** Why editing is blocked, for the info banner (S3 header / S5). null when editable. */
export function editBlockReason(
	s: Pick<Stocktake, 'status' | 'isLocked'>
): 'finalised' | 'locked' | null {
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
 * Adjustment direction from the (deliberately confusing) sign convention in 03:
 * reductionAmount = snapshot − counted. Positive reductionAmount ⇒ stock went DOWN
 * (a negative adjustment); negative ⇒ stock went UP (a positive adjustment).
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

const NEGATIVE_REASON_TYPES: ReasonOptionType[] = [
	'NEGATIVE_INVENTORY_ADJUSTMENT',
	'OPEN_VIAL_WASTAGE',
	'CLOSED_VIAL_WASTAGE'
];

/** Reason option types valid for a given adjustment direction (AC-R2). */
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
 * - required when active reasons exist for the direction and none is provided;
 * - if provided, the reason's type must match the direction;
 * - no active reasons for a direction ⇒ none required.
 */
export function reasonError(line: StocktakeLine, activeReasons: ReasonOption[]): ReasonError {
	const dir = adjustmentDirection(line);
	if (dir === 'none') return null;

	if (line.reasonOption) {
		return reasonTypeMatchesDirection(line.reasonOption.type, dir)
			? null
			: 'AdjustmentReasonNotValid';
	}
	return hasActiveReasonForDirection(activeReasons, dir) ? 'AdjustmentReasonNotProvided' : null;
}

// ── Finalise preconditions (03 › Finalise preconditions) ─────────────────────

/**
 * Would finalising this line drive its stock line's total or available packs below
 * zero (AC-F2)? Only meaningful for counted lines on existing stock.
 */
export function wouldReduceBelowZero(line: StocktakeLine): boolean {
	if (line.countedNumberOfPacks == null || !line.stockLine) return false;
	const delta = line.countedNumberOfPacks - line.snapshotNumberOfPacks;
	return (
		line.stockLine.totalNumberOfPacks + delta < 0 ||
		line.stockLine.availableNumberOfPacks + delta < 0
	);
}

/**
 * Has the snapshot drifted from current stock (AC-F3)? Counted lines on existing
 * stock must still have snapshot === stock line's current total. Uncounted and
 * new-batch lines are exempt. (Server is authoritative — current stock may have
 * moved server-side beyond what the client holds.)
 */
export function snapshotMismatch(line: StocktakeLine): boolean {
	if (line.countedNumberOfPacks == null || !line.stockLine) return false;
	return line.snapshotNumberOfPacks !== line.stockLine.totalNumberOfPacks;
}

export interface FinaliseCheck {
	canFinalise: boolean;
	/** Whole-stocktake blockers (banner/toast). */
	blockers: ('notEditable' | 'noCountedLines')[];
	/** Per-line problems, keyed by line id (surfaced inline). */
	lineErrors: Record<
		string,
		('reduceBelowZero' | 'snapshotMismatch' | 'reasonRequired' | 'reasonInvalid')[]
	>;
}

/**
 * Client-side pre-flight for finalise (mirrors the server checks so the UI can
 * block early and mark offending lines). The server still validates atomically.
 */
export function finaliseCheck(
	stocktake: Pick<Stocktake, 'status' | 'isLocked'>,
	lines: StocktakeLine[],
	activeReasons: ReasonOption[]
): FinaliseCheck {
	const blockers: FinaliseCheck['blockers'] = [];
	if (!isEditable(stocktake)) blockers.push('notEditable');
	// UI blocks finalise when no line is counted (NoLines also covers zero lines).
	if (!lines.some(isCounted)) blockers.push('noCountedLines');

	const lineErrors: FinaliseCheck['lineErrors'] = {};
	for (const line of lines) {
		if (!isCounted(line)) continue; // uncounted lines are trimmed, not validated
		const errs: FinaliseCheck['lineErrors'][string] = [];
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

/** Where a typed API error is shown (spec 05-ui-surface › S5). */
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
		case 'AdjustmentReasonNotProvided':
		case 'AdjustmentReasonNotValid':
			return 'line';
		default:
			return 'banner';
	}
}
