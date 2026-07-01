// Neutral TS types mirroring the GraphQL contract (spec/stocktakes/01,02).

export type StocktakeStatus = 'NEW' | 'FINALISED';

export interface Store {
  id: string;
  code: string;
  storeName: string;
}

export interface ItemRef {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine?: boolean;
  doses?: number;
  defaultPackSize?: number;
}

export interface LocationRef {
  id: string;
  name?: string | null;
  code?: string | null;
  onHold?: boolean;
}

export interface StockLineRef {
  id: string;
  batch?: string | null;
  packSize?: number;
  availableNumberOfPacks?: number;
  totalNumberOfPacks?: number;
  expiryDate?: string | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
}

export type ReasonType =
  | 'POSITIVE_INVENTORY_ADJUSTMENT'
  | 'NEGATIVE_INVENTORY_ADJUSTMENT'
  | 'OPEN_VIAL_WASTAGE'
  | 'CLOSED_VIAL_WASTAGE';

export interface ReasonOption {
  id: string;
  type: ReasonType;
  reason: string;
  isActive: boolean;
}

export interface StocktakeLine {
  id: string;
  stocktakeId: string;
  item: ItemRef;
  itemId: string;
  itemName: string;
  stockLine?: StockLineRef | null;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks?: number | null;
  packSize: number;
  batch?: string | null;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  sellPricePerPack?: number | null;
  costPricePerPack?: number | null;
  comment?: string | null;
  note?: string | null;
  location?: LocationRef | null;
  reasonOption?: ReasonOption | null;
}

export interface Stocktake {
  id: string;
  stocktakeNumber: number;
  status: StocktakeStatus;
  description?: string | null;
  comment?: string | null;
  createdDatetime: string;
  finalisedDatetime?: string | null;
  isLocked: boolean;
  isInitialStocktake?: boolean;
  countedBy?: string | null;
  verifiedBy?: string | null;
  stocktakeDate?: string | null;
  user?: { username?: string; email?: string | null } | null;
  lines?: { totalCount: number; nodes: StocktakeLine[] };
}

export interface Paginated<T> {
  totalCount: number;
  nodes: T[];
}

// ---- Error union member typenames (spec/stocktakes/02) ----
export type StocktakeUpdateErrorTypename =
  | 'SnapshotCountCurrentCountMismatch'
  | 'StocktakeIsLocked'
  | 'CannotEditStocktake'
  | 'StockLinesReducedBelowZero';

export type LineErrorTypename =
  | 'CannotEditStocktake'
  | 'StocktakeIsLocked'
  | 'StockLineReducedBelowZero'
  | 'SnapshotCountCurrentCountMismatch'
  | 'AdjustmentReasonNotProvided'
  | 'AdjustmentReasonNotValid'
  | 'CannotEditFinalised'
  | string;
