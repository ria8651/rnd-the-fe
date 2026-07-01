import { splitProps, type JSX } from 'solid-js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  busy?: boolean;
}

export function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, ['variant', 'size', 'busy', 'class', 'children', 'disabled']);
  return (
    <button
      {...rest}
      disabled={local.disabled || local.busy}
      aria-busy={local.busy}
      class={[
        'btn',
        `btn--${local.variant ?? 'secondary'}`,
        local.size === 'sm' ? 'btn--sm' : '',
        local.class ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {local.busy && <span class="spinner" style={{ width: '16px', height: '16px' }} />}
      {local.children}
    </button>
  );
}
