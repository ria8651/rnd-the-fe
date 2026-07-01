/**
 * Dashboard — the root landing page after login / store switch. A light overview with quick
 * links into the implemented verticals. (Only stocktakes is built out in this spec pass.)
 */
import { type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { auth } from '../state/auth';

export function Dashboard(): JSX.Element {
  return (
    <div class="pad">
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        {auth.currentStore?.name ?? 'No store'} · welcome, {auth.user?.firstName}
      </p>
      <div class="dash-grid">
        <A href="/stocktakes" class="dash-card">
          <span class="dash-card__label">
            <Icon name="stock" size={20} /> Stocktakes
          </span>
          <span class="dash-card__value">Open</span>
          <span style={{ color: 'var(--text-secondary)', 'font-size': '13px' }}>
            Count and reconcile stock; finalise to apply inventory adjustments.
          </span>
        </A>
      </div>
    </div>
  );
}
