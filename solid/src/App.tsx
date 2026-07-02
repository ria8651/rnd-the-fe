import { createEffect, type JSX } from 'solid-js';
import { Router, Route, Navigate, useNavigate } from '@solidjs/router';
import { AppShell } from './chrome/AppShell';
import { StocktakeListPage } from './domain/stocktakes/StocktakeListPage';
import { StocktakeDetailPage } from './domain/stocktakes/StocktakeDetailPage';
import { Placeholder } from './pages/Placeholder';
import { Login } from './pages/Login';
import { defaultStoreId } from './state/store';

/*
 * Store-scoped routing (urls.md#path-layout): /{store}/{area}/{vertical}[/{record}].
 * The stocktakes vertical lives under Inventory; other sections show a placeholder.
 * Root resolves to the default store once the store list loads.
 */

function RootRedirect(): JSX.Element {
  const navigate = useNavigate();
  createEffect(() => {
    const id = defaultStoreId();
    if (id) navigate(`/${id}/dashboard`, { replace: true });
  });
  return <Login />;
}

export function App(): JSX.Element {
  return (
    <Router>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/:storeId" component={AppShell}>
        <Route path="/" component={() => <Navigate href="dashboard" />} />
        <Route path="/inventory" component={() => <Navigate href="inventory/stocktakes" />} />
        <Route path="/inventory/stocktakes" component={StocktakeListPage} />
        <Route path="/inventory/stocktakes/:number" component={StocktakeDetailPage} />
        <Route path="/*" component={Placeholder} />
      </Route>
    </Router>
  );
}
