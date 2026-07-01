import { createSignal, For, Show, type JSX } from 'solid-js';
import { Icon } from './Icon';

export interface StatusStep {
  value: string;
  label: string;
  reachedAt?: string | null; // localised timestamp when this status was reached
}

// Status crumbs (spec/ui-standards/controls.md#status-crumbs-lifecycle-indicator):
// a read-only lifecycle indicator. Reached statuses are emphasised, later ones
// muted; state is conveyed by position + text, never colour alone. Revealing it
// shows when each status was reached (enhancement, keyboard/touch reachable).
export function StatusCrumbs(props: { steps: StatusStep[]; current: string; formatTime: (t?: string | null) => string }): JSX.Element {
  const [showHistory, setShowHistory] = createSignal(false);
  const currentIndex = () => props.steps.findIndex((s) => s.value === props.current);
  const isReached = (i: number) => i <= currentIndex();

  return (
    <div
      class="crumbs"
      tabindex="0"
      role="group"
      aria-label={`Status: ${props.steps[currentIndex()]?.label ?? props.current}`}
      onMouseEnter={() => setShowHistory(true)}
      onMouseLeave={() => setShowHistory(false)}
      onFocus={() => setShowHistory(true)}
      onBlur={() => setShowHistory(false)}
    >
      <For each={props.steps}>
        {(step, i) => (
          <>
            <Show when={i() > 0}>
              <Icon name="chevron-right" size={14} class="crumbs__sep" />
            </Show>
            <span class="crumbs__step" data-reached={isReached(i())} data-current={step.value === props.current}>
              {step.label}
            </span>
          </>
        )}
      </For>
      <Show when={showHistory()}>
        <div class="crumbs__history" role="status">
          <For each={props.steps.filter((s, i) => isReached(i) && s.reachedAt)}>
            {(step) => (
              <div class="crumbs__history-row">
                <span>{step.label}</span>
                <span class="tnum muted">{props.formatTime(step.reachedAt)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
