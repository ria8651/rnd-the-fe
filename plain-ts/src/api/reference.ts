// Reference data + line-count estimates for the create flow (S2). The estimate
// mirrors the server's line-generation rules (03-state-rules.md) closely enough
// to give the user a pre-confirm number — it is a best-effort preview, not a
// guarantee (the server is authoritative at insert time).

import { gql } from './client.ts';

export interface MasterList {
  id: string;
  name: string;
  linesCount: number;
}
export interface Location {
  id: string;
  name: string;
  code: string;
}
export interface VvmStatus {
  id: string;
  description: string;
}

export async function fetchMasterLists(storeId: string): Promise<MasterList[]> {
  const query = `
    query MasterLists($storeId: String!) {
      masterLists(storeId: $storeId, filter: { existsForStoreId: { equalTo: $storeId } }) {
        ... on MasterListConnector { nodes { id name linesCount } }
      }
    }
  `;
  const data = await gql<{ masterLists: { nodes: MasterList[] } }>(query, { storeId });
  return data.masterLists.nodes.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchLocations(storeId: string): Promise<Location[]> {
  const query = `
    query Locations($storeId: String!) {
      locations(storeId: $storeId) {
        ... on LocationConnector { nodes { id name code } }
      }
    }
  `;
  const data = await gql<{ locations: { nodes: Location[] } }>(query, { storeId });
  return data.locations.nodes.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchActiveVvmStatuses(storeId: string): Promise<VvmStatus[]> {
  const query = `
    query Vvm($storeId: String!) {
      activeVvmStatuses(storeId: $storeId) {
        ... on VvmstatusConnector { nodes { id description } }
      }
    }
  `;
  const data = await gql<{ activeVvmStatuses: { nodes: VvmStatus[] } }>(query, { storeId });
  return data.activeVvmStatuses.nodes;
}

/** Count on-hand stock lines (optionally narrowed) — the Filtered/Full estimate. */
async function countStockLines(storeId: string, filter: Record<string, unknown>): Promise<number> {
  const query = `
    query CountStock($storeId: String!, $filter: StockLineFilterInput) {
      stockLines(storeId: $storeId, filter: $filter, page: { first: 1 }) {
        ... on StockLineConnector { totalCount }
      }
    }
  `;
  const data = await gql<{ stockLines: { totalCount: number } }>(query, {
    storeId,
    filter: { hasPacksInStore: true, ...filter },
  });
  return data.stockLines.totalCount;
}

/** Count visible stock items — the "all items incl. zero-stock" estimate. */
async function countVisibleStockItems(storeId: string): Promise<number> {
  const query = `
    query CountItems($storeId: String!) {
      items(storeId: $storeId, filter: { isVisible: true, type: { equalTo: STOCK } }, page: { first: 1 }) {
        ... on ItemConnector { totalCount }
      }
    }
  `;
  const data = await gql<{ items: { totalCount: number } }>(query, { storeId });
  return data.items.totalCount;
}

export interface FullEstimateArgs {
  storeId: string;
  includeAllItems: boolean;
}
export async function estimateFull(args: FullEstimateArgs): Promise<number> {
  return args.includeAllItems
    ? countVisibleStockItems(args.storeId)
    : countStockLines(args.storeId, {});
}

export interface FilteredEstimateArgs {
  storeId: string;
  masterListId?: string;
  locationId?: string;
  vvmStatusId?: string;
  expiresBefore?: string;
  includeAllMasterListItems?: boolean;
  masterListLinesCount?: number;
}
export async function estimateFiltered(args: FilteredEstimateArgs): Promise<number> {
  // "Include all master-list items" generates a line per master-list item
  // regardless of stock, so the estimate is the list's line count.
  if (args.includeAllMasterListItems && args.masterListId) {
    return args.masterListLinesCount ?? 0;
  }
  const filter: Record<string, unknown> = {};
  if (args.masterListId) filter.masterList = { id: { equalTo: args.masterListId } };
  if (args.locationId) filter.locationId = { equalTo: args.locationId };
  if (args.vvmStatusId) filter.vvmStatusId = { equalTo: args.vvmStatusId };
  if (args.expiresBefore) filter.expiryDate = { beforeOrEqualTo: args.expiresBefore };
  return countStockLines(args.storeId, filter);
}
