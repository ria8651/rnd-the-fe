// Neutral domain types for the stocktakes vertical. Mirrors
// ../../spec/stocktakes/01-domain-model.md (optionality via `?`). These are the
// shapes the UI works with; the API layer maps GraphQL nodes onto these.

export type StocktakeStatus = 'NEW' | 'FINALISED';

export type ReasonType =
  | 'POSITIVE_INVENTORY_ADJUSTMENT'
  | 'NEGATIVE_INVENTORY_ADJUSTMENT'
  | 'OPEN_VIAL_WASTAGE'
  | 'CLOSED_VIAL_WASTAGE'
  | 'RETURN_REASON'
  | 'REQUISITION_LINE_VARIANCE'
  | 'SHIPMENT_VARIANCE';

export interface ReasonOption {
  id: string;
  reason: string;
  type: ReasonType;
  isActive: boolean;
}

export interface Stocktake {
  id: string;
  stocktakeNumber: number;
  status: StocktakeStatus;
  description?: string | null;
  comment?: string | null;
  createdDatetime: string;
  finalisedDatetime?: string | null;
  stocktakeDate?: string | null;
  isLocked: boolean;
  isInitialStocktake?: boolean;
  countedBy?: string | null;
  verifiedBy?: string | null;
}

export interface StocktakeListResult {
  totalCount: number;
  nodes: Stocktake[];
}

export interface StockLineRef {
  id: string;
  totalNumberOfPacks: number;
  availableNumberOfPacks: number;
  packSize: number;
}

export interface ItemRef {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  defaultPackSize: number;
}

export interface LocationRef {
  id: string;
  name: string;
  code: string;
  onHold?: boolean;
}

export interface StocktakeLine {
  id: string;
  stocktakeId: string;
  itemId: string;
  itemName: string;
  item: ItemRef;
  stockLine?: StockLineRef | null;
  location?: LocationRef | null;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks?: number | null;
  packSize?: number | null;
  batch?: string | null;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  sellPricePerPack?: number | null;
  costPricePerPack?: number | null;
  comment?: string | null;
  note?: string | null;
  reasonOption?: ReasonOption | null;
  donorName?: string | null;
}

export interface StocktakeLineListResult {
  totalCount: number;
  nodes: StocktakeLine[];
}

// Sort field names match the GraphQL StocktakeSortFieldInput enum.
export type StocktakeSortField =
  | 'status'
  | 'createdDatetime'
  | 'finalisedDatetime'
  | 'stocktakeNumber'
  | 'comment'
  | 'description'
  | 'stocktakeDate';
