/**
 * Minimal GraphQL-over-fetch client. The dev open-mSupply server runs at :8000
 * with auth disabled; Vite proxies /graphql to it (see vite.config.ts), so the
 * app talks to a same-origin path.
 *
 * Operations are store-scoped via a storeId argument (spec 02-api-contract.md).
 */

export const GRAPHQL_ENDPOINT = '/graphql';

/**
 * When the page is unloading (refresh / navigation-away), in-flight writes are
 * sent with `keepalive` so the browser doesn't drop them — this backs the
 * in-place-field "flush on teardown" guarantee (divergence D1 / AC-E7).
 */
let unloading = false;
export function setUnloading(value: boolean) {
  unloading = value;
}

export interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export class GraphQLRequestError extends Error {
  errors: GraphQLError[];
  constructor(errors: GraphQLError[]) {
    super(errors.map((e) => e.message).join('; ') || 'GraphQL request failed');
    this.name = 'GraphQLRequestError';
    this.errors = errors;
  }
}

export async function gqlRequest<TData = unknown, TVars = Record<string, unknown>>(
  query: string,
  variables?: TVars,
  signal?: AbortSignal,
): Promise<TData> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
    keepalive: unloading,
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: TData; errors?: GraphQLError[] };
  if (json.errors && json.errors.length > 0) {
    throw new GraphQLRequestError(json.errors);
  }
  if (json.data == null) {
    throw new Error('GraphQL response contained no data');
  }
  return json.data;
}
