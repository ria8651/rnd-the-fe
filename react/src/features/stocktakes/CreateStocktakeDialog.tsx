import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { Toggle } from '@/components/Toggle';
import { TextInput, TextArea } from '@/components/Field';
import { Icon } from '@/icons/Icon';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { formatNumber } from '@/lib/format';
import { insertStocktake } from './api';
import {
  estimateLineCount,
  fetchLocations,
  fetchMasterLists,
  fetchVvmStatuses,
} from './refData';
import type { CreateMode, CreateStocktakeInput } from './types';
import './CreateStocktakeDialog.css';

/**
 * Create flow (spec S2 / J2): choose a mode (Full / Filtered / Blank), set its
 * parameters, see an estimated line count, and on confirm create + navigate to
 * the new stocktake. Switching mode resets the other inputs.
 */
interface CreateStocktakeDialogProps {
  storeId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (result: { id: string; stocktakeNumber: number }) => void;
}

const MODES: { key: CreateMode; label: string; hint: string }[] = [
  { key: 'full', label: 'Full', hint: 'Count everything I hold' },
  { key: 'filtered', label: 'Filtered', hint: 'Count a subset' },
  { key: 'blank', label: 'Blank', hint: "I'll add lines myself" },
];

export function CreateStocktakeDialog({
  storeId,
  open,
  onClose,
  onCreated,
}: CreateStocktakeDialogProps) {
  const [mode, setMode] = useState<CreateMode>('full');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  // full
  const [allItems, setAllItems] = useState(false);
  // filtered
  const [masterListId, setMasterListId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [vvmStatusId, setVvmStatusId] = useState<string | null>(null);
  const [expiresBefore, setExpiresBefore] = useState('');
  const [includeAllMaster, setIncludeAllMaster] = useState(false);

  const resetInputs = () => {
    setAllItems(false);
    setMasterListId(null);
    setLocationId(null);
    setVvmStatusId(null);
    setExpiresBefore('');
    setIncludeAllMaster(false);
  };

  const switchMode = (m: CreateMode) => {
    setMode(m);
    resetInputs(); // switching mode resets the other inputs
  };

  // Reference data (loaded lazily when filtered).
  const masterLists = useQuery({
    queryKey: ['masterLists', storeId],
    queryFn: () => fetchMasterLists(storeId),
    enabled: open && mode === 'filtered',
  });
  const locations = useQuery({
    queryKey: ['locations', storeId],
    queryFn: () => fetchLocations(storeId),
    enabled: open && mode === 'filtered',
  });
  const vvmStatuses = useQuery({
    queryKey: ['vvmStatuses', storeId],
    queryFn: () => fetchVvmStatuses(storeId),
    enabled: open && mode === 'filtered',
  });

  const input = useMemo<CreateStocktakeInput>(
    () => ({
      mode,
      description: description || undefined,
      comment: comment || undefined,
      isAllItemsStocktake: allItems || undefined,
      masterListId: masterListId ?? undefined,
      locationId: locationId ?? undefined,
      vvmStatusId: vvmStatusId ?? undefined,
      expiresBefore: expiresBefore || undefined,
      includeAllMasterListItems: includeAllMaster || undefined,
    }),
    [mode, description, comment, allItems, masterListId, locationId, vvmStatusId, expiresBefore, includeAllMaster],
  );

  // Debounce the estimate so changing filters coalesces into one query.
  const debouncedInput = useDebouncedValue(input, 400);
  const estimate = useQuery({
    queryKey: ['estimate', storeId, debouncedInput],
    queryFn: () => estimateLineCount(storeId, debouncedInput),
    enabled: open && mode !== 'blank',
  });

  const create = useMutation({
    mutationFn: () => insertStocktake(storeId, input),
    onSuccess: (result) => {
      onCreated(result);
    },
  });

  const masterListOptions = (masterLists.data ?? []).map((o) => ({ value: o.id, label: o.label }));
  const locationOptions = (locations.data ?? []).map((o) => ({ value: o.id, label: o.label }));
  const vvmOptions = (vvmStatuses.data ?? []).map((o) => ({ value: o.id, label: o.label }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New stocktake"
      size="md"
      dismissable={!create.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon="check"
            busy={create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </>
      }
    >
      {/* Mode choice */}
      <div className="oms-create__modes" role="radiogroup" aria-label="Creation mode">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            className={`oms-create__mode${mode === m.key ? ' is-selected' : ''}`}
            onClick={() => switchMode(m.key)}
          >
            <span className="oms-create__mode-label">{m.label}</span>
            <span className="oms-create__mode-hint">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="oms-create__body">
        {mode === 'full' && (
          <Toggle
            checked={allItems}
            onChange={setAllItems}
            label="Include items with no stock on hand"
          />
        )}

        {mode === 'filtered' && (
          <div className="oms-create__filters">
            <Select
              label="Master list"
              placeholder="Any master list"
              options={masterListOptions}
              value={masterListId}
              onChange={setMasterListId}
            />
            <Select
              label="Location"
              placeholder="Any location"
              options={locationOptions}
              value={locationId}
              onChange={setLocationId}
              emptyMessage={locations.isLoading ? 'Loading…' : 'No locations'}
            />
            <Select
              label="VVM status"
              placeholder="Any VVM status"
              options={vvmOptions}
              value={vvmStatusId}
              onChange={setVvmStatusId}
              emptyMessage={vvmStatuses.isLoading ? 'Loading…' : 'No VVM statuses'}
            />
            <TextInput
              type="date"
              label="Expires before"
              value={expiresBefore}
              onChange={(e) => setExpiresBefore(e.target.value)}
            />
            <div className="oms-create__filters-full">
              <Toggle
                checked={includeAllMaster}
                onChange={setIncludeAllMaster}
                label="Include all master-list items (incl. zero stock)"
                disabled={!masterListId}
              />
            </div>
          </div>
        )}

        {mode === 'blank' && (
          <p className="oms-create__blank">
            <Icon name="info" size={18} /> A blank stocktake is created with no lines. You
            add items and batches yourself.
          </p>
        )}

        <div className="oms-create__meta">
          <TextInput
            label="Description"
            placeholder="Optional title"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextArea
            label="Comment"
            placeholder="Optional note"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>

        {/* Feedback: estimated line count (Full/Filtered) or blank notice */}
        <div className="oms-create__estimate">
          {mode === 'blank' ? (
            <span className="oms-create__estimate-blank">Blank stocktake — no lines</span>
          ) : estimate.isLoading || estimate.isFetching ? (
            <span className="oms-create__estimate-loading">Estimating lines…</span>
          ) : estimate.isError ? (
            <span>Estimate unavailable</span>
          ) : (
            <span>
              Estimated <strong>{formatNumber(estimate.data ?? 0)}</strong> line
              {estimate.data === 1 ? '' : 's'} will be generated
            </span>
          )}
        </div>

        {create.isError && (
          <p className="oms-field__error" role="alert" style={{ marginTop: 'var(--sp-2)' }}>
            <Icon name="circle-alert" size={14} />
            <span>{(create.error as Error).message}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
