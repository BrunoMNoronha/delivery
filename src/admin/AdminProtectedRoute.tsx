import type { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from './state/useAdminAuth';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

const AdminProtectedRoute: FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
