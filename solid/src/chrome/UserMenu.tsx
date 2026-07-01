/**
 * User details + logout (spec/chrome/01-behaviours.md › User details & logout). A click-
 * popover showing username, email, and job title, plus the theme override. Logout requires a
 * confirmation; on confirm the session is cleared and the app navigates to Login (AC-CH14).
 */
import { type JSX, Show, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Popover } from '../ui/Popover';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Modal';
import { ThemeToggle } from '../theme/ThemeToggle';
import { auth } from '../state/auth';

export function UserMenu(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [confirm, setConfirm] = createSignal(false);
  const navigate = useNavigate();

  const doLogout = () => {
    setConfirm(false);
    setOpen(false);
    auth.logout();
    navigate('/login');
  };

  return (
    <Show when={auth.user}>
      <Popover
        open={open()}
        onClose={() => setOpen(false)}
        placement="top-start"
        trigger={
          <button
            class="bottom-bar__item"
            type="button"
            data-popover-trigger
            aria-haspopup="dialog"
            aria-expanded={open()}
            onClick={() => setOpen(!open())}
          >
            <Icon name="user" size={14} />
            <span>
              {auth.user!.firstName} {auth.user!.lastName}
            </span>
          </button>
        }
      >
        <div class="user-card" role="dialog" aria-label="Account">
          <div class="user-card__name">{auth.user!.username}</div>
          <div class="user-card__row">{auth.user!.email}</div>
          <div class="user-card__row">{auth.user!.jobTitle}</div>
          <div style={{ 'margin-top': 'var(--space-3)' }}>
            <div class="user-card__row" style={{ 'margin-bottom': '4px' }}>
              Appearance
            </div>
            <ThemeToggle />
          </div>
          <div class="user-card__actions">
            <Button variant="secondary" icon="power" onClick={() => setConfirm(true)}>
              Logout
            </Button>
          </div>
        </div>
      </Popover>
      <ConfirmDialog
        open={confirm()}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmLabel="Log out"
        onConfirm={doLogout}
        onCancel={() => setConfirm(false)}
      />
    </Show>
  );
}
