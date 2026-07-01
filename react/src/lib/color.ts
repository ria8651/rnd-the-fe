/**
 * Colour helpers for the store-coloured bottom bar (spec chrome AC-CH17):
 * the bar's foreground must automatically contrast with whatever colour a store
 * sets, so icons/labels stay legible.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  if (m.length === 3) {
    return [
      parseInt(m[0] + m[0], 16),
      parseInt(m[1] + m[1], 16),
      parseInt(m[2] + m[2], 16),
    ];
  }
  if (m.length === 6) {
    return [
      parseInt(m.slice(0, 2), 16),
      parseInt(m.slice(2, 4), 16),
      parseInt(m.slice(4, 6), 16),
    ];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** Returns a legible foreground (near-black or near-white) for a given background hex. */
export function contrastingForeground(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return '#1c1c28';
  return relativeLuminance(rgb) > 0.5 ? '#1c1c28' : '#ffffff';
}

/**
 * The store's configured brand colour for the bottom bar. The dev GraphQL store
 * node exposes no colour field, so as a stand-in we derive a stable hue from the
 * store id — this demonstrates "which store am I in" and AC-CH17's colour-follows-
 * store behaviour. A real deployment would read the store's configured colour.
 */
export function deriveStoreColour(storeId: string | null | undefined): string | null {
  if (!storeId) return null;
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) {
    hash = (hash * 31 + storeId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return hslToHex(hue, 42, 32);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
