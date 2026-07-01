/**
 * Language selector (spec/chrome/01-behaviours.md › Language selector). Click-popover listing
 * available languages; the current one is not selectable. Selecting changes the active
 * language, persists it per user, and (per AC-CH11) reloads so content re-renders. Honours
 * RTL. Here `reloadOnChange` is off in dev to avoid churn while there are no string
 * catalogues yet; the acceptance contract turns it on.
 */
import { type JSX, For, Show, createSignal } from 'solid-js';
import { Popover } from '../ui/Popover';
import { Icon } from '../ui/Icon';
import { i18n } from '../state/i18n';

export function LanguageSelector(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const choose = (code: string) => {
    setOpen(false);
    i18n.setLanguage(code);
  };
  return (
    <Popover
      open={open()}
      onClose={() => setOpen(false)}
      placement="top-start"
      trigger={
        <button
          class="bottom-bar__item"
          type="button"
          data-popover-trigger
          aria-haspopup="listbox"
          aria-expanded={open()}
          onClick={() => setOpen(!open())}
        >
          <Icon name="translate" size={14} />
          <span>{i18n.current.name}</span>
        </button>
      }
    >
      <ul class="menu" role="listbox" aria-label="Language" style={{ 'min-width': '200px' }}>
        <For each={i18n.languages}>
          {(l) => {
            const isCurrent = () => l.code === i18n.code;
            return (
              <li role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent()}
                  class={`menu-item${isCurrent() ? ' menu-item--selected' : ''}`}
                  disabled={isCurrent()}
                  onClick={() => choose(l.code)}
                >
                  <span class="menu-check">
                    <Show when={isCurrent()}>
                      <Icon name="check" size={16} />
                    </Show>
                  </span>
                  <span class="menu-item__label" dir={l.rtl ? 'rtl' : undefined}>
                    {l.name}
                  </span>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </Popover>
  );
}
