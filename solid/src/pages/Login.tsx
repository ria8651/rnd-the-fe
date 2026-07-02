import { Show, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { stores, defaultStoreId } from '../state/store';

/*
 * Login is out of scope (auth is off in dev; the chrome only consumes auth). This is
 * a mock landing that continues into the app at the default store.
 */
export function Login(): JSX.Element {
  const navigate = useNavigate();
  const enter = () => {
    const id = defaultStoreId();
    if (id) navigate(`/${id}/dashboard`, { replace: true });
  };
  return (
    <div class="login">
      <div class="login-card">
        <Icon name="m-supply-guy" size={64} />
        <h1>open mSupply</h1>
        <p>SolidJS implementation of the reverse spec.</p>
        <Show when={stores().length > 0} fallback={<p class="login-status">Connecting…</p>}>
          <Button label="Continue" variant="primary" onClick={enter} />
        </Show>
      </div>
    </div>
  );
}
