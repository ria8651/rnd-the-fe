import type { ReasonOption, ReasonType } from '../api/types';

// Adjustment-reason rules, mirrored from spec/stocktakes/03-state-rules.md
// (adjustment-reason-rules). The UI mirrors these for good UX; the server is
// still the source of truth.
//
// Sign convention: reductionAmount = snapshot − counted.
//   counted > snapshot  →  stock went UP    →  POSITIVE adjustment
//   counted < snapshot  →  stock went DOWN  →  NEGATIVE adjustment

export type Direction = 'positive' | 'negative' | 'none';

const NEGATIVE_TYPES: ReasonType[] = [
  'NEGATIVE_INVENTORY_ADJUSTMENT',
  'OPEN_VIAL_WASTAGE',
  'CLOSED_VIAL_WASTAGE',
];

export function adjustmentDirection(
  snapshot: number,
  counted: number | null | undefined,
): Direction {
  if (counted == null) return 'none'; // uncounted lines never adjust
  if (counted > snapshot) return 'positive';
  if (counted < snapshot) return 'negative';
  return 'none';
}

/** Active reasons valid for a given adjustment direction. */
export function reasonsForDirection(reasons: ReasonOption[], dir: Direction): ReasonOption[] {
  if (dir === 'positive') return reasons.filter((r) => r.isActive && r.type === 'POSITIVE_INVENTORY_ADJUSTMENT');
  if (dir === 'negative') return reasons.filter((r) => r.isActive && NEGATIVE_TYPES.includes(r.type));
  return [];
}

export function isReasonValid(reason: ReasonOption | undefined, dir: Direction): boolean {
  if (!reason) return false;
  if (dir === 'positive') return reason.type === 'POSITIVE_INVENTORY_ADJUSTMENT';
  if (dir === 'negative') return NEGATIVE_TYPES.includes(reason.type);
  return true;
}

export type ReasonState = 'ok' | 'missing' | 'invalid';

/**
 * Returns the reason validation state for a line.
 * - 'missing': a reason is required for the direction (active reasons exist) but none chosen.
 * - 'invalid': the chosen reason doesn't match the adjustment direction.
 * - 'ok': no reason needed, or a valid reason is chosen.
 */
export function reasonState(
  reasons: ReasonOption[],
  snapshot: number,
  counted: number | null | undefined,
  chosenReasonId: string | null | undefined,
): ReasonState {
  const dir = adjustmentDirection(snapshot, counted);
  if (dir === 'none') return 'ok';

  const applicable = reasonsForDirection(reasons, dir);
  const chosen = reasons.find((r) => r.id === chosenReasonId);

  if (!chosen) {
    // No reason chosen: required only if active reasons exist for the direction.
    return applicable.length > 0 ? 'missing' : 'ok';
  }
  return isReasonValid(chosen, dir) ? 'ok' : 'invalid';
}

/** True when the line needs a reason the user hasn't validly provided (blocks save). */
export function reasonBlocks(
  reasons: ReasonOption[],
  snapshot: number,
  counted: number | null | undefined,
  chosenReasonId: string | null | undefined,
): boolean {
  return reasonState(reasons, snapshot, counted, chosenReasonId) !== 'ok';
}
