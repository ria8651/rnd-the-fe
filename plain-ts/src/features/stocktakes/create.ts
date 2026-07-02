import { h, when } from '../../core/dom';
import { signal, effect } from '../../core/signal';
import { openModal, modalShell } from '../../components/modal';
import { button } from '../../components/button';
import { combobox } from '../../components/combobox';
import { textField } from '../../components/input';
import { toast } from '../../components/toast';
import { navigate } from '../../core/router';
import { insertStocktake, type InsertStocktakeInput } from '../../api/stocktakes';
import { fetchLocations, searchMasterLists, countStockLines } from '../../api/reference';
import { currentStoreId } from '../../context/auth';
import type { LocationRef } from '../../api/types';

type Mode = 'full' | 'filtered' | 'blank' | 'initial';

function uuid(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase();
}

export function openCreateFlow() {
  const store = currentStoreId();
  if (!store) return;

  const [mode, setMode] = signal<Mode>('full');
  const [includeAllItems, setIncludeAllItems] = signal(false);
  const [includeAllMaster, setIncludeAllMaster] = signal(false);
  const [locationId, setLocationId] = signal<string | null>(null);
  const [masterListId, setMasterListId] = signal<string | null>(null);
  const [masterListLabel, setMasterListLabel] = signal<string>('');
  const [expiresBefore, setExpiresBefore] = signal<string>('');
  const [description, setDescription] = signal('');
  const [estimate, setEstimate] = signal<number | null>(null);
  const [estimating, setEstimating] = signal(false);
  const [saving, setSaving] = signal(false);

  let locations: LocationRef[] = [];
  fetchLocations(store).then((l) => (locations = l)).catch(() => {});

  // Switching mode resets the other inputs (S2).
  const switchMode = (m: Mode) => {
    setMode(m);
    setIncludeAllItems(false);
    setIncludeAllMaster(false);
    setLocationId(null);
    setMasterListId(null);
    setMasterListLabel('');
    setExpiresBefore('');
  };

  // Recompute the estimated line count when inputs change.
  effect(() => {
    const m = mode();
    // read deps
    const loc = locationId();
    const exp = expiresBefore();
    const allItems = includeAllItems();
    const allMaster = includeAllMaster();
    if (m === 'blank') { setEstimate(0); return; }
    if (m === 'initial') { setEstimate(null); return; }
    if ((m === 'full' && allItems) || (m === 'filtered' && allMaster && masterListId())) {
      setEstimate(null); // "all items" — count not a simple stock-line query
      return;
    }
    setEstimating(true);
    countStockLines(store, { locationId: loc || undefined, expiresBefore: exp || undefined })
      .then((n) => setEstimate(n))
      .catch(() => setEstimate(null))
      .finally(() => setEstimating(false));
  });

  const create = async () => {
    setSaving(true);
    const input: InsertStocktakeInput = { id: uuid() };
    if (description().trim()) input.description = description().trim();
    const m = mode();
    if (m === 'blank') input.createBlankStocktake = true;
    else if (m === 'initial') input.isInitialStocktake = true;
    else if (m === 'full') {
      if (includeAllItems()) input.isAllItemsStocktake = true;
    } else {
      if (locationId()) input.locationId = locationId()!;
      if (masterListId()) input.masterListId = masterListId()!;
      if (includeAllMaster()) input.includeAllMasterListItems = true;
      if (expiresBefore()) input.expiresBefore = expiresBefore();
    }
    try {
      const res = await insertStocktake(store, input);
      toast(`Created stocktake #${res.stocktakeNumber}.`, 'success');
      close();
      navigate(`/${store}/inventory/stocktakes/${res.stocktakeNumber}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create stocktake', 'error');
      setSaving(false);
    }
  };

  let close = () => {};

  const modeButton = (m: Mode, label: string, desc: string) =>
    h('button', {
      type: 'button',
      class: () => `menu__item${mode() === m ? ' selected' : ''}`,
      style: { border: '1px solid var(--border-default)', 'border-radius': 'var(--radius-control)', 'flex-direction': 'column', 'align-items': 'flex-start', gap: '2px', 'margin-bottom': 'var(--sp-2)' },
      'aria-pressed': () => (mode() === m ? 'true' : 'false'),
      onclick: () => switchMode(m),
    }, h('strong', null, label), h('span', { class: 'small muted' }, desc));

  const options = when(
    () => mode() === 'full' || mode() === 'filtered',
    () => {
      if (mode() === 'full') {
        return h('label', { class: 'row', style: { gap: 'var(--sp-2)' } },
          h('input', { type: 'checkbox', checked: includeAllItems, onchange: (e: Event) => setIncludeAllItems((e.target as HTMLInputElement).checked) }),
          h('span', null, 'Include items with no stock on hand'),
        );
      }
      return h('div', { class: 'stack' },
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Location'),
          combobox<LocationRef>({
            value: locationId,
            selectedLabel: () => locations.find((l) => l.id === locationId())?.name ?? '',
            placeholder: 'Any location',
            required: false,
            loadOptions: (q) => locations.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())).map((l) => ({ value: l.id, label: l.name })),
            onSelect: (v) => setLocationId(v),
          }),
        ),
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Master list'),
          combobox({
            value: masterListId,
            selectedLabel: masterListLabel,
            placeholder: 'Any master list',
            required: false,
            async: true,
            loadOptions: async (q) => (await searchMasterLists(store, q)).map((m) => ({ value: m.id, label: m.name })),
            onSelect: (v, opt) => { setMasterListId(v); setMasterListLabel(opt?.label ?? ''); },
          }),
        ),
        h('label', { class: 'row', style: { gap: 'var(--sp-2)' } },
          h('input', { type: 'checkbox', checked: includeAllMaster, disabled: () => !masterListId(), onchange: (e: Event) => setIncludeAllMaster((e.target as HTMLInputElement).checked) }),
          h('span', null, 'Include all master-list items (incl. zero stock)'),
        ),
        textField({ label: 'Expires before', type: 'date', value: expiresBefore, onInput: setExpiresBefore, maxWidth: '200px' }),
      );
    },
  );

  const feedback = () => {
    if (mode() === 'blank') return h('div', { class: 'banner banner--info' }, 'A blank stocktake with no lines will be created; add items yourself.');
    if (mode() === 'initial') return h('div', { class: 'banner banner--info' }, 'Generates a line for every visible stock item to set opening balances. Allowed once per store.');
    if (estimating()) return h('div', { class: 'row muted small' }, h('span', { class: 'spinner' }), 'Estimating…');
    if (estimate() === null) return h('div', { class: 'banner banner--info' }, 'Lines will be generated for all matching items (incl. zero stock).');
    return h('div', { class: 'banner banner--info' }, `Estimated lines: ${estimate()}`);
  };

  openModal((doClose) => {
    close = doClose;
    const body = h('div', { class: 'stack' },
      h('div', null,
        modeButton('full', 'Full', 'Count everything on hand.'),
        modeButton('filtered', 'Filtered', 'Count a subset by list, location, or expiry.'),
        modeButton('blank', 'Blank', "Add lines yourself."),
        modeButton('initial', 'Initial (opening balance)', 'One-time count of all items for a new store.'),
      ),
      options,
      textField({ label: 'Description (optional)', value: description, onInput: setDescription, maxWidth: '600px' }),
      feedback,
    );
    const footer = h('div', { class: 'row' },
      button({ label: 'Cancel', variant: 'secondary', onClick: doClose }),
      button({ label: 'Create', variant: 'primary', onClick: create, busy: saving }),
    );
    return modalShell({ title: 'New stocktake', body, footer, close: doClose });
  }, { beforeClose: () => !saving() });
}
