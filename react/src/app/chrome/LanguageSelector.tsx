import type { RefObject } from 'react';
import { Icon } from '@/icons/Icon';
import { Popover } from '@/components/Popover';
import { useI18n } from '@/app/i18n/i18n';
import './selectors.css';

/**
 * Language selector (spec/chrome/01-behaviours.md#language-selector):
 *  - click popover; lists available languages; the current one is not selectable
 *  - selecting changes + persists + reloads so content re-renders (AC-CH11)
 *  - honours RTL languages
 */
interface LanguageSelectorProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
}

export function LanguageSelector({ anchorRef, open, onClose }: LanguageSelectorProps) {
  const { language, languages, setLanguage } = useI18n();

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      placement="top-end"
      role="listbox"
      className="oms-selector oms-selector--narrow"
    >
      <ul className="oms-selector__list" role="listbox" aria-label="Languages">
        {languages.map((l) => {
          const isCurrent = l.code === language.code;
          return (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={isCurrent}
                disabled={isCurrent}
                className={`oms-menu-item${isCurrent ? ' is-active' : ''}`}
                onClick={() => {
                  setLanguage(l.code);
                  onClose();
                }}
              >
                <span dir={l.rtl ? 'rtl' : 'ltr'}>{l.name}</span>
                {isCurrent && <Icon name="check" size={16} className="oms-menu-item__check" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}
