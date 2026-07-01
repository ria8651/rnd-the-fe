// Minimal GraphQL-over-fetch client. The dev server proxies /graphql to the
// live open-mSupply API (auth disabled in dev — see vite.config.ts).

const ENDPOINT = '/graphql';

export class GraphQLError extends Error {
  constructor(message: string, public readonly errors?: unknown) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new GraphQLError(`Network error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors && body.errors.length) {
    throw new GraphQLError(body.errors.map((e) => e.message).join('; '), body.errors);
  }
  if (body.data == null) {
    throw new GraphQLError('No data returned');
  }
  return body.data;
}
