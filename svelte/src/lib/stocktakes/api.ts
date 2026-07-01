/**
 * Stocktakes API adapter — speaks the operations in spec/stocktakes/02-api-contract.md
 * to the live open-mSupply GraphQL API via the {@link gql} client. All operations are
 * store-scoped. This is the only place GraphQL query strings live.
 */
import { gql } from '$lib/api/graphql';
import type {
	CreateStocktakeInput,
	Paginated,
	Stocktake,
	StocktakeLine,
	StocktakeListParams,
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

const SORT_KEY_MAP: Record<NonNullable<StocktakeListParams['sortKey']>, string> = {
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
			sort: [{ key: SORT_KEY_MAP[sortKey], desc: sortDir === 'desc' }],
			filter: status ? { status: { equalTo: status } } : undefined
		},
		signal
	);
	return data.stocktakes;
}

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
	const data = await gql<{ stocktake: (Stocktake & { lines: Paginated<StocktakeLine> }) | null }>(
		query,
		{ storeId, id },
		signal
	);
	if (!data.stocktake) return null;
	return { ...data.stocktake, lines: data.stocktake.lines.nodes, lineCount: data.stocktake.lines.totalCount };
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
	const data = await gql<{ stocktakeByNumber: (Stocktake & { lines: Paginated<StocktakeLine> }) | null }>(
		query,
		{ storeId, n: stocktakeNumber },
		signal
	);
	if (!data.stocktakeByNumber) return null;
	const s = data.stocktakeByNumber;
	return { ...s, lines: s.lines.nodes, lineCount: s.lines.totalCount };
}

// ── Mutations ──────────────────────────────────────────────────────────────────

function uuid(): string {
	return crypto.randomUUID();
}

/** Create a stocktake (mode implied by which fields are set — 02/03). Returns id + number. */
export async function insertStocktake(
	storeId: string,
	input: CreateStocktakeInput
): Promise<{ id: string; stocktakeNumber: number }> {
	const query = `
		mutation insertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
			insertStocktake(storeId: $storeId, input: $input) {
				... on StocktakeNode { id stocktakeNumber }
			}
		}`;
	const id = uuid();
	const data = await gql<{ insertStocktake: { id: string; stocktakeNumber: number } }>(query, {
		storeId,
		input: { id, ...input }
	});
	return data.insertStocktake;
}

/** Result of a header update: the node, or a typed error to surface (02 › Error model). */
export type UpdateResult =
	| { ok: true; stocktake: Stocktake }
	| { ok: false; errorType: string };

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

export async function updateStocktake(
	storeId: string,
	input: UpdateStocktakeFields
): Promise<UpdateResult> {
	const query = `
		mutation updateStocktake($storeId: String!, $input: UpdateStocktakeInput!) {
			updateStocktake(storeId: $storeId, input: $input) {
				__typename
				... on StocktakeNode { ${HEADER_FIELDS} }
				... on UpdateStocktakeError { error { __typename description } }
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
 * Fields for a line insert or update. Note the API's asymmetry: on **insert**
 * `expiryDate` is a plain NaiveDate; on **update** it's a nullable wrapper — so we
 * only send `expiryDate` on inserts (new batches). `location` is a nullable wrapper
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

/**
 * One transactional batch call for line edits (02 › batchStocktake). Splits the
 * working set into inserts (no id) and updates (id) and returns per-row responses
 * so partial per-line errors can be surfaced.
 */
export async function batchStocktakeLines(
	storeId: string,
	edits: { upserts?: UpsertLineInput[]; deleteIds?: string[] }
): Promise<unknown> {
	const inserts = (edits.upserts ?? []).filter((l) => !l.id).map((l) => ({ id: uuid(), ...l }));
	const updates = (edits.upserts ?? []).filter((l) => l.id);
	const query = `
		mutation batchStocktake($storeId: String!, $input: BatchStocktakeInput!) {
			batchStocktake(storeId: $storeId, input: $input) {
				insertStocktakeLines { id response { __typename ... on InsertStocktakeLineError { error { __typename } } } }
				updateStocktakeLines { id response { __typename ... on UpdateStocktakeLineError { error { __typename } } } }
				deleteStocktakeLines { id response { __typename } }
			}
		}`;
	const data = await gql<{ batchStocktake: unknown }>(query, {
		storeId,
		input: {
			insertStocktakeLines: inserts.length ? inserts : undefined,
			updateStocktakeLines: updates.length ? updates : undefined,
			deleteStocktakeLines: edits.deleteIds?.length
				? edits.deleteIds.map((id) => ({ id }))
				: undefined
		}
	});
	return data.batchStocktake;
}

/** Bulk delete stocktakes from the list (AC-L2), via the same batch endpoint. */
export async function deleteStocktakes(storeId: string, ids: string[]): Promise<unknown> {
	const query = `
		mutation batchStocktake($storeId: String!, $input: BatchStocktakeInput!) {
			batchStocktake(storeId: $storeId, input: $input) {
				deleteStocktakes { id response { __typename } }
			}
		}`;
	const data = await gql<{ batchStocktake: unknown }>(query, {
		storeId,
		input: { deleteStocktakes: ids.map((id) => ({ id })) }
	});
	return data.batchStocktake;
}
