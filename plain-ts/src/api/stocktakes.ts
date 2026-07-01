// Stocktake operations — the client half of ../../spec/stocktakes/02-api-contract.md.
// Every operation is store-scoped. Errors are typed members of a response union;
// callers match on `__typename`.

import { gql } from './client.ts';
import { STOCKTAKE_HEADER_FIELDS, STOCKTAKE_LINE_FIELDS } from './fragments.ts';
import type {
  Stocktake,
  StocktakeLine,
  StocktakeLineListResult,
  StocktakeListResult,
  StocktakeSortField,
} from '../domain/types.ts';

export interface ListArgs {
  storeId: string;
  first: number;
  offset: number;
  status?: 'NEW' | 'FINALISED';
  descriptionLike?: string;
  sortField?: StocktakeSortField;
  sortDesc?: boolean;
}

export async function fetchStocktakes(args: ListArgs): Promise<StocktakeListResult> {
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = { equalTo: args.status };
  if (args.descriptionLike) filter.description = { like: args.descriptionLike };

  const query = `
    query Stocktakes($storeId: String!, $page: PaginationInput, $filter: StocktakeFilterInput, $sort: [StocktakeSortInput!]) {
      stocktakes(storeId: $storeId, page: $page, filter: $filter, sort: $sort) {
        ... on StocktakeConnector {
          totalCount
          nodes { ${STOCKTAKE_HEADER_FIELDS} }
        }
      }
    }
  `;
  const data = await gql<{ stocktakes: StocktakeListResult }>(query, {
    storeId: args.storeId,
    page: { first: args.first, offset: args.offset },
    filter: Object.keys(filter).length ? filter : undefined,
    sort: args.sortField
      ? [{ key: args.sortField, desc: args.sortDesc ?? false }]
      : [{ key: 'createdDatetime', desc: true }],
  });
  return data.stocktakes;
}

export async function fetchStocktake(id: string, storeId: string): Promise<Stocktake | null> {
  const query = `
    query Stocktake($id: String!, $storeId: String!) {
      stocktake(id: $id, storeId: $storeId) {
        ... on StocktakeNode { ${STOCKTAKE_HEADER_FIELDS} }
      }
    }
  `;
  const data = await gql<{ stocktake: Stocktake | null }>(query, { id, storeId });
  return data.stocktake;
}

export async function fetchStocktakeByNumber(
  stocktakeNumber: number,
  storeId: string,
): Promise<Stocktake | null> {
  const query = `
    query StocktakeByNumber($stocktakeNumber: Int!, $storeId: String!) {
      stocktakeByNumber(stocktakeNumber: $stocktakeNumber, storeId: $storeId) {
        ... on StocktakeNode { ${STOCKTAKE_HEADER_FIELDS} }
      }
    }
  `;
  const data = await gql<{ stocktakeByNumber: Stocktake | null }>(query, { stocktakeNumber, storeId });
  return data.stocktakeByNumber;
}

export interface LineArgs {
  storeId: string;
  stocktakeId: string;
  first: number;
  offset: number;
  itemLike?: string;
}

export async function fetchStocktakeLines(args: LineArgs): Promise<StocktakeLineListResult> {
  const filter: Record<string, unknown> = {};
  if (args.itemLike) {
    // Item text filter matches code or name.
    filter.itemCodeOrName = { like: args.itemLike };
  }
  const query = `
    query StocktakeLines($storeId: String!, $stocktakeId: String!, $page: PaginationInput, $filter: StocktakeLineFilterInput) {
      stocktakeLines(storeId: $storeId, stocktakeId: $stocktakeId, page: $page, filter: $filter) {
        ... on StocktakeLineConnector {
          totalCount
          nodes { ${STOCKTAKE_LINE_FIELDS} }
        }
      }
    }
  `;
  const data = await gql<{ stocktakeLines: StocktakeLineListResult }>(query, {
    storeId: args.stocktakeId ? args.storeId : args.storeId,
    stocktakeId: args.stocktakeId,
    page: { first: args.first, offset: args.offset },
    filter: Object.keys(filter).length ? filter : undefined,
  });
  return data.stocktakeLines;
}

// ---- Mutations ----

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

export type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; typename: string };

export async function insertStocktake(
  input: InsertStocktakeInput,
  storeId: string,
): Promise<MutationResult<Stocktake>> {
  const query = `
    mutation InsertStocktake($input: InsertStocktakeInput!, $storeId: String!) {
      insertStocktake(input: $input, storeId: $storeId) {
        __typename
        ... on StocktakeNode { ${STOCKTAKE_HEADER_FIELDS} }
      }
    }
  `;
  const data = await gql<{ insertStocktake: { __typename: string } & Stocktake }>(query, {
    input,
    storeId,
  });
  const node = data.insertStocktake;
  if (node.__typename === 'StocktakeNode') return { ok: true, value: node };
  return { ok: false, typename: node.__typename, error: describeError(node.__typename) };
}

export interface UpdateStocktakeInput {
  id: string;
  status?: 'FINALISED';
  description?: string;
  comment?: string;
  isLocked?: boolean;
  stocktakeDate?: string;
  countedBy?: string;
  verifiedBy?: string;
}

export async function updateStocktake(
  input: UpdateStocktakeInput,
  storeId: string,
): Promise<MutationResult<Stocktake>> {
  const query = `
    mutation UpdateStocktake($input: UpdateStocktakeInput!, $storeId: String!) {
      updateStocktake(input: $input, storeId: $storeId) {
        __typename
        ... on StocktakeNode { ${STOCKTAKE_HEADER_FIELDS} }
        ... on UpdateStocktakeError { error { __typename description } }
      }
    }
  `;
  const data = await gql<{
    updateStocktake:
      | ({ __typename: 'StocktakeNode' } & Stocktake)
      | { __typename: 'UpdateStocktakeError'; error: { __typename: string; description: string } };
  }>(query, { input, storeId });
  const node = data.updateStocktake;
  if (node.__typename === 'StocktakeNode') return { ok: true, value: node };
  return {
    ok: false,
    typename: node.error.__typename,
    error: node.error.description || describeError(node.error.__typename),
  };
}

