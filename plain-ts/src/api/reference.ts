import { gql } from './client';
import type { ItemRef, LocationRef, ReasonOption, StockLineRef, StoreRef, Paged } from './types';

export async function fetchStores(): Promise<StoreRef[]> {
  const d = await gql<{ stores: Paged<StoreRef> }>(
    `query stores { stores(page:{first:500}) { ... on StoreConnector { totalCount nodes { id code storeName } } } }`,
  );
  return d.stores.nodes;
}

export async function searchItems(storeId: string, query: string, excludeIds: string[] = []): Promise<ItemRef[]> {
  const d = await gql<{ items: Paged<ItemRef> }>(
    `query items($storeId: String!, $q: String) {
      items(storeId: $storeId, filter: { codeOrName: { like: $q }, isVisible: true }, page: { first: 25 }) {
        ... on ItemConnector { nodes { id code name unitName isVaccine doses defaultPackSize } }
      }
    }`,
    { storeId, q: query },
  );
  const exclude = new Set(excludeIds);
  return d.items.nodes.filter((i) => !exclude.has(i.id));
}

export interface ItemStockLine extends StockLineRef {
  batch?: string | null;
  packSize?: number | null;
  expiryDate?: string | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  locationId?: string | null;
  locationName?: string | null;
}

export async function fetchStockLinesForItem(storeId: string, itemId: string): Promise<ItemStockLine[]> {
  const d = await gql<{ stockLines: Paged<ItemStockLine> }>(
    `query stockLines($storeId: String!, $itemId: EqualFilterStringInput) {
      stockLines(storeId: $storeId, filter: { itemId: $itemId }, page: { first: 200 }) {
        ... on StockLineConnector {
          nodes { id batch packSize expiryDate costPricePerPack sellPricePerPack
                  availableNumberOfPacks totalNumberOfPacks locationId locationName }
        }
      }
    }`,
    { storeId, itemId: { equalTo: itemId } },
  );
  return d.stockLines.nodes;
}

export async function fetchLocations(storeId: string): Promise<LocationRef[]> {
  const d = await gql<{ locations: Paged<LocationRef> }>(
    `query locations($storeId: String!) {
      locations(storeId: $storeId, page: { first: 500 }) {
        ... on LocationConnector { nodes { id name code onHold } }
      }
    }`,
    { storeId },
  );
  return d.locations.nodes;
}

export interface MasterListRef {
  id: string;
  name: string;
  code?: string | null;
}

export async function searchMasterLists(storeId: string, query: string): Promise<MasterListRef[]> {
  const d = await gql<{ masterLists: Paged<MasterListRef> }>(
    `query masterLists($storeId: String!, $q: String) {
      masterLists(storeId: $storeId, filter: { name: { like: $q } }, page: { first: 25 }) {
        ... on MasterListConnector { nodes { id name code } }
      }
    }`,
    { storeId, q: query },
  );
  return d.masterLists.nodes;
}

/** totalCount of on-hand stock lines matching optional filters (create estimate). */
export async function countStockLines(
  storeId: string,
  filter: { locationId?: string; expiresBefore?: string; hasPacks?: boolean },
): Promise<number> {
  const f: Record<string, unknown> = {};
  if (filter.hasPacks !== false) f.hasPacksInStore = true;
  if (filter.locationId) f.locationId = { equalTo: filter.locationId };
  if (filter.expiresBefore) f.expiryDate = { beforeOrEqualTo: filter.expiresBefore };
  const d = await gql<{ stockLines: Paged<never> }>(
    `query countStockLines($storeId: String!, $filter: StockLineFilterInput) {
      stockLines(storeId: $storeId, filter: $filter, page: { first: 1 }) {
        ... on StockLineConnector { totalCount }
      }
    }`,
    { storeId, filter: f },
  );
  return d.stockLines.totalCount;
}

export async function fetchReasonOptions(): Promise<ReasonOption[]> {
  const d = await gql<{ reasonOptions: Paged<ReasonOption> }>(
    `query reasonOptions {
      reasonOptions(filter: { isActive: true }, page: { first: 200 }) {
        ... on ReasonOptionConnector { nodes { id type reason isActive } }
      }
    }`,
  );
  return d.reasonOptions.nodes;
}
