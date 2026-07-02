// Stocktakes API — the operations from spec stocktakes/02-api-contract.md, spoken
// against the live schema. Connectors are union-wrapped, so queries use inline fragments.

import { gql } from '../graphql';
import { toIsoDate } from '../util/format';
import type { Stocktake, StocktakeHeader, StocktakeLine, StocktakeStatus } from './types';

const LINE_FIELDS = `
  id itemId itemName
  item { code name unitName isVaccine defaultPackSize }
  stockLine { id totalNumberOfPacks availableNumberOfPacks }
  snapshotNumberOfPacks countedNumberOfPacks packSize
  batch expiryDate manufactureDate costPricePerPack sellPricePerPack
  comment note
  location { id code name }
  reasonOption { id reason type }
`;

const HEADER_FIELDS = `
  id stocktakeNumber status description comment
  createdDatetime finalisedDatetime stocktakeDate
  isLocked isInitialStocktake countedBy verifiedBy
  user { username email }
`;

export type SortKey =
  | 'stocktakeNumber'
  | 'status'
  | 'description'
  | 'comment'
  | 'createdDatetime'
  | 'finalisedDatetime';

export type ListArgs = {
  storeId: string;
  status?: StocktakeStatus | null;
  sortKey?: SortKey;
  sortDesc?: boolean;
  page?: number; // 1-based
  pageSize?: number;
};

export async function listStocktakes(
  args: ListArgs,
): Promise<{ totalCount: number; nodes: StocktakeHeader[] }> {
  const { storeId, status, sortKey = 'createdDatetime', sortDesc = true } = args;
  const pageSize = args.pageSize ?? 25;
  const page = args.page ?? 1;
  const filter = status ? { status: { equalTo: status } } : undefined;
  const data = await gql<{ stocktakes: { totalCount: number; nodes: StocktakeHeader[] } }>(
    `query List($storeId: String!, $filter: StocktakeFilterInput, $sort: StocktakeSortInput, $page: PaginationInput) {
      stocktakes(storeId: $storeId, filter: $filter, sort: $sort, page: $page) {
        ... on StocktakeConnector { totalCount nodes { ${HEADER_FIELDS} } }
      }
    }`,
    {
      storeId,
      filter,
      sort: { key: sortKey, desc: sortDesc },
      page: { first: pageSize, offset: (page - 1) * pageSize },
    },
  );
  return data.stocktakes;
}

async function fetchLines(storeId: string, stocktakeId: string): Promise<{ nodes: StocktakeLine[]; totalCount: number }> {
  const data = await gql<{ stocktakeLines: { totalCount: number; nodes: StocktakeLine[] } }>(
    `query Lines($storeId: String!, $id: String!) {
      stocktakeLines(storeId: $storeId, stocktakeId: $id, page: { first: 1000 }) {
        ... on StocktakeLineConnector { totalCount nodes { ${LINE_FIELDS} } }
      }
    }`,
    { storeId, id: stocktakeId },
  );
  return data.stocktakeLines;
}

export async function getStocktakeByNumber(
  storeId: string,
  stocktakeNumber: number,
): Promise<Stocktake | null> {
  const data = await gql<{ stocktakeByNumber: (StocktakeHeader & { lines: { totalCount: number; nodes: StocktakeLine[] } }) | null }>(
    `query ByNumber($storeId: String!, $n: Int!) {
      stocktakeByNumber(storeId: $storeId, stocktakeNumber: $n) {
        ... on StocktakeNode {
          ${HEADER_FIELDS}
          lines { ... on StocktakeLineConnector { totalCount nodes { ${LINE_FIELDS} } } }
        }
      }
    }`,
    { storeId, n: stocktakeNumber },
  );
  const node = data.stocktakeByNumber;
  if (!node) return null;
  return normalise(node, storeId);
}

async function normalise(
  node: StocktakeHeader & { lines: { totalCount: number; nodes: StocktakeLine[] } },
  _storeId: string,
): Promise<Stocktake> {
  const { lines, ...header } = node;
  return { ...header, lines: lines.nodes, linesTotalCount: lines.totalCount };
}

// ---- Mutations ----------------------------------------------------------------

export type CreateMode =
  | { kind: 'blank' }
  | { kind: 'initial' }
  | { kind: 'full'; includeAllItems: boolean }
  | {
      kind: 'filtered';
      masterListId?: string | null;
      locationId?: string | null;
      vvmStatusId?: string | null;
      expiresBefore?: string | null;
      includeAllMasterListItems?: boolean;
    };

export function uuid(): string {
  return crypto.randomUUID();
}

