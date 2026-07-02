import { h, each } from '../core/dom';
import { icon } from '../icons';
import { signal } from '../core/signal';
import { openPopover } from '../components/popover';
import { navigate } from '../core/router';
import { confirmDialog } from '../components/modal';
import { toast } from '../components/toast';
import { stores, currentStore, currentStoreId, setCurrentStoreId, user } from '../context/auth';
import { setThemeMode, setThemeName, themeMode, themeName } from '../theme/theme';
import { LANGUAGES, currentLanguage, language, setLanguage } from '../context/i18n';
import type { StoreRef } from '../api/types';

export function rootPath(storeId: string): string {
  return `/${storeId}/inventory/stocktakes`;
}

function divider(): HTMLElement {
  return h('div', { class: 'bottombar__divider', 'aria-hidden': 'true' });
}

// ---- Store selector ----
function openStoreSelector(anchor: HTMLElement) {
  const [queryGet, querySet] = signal('');
  const rememberKey = `oms.rememberStore.${user.username}`;
  const remembered = localStorage.getItem(rememberKey) === '1';

  openPopover(anchor, (close) => {
    const list = () =>
      stores()
        .filter((s) => s.storeName.toLowerCase().includes(queryGet().toLowerCase()))
        .sort((a, b) => a.storeName.localeCompare(b.storeName));
    return h(
      'div',
      { style: { 'min-width': '260px' } },
      h('div', { class: 'menu__search' },
        h('input', {
          class: 'input input--compact',
          type: 'text',
          placeholder: 'Search stores…',
          'aria-label': 'Search stores',
          oninput: (e: Event) => querySet((e.target as HTMLInputElement).value),
          ref: (el: HTMLElement) => setTimeout(() => el.focus(), 0),
        }),
      ),
      h('div', { class: 'menu', role: 'listbox' }, each(list, (s: StoreRef) => {
        const isCurrent = s.id === currentStoreId();
        return h('button', {
          type: 'button', role: 'option', class: `menu__item${isCurrent ? ' selected' : ''}`,
          disabled: isCurrent,
          onclick: () => {
            setCurrentStoreId(s.id);
            close();
            navigate(rootPath(s.id));
          },
        }, h('span', null, s.storeName), isCurrent ? icon('check', { class: 'check' }) : null);
      })),
      h('label', { class: 'menu__item', style: { 'border-top': '1px solid var(--divider)' } },
        h('input', {
          type: 'checkbox', checked: remembered,
          onchange: (e: Event) => {
            if ((e.target as HTMLInputElement).checked) localStorage.setItem(rememberKey, '1');
            else localStorage.removeItem(rememberKey);
          },
        }),
        h('span', null, 'Remember choice'),
      ),
    );
  }, { autoFocus: false });
}

// ---- Language selector ----
function openLanguageSelector(anchor: HTMLElement) {
  openPopover(anchor, (close) =>
    h('div', { class: 'menu', role: 'listbox' },
      ...LANGUAGES.map((l) => {
        const isCurrent = l.code === currentLanguage();
        return h('button', {
          type: 'button', role: 'option', class: `menu__item${isCurrent ? ' selected' : ''}`,
          disabled: isCurrent,
          onclick: () => { setLanguage(l.code); close(); },
        }, h('span', null, l.name), isCurrent ? icon('check', { class: 'check' }) : null);
      }),
    ),
  );
}

// ---- User menu ----
function openUserMenu(anchor: HTMLElement) {
  openPopover(anchor, (close) =>
    h('div', { style: { 'min-width': '220px', padding: 'var(--sp-3)' } },
      h('div', { class: 'stack', style: { gap: 'var(--sp-1)' } },
        h('strong', null, user.username),
        h('div', { class: 'small muted' }, user.email),
        h('div', { class: 'small muted' }, user.jobTitle),
      ),
      h('div', { style: { 'margin-top': 'var(--sp-2)', 'border-top': '1px solid var(--divider)', 'padding-top': 'var(--sp-2)' } },
        h('div', { class: 'field__label' }, 'Theme'),
        h('div', { class: 'row', style: { 'flex-wrap': 'wrap', gap: '4px', 'margin-top': '4px' } },
          ...([['light', 'Light'], ['dark', 'Dark'], ['system', 'System']] as const).map(([m, label]) =>
            h('button', { type: 'button', class: () => `btn btn--compact${themeMode() === m && themeName() !== 'mui' ? ' btn--secondary' : ''}`, onclick: () => setThemeMode(m) }, label)),
          h('button', { type: 'button', class: () => `btn btn--compact${themeName() === 'mui' ? ' btn--secondary' : ''}`, onclick: () => setThemeName('mui') }, 'MUI'),
        ),
      ),
      h('div', { class: 'menu', style: { 'margin-top': 'var(--sp-2)', 'border-top': '1px solid var(--divider)' } },
        h('button', { type: 'button', class: 'menu__item', onclick: () => {
          close();
          confirmDialog({
            title: 'Log out?',
            message: 'You will be returned to the login screen.',
            confirmLabel: 'Log out',
            onConfirm: () => {
              localStorage.removeItem('oms.storeId');
              navigate('/login');
            },
          });
        } }, icon('power', { size: 18 }), 'Logout'),
      ),
    ),
  );
}

export function bottomBar(): HTMLElement {
  const storeBtn = h('button', {
    class: 'bottombar__item', 'aria-haspopup': 'dialog',
    onclick: () => { if (stores().length >= 2) openStoreSelector(storeBtn); },
    title: 'Active store',
  }, icon('home'), h('span', null, () => currentStore()?.storeName ?? '—'));

  const editBtn = h('button', {
    class: 'bottombar__item', title: 'Edit store',
    onclick: () => toast('Store properties editing is not implemented in this build.', 'info'),
  }, icon('edit'), h('span', null, 'Edit'));

  const userBtn = h('button', {
    class: 'bottombar__item', 'aria-haspopup': 'dialog', title: 'User',
    onclick: () => openUserMenu(userBtn),
  }, icon('user'), h('span', null, user.username));

  const langBtn = h('button', {
    class: 'bottombar__item', 'aria-haspopup': 'dialog', title: 'Language',
    onclick: () => openLanguageSelector(langBtn),
  }, icon('translate'), h('span', null, () => language().name));

  const central = h('div', { class: 'bottombar__item bottombar__central', title: 'Connected to central server' }, icon('central'), h('span', null, 'Central'));

  return h(
    'footer',
    { class: 'bottombar', role: 'contentinfo' },
    // Store selector only shown when there's more than one store (AC-CH5).
    () => (stores().length >= 2 ? storeBtn : h('div', { class: 'bottombar__item', title: 'Active store' }, icon('home'), h('span', null, () => currentStore()?.storeName ?? '—'))),
    editBtn,
    divider(),
    userBtn,
    divider(),
    langBtn,
    central,
  );
}
