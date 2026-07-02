// Neutral domain types (spec stocktakes/01-domain-model.md), shaped to what the
// live schema returns.

export type StocktakeStatus = 'NEW' | 'FINALISED';

export type StocktakeHeader = {
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
  user: { username: string; email: string | null } | null;
};

export type StocktakeLine = {
  id: string;
  itemId: string;
  itemName: string;
  item: {
    code: string;
    name: string;
    unitName: string | null;
    isVaccine: boolean;
    defaultPackSize: number;
  } | null;
  stockLine: {
    id: string;
    totalNumberOfPacks: number;
    availableNumberOfPacks: number;
  } | null;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks: number | null;
  packSize: number;
  batch: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  costPricePerPack: number | null;
  sellPricePerPack: number | null;
  comment: string | null;
  note: string | null;
  location: { id: string; code: string; name: string } | null;
  reasonOption: { id: string; reason: string; type: ReasonType } | null;
};

export type Stocktake = StocktakeHeader & {
  lines: StocktakeLine[];
  linesTotalCount: number;
};

export type ReasonType =
  | 'POSITIVE_INVENTORY_ADJUSTMENT'
  | 'NEGATIVE_INVENTORY_ADJUSTMENT'
  | 'OPEN_VIAL_WASTAGE'
  | 'CLOSED_VIAL_WASTAGE';

export type ReasonOption = {
  id: string;
  reason: string;
  type: ReasonType;
  isActive: boolean;
};

export type Location = {
  id: string;
  code: string;
  name: string;
  onHold: boolean;
};

export type CatalogueItem = {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
  isVaccine: boolean;
  defaultPackSize: number;
};

// Reasons whose type is valid for a negative adjustment (stock went down).
export const NEGATIVE_REASON_TYPES: ReasonType[] = [
  'NEGATIVE_INVENTORY_ADJUSTMENT',
  'OPEN_VIAL_WASTAGE',
  'CLOSED_VIAL_WASTAGE',
];
export const VACCINE_WASTAGE_TYPES: ReasonType[] = ['OPEN_VIAL_WASTAGE', 'CLOSED_VIAL_WASTAGE'];
