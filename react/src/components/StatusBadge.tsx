import './StatusBadge.css';

/**
 * Status shown with text + style, never colour alone (accessibility.md).
 * Tone maps to a state colour; the label is always present.
 */
export type BadgeTone = 'neutral' | 'info' | 'warning' | 'error' | 'success';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`oms-badge oms-badge--${tone}`}>{label}</span>;
}
