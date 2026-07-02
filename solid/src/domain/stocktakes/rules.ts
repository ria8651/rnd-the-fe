/*
 * Stocktakes state & rules engine (spec/stocktakes/03-state-rules.md). Pure functions
 * mirroring the server-enforced invariants so the UI can gate affordances and explain
 * itself. These are the executable form of the acceptance criteria (06); AC ids cited.
 */

import type { ReasonOption, ReasonOptionType, Stocktake, StocktakeLine } from './types';

/* ---------- Editability (AC-E1/E2) ---------- */

/** Editable iff NEW and not locked (03 › editability-rules). */
export function isEditable(s: Pick<Stocktake, 'status' | 'isLocked'>): boolean {
  return s.status === 'NEW' && !s.isLocked;
}

export type EditBlock = 'finalised' | 'locked' | null;

/** Why edits are blocked — for the explanatory banner (finalised is permanent; locked is reversible). */
export function editBlockReason(s: Pick<Stocktake, 'status' | 'isLocked'>): EditBlock {
  if (s.status === 'FINALISED') return 'finalised';
  if (s.isLocked) return 'locked';
  return null;
}

/* ---------- Counting & difference (AC-E4) ---------- */

export function isCounted(line: Pick<StocktakeLine, 'countedNumberOfPacks'>): boolean {
  return line.countedNumberOfPacks != null;
}

/** counted − snapshot, in packs; 0 when uncounted (AC-E4). */
export function difference(line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>): number {
  if (line.countedNumberOfPacks == null) return 0;
  return line.countedNumberOfPacks - line.snapshotNumberOfPacks;
}

/* ---------- Adjustment direction & reasons (AC-R1/R2/R3) ----------
 * Sign convention from the backend (03): reductionAmount = snapshot − counted. A
 * positive reductionAmount means stock went DOWN (a negative adjustment); negative
 * means stock went UP (a positive adjustment). We express direction from the delta.
 */

export type AdjustmentDirection = 'positive' | 'negative' | 'none';

export function adjustmentDirection(
  line: Pick<StocktakeLine, 'countedNumberOfPacks' | 'snapshotNumberOfPacks'>,
): AdjustmentDirection {
  if (line.countedNumberOfPacks == null) return 'none';
  const delta = line.countedNumberOfPacks - line.snapshotNumberOfPacks;
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'none';
}

/** Reason types valid for an adjustment direction (03 › adjustment-reason-rules). */
export function validReasonTypes(direction: AdjustmentDirection): ReasonOptionType[] {
  if (direction === 'positive') return ['POSITIVE_INVENTORY_ADJUSTMENT'];
  if (direction === 'negative') return ['NEGATIVE_INVENTORY_ADJUSTMENT', 'OPEN_VIAL_WASTAGE', 'CLOSED_VIAL_WASTAGE'];
  return [];
}

/** Active reason options usable for a direction. */
export function reasonsForDirection(reasons: ReasonOption[], direction: AdjustmentDirection): ReasonOption[] {
  const types = validReasonTypes(direction);
  return reasons.filter((r) => r.isActive && types.includes(r.type));
}

export type ReasonError = 'required' | 'invalid' | null;

/**
 * Reason error for a line at save (AC-R1/R2/R3):
 *  - required: active reasons exist for the direction but the line provides none;
 *  - invalid: the chosen reason's type doesn't match the direction;
 *  - none required if no active reasons are configured for the direction.
 */
export function lineReasonError(line: StocktakeLine, reasons: ReasonOption[]): ReasonError {
  const dir = adjustmentDirection(line);
  if (dir === 'none') return null;
  const valid = validReasonTypes(dir);
  if (line.reasonOption) {
    return valid.includes(line.reasonOption.type) ? null : 'invalid';
  }
  const available = reasonsForDirection(reasons, dir);
  return available.length > 0 ? 'required' : null;
}

/* ---------- Finalise client guard (AC-F1) ----------
 * The server rejects zero lines with NoLines; the UI additionally blocks finalise
 * when every line is uncounted (03 › finalise preconditions).
 */
export function hasCountedLine(lines: Pick<StocktakeLine, 'countedNumberOfPacks'>[]): boolean {
  return lines.some((l) => l.countedNumberOfPacks != null);
}

export function countedLineCount(lines: Pick<StocktakeLine, 'countedNumberOfPacks'>[]): number {
  return lines.filter((l) => l.countedNumberOfPacks != null).length;
}
