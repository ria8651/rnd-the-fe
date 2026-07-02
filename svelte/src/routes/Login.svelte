<script lang="ts">
  // Login is out of scope for this build (the chrome only consumes auth state); this
  // screen just re-establishes the mock session so the shell can be re-entered.
  import Button from '../lib/components/Button.svelte';
  import Icon from '../lib/components/Icon.svelte';
  import { auth } from '../lib/state/auth.svelte';
  import { router } from '../lib/router.svelte';
  import { rootPath } from '../lib/nav';

  function signIn() {
    auth.token = 'dev-session';
    router.navigate(rootPath(auth.activeStoreId ?? auth.stores[0]?.id ?? ''));
  }
</script>

<div class="login">
  <div class="card">
    <Icon name="m-supply-guy" size={64} />
    <h1>Open mSupply</h1>
    <p>You have been signed out.</p>
    <Button variant="primary" label="Sign in" onclick={signIn} />
  </div>
</div>

<style>
  .login {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: var(--surface-base);
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
    background: var(--surface-default);
    padding: var(--sp-8);
    border-radius: var(--radius-modal);
    box-shadow: var(--elev-raised);
  }
  h1 {
    font-size: var(--type-heading-size);
  }
  p {
    color: var(--text-secondary);
    margin: 0;
  }
</style>
