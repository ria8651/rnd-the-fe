// Adjustment-reason helpers (spec 03 § adjustment-reason-rules). Sign convention:
// counted > snapshot => stock went UP => positive adjustment;
// counted < snapshot => stock went DOWN => negative adjustment.
import type { ReasonOption } from '../../api/types';

export type Direction = 'positive' | 'negative' | 'none';

const NEGATIVE_TYPES = new Set(['NEGATIVE_INVENTORY_ADJUSTMENT', 'OPEN_VIAL_WASTAGE', 'CLOSED_VIAL_WASTAGE']);
const POSITIVE_TYPES = new Set(['POSITIVE_INVENTORY_ADJUSTMENT']);

export function direction(counted: number | null | undefined, snapshot: number): Direction {
  if (counted == null) return 'none';
  if (counted > snapshot) return 'positive';
  if (counted < snapshot) return 'negative';
  return 'none';
}

export function reasonsForDirection(reasons: ReasonOption[], dir: Direction, vaccineOnly = false): ReasonOption[] {
  if (dir === 'positive') return reasons.filter((r) => POSITIVE_TYPES.has(r.type));
  if (dir === 'negative') {
    const negs = reasons.filter((r) => NEGATIVE_TYPES.has(r.type));
    // A vaccine-only selection may prefer wastage reasons, but all negatives are valid.
    void vaccineOnly;
    return negs;
  }
  return [];
}

/** Whether a reason is required for a line, given available active reasons. */
export function reasonRequired(reasons: ReasonOption[], dir: Direction): boolean {
  return dir !== 'none' && reasonsForDirection(reasons, dir).length > 0;
}
