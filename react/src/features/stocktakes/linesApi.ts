import { gqlRequest } from '@/lib/graphql';
import { uuid } from '@/lib/id';
import type { LineReason, Stocktake, StocktakeLineConnector } from './types';

/**
 * Stocktake line + header + finalise operations (spec 02-api-contract.md).
 * Typed errors are members of a response union — matched on __typename and
 * surfaced per-line or whole-stocktake per spec S5.
 */

const LINE_FIELDS = /* GraphQL */ `
  id
  itemId
  itemName
  stockLine { id }
  batch
  expiryDate
  manufactureDate
  packSize
  snapshotNumberOfPacks
  countedNumberOfPacks
  costPricePerPack
  sellPricePerPack
  comment
  note
  donorName
  location { id name code }
  reasonOption { id type reason }
  manufacturer(storeId: $storeId) { name }
  item { id code name unitName isVaccine doses defaultPackSize }
`;

const LINES_QUERY = /* GraphQL */ `
  query StocktakeLines($storeId: String!, $stocktakeId: String!, $page: PaginationInput) {
    stocktakeLines(storeId: $storeId, stocktakeId: $stocktakeId, page: $page) {
      ... on StocktakeLineConnector {
        totalCount
        nodes { ${LINE_FIELDS} }
      }
    }
  }
`;

export async function fetchStocktakeLines(
  storeId: string,
  stocktakeId: string,
): Promise<StocktakeLineConnector> {
  const d = await gqlRequest<{ stocktakeLines: StocktakeLineConnector }>(LINES_QUERY, {
    storeId,
    stocktakeId,
    page: { first: 1000 },
  });
  return d.stocktakeLines;
}

const REASONS_QUERY = /* GraphQL */ `
  query Reasons {
    reasonOptions(page: { first: 100 }, filter: { isActive: true }) {
      ... on ReasonOptionConnector { nodes { id type reason isActive } }
    }
  }
`;
export async function fetchReasonOptions(): Promise<LineReason[]> {
  const d = await gqlRequest<{ reasonOptions: { nodes: LineReason[] } }>(REASONS_QUERY);
  return d.reasonOptions.nodes;
}

// ---- Header update (in-place fields + lock) ----

const UPDATE_STOCKTAKE = /* GraphQL */ `
  mutation UpdateStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
    updateStocktake(storeId: $storeId, input: $input) {
      __typename
      ... on StocktakeNode { id isLocked description comment countedBy verifiedBy status }
      ... on UpdateStocktakeError {
        error {
          __typename
          ... on StocktakeIsLocked { description }
          ... on CannotEditStocktake { description }
          ... on SnapshotCountCurrentCountMismatch { description }
          ... on StockLinesReducedBelowZero { description }
        }
      }
    }
  }
`;

export interface HeaderUpdate {
  id: string;
  description?: string;
  comment?: string;
  countedBy?: string;
  verifiedBy?: string;
  isLocked?: boolean;
}

/** Update header fields / lock. Throws with the typed error description on failure. */
export async function updateStocktakeHeader(storeId: string, input: HeaderUpdate): Promise<void> {
  const d = await gqlRequest<{
    updateStocktake: {
      __typename: string;
      error?: { __typename: string; description?: string };
    };
  }>(UPDATE_STOCKTAKE, { storeId, input });
  if (d.updateStocktake.__typename === 'UpdateStocktakeError') {
    throw new Error(d.updateStocktake.error?.description ?? 'Could not update the stocktake');
  }
}

// ---- Finalise ----

export interface FinaliseResult {
  ok: boolean;
  bannerError?: string;
  /** Snapshot-cell errors, keyed by stocktake-line id (SnapshotCountCurrentCountMismatch). */
  mismatchKeys?: string[];
  /** Counted-cell errors, keyed by stock-line id (StockLinesReducedBelowZero). */
  reducedKeys?: string[];
}

const FINALISE = /* GraphQL */ `
  mutation Finalise($storeId: String!, $id: String!) {
    updateStocktake(storeId: $storeId, input: { id: $id, status: FINALISED }) {
      __typename
      ... on StocktakeNode { id status finalisedDatetime }
      ... on UpdateStocktakeError {
        error {
          __typename
          ... on CannotEditStocktake { description }
          ... on StocktakeIsLocked { description }
          ... on StockLinesReducedBelowZero {
            description
            errors { description stockLine { id } }
          }
          ... on SnapshotCountCurrentCountMismatch {
            description
            lines { description stocktakeLine { id } }
          }
        }
      }
    }
  }
`;

export async function finaliseStocktake(storeId: string, id: string): Promise<FinaliseResult> {
  const d = await gqlRequest<{
    updateStocktake: {
      __typename: string;
      error?: {
        __typename: string;
        description?: string;
        errors?: { stockLine: { id: string } }[];
        lines?: { stocktakeLine: { id: string } }[];
      };
    };
  }>(FINALISE, { storeId, id });

  const res = d.updateStocktake;
  if (res.__typename === 'StocktakeNode') return { ok: true };

  const err = res.error;
  if (!err) return { ok: false, bannerError: 'Finalise failed' };

  // Mismatch → snapshot cell (stocktake-line id); reduced-below-zero → counted cell (stock-line id).
  const mismatchKeys = (err.lines ?? []).map((l) => l.stocktakeLine.id);
  const reducedKeys = (err.errors ?? []).map((e) => e.stockLine.id);

  return {
    ok: false,
    bannerError: err.description ?? 'Finalise failed',
    mismatchKeys: mismatchKeys.length ? mismatchKeys : undefined,
    reducedKeys: reducedKeys.length ? reducedKeys : undefined,
  };
}

