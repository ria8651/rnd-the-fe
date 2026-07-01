import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/chrome/AppShell';
import { ROOT_PATH } from '@/app/chrome/navConfig';
import { LoginStub } from '@/pages/LoginStub';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { StocktakeListPage } from '@/features/stocktakes/StocktakeListPage';
import { StocktakeDetailPage } from '@/features/stocktakes/StocktakeDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginStub /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={ROOT_PATH} replace /> },
      { path: 'dashboard', element: <PlaceholderPage /> },
      { path: 'inventory/stocktakes', element: <StocktakeListPage /> },
      { path: 'inventory/stocktakes/:number', element: <StocktakeDetailPage /> },
      { path: 'inventory', element: <Navigate to="/inventory/stocktakes" replace /> },
      // Unbuilt nav sections fall back to a placeholder (spec scope = stocktakes).
      { path: 'replenishment', element: <PlaceholderPage /> },
      { path: 'distribution', element: <PlaceholderPage /> },
      { path: 'dispensary', element: <PlaceholderPage /> },
      { path: 'cold-chain', element: <PlaceholderPage /> },
      { path: 'programs', element: <PlaceholderPage /> },
      { path: 'reports', element: <PlaceholderPage /> },
      { path: 'catalogue', element: <PlaceholderPage /> },
      { path: 'manage', element: <PlaceholderPage /> },
      { path: 'settings', element: <PlaceholderPage /> },
      { path: 'sync', element: <PlaceholderPage /> },
      { path: 'help', element: <PlaceholderPage /> },
      { path: '*', element: <Navigate to={ROOT_PATH} replace /> },
    ],
  },
]);
