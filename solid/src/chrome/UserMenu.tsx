import { Show, For, createSignal, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { currentUser } from '../state/auth';
import { themeMode, setThemeMode, type ThemeMode } from '../state/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mui', label: 'Classic' },
];

/*
 * User details & logout (chrome/01-behaviours.md#user-details--logout). The user
 * control opens a popover with username, email, and job title. Logout requires a
 * confirmation; on confirm the app navigates to the Login route (clearing session).
 * Only shown when signed in.
 */

export function UserMenu(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const navigate = useNavigate();
  let trigger: HTMLButtonElement | undefined;

  const logout = () => {
    setConfirmOpen(false);
    // Mock session teardown; a real app would clear the token here.
    navigate('/login');
  };

  return (
    <Show when={currentUser()}>
      <button
        ref={trigger}
        type="button"
        class="bottombar-item"
        aria-haspopup="dialog"
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="user" size={16} />
        <span class="bottombar-label">{currentUser()!.username}</span>
      </button>
      <Popover open={open()} anchor={trigger} onClose={() => setOpen(false)} role="dialog" class="selector-popover">
        <div class="user-card">
          <div class="user-card-name">{currentUser()!.username}</div>
          <Show when={currentUser()!.email}>
            <div class="user-card-line">{currentUser()!.email}</div>
          </Show>
          <Show when={currentUser()!.jobTitle}>
            <div class="user-card-line">{currentUser()!.jobTitle}</div>
          </Show>
        </div>
        <div class="user-prefs">
          <span class="user-prefs-label">Appearance</span>
          <div class="segmented" role="radiogroup" aria-label="Theme">
            <For each={THEME_OPTIONS}>
              {(o) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={themeMode() === o.value}
                  class={`segmented-option${themeMode() === o.value ? ' segmented-option-active' : ''}`}
                  onClick={() => setThemeMode(o.value)}
                >
                  {o.label}
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="user-card-actions">
          <Button
            label="Logout"
            icon="power"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
          />
        </div>
      </Popover>
      <ConfirmDialog
        open={confirmOpen()}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmLabel="Logout"
        onConfirm={logout}
        onCancel={() => setConfirmOpen(false)}
      />
    </Show>
  );
}