/** Build InsertStocktakeInput from a creation mode. */
export function buildInsertInput(
  mode: CreateMode,
  extras: { description?: string | null; comment?: string | null },
): Record<string, unknown> {
  const input: Record<string, unknown> = { id: uuid() };
  if (extras.description) input.description = extras.description;
  if (extras.comment) input.comment = extras.comment;
  switch (mode.kind) {
    case 'blank':
      input.createBlankStocktake = true;
      break;
    case 'initial':
      input.isInitialStocktake = true;
      break;
    case 'full':
      if (mode.includeAllItems) input.isAllItemsStocktake = true;
      break;
    case 'filtered':
      if (mode.masterListId) input.masterListId = mode.masterListId;
      if (mode.locationId) input.locationId = mode.locationId;
      if (mode.vvmStatusId) input.vvmStatusId = mode.vvmStatusId;
      if (mode.expiresBefore) input.expiresBefore = toIsoDate(mode.expiresBefore);
      if (mode.includeAllMasterListItems) input.includeAllMasterListItems = true;
      break;
  }
  return input;
}

export async function insertStocktake(
  storeId: string,
  input: Record<string, unknown>,
): Promise<{ id: string; stocktakeNumber: number }> {
  const data = await gql<{ insertStocktake: { id: string; stocktakeNumber: number; __typename: string } }>(
    `mutation Insert($storeId: String!, $input: InsertStocktakeInput!) {
      insertStocktake(storeId: $storeId, input: $input) {
        ... on StocktakeNode { __typename id stocktakeNumber }
      }
    }`,
    { storeId, input },
  );
  return data.insertStocktake;
}

export type UpdateHeaderFields = {
  description?: string | null;
  comment?: string | null;
  countedBy?: string | null;
  verifiedBy?: string | null;
  isLocked?: boolean;
};

export type UpdateResult =
  | { ok: true; stocktake: StocktakeHeader }
  | { ok: false; errorType: string; description: string };

export async function updateStocktakeHeader(
  storeId: string,
  id: string,
  fields: UpdateHeaderFields,
): Promise<UpdateResult> {
  return runUpdate(storeId, { id, ...fields });
}

export type FinaliseResult =
  | { ok: true }
  | { ok: false; kind: 'banner'; errorType: string; description: string }
  | {
      ok: false;
      kind: 'per-line';
      errorType: string;
      description: string;
      // keys to mark: stockLine ids (reduced-below-zero) / stocktakeLine ids (mismatch)
      stockLineIds: string[];
      stocktakeLineIds: string[];
    };

export async function finaliseStocktake(storeId: string, id: string): Promise<FinaliseResult> {
  const data = await gql<{ updateStocktake: any }>(
    `mutation Finalise($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id status }
        ... on UpdateStocktakeError {
          error {
            __typename
            description
            ... on StockLinesReducedBelowZero { errors { stockLine { id } } }
            ... on SnapshotCountCurrentCountMismatch { lines { stocktakeLine { id } } }
          }
        }
      }
    }`,
    { storeId, input: { id, status: 'FINALISED' } },
  );
  const res = data.updateStocktake;
  if (res.__typename === 'StocktakeNode') return { ok: true };
  const err = res.error;
  if (err.__typename === 'StockLinesReducedBelowZero') {
    return {
      ok: false,
      kind: 'per-line',
      errorType: err.__typename,
      description: err.description,
      stockLineIds: (err.errors ?? []).map((e: any) => e.stockLine.id),
      stocktakeLineIds: [],
    };
  }
  if (err.__typename === 'SnapshotCountCurrentCountMismatch') {
    return {
      ok: false,
      kind: 'per-line',
      errorType: err.__typename,
      description: err.description,
      stockLineIds: [],
      stocktakeLineIds: (err.lines ?? []).map((l: any) => l.stocktakeLine.id),
    };
  }
  return { ok: false, kind: 'banner', errorType: err.__typename, description: err.description };
}

async function runUpdate(storeId: string, input: Record<string, unknown>): Promise<UpdateResult> {
  const data = await gql<{ updateStocktake: any }>(
    `mutation Update($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { ${HEADER_FIELDS} }
        ... on UpdateStocktakeError { error { __typename description } }
      }
    }`,
    { storeId, input },
  );
  const res = data.updateStocktake;
  if (res.__typename === 'StocktakeNode') return { ok: true, stocktake: res };
  return { ok: false, errorType: res.error.__typename, description: res.error.description };
}

// ---- Batch: line edits + header deletes ---------------------------------------

