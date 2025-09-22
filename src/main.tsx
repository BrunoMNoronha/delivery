import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import AdminLogin from './admin/AdminLogin.tsx';
import AdminProtectedRoute from './admin/AdminProtectedRoute.tsx';
import Dashboard from './admin/Dashboard.tsx';
import { AdminAuthProvider } from './admin/state/AdminAuthProvider.tsx';
import './styles/base.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <Dashboard />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
]);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminAuthProvider>
      <RouterProvider router={router} />
    </AdminAuthProvider>
  </StrictMode>,
);
