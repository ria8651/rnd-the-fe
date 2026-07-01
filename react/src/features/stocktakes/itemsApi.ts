import { gqlRequest } from '@/lib/graphql';

/** Item catalogue search for the line editor (spec S4). */

export interface ItemBatch {
  id: string;
  batch: string | null;
  packSize: number;
  expiryDate: string | null;
  totalNumberOfPacks: number;
  location: { id: string; name: string | null; code: string | null } | null;
}

export interface CatalogueItem {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
  isVaccine: boolean;
  defaultPackSize: number | null;
  availableBatches: ItemBatch[];
}

const ITEM_SEARCH = /* GraphQL */ `
  query ItemSearch($storeId: String!, $search: String) {
    items(
      storeId: $storeId
      filter: { codeOrName: { like: $search }, type: { equalTo: STOCK }, isVisibleOrOnHand: true }
      page: { first: 50 }
    ) {
      ... on ItemConnector {
        nodes {
          id
          code
          name
          unitName
          isVaccine
          defaultPackSize
          availableBatches(storeId: $storeId) {
            ... on StockLineConnector {
              nodes {
                id
                batch
                packSize
                expiryDate
                totalNumberOfPacks
                location { id name code }
              }
            }
          }
        }
      }
    }
  }
`;

interface RawItem extends Omit<CatalogueItem, 'availableBatches'> {
  availableBatches: { nodes: ItemBatch[] };
}

export async function searchItems(
  storeId: string,
  search: string,
): Promise<CatalogueItem[]> {
  const d = await gqlRequest<{ items: { nodes: RawItem[] } }>(ITEM_SEARCH, {
    storeId,
    search: search || '',
  });
  return d.items.nodes.map((n) => ({
    ...n,
    availableBatches: n.availableBatches?.nodes ?? [],
  }));
}
