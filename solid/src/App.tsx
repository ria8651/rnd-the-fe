/**
 * App routing (client-rendered SPA). A protected layout wraps every authenticated route in
 * the app shell and redirects to /login when there is no session (AC-CH15). /login sits
 * outside the shell. Unknown paths under the shell fall through to a section placeholder /
 * not-found page.
 */
import { type JSX, Show } from 'solid-js';
import { Router, Route, Navigate } from '@solidjs/router';
import { AppShell } from './chrome/AppShell';
import { Toaster } from './ui/toast';
import { auth } from './state/auth';
import { ROOT_PATH } from './chrome/nav-config';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Placeholder } from './pages/Placeholder';
import { Gallery } from './pages/Gallery';
import { StocktakeListPage } from './domain/stocktakes/StocktakeListPage';
import { StocktakeDetailPage } from './domain/stocktakes/StocktakeDetailPage';

function ProtectedLayout(props: { children?: JSX.Element }): JSX.Element {
  return (
    <Show when={auth.isAuthenticated} fallback={<Navigate href="/login" />}>
      <AppShell>{props.children}</AppShell>
      <Toaster />
    </Show>
  );
}

export function App(): JSX.Element {
  return (
    <Router>
      <Route path="/login" component={Login} />
      <Route path="/" component={ProtectedLayout}>
        <Route path="/" component={() => <Navigate href={ROOT_PATH} />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/stocktakes" component={StocktakeListPage} />
        <Route path="/stocktakes/:number" component={StocktakeDetailPage} />
        <Route path="/gallery" component={Gallery} />
        {/* Known nav sections show a "coming soon" placeholder; unknown paths a not-found. */}
        <Route path="*" component={Placeholder} />
      </Route>
    </Router>
  );
}
