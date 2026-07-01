// Theme tokens transcribed from the spec's theme variants. Values use the spec's
// platform-neutral notation ("#RRGGBB" or "#RRGGBB @ N%"); `toCss` maps them to
// CSS colours. See ../../spec/ui-standards/theming.md and theme-{light,dark}.md.

export type ThemeName = 'light' | 'dark';

export interface ColorRoles {
  brand: {
    primary: string;
    primaryHover: string;
    primarySubtle: string;
    onPrimary: string;
    secondary: string;
    secondaryHover: string;
    secondarySubtle: string;
  };
  surface: {
    base: string;
    default: string;
    raised: string;
    sunken: string;
    nav: string;
    scrim: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    link: string;
    inverse: string;
  };
  border: {
    default: string;
    strong: string;
    divider: string;
  };
  state: Record<'error' | 'warning' | 'success' | 'info', { main: string; subtle: string }>;
  interaction: {
    focusRing: string;
    hoverOverlay: string;
    selected: string;
    selectedHover: string;
  };
}

export const light: ColorRoles = {
  brand: {
    primary: '#E95C30',
    primaryHover: '#C43C11',
    primarySubtle: '#FCEAE3',
    onPrimary: '#FFFFFF',
    secondary: '#3E7BFA',
    secondaryHover: '#3568D4',
    secondarySubtle: '#E8F1FE',
  },
  surface: {
    base: '#F2F2F5',
    default: '#FFFFFF',
    raised: '#FFFFFF',
    sunken: '#FAFAFC',
    nav: '#F2F2F5',
    scrim: '#000000 @ 50%',
  },
  text: {
    primary: '#1C1C28',
    secondary: '#555770',
    disabled: '#8F90A6',
    link: '#3568D4',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E4E4EB',
    strong: '#CBCED4',
    divider: '#EAEAEA',
  },
  state: {
    error: { main: '#E63535', subtle: '#FFCDCE' },
    warning: { main: '#E1A200', subtle: '#FCF1D4' },
    success: { main: '#69A607', subtle: '#EDF7ED' },
    info: { main: '#3E7BFA', subtle: '#E8F1FE' },
  },
  interaction: {
    focusRing: '#E95C30',
    hoverOverlay: '#000000 @ 4%',
    selected: '#E8F1FE',
    selectedHover: '#D2DFFF',
  },
};

export const dark: ColorRoles = {
  brand: {
    primary: '#F2774B',
    primaryHover: '#E95C30',
    primarySubtle: '#E95C30 @ 16%',
    onPrimary: '#FFFFFF',
    secondary: '#6B9BFF',
    secondaryHover: '#3E7BFA',
    secondarySubtle: '#3E7BFA @ 18%',
  },
  surface: {
    base: '#16161D',
    default: '#1F2029',
    raised: '#262732',
    sunken: '#14141A',
    nav: '#1A1B23',
    scrim: '#000000 @ 60%',
  },
  text: {
    primary: '#F2F2F5',
    secondary: '#A4A7B5',
    disabled: '#6A6D7E',
    link: '#6B9BFF',
    inverse: '#16161D',
  },
  border: {
    default: '#33343F',
    strong: '#454654',
    divider: '#2A2B36',
  },
  state: {
    error: { main: '#FF6B6B', subtle: '#E63535 @ 18%' },
    warning: { main: '#F2B43C', subtle: '#E1A200 @ 18%' },
    success: { main: '#8FCB3A', subtle: '#69A607 @ 18%' },
    info: { main: '#6B9BFF', subtle: '#3E7BFA @ 18%' },
  },
  interaction: {
    focusRing: '#F2774B',
    hoverOverlay: '#FFFFFF @ 6%',
    selected: '#3E7BFA @ 24%',
    selectedHover: '#3E7BFA @ 32%',
  },
};

export const themes: Record<ThemeName, ColorRoles> = { light, dark };

/** Convert the spec's "#RRGGBB" or "#RRGGBB @ N%" notation to a CSS colour. */
export function toCss(value: string): string {
  const [hex, opacityPart] = value.split('@').map((s) => s.trim());
  if (!opacityPart) return hex;
  const pct = parseFloat(opacityPart.replace('%', ''));
  const alpha = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alpha}`;
}

/** Flatten a ColorRoles tree into `--group-role` CSS custom-property pairs. */
export function toCssVars(roles: ColorRoles): Record<string, string> {
  const vars: Record<string, string> = {};
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [key, val] of Object.entries(obj)) {
      const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const name = prefix ? `${prefix}-${kebab}` : kebab;
      if (typeof val === 'string') {
        vars[`--${name}`] = toCss(val);
      } else if (val && typeof val === 'object') {
        walk(val as Record<string, unknown>, name);
      }
    }
  };
  walk(roles as unknown as Record<string, unknown>, '');
  return vars;
}
