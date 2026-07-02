import { createResource, createRoot } from 'solid-js';
import { request } from '../lib/graphql';

/*
 * Auth is consumed, not performed, by the chrome (chrome/00-overview.md). In dev,
 * auth is off, so we read the current user from `me()` as a stand-in for a real
 * session. Logout clears the (mock) session and routes to login — handled by the
 * UserMenu with a confirmation.
 */

export interface CurrentUser {
  userId: string;
  username: string;
  email?: string | null;
  jobTitle?: string | null;
}

const ME_QUERY = `
  query Me {
    me {
      ... on UserNode { userId username email jobTitle }
    }
  }
`;

async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const data = await request<{ me: CurrentUser }>(ME_QUERY);
    return data.me ?? null;
  } catch {
    return null;
  }
}

const state = createRoot(() => {
  const [user] = createResource(fetchMe);
  return { user };
});

export const currentUser = state.user;
