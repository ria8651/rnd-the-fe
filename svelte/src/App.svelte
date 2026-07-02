<script lang="ts">
  // Routing hub. Loads the live store list once, keeps the active store in sync with
  // the leading URL segment (spec ui-standards/urls.md › store in the URL, AC-CH8b),
  // routes to a screen, and wraps it in the chrome shell.
  import Shell from './chrome/Shell.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Login from './routes/Login.svelte';
  import Placeholder from './routes/Placeholder.svelte';
  import StocktakesList from './routes/stocktakes/List.svelte';
  import StocktakeCreate from './routes/stocktakes/Create.svelte';
  import StocktakeDetail from './routes/stocktakes/Detail.svelte';
  import { router } from './lib/router.svelte';
  import { auth } from './lib/state/auth.svelte';
  import { rootPath, ALL_NAV } from './lib/nav';

  let loadError = $state<string | null>(null);

  // Load stores once.
  $effect(() => {
    if (!auth.loaded && auth.signedIn) {
      auth.load().catch((e) => (loadError = String(e?.message ?? e)));
    }
  });

  // Keep active store synced to the URL's leading segment.
  $effect(() => {
    if (!auth.loaded) return;
    const seg = router.segments;
    const urlStore = seg[0];
    if (router.path === '/login') return;
    const known = urlStore && auth.stores.some((s) => s.id === urlStore);
    if (!known) {
      // No valid store in the URL — land on the active store's root.
      if (auth.activeStoreId) router.navigate(rootPath(auth.activeStoreId), { replace: true });
    } else if (urlStore !== auth.activeStoreId) {
      // Opening a link scoped to another accessible store switches to it.
      auth.setActiveStore(urlStore);
    }
  });

  type Screen =
    | { kind: 'login' }
    | { kind: 'loading' }
    | { kind: 'list' }
    | { kind: 'create' }
    | { kind: 'detail'; number: number }
    | { kind: 'placeholder'; title: string };

  let screen = $derived.by<Screen>(() => {
    if (!auth.signedIn || router.path === '/login') return { kind: 'login' };
    if (!auth.loaded) return { kind: 'loading' };
    const seg = router.segments;
    const [, area, vertical, record] = seg;
    if (area === 'inventory' && vertical === 'stocktakes') {
      if (!record) return { kind: 'list' };
      if (record === 'new') return { kind: 'create' };
      const n = Number(record);
      if (Number.isFinite(n)) return { kind: 'detail', number: n };
    }
    const nav = ALL_NAV.find((x) => x.area === area);
    return { kind: 'placeholder', title: nav?.label ?? 'Not found' };
  });
</script>

{#if screen.kind === 'login'}
  <Login />
{:else if loadError}
  <div class="fatal">
    <p>Could not load stores: {loadError}</p>
    <p class="muted">Is the dev GraphQL server running on :8000?</p>
  </div>
{:else if screen.kind === 'loading'}
  <div class="fatal"><span class="spinner"></span> Loading…</div>
{:else}
  <Shell>
    {#if screen.kind === 'list'}
      <StocktakesList />
    {:else if screen.kind === 'create'}
      <StocktakeCreate />
    {:else if screen.kind === 'detail'}
      <StocktakeDetail number={screen.number} />
    {:else if screen.kind === 'placeholder'}
      <Placeholder title={screen.title} />
    {/if}
  </Shell>
{/if}

<Toast />

<style>
  .fatal {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    height: 100%;
    color: var(--text-secondary);
  }
  .muted {
    color: var(--text-disabled);
    font-size: var(--type-caption-size);
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-strong);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
