// Shared GraphQL field selections, kept in one place so list/detail queries and
// mutation responses stay consistent with 02-api-contract.md.

export const STOCKTAKE_HEADER_FIELDS = `
  id
  stocktakeNumber
  status
  description
  comment
  createdDatetime
  finalisedDatetime
  stocktakeDate
  isLocked
  isInitialStocktake
  countedBy
  verifiedBy
`;

export const STOCKTAKE_LINE_FIELDS = `
  id
  stocktakeId
  itemId
  itemName
  snapshotNumberOfPacks
  countedNumberOfPacks
  packSize
  batch
  expiryDate
  manufactureDate
  sellPricePerPack
  costPricePerPack
  comment
  note
  donorName
  item { id code name unitName isVaccine doses defaultPackSize }
  location { id name code onHold }
  stockLine { id totalNumberOfPacks availableNumberOfPacks packSize }
  reasonOption { id reason type isActive }
`;
