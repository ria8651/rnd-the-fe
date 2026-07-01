import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/icons/Icon';
import { useAuth } from '@/app/auth/AuthContext';
import { useTranslation } from '@/app/i18n/i18n';
import { NAV_SECTIONS } from './navConfig';
import './MobileNavDrawer.css';

/**
 * Mobile / tablet slide-down nav drawer (spec/chrome/01-behaviours.md#mobile--tablet-nav):
 * nav links (same section icons) plus Docs (external), Sync, Settings (permitted),
 * and Logout.
 */
interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function MobileNavDrawer({ open, onClose, onLogout }: MobileNavDrawerProps) {
  const { hasPermission } = useAuth();
  const t = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sections = NAV_SECTIONS.filter(
    (s) => !s.permission || hasPermission(s.permission),
  );

  return (
    <>
      <div className="oms-drawer__scrim" onClick={onClose} />
      <nav className="oms-drawer" aria-label="Navigation">
        <ul className="oms-drawer__list">
          {sections.map((s) => (
            <li key={s.key}>
              <NavLink
                to={s.path}
                className={({ isActive }) =>
                  `oms-drawer__link${isActive ? ' is-active' : ''}`
                }
                onClick={onClose}
              >
                <Icon name={s.icon} size={22} />
                <span>{t(s.labelKey)}</span>
              </NavLink>
            </li>
          ))}
          <li className="oms-drawer__sep" aria-hidden="true" />
          <li>
            <a
              className="oms-drawer__link"
              href="https://docs.msupply.foundation"
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              <Icon name="book" size={22} />
              <span>Docs</span>
              <Icon name="external-link" size={14} className="oms-drawer__ext" />
            </a>
          </li>
          <li>
            <button type="button" className="oms-drawer__link" onClick={onLogout}>
              <Icon name="power" size={22} />
              <span>Log out</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
