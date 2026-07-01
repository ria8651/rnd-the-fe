// Colour role values, transcribed verbatim from the UI-standards theme variants:
//   spec/ui-standards/theme-light.md and theme-dark.md
// Values are either an opaque 6-digit hex, or "<hex> @ <pct>%" for translucency
// (the spec's platform-neutral notation). resolveColor() maps them to CSS rgba().

export type ThemeRoles = Record<string, string>;

// Flattened role -> value. Keys become CSS custom properties (see cssVarName).
export const lightTheme: ThemeRoles = {
  // Brand
  'brand.primary': '#E95C30',
  'brand.primaryHover': '#C43C11',
  'brand.primarySubtle': '#FCEAE3',
  'brand.onPrimary': '#FFFFFF',
  'brand.secondary': '#3E7BFA',
  'brand.secondaryHover': '#3568D4',
  'brand.secondarySubtle': '#E8F1FE',
  // Surface
  'surface.base': '#F2F2F5',
  'surface.default': '#FFFFFF',
  'surface.raised': '#FFFFFF',
  'surface.sunken': '#FAFAFC',
  'surface.nav': '#F2F2F5',
  'surface.scrim': '#000000 @ 50%',
  // Text
  'text.primary': '#1C1C28',
  'text.secondary': '#555770',
  'text.disabled': '#8F90A6',
  'text.link': '#3568D4',
  'text.inverse': '#FFFFFF',
  // Line
  'border.default': '#E4E4EB',
  'border.strong': '#CBCED4',
  'divider': '#EAEAEA',
  // State
  'state.error.main': '#E63535',
  'state.error.subtle': '#FFCDCE',
  'state.warning.main': '#E1A200',
  'state.warning.subtle': '#FCF1D4',
  'state.success.main': '#69A607',
  'state.success.subtle': '#EDF7ED',
  'state.info.main': '#3E7BFA',
  'state.info.subtle': '#E8F1FE',
  // Interaction
  'focusRing': '#E95C30',
  'hoverOverlay': '#000000 @ 4%',
  'selected': '#E8F1FE',
  'selectedHover': '#D2DFFF',
};

export const darkTheme: ThemeRoles = {
  // Brand
  'brand.primary': '#F2774B',
  'brand.primaryHover': '#E95C30',
  'brand.primarySubtle': '#E95C30 @ 16%',
  'brand.onPrimary': '#FFFFFF',
  'brand.secondary': '#6B9BFF',
  'brand.secondaryHover': '#3E7BFA',
  'brand.secondarySubtle': '#3E7BFA @ 18%',
  // Surface
  'surface.base': '#16161D',
  'surface.default': '#1F2029',
  'surface.raised': '#262732',
  'surface.sunken': '#14141A',
  'surface.nav': '#1A1B23',
  'surface.scrim': '#000000 @ 60%',
  // Text
  'text.primary': '#F2F2F5',
  'text.secondary': '#A4A7B5',
  'text.disabled': '#6A6D7E',
  'text.link': '#6B9BFF',
  'text.inverse': '#16161D',
  // Line
  'border.default': '#33343F',
  'border.strong': '#454654',
  'divider': '#2A2B36',
  // State
  'state.error.main': '#FF6B6B',
  'state.error.subtle': '#E63535 @ 18%',
  'state.warning.main': '#F2B43C',
  'state.warning.subtle': '#E1A200 @ 18%',
  'state.success.main': '#8FCB3A',
  'state.success.subtle': '#69A607 @ 18%',
  'state.info.main': '#6B9BFF',
  'state.info.subtle': '#3E7BFA @ 18%',
  // Interaction
  'focusRing': '#F2774B',
  'hoverOverlay': '#FFFFFF @ 6%',
  'selected': '#3E7BFA @ 24%',
  'selectedHover': '#3E7BFA @ 32%',
};

// "#RRGGBB" or "#RRGGBB @ NN%" -> CSS colour (hex or rgba()).
export function resolveColor(value: string): string {
  const at = value.indexOf('@');
  if (at === -1) return value.trim();
  const hex = value.slice(0, at).trim();
  const pct = parseFloat(value.slice(at + 1).replace('%', '').trim());
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(pct / 100).toFixed(3)})`;
}

// 'brand.primary' -> '--brand-primary'
export function cssVarName(role: string): string {
  return '--' + role.replace(/\./g, '-');
}

export function themeToCssVars(theme: ThemeRoles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [role, value] of Object.entries(theme)) {
    out[cssVarName(role)] = resolveColor(value);
  }
  return out;
}
