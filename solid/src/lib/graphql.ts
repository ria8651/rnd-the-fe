/*
 * Single GraphQL transport seam. Every operation goes through request(); the
 * store-scoping argument (storeId) is passed explicitly by callers per the API
 * contract (spec/stocktakes/02-api-contract.md). In dev, /graphql is proxied to
 * localhost:8000 by Vite (auth off).
 */

const ENDPOINT = '/graphql';

export class GraphQLError extends Error {
  constructor(
    message: string,
    readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function request<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new GraphQLError('Network error — is the server reachable?', e);
  }

  if (!res.ok) throw new GraphQLError(`Request failed (${res.status})`);

  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors && body.errors.length) {
    throw new GraphQLError(body.errors.map((e) => e.message).join('; '), body.errors);
  }
  if (body.data == null) throw new GraphQLError('Empty response');
  return body.data;
}
