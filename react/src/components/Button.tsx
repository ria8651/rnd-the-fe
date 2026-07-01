import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '@/icons/Icon';
import './Button.css';

/**
 * Button variants per spec/ui-standards/controls.md#buttons:
 *  - primary: the one main action of a view (filled brand accent)
 *  - secondary: outlined / neutral surface
 *  - ghost: text-only, low emphasis
 *  - destructive: carries the error colour as its cue (divergence D7) + delete icon
 * At most one primary action visible per view. Every button shares the theme's
 * single button radius. A busy button shows progress and is non-interactive.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'compact';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconTrailing?: boolean;
  busy?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'default',
    icon,
    iconTrailing = false,
    busy = false,
    disabled,
    children,
    className,
    ...rest
  },
  ref,
) {
  const iconOnly = icon != null && children == null;
  const iconEl = busy ? (
    <Icon name="refresh" size={size === 'compact' ? 16 : 20} className="oms-btn__spin" />
  ) : icon ? (
    <Icon name={icon} size={size === 'compact' ? 16 : 20} />
  ) : null;

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        'oms-btn',
        `oms-btn--${variant}`,
        `oms-btn--${size}`,
        iconOnly ? 'oms-btn--icon-only' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {!iconTrailing && iconEl}
      {children != null && <span className="oms-btn__label">{children}</span>}
      {iconTrailing && iconEl}
    </button>
  );
});
