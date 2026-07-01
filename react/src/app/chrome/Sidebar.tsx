import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/icons/Icon';
import { useAuth } from '@/app/auth/AuthContext';
import { useTranslation } from '@/app/i18n/i18n';
import { NAV_SECTIONS, type NavSection } from './navConfig';
import './Sidebar.css';

/**
 * Desktop primary nav (spec/chrome/01-behaviours.md#sidebar):
 *  - Expanded (icon + label) ↔ collapsed icon rail; width animates.
 *  - The brand mark IS the toggle (no separate menu button); it plays a single
 *    360° spin on activation (direction echoes the change), suppressed under
 *    reduced-motion. Hover changes nothing (divergence D3).
 *  - Sections split into upper (scrollable) + lower groups; gated by permission.
 *  - Hidden in full-screen mode (handled by the parent).
 */
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { hasPermission } = useAuth();
  const t = useTranslation();
  const [spin, setSpin] = useState<{ dir: 'cw' | 'ccw'; n: number }>({ dir: 'cw', n: 0 });
  const brandRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    // Spin one way when expanding, the other when collapsing.
    setSpin((s) => ({ dir: collapsed ? 'cw' : 'ccw', n: s.n + 1 }));
    onToggle();
  };

  const visible = NAV_SECTIONS.filter((s) => !s.permission || hasPermission(s.permission));
  const upper = visible.filter((s) => s.group === 'upper');
  const lower = visible.filter((s) => s.group === 'lower');

  return (
    <nav
      className={`oms-sidebar${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Primary navigation"
    >
      <div className="oms-sidebar__brand-band">
        <button
          ref={brandRef}
          type="button"
          className="oms-sidebar__brand"
          aria-label={collapsed ? 'Open the menu' : 'Close the menu'}
          aria-expanded={!collapsed}
          onClick={handleToggle}
        >
          <span
            key={spin.n}
            className={`oms-sidebar__brand-mark oms-sidebar__brand-mark--${spin.dir}${
              spin.n > 0 ? ' is-spinning' : ''
            }`}
          >
            <Icon name="m-supply-guy" size={collapsed ? 32 : 40} />
          </span>
        </button>
      </div>

      <div className="oms-sidebar__scroll">
        <ul className="oms-sidebar__group">
          {upper.map((section) => (
            <SidebarItem key={section.key} section={section} collapsed={collapsed} label={t(section.labelKey)} />
          ))}
        </ul>
      </div>

      <ul className="oms-sidebar__group oms-sidebar__group--lower">
        {lower.map((section) => (
          <SidebarItem key={section.key} section={section} collapsed={collapsed} label={t(section.labelKey)} />
        ))}
      </ul>
    </nav>
  );
}

function SidebarItem({
  section,
  collapsed,
  label,
}: {
  section: NavSection;
  collapsed: boolean;
  label: string;
}) {
  return (
    <li>
      <NavLink
        to={section.path}
        className={({ isActive }) => `oms-sidebar__link${isActive ? ' is-active' : ''}`}
        title={collapsed ? label : undefined}
      >
        <Icon name={section.icon} size={24} className="oms-sidebar__link-icon" />
        <span className="oms-sidebar__link-label">{label}</span>
      </NavLink>
    </li>
  );
}
