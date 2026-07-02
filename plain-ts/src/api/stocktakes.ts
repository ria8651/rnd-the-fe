import { gql } from './client';
import type { Paged, Stocktake, StocktakeLine, StocktakeStatus } from './types';

const HEADER_FIELDS = `
  id stocktakeNumber status description comment createdDatetime finalisedDatetime
  stocktakeDate isLocked isInitialStocktake countedBy verifiedBy
  user { username email }
`;

const LINE_FIELDS = `
  id stocktakeId itemId itemName
  item { id code name unitName isVaccine doses defaultPackSize }
  stockLine { id totalNumberOfPacks availableNumberOfPacks }
  snapshotNumberOfPacks countedNumberOfPacks packSize batch expiryDate manufactureDate
  sellPricePerPack costPricePerPack comment note
  location { id name code onHold }
  reasonOption { id type reason isActive }
  donorId donorName
`;

export interface ListParams {
  statusEq?: StocktakeStatus | null;
  sortKey?: string;
  sortDesc?: boolean;
  page?: number; // 1-based
  pageSize?: number;
}

export async function fetchStocktakes(storeId: string, params: ListParams): Promise<Paged<Stocktake>> {
  const first = params.pageSize ?? 25;
  const offset = ((params.page ?? 1) - 1) * first;
  const filter = params.statusEq ? { status: { equalTo: params.statusEq } } : undefined;
  const sort = params.sortKey ? [{ key: params.sortKey, desc: !!params.sortDesc }] : undefined;
  const d = await gql<{ stocktakes: Paged<Stocktake> }>(
    `query stocktakes($storeId: String!, $filter: StocktakeFilterInput, $sort: [StocktakeSortInput!], $page: PaginationInput) {
      stocktakes(storeId: $storeId, filter: $filter, sort: $sort, page: $page) {
        ... on StocktakeConnector { totalCount nodes { ${HEADER_FIELDS} } }
      }
    }`,
    { storeId, filter, sort, page: { first, offset } },
  );
  return d.stocktakes;
}

export async function fetchStocktakeByNumber(storeId: string, stocktakeNumber: number): Promise<Stocktake | null> {
  const d = await gql<{ stocktakeByNumber: (Stocktake & { __typename: string }) | null }>(
    `query stByNumber($storeId: String!, $n: Int!) {
      stocktakeByNumber(storeId: $storeId, stocktakeNumber: $n) {
        ... on StocktakeNode { ${HEADER_FIELDS} }
      }
    }`,
    { storeId, n: stocktakeNumber },
  );
  return d.stocktakeByNumber ?? null;
}

export async function fetchStocktakeLines(
  storeId: string,
  stocktakeId: string,
  opts: { itemCodeOrName?: string; sortKey?: string; sortDesc?: boolean } = {},
): Promise<Paged<StocktakeLine>> {
  const filter: Record<string, unknown> = { stocktakeId: { equalTo: stocktakeId } };
  if (opts.itemCodeOrName) filter.itemCodeOrName = { like: opts.itemCodeOrName };
  const sort = opts.sortKey ? [{ key: opts.sortKey, desc: !!opts.sortDesc }] : undefined;
  const d = await gql<{ stocktakeLines: Paged<StocktakeLine> }>(
    `query stLines($storeId: String!, $stocktakeId: String!, $filter: StocktakeLineFilterInput, $sort: [StocktakeLineSortInput!]) {
      stocktakeLines(storeId: $storeId, stocktakeId: $stocktakeId, filter: $filter, sort: $sort, page: { first: 1000 }) {
        ... on StocktakeLineConnector { totalCount nodes { ${LINE_FIELDS} } }
      }
    }`,
    { storeId, stocktakeId, filter, sort },
  );
  return d.stocktakeLines;
}

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

export async function insertStocktake(storeId: string, input: InsertStocktakeInput): Promise<{ id: string; stocktakeNumber: number }> {
  const d = await gql<{ insertStocktake: { __typename: string; id?: string; stocktakeNumber?: number } }>(
    `mutation insertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
      insertStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id stocktakeNumber }
      }
    }`,
    { storeId, input },
  );
  const r = d.insertStocktake;
  if (r.__typename !== 'StocktakeNode' || !r.id) throw new Error('Could not create stocktake');
  return { id: r.id, stocktakeNumber: r.stocktakeNumber! };
}

