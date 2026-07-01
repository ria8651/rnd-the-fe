// The UI-side mirror of the server rules. The server is authoritative
// (../../spec/stocktakes/03-state-rules.md); these exist so the UI can gate
// affordances and pre-validate for good UX — never as the sole guard.

import type { ReasonOption, ReasonType, Stocktake, StocktakeLine } from './types.ts';

/** A stocktake is editable only when NEW and not locked. */
export function isEditable(st: Pick<Stocktake, 'status' | 'isLocked'>): boolean {
  return st.status === 'NEW' && !st.isLocked;
}

/** Why editing is blocked, for the info banner (S3 / S5). Null if editable. */
export function editBlockReason(st: Pick<Stocktake, 'status' | 'isLocked'>): string | null {
  if (st.status === 'FINALISED') return 'This stocktake is finalised and can no longer be edited.';
  if (st.isLocked) return 'This stocktake is locked. Unlock it to make changes.';
  return null;
}

/** counted − snapshot; 0 when uncounted. (AC-E4) */
export function difference(line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>): number {
  if (line.countedNumberOfPacks == null) return 0;
  return line.countedNumberOfPacks - line.snapshotNumberOfPacks;
}

export type AdjustmentDirection = 'positive' | 'negative' | 'none';

/**
 * Direction of the inventory adjustment a counted line implies.
 * Sign convention from the backend: reductionAmount = snapshot − counted.
 * A positive reductionAmount = stock went down = a *negative* adjustment.
 */
export function adjustmentDirection(
  line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>,
): AdjustmentDirection {
  if (line.countedNumberOfPacks == null) return 'none';
  const delta = line.countedNumberOfPacks - line.snapshotNumberOfPacks;
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'none';
}

const POSITIVE_TYPES: ReasonType[] = ['POSITIVE_INVENTORY_ADJUSTMENT'];
const NEGATIVE_TYPES: ReasonType[] = [
  'NEGATIVE_INVENTORY_ADJUSTMENT',
  'OPEN_VIAL_WASTAGE',
  'CLOSED_VIAL_WASTAGE',
];

/** Reason types valid for a given adjustment direction (AC-R2). */
export function validReasonTypes(direction: AdjustmentDirection): ReasonType[] {
  if (direction === 'positive') return POSITIVE_TYPES;
  if (direction === 'negative') return NEGATIVE_TYPES;
  return [];
}

/** Active reasons applicable to a direction, for populating the reason dropdown. */
export function reasonsForDirection(reasons: ReasonOption[], direction: AdjustmentDirection): ReasonOption[] {
  const types = validReasonTypes(direction);
  return reasons.filter((r) => r.isActive && types.includes(r.type));
}

/**
 * Whether a reason is required for this line: it adjusts stock in a direction
 * for which active reasons are configured, and none is set yet (AC-R1, AC-R3).
 */
export function isReasonRequired(
  line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks' | 'reasonOption'>,
  reasons: ReasonOption[],
): boolean {
  const direction = adjustmentDirection(line);
  if (direction === 'none') return false;
  const available = reasonsForDirection(reasons, direction);
  if (available.length === 0) return false;
  return !line.reasonOption;
}

/** The UI blocks finalise unless at least one line has been counted. */
export function hasCountedLine(lines: StocktakeLine[]): boolean {
  return lines.some((l) => l.countedNumberOfPacks != null);
}

/** Human label for a status badge (colour is paired with this text). */
export function statusLabel(status: Stocktake['status']): string {
  return status === 'NEW' ? 'New' : 'Finalised';
}
