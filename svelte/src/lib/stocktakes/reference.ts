/**
 * Reference-data + estimate queries used by the create flow (S2). Locations and
 * master lists populate the filtered-mode selectors; the estimate mirrors what the
 * server will generate so the user sees an approximate line count before confirming.
 */
import { gql } from '$lib/api/graphql';
import type { ReasonOption } from './types';

export interface Ref {
	id: string;
	name: string;
	code?: string;
}

/**
 * Active inventory-adjustment reasons, used to validate line reasons on save/finalise
 * (03 › Adjustment-reason rules). Filtered to the two inventory-adjustment types the
 * stocktake flow can produce; server is authoritative on which are active.
 */
export async function listReasonOptions(): Promise<ReasonOption[]> {
	const data = await gql<{ reasonOptions: { nodes: ReasonOption[] } }>(
		`query {
			reasonOptions(
				filter: {
					isActive: true
					type: { equalAny: [POSITIVE_INVENTORY_ADJUSTMENT, NEGATIVE_INVENTORY_ADJUSTMENT] }
				}
			) {
				... on ReasonOptionConnector { nodes { id reason type isActive } }
			}
		}`
	);
	return data.reasonOptions.nodes;
}

export async function listLocations(storeId: string): Promise<Ref[]> {
	const data = await gql<{ locations: { nodes: Ref[] } }>(
		`query($s:String!){ locations(storeId:$s){ ... on LocationConnector { nodes { id name code } } } }`,
		{ s: storeId }
	);
	return data.locations.nodes;
}

export interface ItemSearchResult {
	id: string;
	code: string;
	name: string;
	unitName?: string | null;
	isVaccine: boolean;
	doses: number;
	defaultPackSize: number;
}

/**
 * Catalogue search for the line editor's item picker (S4). Matches on code or name;
 * capped to a page. Callers exclude items already on the stocktake client-side.
 */
export async function searchItems(storeId: string, term: string): Promise<ItemSearchResult[]> {
	const filter: Record<string, unknown> = { isActive: true };
	if (term.trim()) filter.codeOrName = { like: term.trim() };
	const data = await gql<{ items: { nodes: ItemSearchResult[] } }>(
		`query($s:String!,$f:ItemFilterInput){
			items(storeId:$s, page:{first:50}, filter:$f) {
				... on ItemConnector { nodes { id code name unitName isVaccine doses defaultPackSize } }
			}
		}`,
		{ s: storeId, f: filter }
	);
	return data.items.nodes;
}

export async function listMasterLists(storeId: string): Promise<(Ref & { linesCount: number })[]> {
	const data = await gql<{ masterLists: { nodes: (Ref & { linesCount: number })[] } }>(
		`query($s:String!){ masterLists(storeId:$s, page:{first:200}){ ... on MasterListConnector { nodes { id name code linesCount } } } }`,
		{ s: storeId }
	);
	return data.masterLists.nodes;
}

export interface EstimateParams {
	mode: 'full' | 'filtered' | 'blank';
	isAllItemsStocktake?: boolean;
	locationId?: string;
	masterListId?: string;
	includeAllMasterListItems?: boolean;
	expiresBefore?: string;
}

/**
 * Best-effort estimate of how many lines a create will generate. Blank = 0. For
 * include-all-master-list-items we use the master list's line count; otherwise we
 * count stock lines with packs in store, narrowed by any filters. The exact figure
 * is computed server-side (mode precedence, zero-stock inclusion) — this is a guide.
 */
export async function estimateLineCount(
	storeId: string,
	p: EstimateParams,
	masterLists: (Ref & { linesCount: number })[] = []
): Promise<number | null> {
	if (p.mode === 'blank') return 0;

	if (p.includeAllMasterListItems && p.masterListId) {
		return masterLists.find((m) => m.id === p.masterListId)?.linesCount ?? null;
	}

	const filter: Record<string, unknown> = { hasPacksInStore: true };
	if (p.locationId) filter.locationId = { equalTo: p.locationId };
	if (p.masterListId) filter.masterList = { id: { equalTo: p.masterListId } };
	if (p.expiresBefore) filter.expiryDate = { beforeOrEqualTo: p.expiresBefore };

	try {
		const data = await gql<{ stockLines: { totalCount: number } }>(
			`query($s:String!,$f:StockLineFilterInput){ stockLines(storeId:$s, filter:$f, page:{first:1}){ ... on StockLineConnector { totalCount } } }`,
			{ s: storeId, f: filter }
		);
		return data.stockLines.totalCount;
	} catch {
		return null;
	}
}
