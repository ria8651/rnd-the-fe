import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/Field';
import { Banner } from '@/components/Banner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/icons/Icon';
import { useToast } from '@/components/Toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { formatNumber } from '@/lib/format';
import { batchLines, type LineInsert, type LineUpdate } from './linesApi';
import { searchItems } from './itemsApi';
import { reasonsForDirection, directionOf } from './reasons';
import type { LineReason, StocktakeLine } from './types';
import './LineEditor.css';

/**
 * Line editor (spec S4): the single surface for entering line data. Add mode
 * searches the catalogue (excluding items already on the stocktake) and shows the
 * item's batches to count + lets new ones be added; edit mode is locked to the
 * item and shows ALL of that item's batches on the stocktake plus add-new.
 * Committed by an explicit Save (modal — not auto-saved); leaving with unsaved
 * changes prompts a confirmation (inputs.md#modal--explicit-save).
 */
interface LineEditorProps {
  storeId: string;
  stocktakeId: string;
  line: StocktakeLine | null; // null = add mode
  allLines: StocktakeLine[];
  existingItemIds: string[];
  reasons: LineReason[];
  onClose: () => void;
  onSaved: () => void;
}

interface DraftBatch {
  key: string;
  lineId?: string; // existing stocktake line → update
  stockLineId?: string; // existing stock line → insert with link
  label: string;
  snapshot: number;
  isNew: boolean;
  counted: string;
  batch: string;
  expiryDate: string;
  packSize: string;
  reasonOptionId: string | null;
}

function draftFromLine(l: StocktakeLine): DraftBatch {
  return {
    key: l.id,
    lineId: l.id,
    stockLineId: l.stockLine?.id ?? undefined,
    label: `${l.batch || 'No batch'}${l.expiryDate ? ` · exp ${l.expiryDate}` : ''}`,
    snapshot: l.snapshotNumberOfPacks,
    isNew: false,
    counted: l.countedNumberOfPacks?.toString() ?? '',
    batch: l.batch ?? '',
    expiryDate: l.expiryDate ?? '',
    packSize: l.packSize?.toString() ?? '',
    reasonOptionId: l.reasonOption?.id ?? null,
  };
}

