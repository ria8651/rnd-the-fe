import type { LineReason } from './types';

/**
 * Adjustment-reason rules (spec 03-state-rules.md#adjustment-reason-rules):
 *   reductionAmount = snapshot − counted
 *   positive reductionAmount ⇒ stock went DOWN (a negative adjustment)
 *   negative reductionAmount ⇒ stock went UP   (a positive adjustment)
 * A positive adjustment needs a PositiveInventoryAdjustment reason; a negative
 * adjustment accepts NegativeInventoryAdjustment / OpenVialWastage / ClosedVialWastage.
 */
export type Direction = 'positive' | 'negative';

export function directionOf(snapshot: number, counted: number): Direction | null {
  if (counted > snapshot) return 'positive'; // stock up
  if (counted < snapshot) return 'negative'; // stock down
  return null;
}

const NEGATIVE_TYPES = new Set([
  'NEGATIVE_INVENTORY_ADJUSTMENT',
  'OPEN_VIAL_WASTAGE',
  'CLOSED_VIAL_WASTAGE',
]);
const POSITIVE_TYPES = new Set(['POSITIVE_INVENTORY_ADJUSTMENT']);

export function reasonsForDirection(reasons: LineReason[], dir: Direction): LineReason[] {
  const allowed = dir === 'positive' ? POSITIVE_TYPES : NEGATIVE_TYPES;
  return reasons.filter((r) => allowed.has(r.type));
}
