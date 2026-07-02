/*
 * Stocktakes API adapter (spec/stocktakes/02-api-contract.md). Speaks the live
 * GraphQL contract; all operations are store-scoped via storeId. Typed errors are
 * members of response unions — we match on __typename and surface them per the spec
 * (whole-stocktake banner vs. per-line), never as generic strings.
 */

import { request } from '../../lib/graphql';
import type {
  CreateStocktakeParams,
  Stocktake,
  StocktakeLine,
  StocktakeListItem,
  StocktakeStatus,
} from './types';

/* ---------- Field selections ---------- */

const HEADER_FIELDS = `
  id stocktakeNumber status description comment createdDatetime finalisedDatetime
  stocktakeDate isLocked isInitialStocktake countedBy verifiedBy
  inventoryAdditionId inventoryReductionId
  user { username email }
  lines { totalCount }
`;

const LINE_FIELDS = `
  id stocktakeId itemId itemName
  item { id code name unitName isVaccine doses defaultPackSize restrictedLocationTypeId }
  stockLine { id totalNumberOfPacks availableNumberOfPacks }
  snapshotNumberOfPacks countedNumberOfPacks packSize batch expiryDate manufactureDate
  sellPricePerPack costPricePerPack comment note
  location { id name code onHold }
  reasonOption { id type isActive reason }
  donorId donorName
  vvmStatus { id description }
`;

/* ---------- List (S1) ---------- */

export interface StocktakeListArgs {
  storeId: string;
  status?: StocktakeStatus;
  sortKey?: string;
  sortDesc?: boolean;
  page: number; // 1-based
  pageSize: number;
}

export async function fetchStocktakes(
  args: StocktakeListArgs,
): Promise<{ totalCount: number; nodes: StocktakeListItem[] }> {
  const query = `
    query Stocktakes($storeId: String!, $page: PaginationInput, $filter: StocktakeFilterInput, $sort: [StocktakeSortInput!]) {
      stocktakes(storeId: $storeId, page: $page, filter: $filter, sort: $sort) {
        ... on StocktakeConnector {
          totalCount
          nodes { id stocktakeNumber status description comment createdDatetime finalisedDatetime stocktakeDate isLocked }
        }
      }
    }
  `;
  const filter = args.status ? { status: { equalTo: args.status } } : undefined;
  const sort = args.sortKey ? [{ key: args.sortKey, desc: !!args.sortDesc }] : undefined;
  const data = await request<{ stocktakes: { totalCount: number; nodes: StocktakeListItem[] } }>(query, {
    storeId: args.storeId,
    page: { first: args.pageSize, offset: (args.page - 1) * args.pageSize },
    filter,
    sort,
  });
  return data.stocktakes;
}

/* ---------- Detail header (S3) ---------- */

interface RawHeader extends Omit<Stocktake, 'lineCount'> {
  lines: { totalCount: number };
}

function toStocktake(raw: RawHeader): Stocktake {
  const { lines, ...rest } = raw;
  return { ...rest, lineCount: lines.totalCount };
}

export async function fetchStocktakeByNumber(storeId: string, stocktakeNumber: number): Promise<Stocktake | null> {
  const query = `
    query StocktakeByNumber($storeId: String!, $n: Int!) {
      stocktakeByNumber(storeId: $storeId, stocktakeNumber: $n) {
        __typename
        ... on StocktakeNode { ${HEADER_FIELDS} }
      }
    }
  `;
  const data = await request<{ stocktakeByNumber: RawHeader & { __typename: string } }>(query, {
    storeId,
    n: stocktakeNumber,
  });
  const node = data.stocktakeByNumber;
  if (!node || node.__typename !== 'StocktakeNode') return null;
  return toStocktake(node);
}

export async function fetchStocktake(storeId: string, id: string): Promise<Stocktake | null> {
  const query = `
    query Stocktake($storeId: String!, $id: String!) {
      stocktake(storeId: $storeId, id: $id) {
        __typename
        ... on StocktakeNode { ${HEADER_FIELDS} }
      }
    }
  `;
  const data = await request<{ stocktake: (RawHeader & { __typename: string }) | null }>(query, { storeId, id });
  const node = data.stocktake;
  if (!node || node.__typename !== 'StocktakeNode') return null;
  return toStocktake(node);
}

/* ---------- Lines (S3 table, S4 editor) ---------- */