export function LineEditor({
  storeId,
  stocktakeId,
  line,
  allLines,
  existingItemIds,
  reasons,
  onClose,
  onSaved,
}: LineEditorProps) {
  const toast = useToast();
  const isEdit = line != null;
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // ---- Add mode: server-side item search (the Select reports the typed query) ----
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const [pickedItemId, setPickedItemId] = useState<string | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['itemSearch', storeId, debounced],
    queryFn: () => searchItems(storeId, debounced),
    enabled: !isEdit,
  });
  const items = (itemsQuery.data ?? []).filter((i) => !existingItemIds.includes(i.id));

  // ---- Draft batches ----
  const initial = useMemo<DraftBatch[]>(
    () => (line ? allLines.filter((l) => l.itemId === line.itemId).map(draftFromLine) : []),
    [line, allLines],
  );
  const [batches, setBatches] = useState<DraftBatch[]>(initial);
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = JSON.stringify(batches) !== initialJson || (!isEdit && pickedItemId != null);

  const seedFromItem = (itemId: string) => {
    setPickedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setBatches(
      item.availableBatches.map((b) => ({
        key: b.id,
        stockLineId: b.id,
        label: `${b.batch || 'No batch'}${b.expiryDate ? ` · exp ${b.expiryDate}` : ''}`,
        snapshot: b.totalNumberOfPacks,
        isNew: false,
        counted: '',
        batch: b.batch ?? '',
        expiryDate: b.expiryDate ?? '',
        packSize: b.packSize.toString(),
        reasonOptionId: null,
      })),
    );
  };

  const addNewBatch = () =>
    setBatches((bs) => [
      ...bs,
      {
        key: `new-${bs.length}-${bs.reduce((n, b) => n + b.key.length, 0)}`,
        label: 'New batch',
        snapshot: 0,
        isNew: true,
        counted: '',
        batch: '',
        expiryDate: '',
        packSize: '1',
        reasonOptionId: null,
      },
    ]);

  const patchBatch = (key: string, patch: Partial<DraftBatch>) =>
    setBatches((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const save = useMutation({
    mutationFn: async () => {
      const itemId = isEdit ? line!.itemId : pickedItemId!;
      const updates: LineUpdate[] = [];
      const inserts: LineInsert[] = [];

      for (const b of batches) {
        const counted = b.counted === '' ? undefined : Number(b.counted);
        if (b.lineId) {
          // Existing stocktake line → update.
          updates.push({
            id: b.lineId,
            countedNumberOfPacks: counted,
            batch: b.batch || undefined,
            expiryDate: b.expiryDate || null,
            packSize: b.packSize ? Number(b.packSize) : undefined,
            reasonOptionId: b.reasonOptionId ?? undefined,
          });
        } else if (b.counted !== '' || (b.isNew && b.batch)) {
          // New line (available stock batch or a brand-new batch) → insert.
          inserts.push({
            itemId,
            stockLineId: b.stockLineId,
            countedNumberOfPacks: counted,
            batch: b.isNew ? b.batch || undefined : undefined,
            expiryDate: b.isNew ? b.expiryDate || undefined : undefined,
            packSize: b.isNew && b.packSize ? Number(b.packSize) : undefined,
            reasonOptionId: b.reasonOptionId ?? undefined,
          });
        }
      }
      return batchLines(storeId, { stocktakeId, update: updates, insert: inserts });
    },
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(isEdit ? 'Line saved' : 'Lines added');
        onSaved();
      } else {
        setError(res.lineErrors.map((e) => e.message).join('; '));
      }
    },
    onError: (e) => setError((e as Error).message),
  });

  const attemptClose = () => {
    if (dirty && !save.isPending) setConfirmDiscard(true);
    else onClose();
  };

  const canSave = isEdit
    ? dirty
    : pickedItemId != null && batches.some((b) => b.counted !== '' || (b.isNew && b.batch));

  const showBatches = isEdit || pickedItemId != null;

  return (
    <>
      <Modal
        open
        onClose={attemptClose}
        title={isEdit ? `Edit ${line!.itemName}` : 'Add item'}
        size="lg"
        dismissable={!save.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={attemptClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button variant="primary" icon="check" busy={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>
              Save
            </Button>
          </>
        }
      >
        {error && (
          <Banner tone="error" title="Could not save">
            {error}
          </Banner>
        )}

        {isEdit ? (
          <div className="oms-le__item">
            <Icon name="stock" size={18} />
            <span>
              <strong>{line!.item.code}</strong> {line!.itemName}
            </span>
            {line!.item.unitName && <span className="oms-le__unit">{line!.item.unitName}</span>}
          </div>
        ) : (
          <div className="oms-le__search">
            <Select
              label="Item"
              placeholder="Search the catalogue…"
              options={items.map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` }))}
              value={pickedItemId}
              onChange={(v) => v && seedFromItem(v)}
              onQueryChange={setQuery}
              emptyMessage={itemsQuery.isFetching ? 'Searching…' : 'No matching items'}
              ariaLabel="Item"
            />
            <p className="oms-le__hint">Type to search. Items already on the stocktake are excluded.</p>
          </div>
        )}

        {showBatches && (
          <div className="oms-le__batches">
            <div className="oms-le__batches-head">
              <span>Batch</span>
              <span className="oms-align-right">Snapshot</span>
              <span className="oms-align-right">Counted</span>
              <span>Reason</span>
            </div>
            {batches.map((b) => {
              const counted = b.counted === '' ? null : Number(b.counted);
              const dir = counted == null ? null : directionOf(b.snapshot, counted);
              const dirReasons = dir ? reasonsForDirection(reasons, dir) : [];
              const reasonRequired = dir != null && dirReasons.length > 0;
              return (
                <div key={b.key} className="oms-le__batch">
                  {b.isNew ? (
                    <div className="oms-le__newbatch">
                      <TextInput
                        placeholder="Batch"
                        value={b.batch}
                        onChange={(e) => patchBatch(b.key, { batch: e.target.value })}
                        aria-label="Batch"
                      />
                      <TextInput
                        type="date"
                        value={b.expiryDate}
                        onChange={(e) => patchBatch(b.key, { expiryDate: e.target.value })}
                        aria-label="Expiry"
                      />
                      <TextInput
                        type="number"
                        placeholder="Pack size"
                        value={b.packSize}
                        onChange={(e) => patchBatch(b.key, { packSize: e.target.value })}
                        aria-label="Pack size"
                      />
                    </div>
                  ) : (
                    <span className="oms-le__batch-label">{b.label}</span>
                  )}
                  <span className="oms-align-right tabular">{b.isNew ? '—' : formatNumber(b.snapshot)}</span>
                  <TextInput
                    type="number"
                    min={0}
                    value={b.counted}
                    onChange={(e) => patchBatch(b.key, { counted: e.target.value })}
                    aria-label="Counted packs"
                  />
                  <div className="oms-le__reason">
                    {reasonRequired ? (
                      <Select
                        size="compact"
                        optional={false}
                        options={dirReasons.map((r) => ({ value: r.id, label: r.reason }))}
                        value={b.reasonOptionId}
                        onChange={(v) => patchBatch(b.key, { reasonOptionId: v })}
                        placeholder="Reason required"
                        ariaLabel="Reason"
                      />
                    ) : (
                      <span className="oms-muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}

            <Button variant="ghost" size="compact" icon="plus" onClick={addNewBatch}>
              Add new batch
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        title="Discard changes?"
        message="You have unsaved changes to this item's batches."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
      />
    </>
  );
}