// ---- Batch line operations (insert/update/delete) ----

export interface LineInsert {
  itemId: string;
  stockLineId?: string;
  countedNumberOfPacks?: number;
  batch?: string;
  expiryDate?: string;
  location?: string | null;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  reasonOptionId?: string;
  comment?: string;
}
export interface LineUpdate {
  id: string;
  countedNumberOfPacks?: number;
  batch?: string;
  expiryDate?: string | null;
  location?: string | null;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  reasonOptionId?: string;
  comment?: string;
}

export interface BatchLineResult {
  ok: boolean;
  lineErrors: { id: string; message: string }[];
}

const BATCH_LINES = /* GraphQL */ `
  mutation BatchLines(
    $storeId: String!
    $insert: [InsertStocktakeLineInput!]
    $update: [UpdateStocktakeLineInput!]
    $delete: [DeleteStocktakeLineInput!]
  ) {
    batchStocktake(
      storeId: $storeId
      input: {
        insertStocktakeLines: $insert
        updateStocktakeLines: $update
        deleteStocktakeLines: $delete
        continueOnError: false
      }
    ) {
      insertStocktakeLines {
        id
        response {
          __typename
          ... on InsertStocktakeLineError { error { __typename description } }
        }
      }
      updateStocktakeLines {
        id
        response {
          __typename
          ... on UpdateStocktakeLineError { error { __typename description } }
        }
      }
      deleteStocktakeLines {
        id
        response { __typename ... on DeleteStocktakeLineError { error { __typename description } } }
      }
    }
  }
`;

interface LineRowResponse {
  id: string;
  response: { __typename: string; error?: { __typename: string; description?: string } };
}

export async function batchLines(
  storeId: string,
  ops: { insert?: LineInsert[]; update?: LineUpdate[]; delete?: string[]; stocktakeId: string },
): Promise<BatchLineResult> {
  const insert = (ops.insert ?? []).map((l) => ({
    id: uuid(),
    stocktakeId: ops.stocktakeId,
    itemId: l.itemId,
    stockLineId: l.stockLineId,
    countedNumberOfPacks: l.countedNumberOfPacks,
    batch: l.batch,
    expiryDate: l.expiryDate,
    location: l.location !== undefined ? { value: l.location } : undefined,
    packSize: l.packSize,
    costPricePerPack: l.costPricePerPack,
    sellPricePerPack: l.sellPricePerPack,
    reasonOptionId: l.reasonOptionId,
    comment: l.comment,
  }));
  const update = (ops.update ?? []).map((l) => ({
    id: l.id,
    countedNumberOfPacks: l.countedNumberOfPacks,
    batch: l.batch,
    expiryDate: l.expiryDate !== undefined ? { value: l.expiryDate } : undefined,
    location: l.location !== undefined ? { value: l.location } : undefined,
    packSize: l.packSize,
    costPricePerPack: l.costPricePerPack,
    sellPricePerPack: l.sellPricePerPack,
    reasonOptionId: l.reasonOptionId,
    comment: l.comment,
  }));
  const del = (ops.delete ?? []).map((id) => ({ id }));

  const d = await gqlRequest<{
    batchStocktake: {
      insertStocktakeLines?: LineRowResponse[];
      updateStocktakeLines?: LineRowResponse[];
      deleteStocktakeLines?: LineRowResponse[];
    };
  }>(BATCH_LINES, { storeId, insert, update, delete: del });

  const b = d.batchStocktake;
  const rows = [
    ...(b.insertStocktakeLines ?? []),
    ...(b.updateStocktakeLines ?? []),
    ...(b.deleteStocktakeLines ?? []),
  ];
  const lineErrors = rows
    .filter((r) => r.response.__typename.endsWith('Error'))
    .map((r) => ({ id: r.id, message: r.response.error?.description ?? 'Line error' }));

  return { ok: lineErrors.length === 0, lineErrors };
}

/** Re-fetch a full header after mutations (fields beyond the list projection). */
const HEADER_QUERY = /* GraphQL */ `
  query StocktakeHeader($storeId: String!, $id: String!) {
    stocktake(storeId: $storeId, id: $id) {
      ... on StocktakeNode {
        id stocktakeNumber status description comment createdDatetime
        finalisedDatetime stocktakeDate isLocked isInitialStocktake countedBy verifiedBy
        user { username email }
      }
    }
  }
`;
export async function fetchStocktakeById(storeId: string, id: string): Promise<Stocktake | null> {
  const d = await gqlRequest<{ stocktake: Stocktake | null }>(HEADER_QUERY, { storeId, id });
  return d.stocktake ?? null;
}
