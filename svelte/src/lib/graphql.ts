// Minimal GraphQL client. Talks same-origin to /graphql (Vite proxies to the dev
// server at :8000, auth off in dev — spec 02-api-contract). Operations are
// store-scoped via a storeId argument passed in variables.

const ENDPOINT = '/graphql';

export class GraphQLError extends Error {
  constructor(
    message: string,
    public errors?: unknown[],
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new GraphQLError('Network error — could not reach the server.', [e]);
  }

  if (!res.ok) {
    throw new GraphQLError(`Request failed (${res.status})`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new GraphQLError(json.errors.map((e) => e.message).join('; '), json.errors);
  }
  if (json.data == null) {
    throw new GraphQLError('Empty response');
  }
  return json.data;
}
