/** Stocktake domain types (spec/stocktakes/01-domain-model.md). */

export type StocktakeStatus = 'NEW' | 'FINALISED';

export interface StocktakeUser {
  username: string;
  email?: string | null;
}

export interface Stocktake {
  id: string;
  stocktakeNumber: number;
  status: StocktakeStatus;
  description: string | null;
  comment: string | null;
  createdDatetime: string;
  finalisedDatetime: string | null;
  stocktakeDate: string | null;
  isLocked: boolean;
  isInitialStocktake: boolean;
  countedBy: string | null;
  verifiedBy: string | null;
  user?: StocktakeUser | null;
}

export interface StocktakeConnector {
  totalCount: number;
  nodes: Stocktake[];
}

export interface LineItem {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
  isVaccine: boolean;
  doses: number | null;
  defaultPackSize: number | null;
}

export interface LineLocation {
  id: string;
  name: string | null;
  code: string | null;
}

export interface LineReason {
  id: string;
  type: string;
  reason: string;
}

export interface StocktakeLine {
  id: string;
  itemId: string;
  itemName: string;
  item: LineItem;
  stockLine?: { id: string } | null;
  batch: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  packSize: number | null;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks: number | null;
  costPricePerPack: number | null;
  sellPricePerPack: number | null;
  comment: string | null;
  note: string | null;
  location: LineLocation | null;
  reasonOption: LineReason | null;
  donorName: string | null;
  manufacturer: { name: string } | null;
}

export interface StocktakeLineConnector {
  totalCount: number;
  nodes: StocktakeLine[];
}

/** Sort fields accepted by the list query (from the live schema). */
export type StocktakeSortField =
  | 'status'
  | 'createdDatetime'
  | 'finalisedDatetime'
  | 'stocktakeNumber'
  | 'comment'
  | 'description'
  | 'stocktakeDate';

export interface StocktakeListParams {
  status?: StocktakeStatus | null;
  page: number;
  pageSize: number;
  sortField: StocktakeSortField;
  sortDesc: boolean;
}

/** Creation modes (spec 01/02): mode is implied by which input fields are set. */
export type CreateMode = 'full' | 'filtered' | 'blank';

export interface CreateStocktakeInput {
  mode: CreateMode;
  description?: string;
  comment?: string;
  isInitialStocktake?: boolean;
  // full
  isAllItemsStocktake?: boolean;
  // filtered
  masterListId?: string;
  locationId?: string;
  vvmStatusId?: string;
  expiresBefore?: string;
  includeAllMasterListItems?: boolean;
}
