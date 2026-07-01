/**
 * Persistent bottom bar (spec/chrome/01-behaviours.md › Bottom bar, AC-CH17). A slim status
 * strip along the very bottom: identity + quick switches, not primary actions. Its background
 * is the active store's configured colour with an auto-contrasting foreground; both fall back
 * to the nav surface / secondary text when the store sets no colour (the current case — the
 * API exposes no store colour yet). Fixed left→right order (mirrored in RTL): store ·
 * edit-store · [divider] user · [divider] language · central-server indicator (trailing).
 */
import { type JSX, Show } from 'solid-js';
import { Icon } from '../ui/Icon';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import { auth } from '../state/auth';

/** Legible black/white foreground for an arbitrary store background colour. */
function contrastFg(hex: string | undefined): string | undefined {
  if (!hex) return undefined;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1]!, 16);
  const luminance = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return luminance > 140 ? '#1C1C28' : '#FFFFFF';
}

export function BottomBar(): JSX.Element {
  const bg = () => auth.currentStore?.color;
  const style = () => (bg() ? { '--bb-bg': bg(), '--bb-fg': contrastFg(bg()) } : undefined);
  return (
    <footer class="bottom-bar" aria-label="Application controls" style={style()}>
      <StoreSelector />
      <button class="bottom-bar__item" type="button" aria-label="Edit store" title="Edit store details">
        <Icon name="edit" size={14} />
        <span>Edit</span>
      </button>

      <Show when={auth.user}>
        <span class="bottom-bar__divider" aria-hidden="true" />
        <UserMenu />
      </Show>

      <span class="bottom-bar__divider" aria-hidden="true" />
      <LanguageSelector />

      <span class="bottom-bar__spacer" />
      {/* Central-server indicator — trailing; shown only when connected to a central server. */}
      <span class="bottom-bar__item bottom-bar__central" title="Connected to central server">
        <Icon name="central" size={14} />
        <span>Central</span>
      </span>
    </footer>
  );
}
