/**
 * Login screen. The chrome only *consumes* auth (spec/chrome/00 › out of scope: the login
 * flow), so this is a minimal stand-in: it restores the mock session and lands on the root
 * path. If already authenticated it redirects there (so /login isn't shown to a signed-in
 * user).
 */
import { type JSX, Show } from 'solid-js';
import { Navigate, useNavigate } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { auth } from '../state/auth';
import { ROOT_PATH } from '../chrome/nav-config';

export function Login(): JSX.Element {
  const navigate = useNavigate();
  return (
    <Show when={!auth.isAuthenticated} fallback={<Navigate href={ROOT_PATH} />}>
      <div class="login">
        <div class="login__card">
          <span class="login__brand">
            <Icon name="m-supply-guy" size={56} />
          </span>
          <h1 class="login__title">open mSupply</h1>
          <p class="login__sub">Sign in to continue</p>
          <Button
            variant="primary"
            block
            onClick={() => {
              auth.login();
              auth.init();
              navigate(ROOT_PATH);
            }}
          >
            Sign in
          </Button>
        </div>
      </div>
    </Show>
  );
}
