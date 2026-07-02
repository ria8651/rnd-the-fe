import { For, createSignal, type JSX } from 'solid-js';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { LANGUAGES, currentLanguage, language, setLanguage } from '../state/i18n';

/*
 * Language selector (chrome/01-behaviours.md#language-selector). Lists available
 * languages; the current one is not selectable. Selecting persists the choice and
 * reloads so all content re-renders; RTL languages flip layout direction (handled
 * in state/i18n).
 */

export function LanguageSelector(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        class="bottombar-item"
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="translate" size={16} />
        <span class="bottombar-label">{currentLanguage().label}</span>
      </button>
      <Popover open={open()} anchor={trigger} onClose={() => setOpen(false)} role="menu">
        <For each={LANGUAGES}>
          {(l) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={l.code === language()}
              class="menu-item"
              disabled={l.code === language()}
              onClick={() => {
                setOpen(false);
                setLanguage(l.code);
              }}
            >
              <span class="menu-item-check">{l.code === language() && <Icon name="check" size={16} />}</span>
              <span>{l.label}</span>
            </button>
          )}
        </For>
      </Popover>
    </>
  );
}
