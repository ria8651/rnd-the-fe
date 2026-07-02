// Minimal GraphQL-over-fetch client. The dev endpoint is proxied at /graphql
// (see vite.config.ts) and needs no auth.

const ENDPOINT = '/graphql';

export class GraphQLError extends Error {
  constructor(message: string, public detail?: unknown) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T = unknown>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new GraphQLError(`Network error ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors && body.errors.length) {
    throw new GraphQLError(body.errors.map((e) => e.message).join('; '), body.errors);
  }
  return body.data as T;
}
