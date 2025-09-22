import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { AdminAuthContext } from './AdminAuthContext';

const STORAGE_KEY = 'admin-dashboard-token';
const DEFAULT_ADMIN_TOKEN = 'admin';

const readStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEY);
};

const storeToken = (token: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
};

const resolveExpectedToken = (): string => {
  if (typeof import.meta === 'undefined') {
    return DEFAULT_ADMIN_TOKEN;
  }

  const token = import.meta.env?.VITE_ADMIN_TOKEN;
  if (typeof token === 'string' && token.trim().length > 0) {
    return token;
  }

  return DEFAULT_ADMIN_TOKEN;
};

export const AdminAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const expectedToken = useMemo<string>(() => resolveExpectedToken(), []);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = readStoredToken();
    return storedToken === expectedToken;
  });

  useEffect((): void => {
    const storedToken = readStoredToken();
    setIsAuthenticated(storedToken === expectedToken);
  }, [expectedToken]);

  const login = useCallback(
    (token: string): boolean => {
      const sanitized = token.trim();
      if (sanitized !== expectedToken) {
        return false;
      }

      storeToken(expectedToken);
      setIsAuthenticated(true);
      return true;
    },
    [expectedToken],
  );

  const logout = useCallback((): void => {
    storeToken(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      expectedToken,
      login,
      logout,
    }),
    [isAuthenticated, expectedToken, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
