/**
 * Status crumbs — a compact, read-only lifecycle indicator (spec/ui-standards/controls.md ›
 * Status crumbs). Generic across document types: the caller supplies an ordered list of
 * statuses and, per reached status, the timestamp it was reached. Reached statuses are
 * emphasised, later ones muted; the current status is the last reached one. State is
 * conveyed by position + text, never colour alone.
 *
 * Revealing the crumbs (click / focus / tap — not hover-only) opens a vertical stepper of
 * WHEN each status was reached. On small screens the row collapses to "Status: {current}".
 */
import { type JSX, For, Show, createMemo, createSignal } from 'solid-js';
import { Popover } from './Popover';
import { Icon } from './Icon';
import { formatDate } from '../format';

export interface CrumbStep {
  value: string;
  label: string;
  /** Timestamp this status was reached; null/undefined ⇒ not yet reached. */
  reachedAt?: string | null;
}

export function StatusCrumbs(props: { steps: CrumbStep[]; current: string; label?: string }): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const label = () => props.label ?? 'Status';
  const currentIndex = createMemo(() => props.steps.findIndex((s) => s.value === props.current));
  const currentStep = createMemo(() => props.steps[currentIndex()]);
  const reached = (i: number) => i <= currentIndex();

  return (
    <Popover
      open={open()}
      onClose={() => setOpen(false)}
      placement="top-start"
      trigger={
        <button
          type="button"
          class="crumbs"
          data-popover-trigger
          aria-haspopup="dialog"
          aria-expanded={open()}
          aria-label={`${label()} history`}
          onClick={() => setOpen(!open())}
        >
          <span class="crumbs__full">
            <For each={props.steps}>
              {(s, i) => (
                <>
                  <Show when={i() > 0}>
                    <span class="crumb-sep" aria-hidden="true">
                      <Icon name="chevron-down" size={14} flipRtl />
                    </span>
                  </Show>
                  <span
                    class={`crumb${reached(i()) ? ' crumb--reached' : ''}${
                      s.value === props.current ? ' crumb--current' : ''
                    }`}
                  >
                    {s.label}
                  </span>
                </>
              )}
            </For>
          </span>
          <span class="crumbs__collapsed">
            {label()}: <strong>{currentStep()?.label ?? '—'}</strong>
          </span>
        </button>
      }
    >
      <div class="crumb-history" role="dialog" aria-label={`${label()} history`}>
        <ol>
          <For each={props.steps}>
            {(s, i) => (
              <li classList={{ 'is-reached': reached(i()), 'is-current': s.value === props.current }}>
                <span class="crumb-dot" aria-hidden="true" />
                <span class="h-label">{s.label}</span>
                <span class="h-when">
                  {s.reachedAt ? formatDate(s.reachedAt) : reached(i()) ? '—' : 'Not yet'}
                </span>
              </li>
            )}
          </For>
        </ol>
      </div>
    </Popover>
  );
}
