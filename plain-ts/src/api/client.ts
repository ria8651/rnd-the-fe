// Minimal GraphQL-over-fetch client. In dev, requests go to the Vite proxy at
// `/graphql` (→ localhost:8000). The active store is sent as a header the same
// way the real client does, and also passed as an argument where operations
// require it.

const ENDPOINT = '/graphql';

export class GraphQLError extends Error {
  constructor(message: string, readonly errors?: unknown) {
    super(message);
    this.name = 'GraphQLError';
  }
}

let activeStoreId: string | null = null;

export function setRequestStoreId(id: string | null): void {
  activeStoreId = id;
}

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (activeStoreId) headers['store-id'] = activeStoreId;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new GraphQLError(
      'Could not reach the server. Is the open-mSupply server running on :8000?',
      e,
    );
  }

  if (!res.ok) {
    throw new GraphQLError(`Server responded ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) {
    throw new GraphQLError(body.errors.map((e) => e.message).join('; '), body.errors);
  }
  if (body.data == null) throw new GraphQLError('Empty response from server');
  return body.data;
}
