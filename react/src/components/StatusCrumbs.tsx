import { useRef, useState } from 'react';
import { Icon } from '@/icons/Icon';
import { Popover } from './Popover';
import { formatDateTime } from '@/lib/format';
import './StatusCrumbs.css';

/**
 * Generic lifecycle indicator per spec/ui-standards/controls.md#status-crumbs.
 * The vertical supplies its ordered statuses + the timestamp each reached one has.
 * Reached statuses are emphasised, not-yet-reached are muted; state is conveyed by
 * position + text, never colour alone. Revealing shows a history stepper (enhancement).
 */
export interface StatusStep {
  key: string;
  label: string;
  reachedAt?: string | null;
}

interface StatusCrumbsProps {
  steps: StatusStep[];
  currentKey: string;
}

export function StatusCrumbs({ steps, currentKey }: StatusCrumbsProps) {
  const [showHistory, setShowHistory] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentIndex = steps.findIndex((s) => s.key === currentKey);
  const current = steps[currentIndex];

  const hasHistory = steps.some((s, i) => i <= currentIndex && s.reachedAt);

  return (
    <div className="oms-crumbs">
      <button
        ref={triggerRef}
        type="button"
        className="oms-crumbs__trigger"
        aria-label={`Status: ${current?.label ?? 'unknown'}. Show history.`}
        aria-expanded={showHistory}
        onClick={() => hasHistory && setShowHistory((v) => !v)}
      >
        {/* Full crumbs on wide screens */}
        <span className="oms-crumbs__full" aria-hidden="true">
          {steps.map((step, i) => {
            const reached = i <= currentIndex;
            return (
              <span key={step.key} className="oms-crumbs__item">
                {i > 0 && (
                  <Icon name="chevron-down" size={14} className="oms-crumbs__sep" />
                )}
                <span
                  className={`oms-crumbs__label${reached ? ' is-reached' : ''}${
                    i === currentIndex ? ' is-current' : ''
                  }`}
                >
                  {step.label}
                </span>
              </span>
            );
          })}
        </span>
        {/* Collapsed label on small screens */}
        <span className="oms-crumbs__collapsed">Status: {current?.label}</span>
      </button>

      {hasHistory && (
        <Popover
          anchorRef={triggerRef}
          open={showHistory}
          onClose={() => setShowHistory(false)}
          placement="top-start"
          role="dialog"
        >
          <ol className="oms-crumbs__history">
            {steps.map((step, i) => {
              const reached = i <= currentIndex;
              return (
                <li
                  key={step.key}
                  className={`oms-crumbs__hist-item${reached ? ' is-reached' : ''}`}
                >
                  <span className="oms-crumbs__hist-dot" aria-hidden="true" />
                  <span className="oms-crumbs__hist-label">{step.label}</span>
                  <span className="oms-crumbs__hist-time tabular">
                    {step.reachedAt ? formatDateTime(step.reachedAt) : '—'}
                  </span>
                </li>
              );
            })}
          </ol>
        </Popover>
      )}
    </div>
  );
}