export async function deleteStocktakes(
  ids: string[],
  storeId: string,
): Promise<MutationResult<number>> {
  const query = `
    mutation DeleteStocktakes($input: BatchStocktakeInput!, $storeId: String!) {
      batchStocktake(input: $input, storeId: $storeId) {
        deleteStocktakes {
          id
          response {
            __typename
            ... on DeleteStocktakeError { error { __typename description } }
          }
        }
      }
    }
  `;
  const data = await gql<{
    batchStocktake: {
      deleteStocktakes: Array<{
        id: string;
        response: { __typename: string; error?: { __typename: string; description: string } };
      }>;
    };
  }>(query, { input: { deleteStocktakes: ids.map((id) => ({ id })) }, storeId });

  const failures = data.batchStocktake.deleteStocktakes.filter(
    (r) => r.response.__typename !== 'DeleteResponse',
  );
  if (failures.length) {
    const first = failures[0].response.error;
    return {
      ok: false,
      typename: first?.__typename ?? 'DeleteStocktakeError',
      error: first?.description ?? `Failed to delete ${failures.length} stocktake(s).`,
    };
  }
  return { ok: true, value: ids.length };
}

// ---- Line batch (insert / update / delete) ----

export interface NullableUpdate<T> {
  value?: T | null;
}

export interface InsertLineInput {
  id: string;
  stocktakeId: string;
  itemId?: string;
  stockLineId?: string;
  countedNumberOfPacks?: number;
  batch?: string;
  expiryDate?: string;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  comment?: string;
  note?: string;
  reasonOptionId?: string;
  location?: NullableUpdate<string>;
}

export interface UpdateLineInput {
  id: string;
  countedNumberOfPacks?: number;
  batch?: string;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  comment?: string;
  note?: string;
  reasonOptionId?: string;
  expiryDate?: NullableUpdate<string>;
  location?: NullableUpdate<string>;
}

export interface BatchLinesInput {
  insert?: InsertLineInput[];
  update?: UpdateLineInput[];
  deleteIds?: string[];
}

export interface LineError {
  lineId: string;
  typename: string;
  message: string;
}

export interface BatchLinesResult {
  ok: boolean;
  lineErrors: LineError[];
}

export async function batchStocktakeLines(
  input: BatchLinesInput,
  storeId: string,
): Promise<BatchLinesResult> {
  const query = `
    mutation BatchLines($input: BatchStocktakeInput!, $storeId: String!) {
      batchStocktake(input: $input, storeId: $storeId) {
        insertStocktakeLines {
          id
          response { __typename ... on InsertStocktakeLineError { error { __typename description } } }
        }
        updateStocktakeLines {
          id
          response { __typename ... on UpdateStocktakeLineError { error { __typename description } } }
        }
        deleteStocktakeLines {
          id
          response { __typename ... on DeleteStocktakeLineError { error { __typename description } } }
        }
      }
    }
  `;
  const variables = {
    input: {
      insertStocktakeLines: input.insert,
      updateStocktakeLines: input.update,
      deleteStocktakeLines: input.deleteIds?.map((id) => ({ id })),
    },
    storeId,
  };
  const data = await gql<{
    batchStocktake: {
      insertStocktakeLines?: BatchRow[];
      updateStocktakeLines?: BatchRow[];
      deleteStocktakeLines?: BatchRow[];
    };
  }>(query, variables);

  const lineErrors: LineError[] = [];
  const collect = (rows: BatchRow[] | undefined, okTypes: string[]) => {
    for (const row of rows ?? []) {
      if (!okTypes.includes(row.response.__typename)) {
        lineErrors.push({
          lineId: row.id,
          typename: row.response.error?.__typename ?? row.response.__typename,
          message:
            row.response.error?.description ??
            describeError(row.response.error?.__typename ?? row.response.__typename),
        });
      }
    }
  };
  collect(data.batchStocktake.insertStocktakeLines, ['StocktakeLineNode']);
  collect(data.batchStocktake.updateStocktakeLines, ['StocktakeLineNode']);
  collect(data.batchStocktake.deleteStocktakeLines, ['DeleteResponse']);

  return { ok: lineErrors.length === 0, lineErrors };
}

interface BatchRow {
  id: string;
  response: { __typename: string; error?: { __typename: string; description: string } };
}

export type { StocktakeLine };

function describeError(typename: string): string {
  switch (typename) {
    case 'CannotEditStocktake':
    case 'CannotEditFinalised':
      return 'This stocktake is finalised and can no longer be edited.';
    case 'StocktakeIsLocked':
      return 'This stocktake is locked.';
    case 'NoLines':
      return 'There are no counted lines to finalise.';
    case 'StockLinesReducedBelowZero':
    case 'StockLineReducedBelowZero':
      return 'A counted value would reduce stock below zero.';
    case 'SnapshotCountCurrentCountMismatch':
    case 'SnapshotCountCurrentCountMismatchLine':
      return 'Stock has changed since this stocktake was created; the snapshot no longer matches.';
    case 'AdjustmentReasonNotProvided':
      return 'A reason is required for this adjustment.';
    case 'AdjustmentReasonNotValid':
      return 'The selected reason is not valid for this adjustment direction.';
    default:
      return `Operation failed (${typename}).`;
  }
}
