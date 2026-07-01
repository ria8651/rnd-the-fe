import { useLocation } from 'react-router-dom';
import { PageLayout } from '@/app/layout/PageLayout';
import { Icon } from '@/icons/Icon';
import { activeSection } from '@/app/chrome/breadcrumbs';
import { useTranslation } from '@/app/i18n/i18n';

/** Stand-in for nav sections not yet built — the spec scope is stocktakes. */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const t = useTranslation();
  const section = activeSection(pathname);
  return (
    <PageLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-3)',
          height: '100%',
          color: 'var(--c-text-secondary)',
          textAlign: 'center',
        }}
      >
        {section && <Icon name={section.icon} size={48} />}
        <h1 style={{ fontSize: 'var(--fs-heading)' }}>
          {section ? t(section.labelKey) : 'Section'}
        </h1>
        <p style={{ maxWidth: 380 }}>
          This area is outside the spec's current scope. The reverse spec covers the{' '}
          <strong>Stocktakes</strong> vertical and the app chrome.
        </p>
      </div>
    </PageLayout>
  );
}
