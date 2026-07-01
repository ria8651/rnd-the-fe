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
export interface LineUpsert {
  // insert (needs itemId) vs update (keyed by id)
  id: string;
  isNew: boolean;
  stocktakeId: string;
  itemId?: string;
  stockLineId?: string;
  countedNumberOfPacks?: number | null;
  reasonOptionId?: string | null;
  comment?: string | null;
  batch?: string | null;
}

export interface LineBatchResult {
  ok: boolean;
  perLineErrors: { lineId: string; errorType: string; message: string }[];
}

export async function batchStocktakeLines(
  storeId: string,
  ops: {
    insert?: LineUpsert[];
    update?: LineUpsert[];
    deleteIds?: string[];
  },
): Promise<LineBatchResult> {
  const insertStocktakeLines = (ops.insert ?? []).map((l) => ({
    id: l.id,
    stocktakeId: l.stocktakeId,
    itemId: l.itemId,
    stockLineId: l.stockLineId,
    countedNumberOfPacks: l.countedNumberOfPacks ?? undefined,
    reasonOptionId: l.reasonOptionId ?? undefined,
    comment: l.comment ?? undefined,
    batch: l.batch ?? undefined,
  }));
  const updateStocktakeLines = (ops.update ?? []).map((l) => ({
    id: l.id,
    countedNumberOfPacks: l.countedNumberOfPacks ?? undefined,
    reasonOptionId: l.reasonOptionId ?? undefined,
    comment: l.comment ?? undefined,
    batch: l.batch ?? undefined,
  }));
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
