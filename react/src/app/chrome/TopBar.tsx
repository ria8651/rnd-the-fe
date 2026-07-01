import { Fragment, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/icons/Icon';
import { Button } from '@/components/Button';
import { Menu, type MenuOption } from '@/components/Menu';
import { useTranslation } from '@/app/i18n/i18n';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import { activeSection, crumbsFor } from './breadcrumbs';
import './TopBar.css';

/**
 * Desktop top bar (spec/chrome/01-behaviours.md#desktop-top-bar): the active nav
 * section's icon + breadcrumbs, and a full-screen toggle. On mobile it carries the
 * menu toggle instead. Also hosts the theme-mode override (theming.md#mode-selection).
 */
interface TopBarProps {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export function TopBar({ fullscreen, onToggleFullscreen, onOpenMenu, menuOpen }: TopBarProps) {
  const t = useTranslation();
  const { pathname } = useLocation();
  const section = activeSection(pathname);
  const crumbs = crumbsFor(pathname);

  const { mode, setMode } = useTheme();
  const [themeMenu, setThemeMenu] = useState(false);
  const themeRef = useRef<HTMLButtonElement>(null);

  const themeOptions: MenuOption[] = (
    [
      { key: 'system', label: 'Follow system' },
      { key: 'light', label: 'Light' },
      { key: 'dark', label: 'Dark' },
      { key: 'mui', label: 'Existing (MUI)' },
    ] as { key: ThemeMode; label: string }[]
  ).map((o) => ({
    key: o.key,
    label: o.label,
    selected: mode === o.key,
    onSelect: () => setMode(o.key),
  }));

  return (
    <header className="oms-topbar">
      <button
        type="button"
        className="oms-topbar__menu"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={onOpenMenu}
      >
        <Icon name={menuOpen ? 'close' : 'menu-dots'} size={24} />
      </button>

      <div className="oms-topbar__crumbs">
        {section && <Icon name={section.icon} size={20} className="oms-topbar__section-icon" />}
        <nav aria-label="Breadcrumb">
          <ol className="oms-topbar__crumb-list">
            {crumbs.map((c, i) => (
              <Fragment key={c.path}>
                {i > 0 && (
                  <li aria-hidden="true" className="oms-topbar__crumb-sep">
                    <Icon name="arrow-right" size={12} />
                  </li>
                )}
                <li>
                  {i < crumbs.length - 1 ? (
                    <Link to={c.path}>{t(c.labelKey)}</Link>
                  ) : (
                    <span aria-current="page">{t(c.labelKey)}</span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      </div>

      <div className="oms-topbar__actions">
        <Button
          ref={themeRef}
          variant="ghost"
          size="compact"
          icon="sun"
          aria-label="Theme"
          title="Theme"
          onClick={() => setThemeMenu((v) => !v)}
        />
        <Menu
          anchorRef={themeRef}
          open={themeMenu}
          onClose={() => setThemeMenu(false)}
          options={themeOptions}
          placement="bottom-end"
        />
        <Button
          variant="ghost"
          size="compact"
          icon={fullscreen ? 'minimise' : 'maximise'}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={onToggleFullscreen}
          className="oms-topbar__fullscreen"
        />
      </div>
    </header>
  );
}
