import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/app/layout/PageLayout';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusCrumbs } from '@/components/StatusCrumbs';
import { SplitButton } from '@/components/SplitButton';
import { EditableField } from '@/components/EditableField';
import { TextInput } from '@/components/Field';
import { Toggle } from '@/components/Toggle';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/icons/Icon';
import { useToast } from '@/components/Toast';
import { useStoreId } from '@/app/auth/AuthContext';
import { formatDate, formatDateTime, formatSigned, formatNumber } from '@/lib/format';
import { fetchStocktakeByNumber } from './api';
import {
  fetchReasonOptions,
  fetchStocktakeLines,
  finaliseStocktake,
  updateStocktakeHeader,
} from './linesApi';
import { LineEditor } from './LineEditor';
import { BulkLineActions } from './BulkLineActions';
import type { StocktakeLine } from './types';
import './StocktakeDetailPage.css';

export function StocktakeDetailPage() {
  const { number } = useParams();
  const storeId = useStoreId();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [showPanel, setShowPanel] = useState(true);
  const [itemFilter, setItemFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editorFor, setEditorFor] = useState<StocktakeLine | 'new' | null>(null);
  const [confirmFinalise, setConfirmFinalise] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [finaliseStatus, setFinaliseStatus] = useState<'FINALISED'>('FINALISED');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [mismatchKeys, setMismatchKeys] = useState<Set<string>>(new Set()); // snapshot-cell
  const [reducedKeys, setReducedKeys] = useState<Set<string>>(new Set()); // counted-cell

  // Header (by number → gives id used for line queries + mutations).
  const headerQuery = useQuery({
    queryKey: ['stocktake', storeId, number],
    queryFn: () => fetchStocktakeByNumber(storeId!, Number(number)),
    enabled: !!storeId && !!number,
  });
  const st = headerQuery.data;
  const stocktakeId = st?.id;

  const linesQuery = useQuery({
    queryKey: ['stocktakeLines', storeId, stocktakeId],
    queryFn: () => fetchStocktakeLines(storeId!, stocktakeId!),
    enabled: !!storeId && !!stocktakeId,
  });
  const reasonsQuery = useQuery({
    queryKey: ['reasons', storeId],
    queryFn: () => fetchReasonOptions(),
    enabled: !!storeId,
  });

  const lines = linesQuery.data?.nodes ?? [];
  const editable = st?.status === 'NEW' && !st?.isLocked;

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['stocktake', storeId, number] });
    qc.invalidateQueries({ queryKey: ['stocktakeLines', storeId, stocktakeId] });
    // A corrective edit clears the previous finalise-failure markers (they refer to stale data).
    setBannerError(null);
    setMismatchKeys(new Set());
    setReducedKeys(new Set());
  };

  // ---- Header in-place saves ----
  const saveHeader = (patch: Record<string, string>) =>
    updateStocktakeHeader(storeId!, { id: stocktakeId!, ...patch }).then(() => {
      qc.invalidateQueries({ queryKey: ['stocktake', storeId, number] });
    });

  const lockMutation = useMutation({
    mutationFn: (isLocked: boolean) =>
      updateStocktakeHeader(storeId!, { id: stocktakeId!, isLocked }),
    onSuccess: () => refetchAll(),
    onError: (e) => toast.error((e as Error).message),
  });

  const finalise = useMutation({
    mutationFn: () => finaliseStocktake(storeId!, stocktakeId!),
    onSuccess: (res) => {
      setConfirmFinalise(false);
      if (res.ok) {
        setBannerError(null);
        setMismatchKeys(new Set());
        setReducedKeys(new Set());
        toast.success('Stocktake finalised');
        refetchAll();
      } else {
        setBannerError(res.bannerError ?? 'Finalise failed');
        setMismatchKeys(new Set(res.mismatchKeys ?? []));
        setReducedKeys(new Set(res.reducedKeys ?? []));
        toast.error('Finalise blocked — see errors');
      }
    },
    onError: (e) => {
      setConfirmFinalise(false);
      toast.error((e as Error).message);
    },
  });

  const filteredLines = useMemo(() => {
    const q = itemFilter.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(
      (l) =>
        l.itemName.toLowerCase().includes(q) ||
        l.item.code.toLowerCase().includes(q) ||
        (l.batch ?? '').toLowerCase().includes(q),
    );
  }, [lines, itemFilter]);

  const errorOn = useMemo(() => {
    const mismatch = (l: StocktakeLine) => mismatchKeys.has(l.id);
    const reduced = (l: StocktakeLine) => (l.stockLine?.id ? reducedKeys.has(l.stockLine.id) : false);
    return {
      mismatch, // → snapshot cell
      reduced, //  → counted cell
      any: (l: StocktakeLine) => mismatch(l) || reduced(l),
    };
  }, [mismatchKeys, reducedKeys]);
  const lineHasError = errorOn.any;

  const columns = useMemo<Column<StocktakeLine>[]>(() => {
    const diff = (l: StocktakeLine) =>
      l.countedNumberOfPacks == null ? 0 : l.countedNumberOfPacks - l.snapshotNumberOfPacks;
    return [
      {
        key: 'code',
        header: 'Code',
        priority: 1,
        width: 120,
        render: (l) => (
          <span className="oms-line-code">
            {lineHasError(l) && (
              <Icon
                name="circle-alert"
                size={14}
                title="This line blocked finalise"
                className="oms-line-err"
              />
            )}
            {l.item.code}
          </span>
        ),
      },
      { key: 'name', header: 'Item', priority: 1, render: (l) => l.itemName },
      { key: 'batch', header: 'Batch', priority: 3, render: (l) => l.batch || '—' },
      {
        key: 'expiry',
        header: 'Expiry',
        priority: 2,
        width: 110,
        render: (l) => (l.expiryDate ? formatDate(l.expiryDate) : '—'),
      },
      {
        key: 'manufactureDate',
        header: 'Manufactured',
        priority: 3,
        width: 120,
        render: (l) => (l.manufactureDate ? formatDate(l.manufactureDate) : '—'),
      },
      { key: 'location', header: 'Location', priority: 3, render: (l) => l.location?.name || '—' },
      { key: 'unitName', header: 'Unit', priority: 2, width: 90, render: (l) => l.item.unitName || '—' },
      {
        key: 'packSize',
        header: 'Pack size',
        priority: 2,
        align: 'right',
        width: 90,
        render: (l) => formatNumber(l.packSize),
      },
      {
        key: 'snapshot',
        header: 'Snapshot',
        priority: 1,
        align: 'right',
        width: 110,
        render: (l) => (
          <span className="oms-cell-num">
            {errorOn.mismatch(l) && (
              <Icon
                name="circle-alert"
                size={14}
                title="Snapshot no longer matches current stock"
                className="oms-line-err"
              />
            )}
            {formatNumber(l.snapshotNumberOfPacks)}
          </span>
        ),
      },
      {
        key: 'counted',
        header: 'Counted',
        priority: 1,
        align: 'right',
        width: 110,
        render: (l) => (
          <span className="oms-cell-num">
            {errorOn.reduced(l) && (
              <Icon
                name="circle-alert"
                size={14}
                title="This count would reduce stock below zero"
                className="oms-line-err"
              />
            )}
            {l.countedNumberOfPacks == null ? (
              <span className="oms-muted">—</span>
            ) : (
              formatNumber(l.countedNumberOfPacks)
            )}
          </span>
        ),
      },
      {
        key: 'difference',
        header: 'Difference',
        priority: 1,
        align: 'right',
        width: 100,
        render: (l) => {
          const d = diff(l);
          return <span className={d !== 0 ? 'oms-diff' : undefined}>{formatSigned(d)}</span>;
        },
      },
      { key: 'reason', header: 'Reason', priority: 2, render: (l) => l.reasonOption?.reason || '—' },
      { key: 'manufacturer', header: 'Manufacturer', priority: 3, render: (l) => l.manufacturer?.name || '—' },
      {
        key: 'comment',
        header: 'Comment',
        priority: 3,
        render: (l) => l.comment || '—',
      },
    ];
  }, [errorOn]);

  // ---- Finalise guard: needs at least one counted line ----
  const hasCountedLine = lines.some((l) => l.countedNumberOfPacks != null);
  const onFinaliseActivate = () => {
    if (!hasCountedLine) {
      toast.info('Nothing counted yet — count at least one line to finalise.');
      return;
    }
    setConfirmFinalise(true);
  };

  // ---- App bar ----
  const appBar = (
    <div className="oms-detail-appbar">
      <div className="oms-detail-appbar__top">
        <Button variant="ghost" size="compact" icon="arrow-left" onClick={() => navigate('/inventory/stocktakes')}>
          Stocktakes
        </Button>
        {st && (
          <>
            <h1 className="oms-detail-appbar__title">Stocktake #{st.stocktakeNumber}</h1>
            <StatusBadge
              label={st.status === 'NEW' ? 'New' : 'Finalised'}
              tone={st.status === 'NEW' ? 'info' : 'success'}
            />
          </>
        )}
        <div className="oms-detail-appbar__spacer" />
        <Button
          variant="secondary"
          size="compact"
          icon="plus-circle"
          disabled={!editable}
          onClick={() => setEditorFor('new')}
        >
          Add item
        </Button>
        <Button
          variant="ghost"
          size="compact"
          icon="printer"
          aria-label="Generate report"
          title="Generate report"
          onClick={() => toast.info('Report generation is out of scope for this build.')}
        />
        <Button
          variant="ghost"
          size="compact"
          icon="sidebar"
          aria-label="Toggle details"
          title="Toggle details"
          onClick={() => setShowPanel((v) => !v)}
        />
      </div>
      <div className="oms-detail-appbar__meta">
        <EditableField
          label="Description"
          value={st?.description ?? ''}
          readOnly={!editable}
          placeholder="Add a description"
          onSave={(v) => saveHeader({ description: v })}
        />
        <TextInput
          label="Find item in this stocktake"
          placeholder="Filter lines…"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
        />
      </div>
    </div>
  );

  // ---- Footer: bulk bar when selecting, else lifecycle controls ----
  const footer =
    selected.size > 0 ? (
      <BulkLineActions
        storeId={storeId!}
        stocktakeId={stocktakeId!}
        selectedIds={[...selected]}
        reasons={reasonsQuery.data ?? []}
        onClear={() => setSelected(new Set())}
        onDone={() => {
          setSelected(new Set());
          refetchAll();
        }}
      />
    ) : st ? (
      <div className="oms-detail-footer">
        <div className="oms-detail-footer__lock">
          <Toggle
            checked={st.isLocked}
            disabled={st.status === 'FINALISED' || lockMutation.isPending}
            onChange={(v) => lockMutation.mutate(v)}
            label="On hold"
          />
        </div>
        <StatusCrumbs
          currentKey={st.status}
          steps={[
            { key: 'NEW', label: 'New', reachedAt: st.createdDatetime },
            { key: 'FINALISED', label: 'Finalised', reachedAt: st.finalisedDatetime },
          ]}
        />
        <div className="oms-detail-footer__spacer" />
        {editable && (
          <SplitButton
            options={[
              { key: 'NEW', label: 'New', disabled: true },
              { key: 'FINALISED', label: 'Save and confirm' },
            ]}
            selectedKey={finaliseStatus}
            onSelectedChange={(k) => setFinaliseStatus(k as 'FINALISED')}
            onActivate={onFinaliseActivate}
            busy={finalise.isPending}
          />
        )}
      </div>
    ) : undefined;

  // ---- Side panel ----
  const sidePanel = st ? (
    <div className="oms-detail-panel">
      <h2 className="oms-detail-panel__heading">Details</h2>
      <EditableField
        label="Counted by"
        value={st.countedBy ?? ''}
        readOnly={!editable}
        onSave={(v) => saveHeader({ countedBy: v })}
      />
      <EditableField
        label="Verified by"
        value={st.verifiedBy ?? ''}
        readOnly={!editable}
        onSave={(v) => saveHeader({ verifiedBy: v })}
      />
      <EditableField
        label="Comment"
        value={st.comment ?? ''}
        readOnly={!editable}
        multiline
        onSave={(v) => saveHeader({ comment: v })}
      />
      <dl className="oms-detail-panel__facts">
        <Fact label="Entered by" value={st.user?.username || '—'} />
        <Fact label="Created" value={formatDateTime(st.createdDatetime)} />
        <Fact label="Finalised" value={st.finalisedDatetime ? formatDateTime(st.finalisedDatetime) : '—'} />
      </dl>
      <div className="oms-detail-panel__actions">
        <Button
          variant="ghost"
          size="compact"
          icon="copy"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(st, null, 2));
            toast.success('Copied record to clipboard');
          }}
        >
          Copy
        </Button>
        {editable && (
          <Button variant="destructive" size="compact" icon="delete" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <PageLayout appBar={appBar} footer={footer} sidePanel={sidePanel} sidePanelOpen={showPanel}>
      {/* Editability messaging (locked = reversible, finalised = permanent) */}
      {st?.status === 'FINALISED' && (
        <Banner tone="info" title="Finalised — read only">
          This stocktake is finalised. Its differences have been applied as inventory
          adjustments and it can no longer be edited.
        </Banner>
      )}
      {st?.status === 'NEW' && st.isLocked && (
        <Banner
          tone="warning"
          title="On hold — editing is blocked"
          action={
            <Button variant="secondary" size="compact" onClick={() => lockMutation.mutate(false)}>
              Unlock to edit
            </Button>
          }
        >
          Turn off "On hold" to resume editing.
        </Banner>
      )}
      {bannerError && (
        <Banner tone="error" title="Finalise blocked">
          {bannerError}
        </Banner>
      )}

      <div className="oms-detail-table">
        <DataTable
          caption="Stocktake lines"
          columns={columns}
          rows={filteredLines}
          rowKey={(l) => l.id}
          selectable={editable}
          selectedIds={selected}
          onSelectionChange={setSelected}
          onRowClick={(l) => setEditorFor(l)}
          rowError={lineHasError}
          loading={linesQuery.isLoading}
          error={linesQuery.isError ? (linesQuery.error as Error).message : undefined}
          onRetry={() => linesQuery.refetch()}
          isFiltered={!!itemFilter}
          onClearFilters={() => setItemFilter('')}
          emptyMessage={editable ? 'No lines yet — add an item to start counting' : 'No lines'}
          emptyFilteredMessage="No lines match your search"
        />
      </div>

      {editorFor && stocktakeId && (
        <LineEditor
          storeId={storeId!}
          stocktakeId={stocktakeId}
          line={editorFor === 'new' ? null : editorFor}
          allLines={lines}
          existingItemIds={lines.map((l) => l.itemId)}
          reasons={reasonsQuery.data ?? []}
          onClose={() => setEditorFor(null)}
          onSaved={() => {
            setEditorFor(null);
            refetchAll();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmFinalise}
        onClose={() => setConfirmFinalise(false)}
        onConfirm={() => finalise.mutate()}
        title="Finalise stocktake?"
        message="This applies all counted differences as inventory adjustments and cannot be undone. Uncounted lines are removed."
        confirmLabel="Save and confirm"
        busy={finalise.isPending}
      />
      <DeleteStocktakeConfirm
        open={confirmDelete}
        storeId={storeId!}
        id={stocktakeId}
        onClose={() => setConfirmDelete(false)}
        onDeleted={() => {
          toast.success('Stocktake deleted');
          navigate('/inventory/stocktakes');
        }}
      />
    </PageLayout>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="oms-detail-panel__fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Delete uses the header batch-delete endpoint from the list api.
import { deleteStocktakes } from './api';
function DeleteStocktakeConfirm({
  open,
  storeId,
  id,
  onClose,
  onDeleted,
}: {
  open: boolean;
  storeId: string;
  id: string | undefined;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const del = useMutation({
    mutationFn: () => deleteStocktakes(storeId, [id!]),
    onSuccess: (res) => {
      onClose();
      if (res[0]?.ok) onDeleted();
      else toast.error(res[0]?.error ?? 'Could not delete');
    },
    onError: (e) => {
      onClose();
      toast.error((e as Error).message);
    },
  });
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => del.mutate()}
      title="Delete this stocktake?"
      message="This cannot be undone."
      confirmLabel="Delete"
      destructive
      busy={del.isPending}
    />
  );
}
