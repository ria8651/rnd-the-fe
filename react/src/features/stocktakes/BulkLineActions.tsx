import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Select } from '@/components/Select';
import { useToast } from '@/components/Toast';
import { batchLines } from './linesApi';
import { fetchLocations } from './refData';
import { reasonsForDirection } from './reasons';
import type { LineReason } from './types';
import './BulkLineActions.css';

/**
 * Bulk line-action bar shown in the action footer when lines are selected (spec J5).
 * - Reduce to zero: sets counted = 0 for the selection; because that is a reduction,
 *   the dialog requires a reason whenever reduction reasons are configured (AC-E8),
 *   and applies it to every selected line.
 * - Change location: reassigns location in bulk.
 * - Delete selected.
 */
interface BulkLineActionsProps {
  storeId: string;
  stocktakeId: string;
  selectedIds: string[];
  reasons: LineReason[];
  onClear: () => void;
  onDone: () => void;
}

export function BulkLineActions({
  storeId,
  stocktakeId,
  selectedIds,
  reasons,
  onClear,
  onDone,
}: BulkLineActionsProps) {
  const toast = useToast();
  const [dialog, setDialog] = useState<'zero' | 'location' | 'delete' | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const reductionReasons = reasonsForDirection(reasons, 'negative');
  const reasonRequired = reductionReasons.length > 0;

  const locations = useQuery({
    queryKey: ['locations', storeId],
    queryFn: () => fetchLocations(storeId),
    enabled: dialog === 'location',
  });

  const run = useMutation({
    mutationFn: (kind: 'zero' | 'location' | 'delete') => {
      if (kind === 'delete') {
        return batchLines(storeId, { stocktakeId, delete: selectedIds });
      }
      if (kind === 'zero') {
        return batchLines(storeId, {
          stocktakeId,
          update: selectedIds.map((id) => ({
            id,
            countedNumberOfPacks: 0,
            reasonOptionId: reasonId ?? undefined,
          })),
        });
      }
      return batchLines(storeId, {
        stocktakeId,
        update: selectedIds.map((id) => ({ id, location: locationId })),
      });
    },
    onSuccess: (res) => {
      setDialog(null);
      if (res.ok) {
        toast.success('Lines updated');
        onDone();
      } else {
        toast.error(res.lineErrors.map((e) => e.message).join('; '));
      }
    },
    onError: (e) => {
      setDialog(null);
      toast.error((e as Error).message);
    },
  });

  return (
    <div className="oms-bulkbar">
      <Button variant="ghost" size="compact" icon="minus-circle" onClick={onClear}>
        Clear
      </Button>
      <span className="oms-bulkbar__count">{selectedIds.length} selected</span>
      <div className="oms-bulkbar__spacer" />
      <Button variant="secondary" size="compact" icon="rewind" onClick={() => setDialog('zero')}>
        Reduce to zero
      </Button>
      <Button variant="secondary" size="compact" icon="location" onClick={() => setDialog('location')}>
        Change location
      </Button>
      <Button variant="destructive" size="compact" icon="delete" onClick={() => setDialog('delete')}>
        Delete
      </Button>

      {/* Reduce to zero — captures a required reason when reduction reasons exist. */}
      <ConfirmDialog
        open={dialog === 'zero'}
        onClose={() => setDialog(null)}
        onConfirm={() => run.mutate('zero')}
        title={`Reduce ${selectedIds.length} line${selectedIds.length === 1 ? '' : 's'} to zero?`}
        message="This sets the counted quantity to 0 for every selected line."
        confirmLabel="Reduce to zero"
        busy={run.isPending}
        confirmDisabled={reasonRequired && !reasonId}
      >
        {reasonRequired && (
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <Select
              label="Reason"
              optional={false}
              options={reductionReasons.map((r) => ({ value: r.id, label: r.reason }))}
              value={reasonId}
              onChange={setReasonId}
              placeholder="Choose a reason"
            />
          </div>
        )}
      </ConfirmDialog>

      {/* Change location */}
      <ConfirmDialog
        open={dialog === 'location'}
        onClose={() => setDialog(null)}
        onConfirm={() => run.mutate('location')}
        title={`Change location of ${selectedIds.length} line${selectedIds.length === 1 ? '' : 's'}`}
        confirmLabel="Apply"
        busy={run.isPending}
        confirmDisabled={!locationId}
      >
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <Select
            label="Location"
            options={(locations.data ?? []).map((l) => ({ value: l.id, label: l.label }))}
            value={locationId}
            onChange={setLocationId}
            placeholder="Choose a location"
            emptyMessage={locations.isLoading ? 'Loading…' : 'No locations configured'}
          />
        </div>
      </ConfirmDialog>

      {/* Delete */}
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() => run.mutate('delete')}
        title={`Delete ${selectedIds.length} line${selectedIds.length === 1 ? '' : 's'}?`}
        message="This removes the selected lines from the stocktake."
        confirmLabel="Delete"
        destructive
        busy={run.isPending}
      />
    </div>
  );
}
