import { type JSX } from 'solid-js';

// Single custom SVG set, drawn with currentColor so icons theme automatically
// (spec/ui-standards/icons.md). Outline/Feather style on a 24×24 grid.

export type IconName =
  | 'plus'
  | 'plus-circle'
  | 'search'
  | 'filter'
  | 'sort-asc'
  | 'sort-desc'
  | 'chevron-down'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'close'
  | 'check'
  | 'check-circle'
  | 'alert'
  | 'info'
  | 'edit'
  | 'delete'
  | 'download'
  | 'home'
  | 'translate'
  | 'user'
  | 'power'
  | 'lock'
  | 'unlock'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'menu'
  | 'sidebar'
  | 'dashboard'
  | 'stock'
  | 'printer'
  | 'refresh';

const PATHS: Record<IconName, JSX.Element> = {
  plus: <path d="M12 5v14M5 12h14" />,
  'plus-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  'sort-asc': <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 20V4" />,
  'sort-desc': <path d="M11 19h10M11 15h7M11 11h4M3 7l3-3 3 3M6 4v16" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M12 19l-7-7 7-7" />,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  edit: <path d="M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z" />,
  delete: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  translate: <path d="M4 5h10M9 3v2M11 5c0 5-4 9-8 9M6 9c0 3 3 5 6 6M14 21l4-9 4 9M16.5 16h5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  power: <path d="M12 3v9M6.4 6.4a9 9 0 1011.2 0" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 017.5-2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="1" />
      <rect x="13" y="3" width="8" height="6" rx="1" />
      <rect x="13" y="11" width="8" height="10" rx="1" />
      <rect x="3" y="15" width="8" height="6" rx="1" />
    </>
  ),
  stock: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7M12 11v10" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" />
    </>
  ),
  refresh: <path d="M21 12a9 9 0 11-2.6-6.3M21 3v5h-5" />,
};

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  'aria-hidden'?: boolean;
}

export function Icon(props: IconProps): JSX.Element {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden={props['aria-hidden'] ?? true}
      style={{ 'flex-shrink': 0 }}
    >
      {PATHS[props.name]}
    </svg>
  );
}
