import { type JSX } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { Icon } from '../../components/ui/Icon';

// Placeholder until Stage 2 (S3 detail screen: header, line table, counting, finalise).
export function StocktakeDetailPlaceholder(): JSX.Element {
  const params = useParams();
  return (
    <div class="page">
      <A href="/stocktakes" class="row" style={{ gap: 'var(--sp-1)', 'text-decoration': 'none', color: 'var(--text-link)' }}>
        <Icon name="arrow-left" size={16} /> Back to stocktakes
      </A>
      <div class="banner banner--info" style={{ 'margin-top': 'var(--sp-4)' }}>
        <Icon name="info" size={18} />
        <span>
          Detail screen (counting, reasons, bulk actions, lock, finalise) arrives in Stage 2.
          Stocktake id: <code>{params.id}</code>
        </span>
      </div>
    </div>
  );
}
