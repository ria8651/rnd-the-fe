/**
 * Standard page anatomy (spec/ui-standards/layout.md): an app-bar/toolbar (title, metadata
 * entry points, page actions, filter/search), a single scrolling content body, an optional
 * toggleable detail side panel (overlay on narrow viewports), and an always-visible action
 * footer for lifecycle controls. Only the body scrolls; toolbar and footer stay put.
 */
import { type JSX, Show } from 'solid-js';

export interface PageLayoutProps {
  title?: JSX.Element;
  /** Right-aligned toolbar content: page actions, filter menu, item search. */
  toolbar?: JSX.Element;
  /** Left-aligned toolbar content that follows the title (e.g. active filters). */
  toolbarStart?: JSX.Element;
  children: JSX.Element;
  /** Always-visible action footer (status crumbs, lifecycle button, bulk-action bar). */
  footer?: JSX.Element;
  /** Detail side panel content. */
  side?: JSX.Element;
  sideOpen?: boolean;
}

export function PageLayout(props: PageLayoutProps): JSX.Element {
  return (
    <div class="page">
      <Show when={props.title || props.toolbar || props.toolbarStart}>
        <div class="page__toolbar">
          <Show when={props.title}>
            <h1 class="page__title">{props.title}</h1>
          </Show>
          {props.toolbarStart}
          <div class="page__toolbar-spacer" />
          <Show when={props.toolbar}>
            <div class="page__toolbar-actions">{props.toolbar}</div>
          </Show>
        </div>
      </Show>
      <div class="page__main">
        <div class="page__body">{props.children}</div>
        <Show when={props.side && props.sideOpen}>
          <aside class="page__side" aria-label="Details">
            {props.side}
          </aside>
        </Show>
      </div>
      <Show when={props.footer}>
        <div class="page__footer">{props.footer}</div>
      </Show>
    </div>
  );
}
