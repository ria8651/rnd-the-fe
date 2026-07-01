/**
 * Stocktakes API adapter — speaks the operations in spec/stocktakes/02-api-contract.md to
 * the live open-mSupply GraphQL API via the {@link gql} client. All operations are
 * store-scoped. This is the only place GraphQL query strings for stocktakes live; field
 * names/inputs were confirmed by introspecting localhost:8000.
 */
import { gql } from '../../api/graphql';
import type {
  CreateStocktakeInput,
  Paginated,
  Stocktake,
  StocktakeLine,
  StocktakeListParams,
  StocktakeSortKey,
  StocktakeWithLines
} from './types';

// ── Field selections ─────────────────────────────────────────────────────────

const HEADER_FIELDS = `
  id stocktakeNumber status description comment createdDatetime finalisedDatetime
  isLocked isInitialStocktake countedBy verifiedBy stocktakeDate
`;

const LINE_FIELDS = `
  id stocktakeId itemId itemName snapshotNumberOfPacks countedNumberOfPacks packSize
  batch expiryDate manufactureDate sellPricePerPack costPricePerPack volumePerPack
  comment note donorId donorName itemVariantId
  item { id code name unitName isVaccine doses defaultPackSize }
  stockLine { id totalNumberOfPacks availableNumberOfPacks packSize }
  location { id name code onHold }
  reasonOption { id reason type isActive }
  manufacturer(storeId: $storeId) { id name }
`;

// ── Queries ───────────────────────────────────────────────────────────────────

/** Client sort keys → StocktakeSortFieldInput enum values (identical here). */
const SORT_KEY: Record<StocktakeSortKey, string> = {
  stocktakeNumber: 'stocktakeNumber',
  status: 'status',
  createdDatetime: 'createdDatetime',
  finalisedDatetime: 'finalisedDatetime',
  description: 'description',
  comment: 'comment',
  stocktakeDate: 'stocktakeDate'
};

/** List view (S1): paginated, sortable, filterable by status (AC-L1). */
export async function listStocktakes(
  storeId: string,
  params: StocktakeListParams = {},
  signal?: AbortSignal
): Promise<Paginated<Stocktake>> {
  const { page = 0, perPage = 25, sortKey = 'createdDatetime', sortDir = 'desc', status } = params;
  const query = `
    query stocktakes($storeId: String!, $page: PaginationInput, $sort: [StocktakeSortInput!], $filter: StocktakeFilterInput) {
      stocktakes(storeId: $storeId, page: $page, sort: $sort, filter: $filter) {
        ... on StocktakeConnector { totalCount nodes { ${HEADER_FIELDS} } }
      }
    }`;
  const data = await gql<{ stocktakes: Paginated<Stocktake> }>(
    query,
    {
      storeId,
      page: { first: perPage, offset: page * perPage },
      sort: [{ key: SORT_KEY[sortKey], desc: sortDir === 'desc' }],
      filter: status ? { status: { equalTo: status } } : undefined
    },
    signal
  );
  return data.stocktakes;
}

type NodeWithLines = Stocktake & { lines: Paginated<StocktakeLine> };
const flatten = (s: NodeWithLines): StocktakeWithLines => ({
  ...s,
  lines: s.lines.nodes,
  lineCount: s.lines.totalCount
});

/** Detail header + lines by id (S3). */
export async function getStocktake(
  storeId: string,
  id: string,
  signal?: AbortSignal
): Promise<StocktakeWithLines | null> {
  const query = `
    query stocktake($storeId: String!, $id: String!) {
      stocktake(storeId: $storeId, id: $id) {
        ... on StocktakeNode {
          ${HEADER_FIELDS}
          lines { totalCount nodes { ${LINE_FIELDS} } }
        }
      }
    }`;
  const data = await gql<{ stocktake: NodeWithLines | null }>(query, { storeId, id }, signal);
  return data.stocktake ? flatten(data.stocktake) : null;
}

/** Deep-link by human number (AC-L4). */
export async function getStocktakeByNumber(
  storeId: string,
  stocktakeNumber: number,
  signal?: AbortSignal
): Promise<StocktakeWithLines | null> {
  const query = `
    query stocktakeByNumber($storeId: String!, $n: Int!) {
      stocktakeByNumber(storeId: $storeId, stocktakeNumber: $n) {
        ... on StocktakeNode {
          ${HEADER_FIELDS}
          lines { totalCount nodes { ${LINE_FIELDS} } }
        }
      }
    }`;
  const data = await gql<{ stocktakeByNumber: NodeWithLines | null }>(query, { storeId, n: stocktakeNumber }, signal);
  return data.stocktakeByNumber ? flatten(data.stocktakeByNumber) : null;
}

// ── Mutations ──────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();

/** Create a stocktake (mode implied by which fields are set — 02/03). Returns id + number,
 *  or a typed insert error to surface. */
export type InsertResult =
  | { ok: true; id: string; stocktakeNumber: number }
  | { ok: false; errorType: string };

export async function insertStocktake(storeId: string, input: CreateStocktakeInput): Promise<InsertResult> {
  const query = `
    mutation insertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
      insertStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { id stocktakeNumber }
        ... on InsertStocktakeError { error { __typename } }
      }
    }`;
  const data = await gql<{
    insertStocktake:
      | { __typename: 'StocktakeNode'; id: string; stocktakeNumber: number }
      | { __typename: 'InsertStocktakeError'; error: { __typename: string } };
  }>(query, { storeId, input: { id: uuid(), ...input } });
  const res = data.insertStocktake;
  if (res.__typename === 'InsertStocktakeError') return { ok: false, errorType: res.error.__typename };
  return { ok: true, id: res.id, stocktakeNumber: res.stocktakeNumber };
}

