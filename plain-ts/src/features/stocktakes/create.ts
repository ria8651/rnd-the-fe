// S2 — Create flow. Choose a mode (Full / Filtered / Blank / Initial) and its
// parameters, preview an estimated line count, then create and land on the new
// stocktake's detail screen (J2 / J10). Spec:
// ../../../spec/stocktakes/05-ui-surface.md#s2--create-flow

import { el, mount } from '../../framework/dom.ts';
import { effect, signal } from '../../framework/signal.ts';
import { navigate } from '../../framework/router.ts';
import { uuid } from '../../framework/id.ts';
import { select } from '../../components/select.ts';
import { icon } from '../../components/icon.ts';
import { toast } from '../../components/toast.ts';
import { insertStocktake, type InsertStocktakeInput } from '../../api/stocktakes.ts';
import {
  estimateFiltered,
  estimateFull,
  fetchActiveVvmStatuses,
  fetchLocations,
  fetchMasterLists,
  type Location,
  type MasterList,
  type VvmStatus,
} from '../../api/reference.ts';
import { GraphQLError } from '../../api/client.ts';
import './create.css';

type Mode = 'full' | 'filtered' | 'blank' | 'initial';

const MODES: { mode: Mode; title: string; desc: string }[] = [
  { mode: 'full', title: 'Full', desc: 'Count everything currently in stock.' },
  { mode: 'filtered', title: 'Filtered', desc: 'Count a subset by list, location, VVM or expiry.' },
  { mode: 'blank', title: 'Blank', desc: "Start empty and add lines yourself." },
  { mode: 'initial', title: 'Initial', desc: 'Opening balances for every item (once per store).' },
];

