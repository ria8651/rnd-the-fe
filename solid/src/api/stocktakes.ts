import { gql } from './client';
import type {
  Paginated,
  ReasonOption,
  Stocktake,
  StocktakeLine,
  StocktakeStatus,
  Store,
} from './types';

// ---- Fragments ----
const STOCKTAKE_ROW = `
  id stocktakeNumber status description comment
  createdDatetime finalisedDatetime isLocked isInitialStocktake
`;

const LINE_FIELDS = `
  id stocktakeId snapshotNumberOfPacks countedNumberOfPacks packSize
  batch expiryDate manufactureDate sellPricePerPack costPricePerPack comment note
  itemId itemName
  item { id code name unitName isVaccine doses defaultPackSize }
  stockLine { id batch packSize availableNumberOfPacks totalNumberOfPacks expiryDate costPricePerPack sellPricePerPack }
  location { id name code onHold }
  reasonOption { id type reason isActive }
`;

// ---- List ----
export type StocktakeSortField =
  | 'status'
  | 'createdDatetime'
  | 'finalisedDatetime'
  | 'stocktakeNumber'
  | 'comment'
  | 'description'
  | 'stocktakeDate';

export interface ListArgs {
  storeId: string;
  first: number;
  offset: number;
  sortKey: StocktakeSortField;
  sortDesc: boolean;
  status?: StocktakeStatus;
}

export async function fetchStocktakes(a: ListArgs): Promise<Paginated<Stocktake>> {
  const filter = a.status ? { status: { equalTo: a.status } } : undefined;
  const data = await gql<{ stocktakes: Paginated<Stocktake> }>(
    `query Stocktakes($storeId: String!, $page: PaginationInput, $sort: [StocktakeSortInput!], $filter: StocktakeFilterInput) {
      stocktakes(storeId: $storeId, page: $page, sort: $sort, filter: $filter) {
        ... on StocktakeConnector { totalCount nodes { ${STOCKTAKE_ROW} } }
      }
    }`,
    {
      storeId: a.storeId,
      page: { first: a.first, offset: a.offset },
      sort: [{ key: a.sortKey, desc: a.sortDesc }],
      filter,
    },
  );
  return data.stocktakes;
}

// ---- Detail ----
export async function fetchStocktake(storeId: string, id: string): Promise<Stocktake> {
  const data = await gql<{ stocktake: Stocktake & { __typename: string } }>(
    `query Stocktake($storeId: String!, $id: String!) {
      stocktake(storeId: $storeId, id: $id) {
        __typename
        ... on StocktakeNode {
          id stocktakeNumber status description comment createdDatetime
          finalisedDatetime isLocked isInitialStocktake countedBy verifiedBy stocktakeDate
          user { username email }
        }
      }
    }`,
    { storeId, id },
  );
  return data.stocktake;
}

export async function fetchStocktakeByNumber(
  storeId: string,
  stocktakeNumber: number,
): Promise<Stocktake> {
  const data = await gql<{ stocktakeByNumber: Stocktake }>(
    `query StocktakeByNumber($storeId: String!, $n: Int!) {
      stocktakeByNumber(storeId: $storeId, stocktakeNumber: $n) {
        ... on StocktakeNode { id }
      }
    }`,
    { storeId, n: stocktakeNumber },
  );
  return data.stocktakeByNumber;
}

export interface LineListArgs {
  storeId: string;
  stocktakeId: string;
  first: number;
  offset: number;
  sortKey?: string;
  sortDesc?: boolean;
  itemCodeOrName?: string;
}

export async function fetchStocktakeLines(a: LineListArgs): Promise<Paginated<StocktakeLine>> {
  const filter: Record<string, unknown> = { stocktakeId: { equalTo: a.stocktakeId } };
  if (a.itemCodeOrName) filter.itemCodeOrName = { like: a.itemCodeOrName };
  const data = await gql<{ stocktakeLines: Paginated<StocktakeLine> }>(
    `query StocktakeLines($storeId: String!, $stocktakeId: String!, $page: PaginationInput, $sort: [StocktakeLineSortInput!], $filter: StocktakeLineFilterInput) {
      stocktakeLines(storeId: $storeId, stocktakeId: $stocktakeId, page: $page, sort: $sort, filter: $filter) {
        ... on StocktakeLineConnector { totalCount nodes { ${LINE_FIELDS} } }
      }
    }`,
    {
      storeId: a.storeId,
      stocktakeId: a.stocktakeId,
      page: { first: a.first, offset: a.offset },
      sort: a.sortKey ? [{ key: a.sortKey, desc: !!a.sortDesc }] : undefined,
      filter,
    },
  );
  return data.stocktakeLines;
}