export interface LinesArgs {
  storeId: string;
  stocktakeId: string;
  page: number;
  pageSize: number;
}

export async function fetchStocktakeLines(
  args: LinesArgs,
): Promise<{ totalCount: number; nodes: StocktakeLine[] }> {
  const query = `
    query StocktakeLines($storeId: String!, $stocktakeId: String!, $page: PaginationInput) {
      stocktakeLines(storeId: $storeId, stocktakeId: $stocktakeId, page: $page) {
        ... on StocktakeLineConnector {
          totalCount
          nodes { ${LINE_FIELDS} }
        }
      }
    }
  `;
  const data = await request<{ stocktakeLines: { totalCount: number; nodes: StocktakeLine[] } }>(query, {
    storeId: args.storeId,
    stocktakeId: args.stocktakeId,
    page: { first: args.pageSize, offset: (args.page - 1) * args.pageSize },
  });
  return data.stocktakeLines;
}

/* ---------- Create (S2) ---------- */

export async function insertStocktake(
  storeId: string,
  id: string,
  params: CreateStocktakeParams,
): Promise<{ id: string; stocktakeNumber: number }> {
  const input: Record<string, unknown> = { id };
  if (params.description) input.description = params.description;
  if (params.comment) input.comment = params.comment;
  if (params.isInitialStocktake) input.isInitialStocktake = true;
  if (params.mode === 'blank') input.createBlankStocktake = true;
  if (params.mode === 'full' && params.isAllItemsStocktake) input.isAllItemsStocktake = true;
  if (params.mode === 'filtered') {
    if (params.masterListId) input.masterListId = params.masterListId;
    if (params.locationId) input.locationId = params.locationId;
    if (params.vvmStatusId) input.vvmStatusId = params.vvmStatusId;
    if (params.expiresBefore) input.expiresBefore = params.expiresBefore;
    if (params.includeAllMasterListItems) input.includeAllMasterListItems = true;
  }
  const query = `
    mutation Insert($storeId: String!, $input: InsertStocktakeInput!) {
      insertStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id stocktakeNumber }
      }
    }
  `;
  const data = await request<{ insertStocktake: { id: string; stocktakeNumber: number } }>(query, {
    storeId,
    input,
  });
  return data.insertStocktake;
}

/* ---------- Header update (in-place autosave, lock, finalise) ---------- */

export interface HeaderPatch {
  description?: string | null;
  comment?: string | null;
  countedBy?: string | null;
  verifiedBy?: string | null;
  isLocked?: boolean;
  stocktakeDate?: string | null;
}

export async function updateStocktakeHeader(storeId: string, id: string, patch: HeaderPatch): Promise<void> {
  const query = `
    mutation UpdateHeader($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on UpdateStocktakeError { error { __typename description } }
      }
    }
  `;
  const data = await request<{ updateStocktake: { __typename: string; error?: { description: string } } }>(query, {
    storeId,
    input: { id, ...patch },
  });
  if (data.updateStocktake.__typename === 'UpdateStocktakeError') {
    throw new Error(data.updateStocktake.error?.description ?? 'Update rejected');
  }
}

/* ---------- Finalise (J7) with typed errors ---------- */

export interface FinaliseError {
  typename: string;
  message: string;
  reducedStockLineIds: string[];
  mismatchLineIds: string[];
}
export type FinaliseResult = { ok: true } | { ok: false; error: FinaliseError };

export async function finaliseStocktake(storeId: string, id: string): Promise<FinaliseResult> {
  const query = `
    mutation Finalise($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on UpdateStocktakeError {
          error {
            __typename
            description
            ... on StockLinesReducedBelowZero { errors { stockLine { id } } }
            ... on SnapshotCountCurrentCountMismatch { lines { stocktakeLine { id } } }
          }
        }
      }
    }
  `;
  const data = await request<{
    updateStocktake: {
      __typename: string;
      error?: {
        __typename: string;
        description: string;
        errors?: { stockLine: { id: string } }[];
        lines?: { stocktakeLine: { id: string } }[];
      };
    };
  }>(query, { storeId, input: { id, status: 'FINALISED' } });

  const res = data.updateStocktake;
  if (res.__typename === 'StocktakeNode') return { ok: true };
  const e = res.error!;
  return {
    ok: false,
    error: {
      typename: e.__typename,
      message: e.description,
      reducedStockLineIds: (e.errors ?? []).map((x) => x.stockLine.id),
      mismatchLineIds: (e.lines ?? []).map((x) => x.stocktakeLine.id),
    },
  };
}

