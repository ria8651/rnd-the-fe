/*
 * Stocktakes domain model (spec/stocktakes/01-domain-model.md), in neutral TS types.
 * The authoritative source is the live GraphQL schema; field optionality mirrors the
 * API contract (? = nullable).
 */

export type StocktakeStatus = 'NEW' | 'FINALISED';

/** Reason-option types (GraphQL ReasonOptionNodeType casing). */
export type ReasonOptionType =
  | 'POSITIVE_INVENTORY_ADJUSTMENT'
  | 'NEGATIVE_INVENTORY_ADJUSTMENT'
  | 'OPEN_VIAL_WASTAGE'
  | 'CLOSED_VIAL_WASTAGE'
  | 'RETURN_REASON'
  | 'REQUISITION_LINE_VARIANCE'
  | 'SHIPMENT_VARIANCE';

export interface ReasonOption {
  id: string;
  type: ReasonOptionType;
  isActive: boolean;
  reason: string;
}

export interface StocktakeListItem {
  id: string;
  stocktakeNumber: number;
  status: StocktakeStatus;
  description?: string | null;
  comment?: string | null;
  createdDatetime: string;
  finalisedDatetime?: string | null;
  stocktakeDate?: string | null;
  isLocked: boolean;
}

export interface StocktakeUser {
  username: string;
  email?: string | null;
}

export interface Stocktake extends StocktakeListItem {
  isInitialStocktake: boolean;
  countedBy?: string | null;
  verifiedBy?: string | null;
  user?: StocktakeUser | null;
  inventoryAdditionId?: string | null;
  inventoryReductionId?: string | null;
  lineCount: number;
}

export interface LineItem {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  defaultPackSize: number;
  restrictedLocationTypeId?: string | null;
}

export interface LineStockLine {
  id: string;
  totalNumberOfPacks: number;
  availableNumberOfPacks: number;
}

export interface LineLocation {
  id: string;
  name: string;
  code: string;
  onHold: boolean;
}

export interface StocktakeLine {
  id: string;
  stocktakeId: string;
  itemId: string;
  itemName: string;
  item: LineItem;
  stockLine?: LineStockLine | null;
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
  location?: LineLocation | null;
  reasonOption?: ReasonOption | null;
  donorId?: string | null;
  donorName?: string | null;
  vvmStatus?: { id: string; description: string } | null;
}

/** Creation mode (spec 01 › creation inputs, 03 › creation rules). */
export type CreateMode = 'full' | 'filtered' | 'blank';

export interface CreateStocktakeParams {
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
