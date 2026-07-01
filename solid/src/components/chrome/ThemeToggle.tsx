import { type JSX } from 'solid-js';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';
import { Icon, type IconName } from '../ui/Icon';

// Manual override: light / dark / follow-system (theming.md#mode-selection).
export function ThemeToggle(): JSX.Element {
  const theme = useTheme();
  const modes: { mode: ThemeMode; icon: IconName; label: string }[] = [
    { mode: 'light', icon: 'sun', label: 'Light' },
    { mode: 'dark', icon: 'moon', label: 'Dark' },
    { mode: 'system', icon: 'monitor', label: 'System' },
  ];
  return (
    <div class="segmented" role="group" aria-label="Theme">
      {modes.map((m) => (
        <button
          class="segmented__item"
          data-active={theme.mode() === m.mode}
          aria-pressed={theme.mode() === m.mode}
          title={m.label}
          onClick={() => theme.setMode(m.mode)}
        >
          <Icon name={m.icon} size={16} />
        </button>
      ))}
    </div>
  );
}
