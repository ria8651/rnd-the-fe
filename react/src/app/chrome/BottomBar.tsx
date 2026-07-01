import { useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/icons/Icon';
import { useAuth } from '@/app/auth/AuthContext';
import { useI18n } from '@/app/i18n/i18n';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { contrastingForeground, deriveStoreColour } from '@/lib/color';
import { ROOT_PATH } from './navConfig';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import './BottomBar.css';

/**
 * Chrome bottom bar (spec/chrome/01-behaviours.md#bottom-bar-footer): a slim
 * store-coloured status strip at the very bottom. Controls in fixed left→right
 * order — store · edit · user · language · central (trailing) — each pairing an
 * icon with a label. Background is the active store's colour with an auto-
 * contrasting foreground (AC-CH17). Thin dividers before the user and language groups.
 */
type OpenPopover = 'store' | 'language' | 'user' | null;

export function BottomBar() {
  const { store, stores, user, setActiveStore, logout } = useAuth();
  const { language } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState<OpenPopover>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const storeRef = useRef<HTMLButtonElement>(null);
  const langRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);

  // The store's configured colour (dev stand-in derived from id); falls back to
  // the default nav surface when a store sets none.
  const colour = deriveStoreColour(store?.id);
  const barStyle: CSSProperties = colour
    ? ({ '--bar-bg': colour, '--bar-fg': contrastingForeground(colour) } as CSSProperties)
    : {};

  // Store selector is hidden entirely when there's nothing to switch to (<2 stores).
  const canSwitchStore = stores.length >= 2;

  // Central-server indicator: shown only when connected. The dev server acts as
  // the central instance here, so it is shown (trailing).
  const centralConnected = true;

  return (
    <footer className={`oms-bottombar${colour ? ' has-colour' : ''}`} style={barStyle}>
      <BarButton
        ref={storeRef}
        icon="home"
        label={store?.storeName ?? '—'}
        disabled={!canSwitchStore}
        active={open === 'store'}
        onClick={() => setOpen(open === 'store' ? null : 'store')}
      />
      <BarButton
        icon="edit"
        label="Edit"
        onClick={() => toast.info('Store properties editing is out of scope for this build.')}
      />

      <span className="oms-bottombar__divider" aria-hidden="true" />

      <BarButton
        ref={userRef}
        icon="user"
        label={`${user.firstName} ${user.lastName}`}
        active={open === 'user'}
        onClick={() => setOpen(open === 'user' ? null : 'user')}
      />

      <span className="oms-bottombar__divider" aria-hidden="true" />

      <BarButton
        ref={langRef}
        icon="translate"
        label={language.name}
        active={open === 'language'}
        onClick={() => setOpen(open === 'language' ? null : 'language')}
      />

      {centralConnected && (
        <div className="oms-bottombar__central" title="Connected to central server">
          <Icon name="central" size={16} />
          <span className="oms-bottombar__label">Central</span>
        </div>
      )}

      {canSwitchStore && (
        <StoreSelector
          anchorRef={storeRef}
          open={open === 'store'}
          onClose={() => setOpen(null)}
          onPick={(id) => {
            setActiveStore(id);
            setOpen(null);
            navigate(ROOT_PATH); // land in a valid place for the new store
          }}
        />
      )}
      <LanguageSelector
        anchorRef={langRef}
        open={open === 'language'}
        onClose={() => setOpen(null)}
      />
      <UserMenu
        anchorRef={userRef}
        open={open === 'user'}
        onClose={() => setOpen(null)}
        onLogout={() => setConfirmLogout(true)}
      />

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmLabel="Log out"
        cancelLabel="Stay"
      />
    </footer>
  );
}

interface BarButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

import { forwardRef } from 'react';
const BarButton = forwardRef<HTMLButtonElement, BarButtonProps>(function BarButton(
  { icon, label, onClick, active, disabled },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`oms-bottombar__btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={active}
    >
      <Icon name={icon} size={16} />
      <span className="oms-bottombar__label">{label}</span>
    </button>
  );
});
