/**
 * Reference-data + estimate queries used by the create flow (S2) and line editor (S4).
 * Locations and master lists populate the filtered-mode selectors; the estimate mirrors
 * what the server will generate so the user sees an approximate line count before
 * confirming (S2 › Feedback). Active reasons drive line validation (03 › reason rules).
 */
import { gql } from '../../api/graphql';
import type { ReasonOption } from './types';

export interface Ref {
  id: string;
  name: string;
  code?: string;
}

/** Active inventory-adjustment reasons for the two directions a stocktake can produce.
 *  The server is authoritative on which are active (03 › Adjustment-reason rules). */
export async function listReasonOptions(): Promise<ReasonOption[]> {
  const data = await gql<{ reasonOptions: { nodes: ReasonOption[] } }>(
    `query {
      reasonOptions(
        filter: { isActive: true, type: { equalAny: [POSITIVE_INVENTORY_ADJUSTMENT, NEGATIVE_INVENTORY_ADJUSTMENT, OPEN_VIAL_WASTAGE, CLOSED_VIAL_WASTAGE] } }
      ) {
        ... on ReasonOptionConnector { nodes { id reason type isActive } }
      }
    }`
  );
  return data.reasonOptions.nodes;
}

export async function listLocations(storeId: string): Promise<Ref[]> {
  const data = await gql<{ locations: { nodes: Ref[] } }>(
    `query($s: String!) { locations(storeId: $s) { ... on LocationConnector { nodes { id name code } } } }`,
    { s: storeId }
  );
  return data.locations.nodes;
}

export async function listVvmStatuses(storeId: string): Promise<Ref[]> {
  const data = await gql<{ activeVvmStatuses: { nodes: { id: string; description: string }[] } }>(
    `query($s: String!) { activeVvmStatuses(storeId: $s) { ... on VvmstatusConnector { nodes { id description } } } }`,
    { s: storeId }
  );
  return data.activeVvmStatuses.nodes.map((v) => ({ id: v.id, name: v.description }));
}

export async function listMasterLists(storeId: string): Promise<(Ref & { lineCount: number })[]> {
  const data = await gql<{ masterLists: { nodes: (Ref & { lineCount: number })[] } }>(
    `query($s: String!) { masterLists(storeId: $s, page: { first: 500 }) { ... on MasterListConnector { nodes { id name code lineCount: linesCount } } } }`,
    { s: storeId }
  );
  return data.masterLists.nodes;
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

/** Catalogue search for the line editor's item picker (S4). Matches code or name; capped
 *  to a page. Callers exclude items already on the stocktake client-side (AC-E3). */
export async function searchItems(storeId: string, term: string, signal?: AbortSignal): Promise<ItemSearchResult[]> {
  const filter: Record<string, unknown> = { isActive: true, type: { equalTo: 'STOCK' } };
  if (term.trim()) filter.codeOrName = { like: term.trim() };
  const data = await gql<{ items: { nodes: ItemSearchResult[] } }>(
    `query($s: String!, $f: ItemFilterInput) {
      items(storeId: $s, page: { first: 50 }, filter: $f) {
        ... on ItemConnector { nodes { id code name unitName isVaccine doses defaultPackSize } }
      }
    }`,
    { s: storeId, f: filter },
    signal
  );
  return data.items.nodes;
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
 * include-all-master-list-items we use the master list's line count; otherwise we count
 * stock lines with packs in store, narrowed by any filters. The exact figure is computed
 * server-side (mode precedence, zero-stock inclusion) — this is a guide, not a contract.
 */
export async function estimateLineCount(
  storeId: string,
  p: EstimateParams,
  masterLists: (Ref & { lineCount: number })[] = []
): Promise<number | null> {
  if (p.mode === 'blank') return 0;

  if (p.includeAllMasterListItems && p.masterListId) {
    return masterLists.find((m) => m.id === p.masterListId)?.lineCount ?? null;
  }

  const filter: Record<string, unknown> = { hasPacksInStore: true };
  if (p.locationId) filter.location = { id: { equalTo: p.locationId } };
  if (p.masterListId) filter.masterList = { id: { equalTo: p.masterListId } };
  if (p.expiresBefore) filter.expiryDate = { beforeOrEqualTo: p.expiresBefore };

  try {
    const data = await gql<{ stockLines: { totalCount: number } }>(
      `query($s: String!, $f: StockLineFilterInput) {
        stockLines(storeId: $s, filter: $f, page: { first: 1 }) { ... on StockLineConnector { totalCount } }
      }`,
      { s: storeId, f: filter }
    );
    return data.stockLines.totalCount;
  } catch {
    return null;
  }
}