export function renderCreateStocktake(storeId: string): HTMLElement {
  const mode = signal<Mode>('full');
  const description = signal<string>('');

  // Full options
  const includeAllItems = signal<boolean>(false);
  // Filtered options
  const masterListId = signal<string | null>(null);
  const locationId = signal<string | null>(null);
  const vvmStatusId = signal<string | null>(null);
  const expiresBefore = signal<string>('');
  const includeAllMasterListItems = signal<boolean>(false);

  const masterLists = signal<MasterList[]>([]);
  const locations = signal<Location[]>([]);
  const vvmStatuses = signal<VvmStatus[]>([]);

  const estimate = signal<number | null>(null);
  const estimating = signal<boolean>(false);
  const saving = signal<boolean>(false);

  // Load reference data for the Filtered mode lazily but once.
  let refLoaded = false;
  async function ensureRefData() {
    if (refLoaded) return;
    refLoaded = true;
    try {
      const [ml, loc, vvm] = await Promise.all([
        fetchMasterLists(storeId),
        fetchLocations(storeId),
        fetchActiveVvmStatuses(storeId),
      ]);
      masterLists.set(ml);
      locations.set(loc);
      vvmStatuses.set(vvm);
    } catch {
      toast('Could not load filter options.', 'warning');
    }
  }

  function resetModeInputs() {
    includeAllItems.set(false);
    masterListId.set(null);
    locationId.set(null);
    vvmStatusId.set(null);
    expiresBefore.set('');
    includeAllMasterListItems.set(false);
    estimate.set(null);
  }

  function setMode(next: Mode) {
    if (mode() === next) return;
    mode.set(next);
    resetModeInputs();
    if (next === 'filtered') ensureRefData();
    recomputeEstimate();
  }

  // Debounced estimate recompute for Full/Filtered.
  let estimateToken = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  function recomputeEstimate() {
    clearTimeout(debounceTimer);
    const m = mode();
    if (m === 'blank' || m === 'initial') {
      estimate.set(null);
      return;
    }
    debounceTimer = setTimeout(async () => {
      const token = ++estimateToken;
      estimating.set(true);
      try {
        const count =
          m === 'full'
            ? await estimateFull({ storeId, includeAllItems: includeAllItems() })
            : await estimateFiltered({
                storeId,
                masterListId: masterListId() ?? undefined,
                locationId: locationId() ?? undefined,
                vvmStatusId: vvmStatusId() ?? undefined,
                expiresBefore: expiresBefore() || undefined,
                includeAllMasterListItems: includeAllMasterListItems(),
                masterListLinesCount: masterLists().find((l) => l.id === masterListId())?.linesCount,
              });
        if (token === estimateToken) estimate.set(count);
      } catch {
        if (token === estimateToken) estimate.set(null);
      } finally {
        if (token === estimateToken) estimating.set(false);
      }
    }, 250);
  }

  async function onCreate() {
    saving.set(true);
    const input: InsertStocktakeInput = { id: uuid() };
    if (description().trim()) input.description = description().trim();

    switch (mode()) {
      case 'full':
        if (includeAllItems()) input.isAllItemsStocktake = true;
        break;
      case 'blank':
        input.createBlankStocktake = true;
        break;
      case 'initial':
        input.isInitialStocktake = true;
        break;
      case 'filtered':
        if (masterListId()) input.masterListId = masterListId()!;
        if (locationId()) input.locationId = locationId()!;
        if (vvmStatusId()) input.vvmStatusId = vvmStatusId()!;
        if (expiresBefore()) input.expiresBefore = expiresBefore();
        if (includeAllMasterListItems() && masterListId()) input.includeAllMasterListItems = true;
        break;
    }

    try {
      const res = await insertStocktake(input, storeId);
      if (res.ok) {
        toast(`Created stocktake #${res.value.stocktakeNumber}.`, 'success');
        navigate(`/stocktakes/${res.value.id}`);
      } else {
        toast(res.error, 'error');
        saving.set(false);
      }
    } catch (e) {
      toast(e instanceof GraphQLError ? e.message : 'Could not create stocktake.', 'error');
      saving.set(false);
    }
  }

  const container = el('div', { style: { display: 'contents' } });

  effect(() => {
    const m = mode();

    const modeCards = el(
      'div',
      { class: 'mode-grid', role: 'radiogroup', 'aria-label': 'Stocktake type' },
      ...MODES.map((def) =>
        el(
          'button',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': m === def.mode ? 'true' : 'false',
            class: `mode-card ${m === def.mode ? 'selected' : ''}`,
            onclick: () => setMode(def.mode),
          },
          el('span', { class: 'mode-title' }, def.title),
          el('span', { class: 'mode-desc' }, def.desc),
        ),
      ),
    );

    // Mode-specific options
    let options: Node = el('div');
    if (m === 'full') {
      options = toggleRow('Include items with no stock on hand', includeAllItems, () => recomputeEstimate());
    } else if (m === 'filtered') {
      options = el(
        'div',
        { class: 'form-section' },
        labelled('Master list', () =>
          select<string | null>({
            options: [
              { value: null, label: 'Any' },
              ...masterLists().map((l) => ({ value: l.id, label: `${l.name} (${l.linesCount})` })),
            ],
            value: masterListId(),
            placeholder: 'Any',
            ariaLabel: 'Master list',
            onChange: (v) => {
              masterListId.set(v);
              if (!v) includeAllMasterListItems.set(false);
              recomputeEstimate();
            },
          }),
        ),
        labelled('Location', () =>
          select<string | null>({
            options: [
              { value: null, label: 'Any' },
              ...locations().map((l) => ({ value: l.id, label: l.name })),
            ],
            value: locationId(),
            placeholder: 'Any',
            ariaLabel: 'Location',
            onChange: (v) => { locationId.set(v); recomputeEstimate(); },
          }),
        ),
        labelled('VVM status', () =>
          select<string | null>({
            options: [
              { value: null, label: 'Any' },
              ...vvmStatuses().map((v) => ({ value: v.id, label: v.description })),
            ],
            value: vvmStatusId(),
            placeholder: 'Any',
            ariaLabel: 'VVM status',
            onChange: (v) => { vvmStatusId.set(v); recomputeEstimate(); },
          }),
        ),
        labelled('Expires before', () =>
          el('input', {
            type: 'date',
            class: 'input',
            value: expiresBefore(),
            'aria-label': 'Expires before',
            oninput: (e: Event) => { expiresBefore.set((e.target as HTMLInputElement).value); recomputeEstimate(); },
          }),
        ),
        toggleRow(
          'Include all master-list items (incl. zero stock)',
          includeAllMasterListItems,
          () => recomputeEstimate(),
          () => masterListId() == null,
        ),
      );
    }

    // Feedback
    let feedback: Node;
    if (m === 'blank') {
      feedback = el('div', { class: 'estimate' }, icon('info', 20), 'A blank stocktake will be created with no lines.');
    } else if (m === 'initial') {
      feedback = el(
        'div',
        { class: 'estimate' },
        icon('info', 20),
        'Generates an opening-balance line for every visible item. Allowed once per store.',
      );
    } else {
      feedback = el(
        'div',
        { class: 'estimate' },
        icon('columns', 20),
        estimating()
          ? el('span', { class: 'muted' }, 'Estimating…')
          : el(
              'span',
              null,
              'Estimated lines: ',
              el('span', { class: 'count' }, estimate() == null ? '—' : String(estimate())),
            ),
      );
    }

    mount(
      container,
      el(
        'div',
        { class: 'create-screen' },
        el('h1', null, 'New stocktake'),
        modeCards,
        labelled('Description (optional)', () =>
          el('input', {
            type: 'text',
            class: 'input',
            value: description(),
            placeholder: 'e.g. Monthly count — cold room',
            'aria-label': 'Description',
            oninput: (e: Event) => description.set((e.target as HTMLInputElement).value),
          }),
        ),
        options,
        feedback,
        el(
          'div',
          { class: 'create-actions' },
          el('button', { class: 'btn btn-secondary', onclick: () => navigate('/stocktakes') }, 'Cancel'),
          el(
            'button',
            { class: 'btn btn-primary', 'aria-busy': () => (saving() ? 'true' : 'false'), disabled: () => saving(), onclick: onCreate },
            () => (saving() ? 'Creating…' : 'Create'),
          ),
        ),
      ),
    );
  });

  recomputeEstimate();
  return container;
}

// ---- small local helpers ----

function labelled(label: string, control: () => Node): HTMLElement {
  return el('div', { class: 'form-row' }, el('label', null, label), control);
}

function toggleRow(
  label: string,
  sig: { (): boolean; set(v: boolean): void },
  onToggle: () => void,
  disabled?: () => boolean,
): HTMLElement {
  return el(
    'label',
    { class: () => `toggle ${disabled?.() ? 'disabled' : ''}` },
    el('input', {
      type: 'checkbox',
      checked: () => sig(),
      disabled: () => disabled?.() ?? false,
      onchange: (e: Event) => { sig.set((e.target as HTMLInputElement).checked); onToggle(); },
    }),
    el('span', null, label),
  );
}
