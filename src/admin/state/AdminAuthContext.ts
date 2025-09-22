import { createContext } from 'react';

export interface AdminAuthContextValue {
  isAuthenticated: boolean;
  expectedToken: string;
  login(token: string): boolean;
  logout(): void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
