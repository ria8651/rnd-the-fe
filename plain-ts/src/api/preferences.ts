// Store preferences that gate stocktake line columns (05-ui-surface.md line table):
// `manageVaccinesInDoses` gates the doses columns, `allowTrackingOfStockByDonor`
// gates the donor column. Cached per store for the session.

import { gql } from './client.ts';

export interface StockPreferences {
  manageVaccinesInDoses: boolean;
  allowTrackingOfStockByDonor: boolean;
}

const cache = new Map<string, StockPreferences>();

export async function fetchPreferences(storeId: string): Promise<StockPreferences> {
  const cached = cache.get(storeId);
  if (cached) return cached;
  const query = `
    query Preferences($storeId: String!) {
      preferences(storeId: $storeId) {
        manageVaccinesInDoses
        allowTrackingOfStockByDonor
      }
    }
  `;
  try {
    const data = await gql<{ preferences: StockPreferences }>(query, { storeId });
    cache.set(storeId, data.preferences);
    return data.preferences;
  } catch {
    // Preferences are non-critical for display; default to hiding pref-gated columns.
    return { manageVaccinesInDoses: false, allowTrackingOfStockByDonor: false };
  }
}
