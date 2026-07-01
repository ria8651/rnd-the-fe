/* @refresh reload */
import { render } from 'solid-js/web';
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import { ThemeProvider } from './theme/ThemeProvider';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './components/ui/Toast';
import { App } from './App';
import './main.css';
import './components/ui/ui.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StoreProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </StoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  ),
  root,
);