export interface UpdateStocktakeInput {
  id: string;
  description?: string;
  comment?: string;
  countedBy?: string;
  verifiedBy?: string;
  isLocked?: boolean;
  stocktakeDate?: string;
  status?: 'FINALISED';
}

export interface UpdateResult {
  ok: boolean;
  errorType?: string;
  errorMessage?: string;
}

export async function updateStocktake(storeId: string, input: UpdateStocktakeInput): Promise<UpdateResult> {
  const d = await gql<{ updateStocktake: { __typename: string; error?: { __typename: string; description: string } } }>(
    `mutation updateStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on UpdateStocktakeError { error { __typename description } }
      }
    }`,
    { storeId, input },
  );
  const r = d.updateStocktake;
  if (r.__typename === 'StocktakeNode') return { ok: true };
  return { ok: false, errorType: r.error?.__typename, errorMessage: r.error?.description };
}

// ---- Line batch operations (batchStocktake) ----

export interface LineInput {
  id: string;
  stocktakeId?: string;
  stockLineId?: string | null;
  itemId?: string;
  countedNumberOfPacks?: number | null;
  batch?: string | null;
  expiryDate?: string | null;
  packSize?: number | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  reasonOptionId?: string | null;
  comment?: string | null;
  note?: string | null;
  locationId?: string | null; // mapped to NullableStringUpdate below
}

export interface LineOpError {
  id: string;
  errorType: string;
  message: string;
}

export interface BatchLinesResult {
  ok: boolean;
  errors: LineOpError[];
}

function toInsertInput(l: LineInput) {
  const { locationId, ...rest } = l;
  return { ...rest, location: locationId !== undefined ? { value: locationId } : undefined };
}
function toUpdateInput(l: LineInput) {
  const { locationId, stocktakeId, itemId, stockLineId, ...rest } = l;
  void stocktakeId; void itemId; void stockLineId;
  return { ...rest, location: locationId !== undefined ? { value: locationId } : undefined };
}

export async function batchLines(
  storeId: string,
  ops: { inserts?: LineInput[]; updates?: LineInput[]; deletes?: string[] },
): Promise<BatchLinesResult> {
  const input: Record<string, unknown> = { continueOnError: true };
  if (ops.inserts?.length) input.insertStocktakeLines = ops.inserts.map(toInsertInput);
  if (ops.updates?.length) input.updateStocktakeLines = ops.updates.map(toUpdateInput);
  if (ops.deletes?.length) input.deleteStocktakeLines = ops.deletes.map((id) => ({ id }));

  const d = await gql<{
    batchStocktake: {
      insertStocktakeLines?: Array<{ id: string; response: { __typename: string; error?: { __typename: string; description: string } } }>;
      updateStocktakeLines?: Array<{ id: string; response: { __typename: string; error?: { __typename: string; description: string } } }>;
      deleteStocktakeLines?: Array<{ id: string; response: { __typename: string } }>;
    };
  }>(
    `mutation batchStocktake($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename description } } } }
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename description } } } }
        deleteStocktakeLines { id response { __typename } }
      }
    }`,
    { storeId, input },
  );

  const errors: LineOpError[] = [];
  const collect = (arr?: Array<{ id: string; response: { __typename: string; error?: { __typename: string; description: string } } }>) => {
    for (const row of arr ?? []) {
      if (row.response.error) errors.push({ id: row.id, errorType: row.response.error.__typename, message: row.response.error.description });
    }
  };
  collect(d.batchStocktake.insertStocktakeLines);
  collect(d.batchStocktake.updateStocktakeLines);
  return { ok: errors.length === 0, errors };
}

export async function deleteStocktakes(storeId: string, ids: string[]): Promise<void> {
  await gql(
    `mutation deleteStocktakes($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) { deleteStocktakes { id response { __typename } } }
    }`,
    { storeId, input: { deleteStocktakes: ids.map((id) => ({ id })), continueOnError: true } },
  );
}
