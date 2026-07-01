/**
 * Component gallery — a living reference of the theme tokens, icon set, and UI primitives.
 * Not part of the product surface; a harness for eyeballing the design system under each
 * theme. Route: /gallery.
 */
import { type JSX, For, createSignal } from 'solid-js';
import { Icon } from '../ui/Icon';
import { Button, IconButton } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Banner } from '../ui/Banner';
import { SplitButton } from '../ui/SplitButton';
import { StatusCrumbs } from '../ui/StatusCrumbs';
import { TextField } from '../ui/inputs/TextField';
import { NumericField } from '../ui/inputs/NumericField';
import { SelectField } from '../ui/inputs/SelectField';
import { Toggle } from '../ui/inputs/Toggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { colorTokens } from '../theme/tokens';
import manifest from '../icons/_manifest.json';

export function Gallery(): JSX.Element {
  const [text, setText] = createSignal('Aspirin');
  const [num, setNum] = createSignal<number | null>(42);
  const [sel, setSel] = createSignal('a');
  const [on, setOn] = createSignal(true);
  const [status, setStatus] = createSignal('FINALISED');
  const icons = (manifest as { name: string }[]).map((m) => m.name).sort();

  return (
    <div class="gallery">
      <section>
        <h1>Design system</h1>
        <ThemeToggle />
      </section>

      <section>
        <h2>Colour tokens</h2>
        <div class="swatch-grid">
          <For each={Object.keys(colorTokens)}>
            {(name) => (
              <div class="swatch">
                <div class="swatch__chip" style={{ background: `var(${name})` }} />
                <div class="swatch__name">{name}</div>
              </div>
            )}
          </For>
        </div>
      </section>

      <section>
        <h2>Buttons</h2>
        <div class="gallery__row">
          <Button variant="primary" icon="plus-circle">
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon="delete">
            Danger
          </Button>
          <Button variant="primary" busy>
            Busy
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <IconButton icon="printer" label="Print" />
          <IconButton icon="download" label="Export" text="Export" />
          <SplitButton
            options={[
              { value: 'NEW', label: 'New', disabled: true },
              { value: 'FINALISED', label: 'Save and confirm' }
            ]}
            value="FINALISED"
            onAction={() => undefined}
          />
        </div>
      </section>

      <section>
        <h2>Badges &amp; crumbs</h2>
        <div class="gallery__row">
          <StatusBadge label="New" tone="info" />
          <StatusBadge label="Finalised" tone="success" icon="check-circle" />
          <StatusBadge label="On hold" tone="warning" />
          <StatusBadge label="Error" tone="error" icon="circle-alert" />
          <StatusCrumbs
            steps={[
              { value: 'NEW', label: 'New', reachedAt: '2026-06-30' },
              { value: 'FINALISED', label: 'Finalised', reachedAt: status() === 'FINALISED' ? '2026-07-01' : null }
            ]}
            current={status()}
          />
          <Button variant="ghost" compact onClick={() => setStatus((s) => (s === 'NEW' ? 'FINALISED' : 'NEW'))}>
            Toggle status
          </Button>
        </div>
        <Banner tone="warning">This stocktake is on hold — unlock it to edit.</Banner>
      </section>

      <section>
        <h2>Inputs</h2>
        <div class="gallery__row">
          <TextField label="Description" value={text()} onInput={setText} width="240px" />
          <NumericField label="Counted packs" value={num()} onInput={setNum} />
          <SelectField
            label="Reason"
            value={sel()}
            onChange={setSel}
            options={[
              { value: 'a', label: 'Quantity adjustment' },
              { value: 'b', label: 'Damaged' },
              { value: 'c', label: 'Expired', disabled: true }
            ]}
            width="240px"
          />
          <TextField label="Invalid" value="" error="This field is required" width="200px" />
          <Toggle checked={on()} onChange={setOn} label="Include zero-stock items" />
        </div>
      </section>

      <section>
        <h2>Icons ({icons.length})</h2>
        <div class="icon-grid">
          <For each={icons}>
            {(name) => (
              <div class="icon-cell">
                <Icon name={name} size={24} />
                <span>{name}</span>
              </div>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
