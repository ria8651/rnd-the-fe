import { type JSX } from 'solid-js';
import { Router, Route, Navigate } from '@solidjs/router';
import { AppShell } from './components/chrome/AppShell';
import { StocktakeList } from './features/stocktakes/StocktakeList';
import { StocktakeDetail } from './features/stocktakes/StocktakeDetail';

export function App(): JSX.Element {
  return (
    <Router root={(props) => <AppShell>{props.children}</AppShell>}>
      <Route path="/" component={() => <Navigate href="/stocktakes" />} />
      <Route path="/stocktakes" component={StocktakeList} />
      <Route path="/stocktakes/:id" component={StocktakeDetail} />
      <Route path="*" component={() => <Navigate href="/stocktakes" />} />
    </Router>
  );
}