// ---- Create (insertStocktake) ----
export interface InsertStocktakeInput {
  id: string;
  description?: string;
  comment?: string;
  isInitialStocktake?: boolean;
  createBlankStocktake?: boolean;
  isAllItemsStocktake?: boolean;
  includeAllMasterListItems?: boolean;
  masterListId?: string;
  locationId?: string;
  vvmStatusId?: string;
  expiresBefore?: string;
}

export async function insertStocktake(
  storeId: string,
  input: InsertStocktakeInput,
): Promise<{ id: string; stocktakeNumber: number }> {
  const data = await gql<{ insertStocktake: { __typename: string; id: string; stocktakeNumber: number } }>(
    `mutation InsertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
      insertStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id stocktakeNumber }
      }
    }`,
    { storeId, input },
  );
  return data.insertStocktake;
}

// ---- Update header / status / lock ----
export interface UpdateStocktakeInput {
  id: string;
  description?: string;
  comment?: string;
  status?: 'FINALISED';
  stocktakeDate?: string;
  isLocked?: boolean;
  countedBy?: string;
  verifiedBy?: string;
}

export interface UpdateResult {
  ok: boolean;
  errorType?: string;
  errorMessage?: string;
  node?: Stocktake;
}

export async function updateStocktake(
  storeId: string,
  input: UpdateStocktakeInput,
): Promise<UpdateResult> {
  const data = await gql<{
    updateStocktake:
      | { __typename: 'StocktakeNode'; id: string; status: StocktakeStatus; isLocked: boolean; finalisedDatetime?: string }
      | { __typename: 'UpdateStocktakeError'; error: { __typename: string; description: string } };
  }>(
    `mutation UpdateStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id status isLocked finalisedDatetime description comment }
        ... on UpdateStocktakeError { error { __typename description } }
      }
    }`,
    { storeId, input },
  );
  const r = data.updateStocktake;
  if (r.__typename === 'StocktakeNode') return { ok: true, node: r as unknown as Stocktake };
  return { ok: false, errorType: r.error.__typename, errorMessage: r.error.description };
}

// ---- Batch: header deletes ----
export async function deleteStocktakes(storeId: string, ids: string[]): Promise<void> {
  await gql(
    `mutation DeleteStocktakes($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        deleteStocktakes { id response { __typename } }
      }
    }`,
    { storeId, input: { deleteStocktakes: ids.map((id) => ({ id })) } },
  );
}

// ---- Batch: line edits ----
// The full editable field set for a stocktake line (spec 01/02). All optional;
// only defined keys are sent. Editing lives entirely in the line editor (S4).
export interface LineFields {
  countedNumberOfPacks?: number | null;
  reasonOptionId?: string | null;
  batch?: string | null;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  packSize?: number | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  comment?: string | null;
  note?: string | null;
  locationId?: string | null;
}

export interface LineInsert extends LineFields {
  id: string;
  stocktakeId: string;
  itemId: string;
  stockLineId?: string;
}

export interface LineUpdate extends LineFields {
  id: string;
}

export interface LineBatchResult {
  ok: boolean;
  perLineErrors: { lineId: string; errorType: string; message: string }[];
}

// Insert takes plain scalars; location is a NullableStringUpdate wrapper.
function toInsertInput(l: LineInsert): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: l.id,
    stocktakeId: l.stocktakeId,
    itemId: l.itemId,
  };
  if (l.stockLineId != null) out.stockLineId = l.stockLineId;
  if (l.countedNumberOfPacks !== undefined) out.countedNumberOfPacks = l.countedNumberOfPacks ?? undefined;
  if (l.reasonOptionId !== undefined) out.reasonOptionId = l.reasonOptionId ?? undefined;
  if (l.batch !== undefined) out.batch = l.batch ?? undefined;
  if (l.expiryDate !== undefined) out.expiryDate = l.expiryDate ?? undefined;
  if (l.manufactureDate !== undefined) out.manufactureDate = l.manufactureDate ?? undefined;
  if (l.packSize !== undefined) out.packSize = l.packSize ?? undefined;
  if (l.costPricePerPack !== undefined) out.costPricePerPack = l.costPricePerPack ?? undefined;
  if (l.sellPricePerPack !== undefined) out.sellPricePerPack = l.sellPricePerPack ?? undefined;
  if (l.comment !== undefined) out.comment = l.comment ?? undefined;
  if (l.note !== undefined) out.note = l.note ?? undefined;
  if (l.locationId !== undefined) out.location = { value: l.locationId };
  return out;
}

