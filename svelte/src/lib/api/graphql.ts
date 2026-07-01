/**
 * Minimal GraphQL client for the open-mSupply API. In dev, requests go to
 * `/graphql`, which Vite proxies to localhost:8000 (same-origin, no CORS).
 * Override with VITE_GRAPHQL_URL for other environments.
 *
 * This is the single seam between the app and the live API — the stocktakes
 * adapter builds on it; acceptance tests can stub it.
 */

const ENDPOINT = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql';

/** A transport/GraphQL-level failure (network, HTTP, or top-level `errors`). */
export class GraphQLError extends Error {
	constructor(
		message: string,
		readonly detail?: unknown
	) {
		super(message);
		this.name = 'GraphQLError';
	}
}

export async function gql<T>(
	query: string,
	variables?: Record<string, unknown>,
	signal?: AbortSignal
): Promise<T> {
	let res: Response;
	try {
		res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, variables }),
			signal
		});
	} catch (e) {
		throw new GraphQLError('Network request failed', e);
	}

	if (!res.ok) throw new GraphQLError(`GraphQL HTTP ${res.status}`, await res.text());

	const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
	if (body.errors?.length) {
		throw new GraphQLError(body.errors.map((e) => e.message).join('; '), body.errors);
	}
	if (!body.data) throw new GraphQLError('GraphQL response had no data');
	return body.data;
}