/** Result of a header update: the node, or a typed error to surface (02 › Error model). */
export type UpdateResult = { ok: true; stocktake: Stocktake } | { ok: false; errorType: string };

export interface UpdateStocktakeFields {
  id: string;
  description?: string;
  comment?: string;
  isLocked?: boolean;
  stocktakeDate?: string;
  countedBy?: string;
  verifiedBy?: string;
  /** Only forward transition allowed: FINALISED. */
  status?: 'FINALISED';
}

export async function updateStocktake(storeId: string, input: UpdateStocktakeFields): Promise<UpdateResult> {
  const query = `
    mutation updateStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
      updateStocktake(storeId: $storeId, input: $input) {
        __typename
        ... on StocktakeNode { ${HEADER_FIELDS} }
        ... on UpdateStocktakeError { error { __typename } }
      }
    }`;
  const data = await gql<{
    updateStocktake:
      | ({ __typename: 'StocktakeNode' } & Stocktake)
      | { __typename: 'UpdateStocktakeError'; error: { __typename: string } };
  }>(query, { storeId, input });
  const res = data.updateStocktake;
  if (res.__typename === 'UpdateStocktakeError') return { ok: false, errorType: res.error.__typename };
  return { ok: true, stocktake: res };
}

/** Nullable-field wrapper: `{ value }` sets, `{ value: null }` clears, omit = leave. */
export type NullableUpdate<T> = { value: T | null } | undefined;

/**
 * Fields for a line insert or update. The API is asymmetric: on **insert** `expiryDate`
 * is a plain NaiveDate; on **update** it's a NullableDateUpdate wrapper — so plain
 * `expiryDate` is sent only on inserts (new batches). `location` is a NullableStringUpdate
 * in both. `id` present ⇒ update, absent ⇒ insert.
 */
export interface UpsertLineInput {
  id?: string;
  stocktakeId: string;
  itemId?: string;
  stockLineId?: string;
  countedNumberOfPacks?: number | null;
  batch?: string;
  /** Plain NaiveDate — inserts only. */
  expiryDate?: string;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  location?: NullableUpdate<string>;
  reasonOptionId?: string;
  comment?: string;
  note?: string;
}

/** Per-row result from a batch line edit (02 › batchStocktake returns per-row responses). */
export interface BatchLineResults {
  inserts: { id: string; errorType?: string }[];
  updates: { id: string; errorType?: string }[];
  deletes: { id: string; errorType?: string }[];
}

interface RawRow {
  id: string;
  response: { __typename: string; error?: { __typename: string } };
}
const rowResult = (r: RawRow) => ({ id: r.id, errorType: r.response.error?.__typename });

/**
 * One transactional batch call for line edits (02 › batchStocktake). Splits the working
 * set into inserts (no id) and updates (id) and returns per-row responses so partial
 * per-line errors can be surfaced. `continueOnError: false` keeps the batch atomic.
 */
export async function batchStocktakeLines(
  storeId: string,
  edits: { upserts?: UpsertLineInput[]; deleteIds?: string[] }
): Promise<BatchLineResults> {
  // Inserts and updates take different input shapes. Insert keeps `stocktakeId`/`itemId`/
  // `stockLineId` and a plain NaiveDate `expiryDate`; UpdateStocktakeLineInput has none of
  // those keys (keyed by line `id`) and takes `expiryDate` as a NullableDateUpdate wrapper.
  // The adapter maps a single client `UpsertLineInput` to the right shape for each.
  const inserts = (edits.upserts ?? []).filter((l) => !l.id).map((l) => ({ id: uuid(), ...l }));
  const updates = (edits.upserts ?? [])
    .filter((l) => l.id)
    .map(({ stocktakeId: _s, itemId: _i, stockLineId: _sl, expiryDate, ...rest }) =>
      expiryDate !== undefined ? { ...rest, expiryDate: { value: expiryDate || null } } : rest
    );
  const query = `
    mutation batchStocktake($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename } } } }
        updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename } } } }
        deleteStocktakeLines { id response { __typename ... on DeleteStocktakeLineError { error { __typename } } } }
      }
    }`;
  const data = await gql<{
    batchStocktake: {
      insertStocktakeLines?: RawRow[];
      updateStocktakeLines?: RawRow[];
      deleteStocktakeLines?: RawRow[];
    };
  }>(query, {
    storeId,
    input: {
      insertStocktakeLines: inserts.length ? inserts : undefined,
      updateStocktakeLines: updates.length ? updates : undefined,
      deleteStocktakeLines: edits.deleteIds?.length ? edits.deleteIds.map((id) => ({ id })) : undefined
    }
  });
  const b = data.batchStocktake;
  return {
    inserts: (b.insertStocktakeLines ?? []).map(rowResult),
    updates: (b.updateStocktakeLines ?? []).map(rowResult),
    deletes: (b.deleteStocktakeLines ?? []).map(rowResult)
  };
}

/** Bulk delete stocktakes from the list (AC-L2), via the same batch endpoint. */
export async function deleteStocktakes(storeId: string, ids: string[]): Promise<void> {
  const query = `
    mutation batchStocktake($storeId: String!, $input: BatchStocktakeInput!) {
      batchStocktake(storeId: $storeId, input: $input) {
        deleteStocktakes { id response { __typename ... on DeleteStocktakeError { error { __typename } } } }
      }
    }`;
  await gql(query, { storeId, input: { deleteStocktakes: ids.map((id) => ({ id })) } });
}
