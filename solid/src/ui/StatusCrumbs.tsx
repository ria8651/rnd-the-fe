import { createSignal, For, Show, type JSX } from 'solid-js';
import { Icon } from './Icon';
import { Popover } from './Popover';
import { isPhone } from '../state/viewport';
import { formatDateTime } from '../lib/format';

/*
 * Status crumbs (controls.md#status-crumbs-lifecycle-indicator): a generic, read-only
 * lifecycle indicator. The vertical supplies its ordered statuses and each reached
 * status's timestamp. Reached statuses are emphasised, not-yet-reached are muted, the
 * current status is the last reached. State is position + text, never colour alone.
 * Revealing (hover / focus / tap) shows WHEN each status was reached — an enhancement,
 * reachable by keyboard/touch. On small screens the row collapses to "Status: {current}".
 */

export interface CrumbStep {
  key: string;
  label: string;
  reachedAt?: string | null;
}

export interface StatusCrumbsProps {
  steps: CrumbStep[];
  /** Key of the current (last reached) status. */
  current: string;
}

export function StatusCrumbs(props: StatusCrumbsProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;

  const currentIndex = () => props.steps.findIndex((s) => s.key === props.current);
  const reached = (i: number) => i <= currentIndex();
  const currentLabel = () => props.steps[currentIndex()]?.label ?? '';

  return (
    <div class="status-crumbs">
      <button
        ref={trigger}
        type="button"
        class="status-crumbs-trigger"
        aria-label={`Status: ${currentLabel()}. Show history`}
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Show
          when={!isPhone()}
          fallback={<span class="crumb crumb-current">Status: {currentLabel()}</span>}
        >
          <For each={props.steps}>
            {(step, i) => (
              <>
                <Show when={i() > 0}>
                  <Icon name="chevron-down" size={14} class="crumb-sep" />
                </Show>
                <span
                  class={`crumb${reached(i()) ? ' crumb-reached' : ' crumb-muted'}${
                    i() === currentIndex() ? ' crumb-current' : ''
                  }`}
                >
                  {step.label}
                </span>
              </>
            )}
          </For>
        </Show>
      </button>
      <Popover open={open()} anchor={trigger} onClose={() => setOpen(false)} role="tooltip">
        <ol class="crumb-history">
          <For each={props.steps}>
            {(step, i) => (
              <li class={`crumb-history-item${reached(i()) ? ' reached' : ''}`}>
                <span class="crumb-history-dot" aria-hidden="true" />
                <span class="crumb-history-label">{step.label}</span>
                <span class="crumb-history-time tabular">
                  {step.reachedAt ? formatDateTime(step.reachedAt) : reached(i()) ? '' : '—'}
                </span>
              </li>
            )}
          </For>
        </ol>
      </Popover>
    </div>
  );
}