/* ---------- Bulk delete stocktakes (J8) ---------- */

export async function deleteStocktakes(storeId: string, ids: string[]): Promise<void> {
  const query = `
    mutation DeleteStocktakes($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        deleteStocktakes { id response { __typename ... on DeleteStocktakeError { error { description } } } }
      }
    }
  `;
  const data = await request<{
    batchStocktake: { deleteStocktakes: { response: { __typename: string; error?: { description: string } } }[] };
  }>(query, { storeId, input: { deleteStocktakes: ids.map((id) => ({ id })) } });
  const failed = (data.batchStocktake.deleteStocktakes ?? []).find((r) => r.response.error);
  if (failed) throw new Error(failed.response.error!.description);
}

/* ---------- Batch line edits (J3/J4/J5) ---------- */

export interface LineUpsert {
  id: string;
  /** Present for a brand-new line (insert); absent for an update. */
  itemId?: string;
  stockLineId?: string;
  countedNumberOfPacks?: number | null;
  batch?: string | null;
  expiryDate?: string | null;
  locationId?: string | null;
  packSize?: number | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  reasonOptionId?: string | null;
  comment?: string | null;
  note?: string | null;
}

export interface LineErrorResult {
  lineId: string;
  typename: string;
  message: string;
}

/**
 * Upsert a working set of lines in one transactional batch. Returns per-line errors
 * (the batch endpoint reports per row) so the editor can key them to the offending
 * line (mismatch / reduced-below-zero / reason required/invalid).
 */
export async function batchLines(
  storeId: string,
  stocktakeId: string,
  inserts: LineUpsert[],
  updates: LineUpsert[],
  deletes: string[],
): Promise<LineErrorResult[]> {
  const query = `
    mutation BatchLines($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename description } } } }
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename description } } } }
        deleteStocktakeLines { id response { __typename ... on DeleteStocktakeLineError { error { __typename description } } } }
      }
    }
  `;
  const input = {
    insertStocktakeLines: inserts.map((l) => ({
      id: l.id,
      stocktakeId,
      itemId: l.itemId,
      stockLineId: l.stockLineId,
      countedNumberOfPacks: l.countedNumberOfPacks ?? undefined,
      batch: l.batch ?? undefined,
      expiryDate: l.expiryDate ?? undefined,
      location: l.locationId !== undefined ? { value: l.locationId } : undefined,
      packSize: l.packSize ?? undefined,
      costPricePerPack: l.costPricePerPack ?? undefined,
      sellPricePerPack: l.sellPricePerPack ?? undefined,
      reasonOptionId: l.reasonOptionId ?? undefined,
      comment: l.comment ?? undefined,
      note: l.note ?? undefined,
    })),
    updateStocktakeLines: updates.map((l) => ({
      id: l.id,
      countedNumberOfPacks: l.countedNumberOfPacks ?? undefined,
      batch: l.batch ?? undefined,
      expiryDate: l.expiryDate !== undefined ? { value: l.expiryDate } : undefined,
      location: l.locationId !== undefined ? { value: l.locationId } : undefined,
      packSize: l.packSize ?? undefined,
      costPricePerPack: l.costPricePerPack ?? undefined,
      sellPricePerPack: l.sellPricePerPack ?? undefined,
      reasonOptionId: l.reasonOptionId ?? undefined,
      comment: l.comment ?? undefined,
      note: l.note ?? undefined,
    })),
    deleteStocktakeLines: deletes.map((id) => ({ id })),
  };

  const data = await request<{
    batchStocktake: {
      insertStocktakeLines?: LineRow[];
      updateStocktakeLines?: LineRow[];
      deleteStocktakeLines?: LineRow[];
    };
  }>(query, { storeId, input });

  const b = data.batchStocktake;
  const out: LineErrorResult[] = [];
  for (const row of [...(b.insertStocktakeLines ?? []), ...(b.updateStocktakeLines ?? []), ...(b.deleteStocktakeLines ?? [])]) {
    if (row.response.error) {
      out.push({ lineId: row.id, typename: row.response.error.__typename, message: row.response.error.description });
    }
  }
  return out;
}

interface LineRow {
  id: string;
  response: { __typename: string; error?: { __typename: string; description: string } };
}
