import { gqlRequest } from '@/lib/graphql';
import type { CreateStocktakeInput } from './types';

/** Reference-data + line-count-estimate queries for the create flow (spec S2 / J2). */

export interface Option {
  id: string;
  label: string;
}

const MASTER_LISTS = /* GraphQL */ `
  query MasterLists($storeId: String!) {
    masterLists(storeId: $storeId, page: { first: 500 }) {
      ... on MasterListConnector { nodes { id name } }
    }
  }
`;
export async function fetchMasterLists(storeId: string): Promise<Option[]> {
  const d = await gqlRequest<{ masterLists: { nodes: { id: string; name: string }[] } }>(
    MASTER_LISTS,
    { storeId },
  );
  return d.masterLists.nodes.map((n) => ({ id: n.id, label: n.name }));
}

const LOCATIONS = /* GraphQL */ `
  query Locations($storeId: String!) {
    locations(storeId: $storeId, page: { first: 500 }) {
      ... on LocationConnector { nodes { id name code } }
    }
  }
`;
export async function fetchLocations(storeId: string): Promise<Option[]> {
  const d = await gqlRequest<{ locations: { nodes: { id: string; name: string; code: string }[] } }>(
    LOCATIONS,
    { storeId },
  );
  return d.locations.nodes.map((n) => ({ id: n.id, label: `${n.name} (${n.code})` }));
}

const VVM_STATUSES = /* GraphQL */ `
  query VvmStatuses($storeId: String!) {
    activeVvmStatuses(storeId: $storeId) {
      ... on VvmstatusConnector { nodes { id description } }
    }
  }
`;
export async function fetchVvmStatuses(storeId: string): Promise<Option[]> {
  const d = await gqlRequest<{ activeVvmStatuses: { nodes: { id: string; description: string }[] } }>(
    VVM_STATUSES,
    { storeId },
  );
  return d.activeVvmStatuses.nodes.map((n) => ({ id: n.id, label: n.description }));
}

const STOCK_LINE_COUNT = /* GraphQL */ `
  query StockLineCount($storeId: String!, $filter: StockLineFilterInput) {
    stockLines(storeId: $storeId, filter: $filter, page: { first: 1 }) {
      ... on StockLineConnector { totalCount }
    }
  }
`;
// Mirrors the backend's all-items generation (generate_lines_for_all_items):
// visible-or-on-hand STOCK items in this store — NOT the whole catalogue.
const ITEM_COUNT = /* GraphQL */ `
  query ItemCount($storeId: String!) {
    items(
      storeId: $storeId
      filter: { isVisibleOrOnHand: true, type: { equalTo: STOCK } }
      page: { first: 1 }
    ) {
      ... on ItemConnector { totalCount }
    }
  }
`;
const MASTER_LIST_LINE_COUNT = /* GraphQL */ `
  query MasterListLineCount($storeId: String!, $masterListId: String!) {
    masterListLines(storeId: $storeId, masterListId: $masterListId, page: { first: 1 }) {
      ... on MasterListLineConnector { totalCount }
    }
  }
`;

/**
 * Best-effort estimated line count shown before confirming a create (spec S2).
 * Mirrors the generation rules in spec 03: stock-derived counts for full/filtered,
 * item/master-list counts when "include all" is chosen.
 */
export async function estimateLineCount(
  storeId: string,
  input: CreateStocktakeInput,
): Promise<number> {
  if (input.mode === 'blank') return 0;

  if (input.mode === 'full') {
    if (input.isAllItemsStocktake) {
      const d = await gqlRequest<{ items: { totalCount: number } }>(ITEM_COUNT, { storeId });
      return d.items.totalCount;
    }
    const d = await gqlRequest<{ stockLines: { totalCount: number } }>(STOCK_LINE_COUNT, {
      storeId,
      filter: { hasPacksInStore: true },
    });
    return d.stockLines.totalCount;
  }

  // filtered
  if (input.includeAllMasterListItems && input.masterListId) {
    const d = await gqlRequest<{ masterListLines: { totalCount: number } }>(
      MASTER_LIST_LINE_COUNT,
      { storeId, masterListId: input.masterListId },
    );
    return d.masterListLines.totalCount;
  }
  const filter: Record<string, unknown> = { hasPacksInStore: true };
  if (input.masterListId) filter.masterList = { id: { equalTo: input.masterListId } };
  if (input.locationId) filter.locationId = { equalTo: input.locationId };
  if (input.vvmStatusId) filter.vvmStatusId = { equalTo: input.vvmStatusId };
  if (input.expiresBefore) filter.expiryDate = { beforeOrEqualTo: input.expiresBefore };
  const d = await gqlRequest<{ stockLines: { totalCount: number } }>(STOCK_LINE_COUNT, {
    storeId,
    filter,
  });
  return d.stockLines.totalCount;
}
