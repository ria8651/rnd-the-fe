import { useEffect, useRef, useState } from 'react';
import { useDebouncedSave } from '@/lib/useDebouncedValue';
import { FieldShell } from './Field';
import './EditableField.css';

/**
 * In-place, auto-saving field per spec/ui-standards/inputs.md#in-place-fields-auto-save
 * and divergence D1:
 *  - optimistic: shows the typed value immediately
 *  - debounced write (~1000ms idle) so rapid typing yields one write
 *  - flush on blur / teardown / navigation so a pending edit is never lost
 *  - rollback on failure (revert to last saved value + surface the error)
 * No Save button. Gated by the caller (read-only when not editable).
 */
interface EditableFieldProps {
  label?: string;
  value: string | null;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  debounceMs?: number;
}

export function EditableField({
  label,
  value,
  onSave,
  multiline = false,
  readOnly = false,
  placeholder,
  debounceMs = 1000,
}: EditableFieldProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(value ?? '');

  // Re-sync with the server's canonical value when it changes (and we're idle).
  useEffect(() => {
    lastSaved.current = value ?? '';
    setDraft((d) => (d === '' || d === lastSaved.current ? value ?? '' : d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: string) => {
    if (next === lastSaved.current) return;
    onSave(next)
      .then(() => {
        lastSaved.current = next;
        setError(null);
      })
      .catch((e: Error) => {
        // Rollback to the last saved value and surface the error.
        setDraft(lastSaved.current);
        setError(e.message);
      });
  };

  const { schedule, flush } = useDebouncedSave<string>(commit, debounceMs);

  const onChange = (next: string) => {
    setDraft(next); // optimistic
    schedule(next);
  };

  const commonProps = {
    value: draft,
    placeholder,
    disabled: readOnly,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onBlur: () => flush(), // leaving the field flushes the pending write
    'aria-invalid': error ? true : undefined,
    className: `oms-input${error ? ' oms-input--invalid' : ''}${
      multiline ? ' oms-textarea' : ''
    }`,
  };

  return (
    <FieldShell label={label} error={error ?? undefined}>
      {multiline ? (
        <textarea rows={2} {...commonProps} />
      ) : (
        <input type="text" {...commonProps} />
      )}
    </FieldShell>
  );
}
