// Catalogue lookups that stocktakes consume but don't own (spec 01-domain-model.md
// › related entities): item search, active reasons, locations, and a line-count
// estimate for the create flow.

import { gql } from '../graphql';
import { toIsoDate } from '../util/format';
import type { CatalogueItem, Location, ReasonOption } from './types';

/** Remote item search for the line editor's async catalogue-lookup control. */
export async function searchItems(
  storeId: string,
  query: string,
  excludeItemIds: string[] = [],
): Promise<CatalogueItem[]> {
  const filter: Record<string, unknown> = { isVisibleOrOnHand: true };
  if (query.trim()) filter.codeOrName = { like: query.trim() };
  const data = await gql<{ items: { nodes: CatalogueItem[] } }>(
    `query Items($storeId: String!, $filter: ItemFilterInput, $page: PaginationInput) {
      items(storeId: $storeId, filter: $filter, page: $page) {
        ... on ItemConnector { totalCount nodes { id code name unitName isVaccine defaultPackSize } }
      }
    }`,
    { storeId, filter, page: { first: 50 } },
  );
  const exclude = new Set(excludeItemIds);
  return data.items.nodes.filter((i) => !exclude.has(i.id));
}

let reasonsCache: ReasonOption[] | null = null;
export async function getActiveReasons(): Promise<ReasonOption[]> {
  if (reasonsCache) return reasonsCache;
  const data = await gql<{ reasonOptions: { nodes: ReasonOption[] } }>(
    `query Reasons {
      reasonOptions(filter: { isActive: true }, page: { first: 200 }) {
        ... on ReasonOptionConnector { totalCount nodes { id reason type isActive } }
      }
    }`,
  );
  reasonsCache = data.reasonOptions.nodes;
  return reasonsCache;
}

export async function getLocations(storeId: string): Promise<Location[]> {
  const data = await gql<{ locations: { nodes: Location[] } }>(
    `query Locations($storeId: String!) {
      locations(storeId: $storeId, page: { first: 500 }) {
        ... on LocationConnector { totalCount nodes { id code name onHold } }
      }
    }`,
    { storeId },
  );
  return data.locations.nodes;
}

export type MasterList = { id: string; name: string; linesCount: number };
export async function getMasterLists(storeId: string): Promise<MasterList[]> {
  const data = await gql<{ masterLists: { nodes: MasterList[] } }>(
    `query MasterLists($storeId: String!) {
      masterLists(storeId: $storeId, page: { first: 500 }) {
        ... on MasterListConnector { totalCount nodes { id name linesCount } }
      }
    }`,
    { storeId },
  );
  return data.masterLists.nodes;
}

/**
 * Estimate how many lines a Full/Filtered create would generate, for the create-flow
 * feedback (spec S2). Counts on-hand stock lines matching the same filters the
 * generation uses (packs in store; narrowed by location/vvm/expiry).
 */
export async function estimateLineCount(
  storeId: string,
  opts: {
    full: boolean;
    includeAllItems?: boolean;
    locationId?: string | null;
    vvmStatusId?: string | null;
    expiresBefore?: string | null;
    masterListId?: string | null;
  },
): Promise<number> {
  if (opts.full && opts.includeAllItems) {
    // All items incl. zero stock — count the catalogue.
    const data = await gql<{ items: { totalCount: number } }>(
      `query C($storeId: String!) { items(storeId: $storeId, filter: { isVisibleOrOnHand: true }, page: { first: 1 }) { ... on ItemConnector { totalCount } } }`,
      { storeId },
    );
    return data.items.totalCount;
  }
  const filter: Record<string, unknown> = { hasPacksInStore: true };
  if (opts.locationId) filter.locationId = { equalTo: opts.locationId };
  if (opts.masterListId) filter.masterList = { equalTo: opts.masterListId };
  if (opts.vvmStatusId) filter.vvmStatusId = { equalTo: opts.vvmStatusId };
  if (opts.expiresBefore) filter.expiryDate = { beforeOrEqualTo: toIsoDate(opts.expiresBefore) };
  const data = await gql<{ stockLines: { totalCount: number } }>(
    `query SL($storeId: String!, $filter: StockLineFilterInput) {
      stockLines(storeId: $storeId, filter: $filter, page: { first: 1 }) {
        ... on StockLineConnector { totalCount }
      }
    }`,
    { storeId, filter },
  );
  return data.stockLines.totalCount;
}