// Update: nullable date/location use the { value } wrapper so "clear to null" is
// distinguishable from "leave unchanged"; scalars are sent as-is.
function toUpdateInput(l: LineUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = { id: l.id };
  if (l.countedNumberOfPacks !== undefined) out.countedNumberOfPacks = l.countedNumberOfPacks ?? undefined;
  if (l.reasonOptionId !== undefined) out.reasonOptionId = l.reasonOptionId ?? undefined;
  if (l.batch !== undefined) out.batch = l.batch ?? undefined;
  if (l.expiryDate !== undefined) out.expiryDate = { value: l.expiryDate };
  if (l.manufactureDate !== undefined) out.manufactureDate = { value: l.manufactureDate };
  if (l.packSize !== undefined) out.packSize = l.packSize ?? undefined;
  if (l.costPricePerPack !== undefined) out.costPricePerPack = l.costPricePerPack ?? undefined;
  if (l.sellPricePerPack !== undefined) out.sellPricePerPack = l.sellPricePerPack ?? undefined;
  if (l.comment !== undefined) out.comment = l.comment ?? undefined;
  if (l.note !== undefined) out.note = l.note ?? undefined;
  if (l.locationId !== undefined) out.location = { value: l.locationId };
  return out;
}

export async function batchStocktakeLines(
  storeId: string,
  ops: {
    insert?: LineInsert[];
    update?: LineUpdate[];
    deleteIds?: string[];
  },
): Promise<LineBatchResult> {
  const insertStocktakeLines = (ops.insert ?? []).map(toInsertInput);
  const updateStocktakeLines = (ops.update ?? []).map(toUpdateInput);
  const deleteStocktakeLines = (ops.deleteIds ?? []).map((id) => ({ id }));

  const data = await gql<{
    batchStocktake: {
      insertStocktakeLines?: { id: string; response: { __typename: string; error?: { __typename: string; description: string } } }[];
      updateStocktakeLines?: { id: string; response: { __typename: string; error?: { __typename: string; description: string } } }[];
      deleteStocktakeLines?: { id: string; response: { __typename: string; error?: { __typename: string; description: string } } }[];
    };
  }>(
    `mutation BatchLines($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename description } } } }
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename description } } } }
        deleteStocktakeLines { id response { __typename ... on DeleteStocktakeLineError { error { __typename description } } } }
      }
    }`,
    {
      storeId,
      input: {
        insertStocktakeLines,
        updateStocktakeLines,
        deleteStocktakeLines,
        continueOnError: true,
      },
    },
  );

  const perLineErrors: LineBatchResult['perLineErrors'] = [];
  const collect = (rows?: { id: string; response: { __typename: string; error?: { __typename: string; description: string } } }[]) => {
    for (const row of rows ?? []) {
      if (row.response.error) {
        perLineErrors.push({
          lineId: row.id,
          errorType: row.response.error.__typename,
          message: row.response.error.description,
        });
      }
    }
  };
  collect(data.batchStocktake.insertStocktakeLines);
  collect(data.batchStocktake.updateStocktakeLines);
  collect(data.batchStocktake.deleteStocktakeLines);

  return { ok: perLineErrors.length === 0, perLineErrors };
}

// ---- Supporting lookups ----
export async function fetchStores(search?: string): Promise<Paginated<Store>> {
  const filter = search ? { name: { like: search } } : undefined;
  const data = await gql<{ stores: Paginated<Store> }>(
    `query Stores($page: PaginationInput, $filter: StoreFilterInput) {
      stores(page: $page, filter: $filter) {
        ... on StoreConnector { totalCount nodes { id code storeName } }
      }
    }`,
    { page: { first: 200 }, filter },
  );
  return data.stores;
}

