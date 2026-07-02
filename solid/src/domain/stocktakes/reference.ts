/*
 * Reference data the stocktake flows consume but do not own (reasons, items, locations,
 * master lists, VVM statuses) + the create-flow line-count estimate. These are read
 * from the live GraphQL API; the estimate is deliberately approximate (labelled as ~).
 */

import { request } from '../../lib/graphql';
import type { CreateStocktakeParams, ReasonOption } from './types';

export async function fetchActiveReasonOptions(): Promise<ReasonOption[]> {
  const query = `
    query Reasons($filter: ReasonOptionFilterInput) {
      reasonOptions(filter: $filter, page: { first: 200 }) {
        ... on ReasonOptionConnector { nodes { id type isActive reason } }
      }
    }
  `;
  const data = await request<{ reasonOptions: { nodes: ReasonOption[] } }>(query, {
    filter: { isActive: true },
  });
  return data.reasonOptions.nodes;
}

export interface ItemResult {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  defaultPackSize: number;
}

export async function searchItems(storeId: string, search: string): Promise<ItemResult[]> {
  const query = `
    query Items($storeId: String!, $filter: ItemFilterInput, $page: PaginationInput) {
      items(storeId: $storeId, filter: $filter, page: $page) {
        ... on ItemConnector {
          nodes { id code name unitName isVaccine doses defaultPackSize }
        }
      }
    }
  `;
  const data = await request<{ items: { nodes: ItemResult[] } }>(query, {
    storeId,
    filter: { codeOrName: { like: search }, isVisible: true },
    page: { first: 25 },
  });
  return data.items.nodes;
}

export interface LocationRef {
  id: string;
  name: string;
  code: string;
  onHold: boolean;
}

export async function fetchLocations(storeId: string): Promise<LocationRef[]> {
  const query = `
    query Locations($storeId: String!) {
      locations(storeId: $storeId, page: { first: 500 }) {
        ... on LocationConnector { nodes { id name code onHold } }
      }
    }
  `;
  const data = await request<{ locations: { nodes: LocationRef[] } }>(query, { storeId });
  return data.locations.nodes;
}

export interface MasterListRef {
  id: string;
  name: string;
}

export async function fetchMasterLists(storeId: string): Promise<MasterListRef[]> {
  const query = `
    query MasterLists($storeId: String!) {
      masterLists(storeId: $storeId, page: { first: 500 }) {
        ... on MasterListConnector { nodes { id name } }
      }
    }
  `;
  const data = await request<{ masterLists: { nodes: MasterListRef[] } }>(query, { storeId });
  return data.masterLists.nodes;
}

export interface VvmStatusRef {
  id: string;
  description: string;
}

export async function fetchVvmStatuses(storeId: string): Promise<VvmStatusRef[]> {
  const query = `
    query Vvm($storeId: String!) {
      activeVvmStatuses(storeId: $storeId) {
        ... on VvmstatusConnector { nodes { id description } }
      }
    }
  `;
  try {
    const data = await request<{ activeVvmStatuses: { nodes: VvmStatusRef[] } }>(query, { storeId });
    return data.activeVvmStatuses.nodes;
  } catch {
    return [];
  }
}

/**
 * Approximate the number of lines a Full/Filtered create would generate, for the
 * create-flow feedback (S2). Returns null for a blank stocktake. Uses item counts as
 * a proxy; location/VVM/expiry filters are not on ItemFilter, so those narrow further
 * server-side — hence "≈".
 */
export async function estimateLineCount(
  storeId: string,
  params: CreateStocktakeParams,
): Promise<number | null> {
  if (params.mode === 'blank') return null;

  const filter: Record<string, unknown> = { isVisible: true };
  if (params.mode === 'full') {
    if (!params.isAllItemsStocktake) filter.hasStockOnHand = true;
  } else {
    // filtered
    if (params.masterListId) filter.masterListId = { equalTo: params.masterListId };
    if (!params.includeAllMasterListItems) filter.hasStockOnHand = true;
  }

  const query = `
    query Estimate($storeId: String!, $filter: ItemFilterInput) {
      items(storeId: $storeId, filter: $filter, page: { first: 1 }) {
        ... on ItemConnector { totalCount }
      }
    }
  `;
  const data = await request<{ items: { totalCount: number } }>(query, { storeId, filter });
  return data.items.totalCount;
}
