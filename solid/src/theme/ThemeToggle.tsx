/**
 * Theme override control (spec/ui-standards/theming.md › Mode selection, divergence D2). A
 * small segmented control: Follow system / Light / Dark (plus the existing-app MUI reference).
 * Persisted by the theme controller.
 */
import { type JSX, For } from 'solid-js';
import { theme, type ThemeMode } from '../state/theme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mui', label: 'MUI' }
];

export function ThemeToggle(): JSX.Element {
  return (
    <div role="group" aria-label="Theme" style={{ display: 'flex', gap: '4px', 'flex-wrap': 'wrap' }}>
      <For each={MODES}>
        {(m) => (
          <button
            type="button"
            class={`btn btn--compact ${theme.mode === m.value ? 'btn--primary' : 'btn--ghost'}`}
            aria-pressed={theme.mode === m.value}
            onClick={() => theme.set(m.value)}
          >
            {m.label}
          </button>
        )}
      </For>
    </div>
  );
}
