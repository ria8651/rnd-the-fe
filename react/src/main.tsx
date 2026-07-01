import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import '@/theme/theme.css';
import '@/styles/global.css';
import '@/icons/icon.css';

import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { I18nProvider, applyDocumentLanguage } from '@/app/i18n/i18n';
import { AuthProvider } from '@/app/auth/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { router } from '@/routes';

// Apply <html lang/dir> from the persisted language before first paint.
applyDocumentLanguage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
