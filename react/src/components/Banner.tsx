import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/icons/Icon';
import './Banner.css';

/**
 * Inline message banner (info/warning/error/success). Used for the stocktake
 * locked/finalised explanations and whole-stocktake error surfaces (spec S5).
 * Colour always pairs with an icon + text (colour independence).
 */
export type BannerTone = 'info' | 'warning' | 'error' | 'success';

const TONE_ICON: Record<BannerTone, IconName> = {
  info: 'info',
  warning: 'alert',
  error: 'circle-alert',
  success: 'check-circle',
};

interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function Banner({ tone = 'info', title, children, action }: BannerProps) {
  return (
    <div className={`oms-banner oms-banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={TONE_ICON[tone]} size={20} className="oms-banner__icon" />
      <div className="oms-banner__content">
        {title && <p className="oms-banner__title">{title}</p>}
        {children && <div className="oms-banner__body">{children}</div>}
      </div>
      {action && <div className="oms-banner__action">{action}</div>}
    </div>
  );
}