export type LineInsert = {
  id: string;
  itemId: string;
  stockLineId?: string | null;
  countedNumberOfPacks?: number | null;
  packSize?: number | null;
  batch?: string | null;
  expiryDate?: string | null;
  location?: string | null; // location id
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  reasonOptionId?: string | null;
  comment?: string | null;
  note?: string | null;
};

export type LineUpdate = {
  id: string;
  countedNumberOfPacks?: number | null;
  packSize?: number | null;
  batch?: string | null;
  expiryDate?: string | null | undefined;
  location?: string | null | undefined; // undefined = leave, null/'' = clear
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  reasonOptionId?: string | null;
  comment?: string | null;
  note?: string | null;
};

export type LineError = { id: string; errorType: string; description: string };

function toInsertLineInput(l: LineInsert, stocktakeId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: l.id,
    stocktakeId,
    itemId: l.itemId,
  };
  if (l.stockLineId) out.stockLineId = l.stockLineId;
  if (l.countedNumberOfPacks != null) out.countedNumberOfPacks = l.countedNumberOfPacks;
  if (l.packSize != null) out.packSize = l.packSize;
  if (l.batch != null) out.batch = l.batch;
  if (l.expiryDate) out.expiryDate = toIsoDate(l.expiryDate);
  if (l.location) out.location = { value: l.location };
  if (l.costPricePerPack != null) out.costPricePerPack = l.costPricePerPack;
  if (l.sellPricePerPack != null) out.sellPricePerPack = l.sellPricePerPack;
  if (l.reasonOptionId) out.reasonOptionId = l.reasonOptionId;
  if (l.comment != null) out.comment = l.comment;
  if (l.note != null) out.note = l.note;
  return out;
}

function toUpdateLineInput(l: LineUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = { id: l.id };
  if (l.countedNumberOfPacks !== undefined) out.countedNumberOfPacks = l.countedNumberOfPacks;
  if (l.packSize != null) out.packSize = l.packSize;
  if (l.batch !== undefined) out.batch = l.batch;
  if (l.expiryDate !== undefined) out.expiryDate = { value: l.expiryDate ? toIsoDate(l.expiryDate) : null };
  if (l.location !== undefined) out.location = { value: l.location || null };
  if (l.costPricePerPack != null) out.costPricePerPack = l.costPricePerPack;
  if (l.sellPricePerPack != null) out.sellPricePerPack = l.sellPricePerPack;
  if (l.reasonOptionId !== undefined) out.reasonOptionId = l.reasonOptionId;
  if (l.comment !== undefined) out.comment = l.comment;
  if (l.note !== undefined) out.note = l.note;
  return out;
}

export async function batchLines(
  storeId: string,
  stocktakeId: string,
  ops: { inserts?: LineInsert[]; updates?: LineUpdate[]; deletes?: string[] },
): Promise<{ errors: LineError[] }> {
  const input: Record<string, unknown> = { continueOnError: false };
  if (ops.inserts?.length)
    input.insertStocktakeLines = ops.inserts.map((l) => toInsertLineInput(l, stocktakeId));
  if (ops.updates?.length) input.updateStocktakeLines = ops.updates.map(toUpdateLineInput);
  if (ops.deletes?.length) input.deleteStocktakeLines = ops.deletes.map((id) => ({ id }));

  const data = await gql<{ batchStocktake: any }>(
    `mutation Batch($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename description } } } }
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename description } } } }
        deleteStocktakeLines { id response { __typename ... on DeleteStocktakeLineError { error { __typename description } } } }
      }
    }`,
    { storeId, input },
  );
  const b = data.batchStocktake;
  const errors: LineError[] = [];
  for (const group of ['insertStocktakeLines', 'updateStocktakeLines', 'deleteStocktakeLines'] as const) {
    for (const row of b[group] ?? []) {
      if (row.response?.__typename?.endsWith('Error')) {
        errors.push({
          id: row.id,
          errorType: row.response.error.__typename,
          description: row.response.error.description,
        });
      }
    }
  }
  return { errors };
}

export async function deleteStocktakes(storeId: string, ids: string[]): Promise<{ errors: LineError[] }> {
  const data = await gql<{ batchStocktake: any }>(
    `mutation Del($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        deleteStocktakes { id response { __typename ... on DeleteStocktakeError { error { __typename description } } } }
      }
    }`,
    { storeId, input: { continueOnError: true, deleteStocktakes: ids.map((id) => ({ id })) } },
  );
  const errors: LineError[] = [];
  for (const row of data.batchStocktake.deleteStocktakes ?? []) {
    if (row.response?.__typename?.endsWith('Error')) {
      errors.push({ id: row.id, errorType: row.response.error.__typename, description: row.response.error.description });
    }
  }
  return { errors };
}