// ---- Finalise (updateStocktake status: FINALISED), with offending-line mapping ----
export interface FinaliseResult {
  ok: boolean;
  errorType?: string;
  message?: string;
  // Offending references keyed for per-line surfacing (S5 error surfaces).
  mismatchStocktakeLineIds?: string[];
  reducedStockLineIds?: string[];
}

export async function finaliseStocktake(storeId: string, id: string): Promise<FinaliseResult> {
  const data = await gql<{
    updateStocktake:
      | { __typename: 'StocktakeNode'; status: StocktakeStatus }
      | {
          __typename: 'UpdateStocktakeError';
          error: {
            __typename: string;
            description: string;
            lines?: { stocktakeLine: { id: string } }[];
            errors?: { stockLine: { id: string } }[];
          };
        };
  }>(
    `mutation Finalise($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { status }
        ... on UpdateStocktakeError {
          error {
            __typename
            description
            ... on SnapshotCountCurrentCountMismatch { lines { stocktakeLine { id } } }
            ... on StockLinesReducedBelowZero { errors { stockLine { id } } }
          }
        }
      }
    }`,
    { storeId, input: { id, status: 'FINALISED' } },
  );
  const r = data.updateStocktake;
  if (r.__typename === 'StocktakeNode') return { ok: true };
  return {
    ok: false,
    errorType: r.error.__typename,
    message: r.error.description,
    mismatchStocktakeLineIds: r.error.lines?.map((l) => l.stocktakeLine.id),
    reducedStockLineIds: r.error.errors?.map((e) => e.stockLine.id),
  };
}

// ---- Catalogue item search (S4 add-item; excludes items already present) ----
export interface ItemSearchResult {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  defaultPackSize?: number;
}

export async function searchItems(
  storeId: string,
  search: string,
  first = 25,
): Promise<ItemSearchResult[]> {
  const data = await gql<{ items: Paginated<ItemSearchResult> }>(
    `query Items($storeId: String!, $page: PaginationInput, $filter: ItemFilterInput) {
      items(storeId: $storeId, page: $page, filter: $filter) {
        ... on ItemConnector { nodes { id code name unitName defaultPackSize } }
      }
    }`,
    {
      storeId,
      page: { first },
      filter: {
        isVisible: true,
        ...(search ? { codeOrName: { like: search } } : {}),
      },
    },
  );
  return data.items.nodes;
}

// ---- Locations (bulk change-location) ----
export async function fetchLocations(storeId: string): Promise<{ id: string; name: string; code: string }[]> {
  const data = await gql<{ locations: Paginated<{ id: string; name: string; code: string }> }>(
    `query Locations($storeId: String!, $page: PaginationInput) {
      locations(storeId: $storeId, page: $page) {
        ... on LocationConnector { nodes { id name code } }
      }
    }`,
    { storeId, page: { first: 500 } },
  );
  return data.locations.nodes;
}

// Bulk location change: update lines' location via the nullable-string wrapper.
export async function setLinesLocation(
  storeId: string,
  lineIds: string[],
  locationId: string | null,
): Promise<LineBatchResult> {
  const data = await gql<{
    batchStocktake: {
      updateStocktakeLines?: { id: string; response: { __typename: string; error?: { __typename: string; description: string } } }[];
    };
  }>(
    `mutation SetLocation($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename description } } } }
      }
    }`,
    {
      storeId,
      input: {
        updateStocktakeLines: lineIds.map((id) => ({ id, location: { value: locationId } })),
        continueOnError: true,
      },
    },
  );
  const perLineErrors: LineBatchResult['perLineErrors'] = [];
  for (const row of data.batchStocktake.updateStocktakeLines ?? []) {
    if (row.response.error) {
      perLineErrors.push({ lineId: row.id, errorType: row.response.error.__typename, message: row.response.error.description });
    }
  }
  return { ok: perLineErrors.length === 0, perLineErrors };
}

export async function fetchReasonOptions(): Promise<ReasonOption[]> {
  const data = await gql<{ reasonOptions: Paginated<ReasonOption> }>(
    `query ReasonOptions {
      reasonOptions(filter: { isActive: true }) {
        ... on ReasonOptionConnector { nodes { id type reason isActive } }
      }
    }`,
  );
  return data.reasonOptions.nodes;
}
