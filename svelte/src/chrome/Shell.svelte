<script lang="ts">
  // The persistent app frame (spec chrome). Flex row: sidebar spans full height on the
  // left; the content column (top bar + routed page + bottom bar) sits to its right.
  // Sidebar and mobile top-bar are hidden in full-screen mode.
  import type { Snippet } from 'svelte';
  import Sidebar from './Sidebar.svelte';
  import TopBar from './TopBar.svelte';
  import BottomBar from './BottomBar.svelte';
  import MobileNav from './MobileNav.svelte';
  import { chrome } from '../lib/state/chrome.svelte';
  import { viewport } from '../lib/state/viewport.svelte';

  type Props = { children: Snippet };
  let { children }: Props = $props();
</script>

<div class="shell">
  {#if !chrome.fullscreen && !viewport.isCompact}
    <Sidebar />
  {/if}

  <div class="column">
    {#if !chrome.fullscreen}
      <TopBar />
    {/if}
    <main class="content">
      {@render children()}
    </main>
    <BottomBar />
  </div>

  {#if viewport.isCompact}
    <MobileNav />
  {/if}
</div>

<style>
  .shell {
    display: flex;
    height: 100%;
    overflow: hidden;
  }
  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
  }
  .content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
