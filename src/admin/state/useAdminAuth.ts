import { useContext } from 'react';
import { AdminAuthContext, type AdminAuthContextValue } from './AdminAuthContext';

export const useAdminAuth = (): AdminAuthContextValue => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de um AdminAuthProvider.');
  }
  return context;
};
