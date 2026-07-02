// Neutral domain types (spec 01-domain-model.md). Only the fields we use.

export type StocktakeStatus = 'NEW' | 'FINALISED';

export interface UserRef {
  username?: string | null;
  email?: string | null;
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
  isInitialStocktake: boolean;
  countedBy?: string | null;
  verifiedBy?: string | null;
  user?: UserRef | null;
}

export interface ItemRef {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses?: number | null;
  defaultPackSize?: number | null;
}

export interface LocationRef {
  id: string;
  name: string;
  code?: string | null;
  onHold?: boolean;
}

export interface ReasonOption {
  id: string;
  type: string; // POSITIVE_INVENTORY_ADJUSTMENT | NEGATIVE_INVENTORY_ADJUSTMENT | OPEN_VIAL_WASTAGE | CLOSED_VIAL_WASTAGE
  reason: string;
  isActive: boolean;
}

export interface StockLineRef {
  id: string;
  totalNumberOfPacks: number;
  availableNumberOfPacks: number;
}

export interface StocktakeLine {
  id: string;
  stocktakeId: string;
  itemId: string;
  itemName: string;
  item: ItemRef;
  stockLine?: StockLineRef | null;
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
  location?: LocationRef | null;
  reasonOption?: ReasonOption | null;
  donorId?: string | null;
  donorName?: string | null;
}

export interface StoreRef {
  id: string;
  code: string;
  storeName: string;
}

export interface Paged<T> {
  totalCount: number;
  nodes: T[];
}
