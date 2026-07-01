import type { ReactNode } from 'react';
import './PageLayout.css';

/**
 * Shared page anatomy per spec/ui-standards/layout.md. Regions in stacking order:
 *  - App bar / toolbar: title/metadata + page actions + filter/search (stays put)
 *  - Content body: the only region that scrolls; scales to large data sets
 *  - Action footer: lifecycle actions; STAYS VISIBLE regardless of body scroll
 *  - Detail side panel: toggleable; beside the body on wide screens, overlay when narrow
 * Order and roles are preserved responsively.
 */
interface PageLayoutProps {
  appBar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  sidePanel?: ReactNode;
  sidePanelOpen?: boolean;
  /** Remove body padding (e.g. a full-bleed table). */
  flushBody?: boolean;
}

export function PageLayout({
  appBar,
  children,
  footer,
  sidePanel,
  sidePanelOpen = false,
  flushBody = false,
}: PageLayoutProps) {
  return (
    <div className="oms-page">
      {appBar && <div className="oms-page__appbar">{appBar}</div>}
      <div className="oms-page__mid">
        <div className={`oms-page__body${flushBody ? ' is-flush' : ''}`}>{children}</div>
        {sidePanel && sidePanelOpen && (
          <aside className="oms-page__side" aria-label="Details">
            {sidePanel}
          </aside>
        )}
      </div>
      {footer && <div className="oms-page__footer">{footer}</div>}
    </div>
  );
}
