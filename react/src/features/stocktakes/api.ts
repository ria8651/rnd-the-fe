import { gqlRequest } from '@/lib/graphql';
import { uuid } from '@/lib/id';
import type {
  CreateStocktakeInput,
  Stocktake,
  StocktakeConnector,
  StocktakeListParams,
} from './types';

/** Stocktake GraphQL operations (spec/stocktakes/02-api-contract.md). */

const STOCKTAKE_FIELDS = /* GraphQL */ `
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
  user { username email }
`;

const STOCKTAKES_QUERY = /* GraphQL */ `
  query Stocktakes(
    $storeId: String!
    $filter: StocktakeFilterInput
    $page: PaginationInput
    $sort: [StocktakeSortInput!]
  ) {
    stocktakes(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
      ... on StocktakeConnector {
        totalCount
        nodes { ${STOCKTAKE_FIELDS} }
      }
    }
  }
`;

interface StocktakesData {
  stocktakes: StocktakeConnector;
}

export async function fetchStocktakes(
  storeId: string,
  params: StocktakeListParams,
  signal?: AbortSignal,
): Promise<StocktakeConnector> {
  const filter = params.status ? { status: { equalTo: params.status } } : undefined;
  const data = await gqlRequest<StocktakesData>(
    STOCKTAKES_QUERY,
    {
      storeId,
      filter,
      page: { first: params.pageSize, offset: params.page * params.pageSize },
      sort: [{ key: params.sortField, desc: params.sortDesc }],
    },
    signal,
  );
  return data.stocktakes;
}

const STOCKTAKE_BY_NUMBER_QUERY = /* GraphQL */ `
  query StocktakeByNumber($storeId: String!, $stocktakeNumber: Int!) {
    stocktakeByNumber(storeId: $storeId, stocktakeNumber: $stocktakeNumber) {
      ... on StocktakeNode { ${STOCKTAKE_FIELDS} }
    }
  }
`;

export async function fetchStocktakeByNumber(
  storeId: string,
  stocktakeNumber: number,
): Promise<Stocktake | null> {
  const data = await gqlRequest<{ stocktakeByNumber: Stocktake | null }>(
    STOCKTAKE_BY_NUMBER_QUERY,
    { storeId, stocktakeNumber },
  );
  return data.stocktakeByNumber ?? null;
}

const INSERT_STOCKTAKE = /* GraphQL */ `
  mutation InsertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
    insertStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode { id stocktakeNumber }
    }
  }
`;

/** Build the flat InsertStocktakeInput from the create form; mode is implied by fields. */
function toInsertInput(input: CreateStocktakeInput): Record<string, unknown> {
  const base: Record<string, unknown> = { id: uuid() };
  if (input.description) base.description = input.description;
  if (input.comment) base.comment = input.comment;
  if (input.isInitialStocktake) base.isInitialStocktake = true;

  switch (input.mode) {
    case 'blank':
      base.createBlankStocktake = true;
      break;
    case 'full':
      if (input.isAllItemsStocktake) base.isAllItemsStocktake = true;
      break;
    case 'filtered':
      if (input.masterListId) base.masterListId = input.masterListId;
      if (input.locationId) base.locationId = input.locationId;
      if (input.vvmStatusId) base.vvmStatusId = input.vvmStatusId;
      if (input.expiresBefore) base.expiresBefore = input.expiresBefore;
      if (input.includeAllMasterListItems && input.masterListId) {
        base.includeAllMasterListItems = true;
      }
      break;
  }
  return base;
}

export async function insertStocktake(
  storeId: string,
  input: CreateStocktakeInput,
): Promise<{ id: string; stocktakeNumber: number }> {
  const data = await gqlRequest<{
    insertStocktake: { id: string; stocktakeNumber: number };
  }>(INSERT_STOCKTAKE, { storeId, input: toInsertInput(input) });
  return data.insertStocktake;
}

const BATCH_DELETE = /* GraphQL */ `
  mutation DeleteStocktakes($storeId: String!, $ids: [DeleteStocktakeInput!]) {
    batchStocktake(storeId: $storeId, input: { deleteStocktakes: $ids, continueOnError: true }) {
      deleteStocktakes {
        id
        response {
          __typename
          ... on DeleteResponse { id }
          ... on DeleteStocktakeError {
            error { __typename description }
          }
        }
      }
    }
  }
`;

export interface DeleteResult {
  id: string;
  ok: boolean;
  error?: string;
}

export async function deleteStocktakes(
  storeId: string,
  ids: string[],
): Promise<DeleteResult[]> {
  const data = await gqlRequest<{
    batchStocktake: {
      deleteStocktakes: {
        id: string;
        response: { __typename: string; error?: { description?: string } };
      }[];
    };
  }>(BATCH_DELETE, { storeId, ids: ids.map((id) => ({ id })) });

  return (data.batchStocktake.deleteStocktakes ?? []).map((row) => ({
    id: row.id,
    ok: row.response.__typename === 'DeleteResponse',
    error: row.response.error?.description,
  }));
}
