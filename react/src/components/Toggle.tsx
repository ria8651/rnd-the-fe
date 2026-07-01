import { useId } from 'react';
import './Toggle.css';

/** Switch/toggle using the accent colour when on (inputs.md). */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
  const genId = useId();
  const inputId = id ?? genId;
  return (
    <label className={`oms-toggle${disabled ? ' is-disabled' : ''}`} htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="oms-toggle__input"
      />
      <span className="oms-toggle__track" aria-hidden="true">
        <span className="oms-toggle__thumb" />
      </span>
      {label && <span className="oms-toggle__label">{label}</span>}
    </label>
  );
}
