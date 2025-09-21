import { useCallback, useEffect, useState } from 'react';
import type { CartStorageRecord } from '../types/menu';

const STORAGE_KEY = 'cart@minutus';

const readCartFromStorage = (): CartStorageRecord => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as CartStorageRecord;
    return Object.entries(parsed).reduce<CartStorageRecord>((accumulator, [key, quantity]) => {
      if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
        accumulator[key] = quantity;
      }
      return accumulator;
    }, {});
  } catch (error) {
    console.warn('Falha ao carregar carrinho armazenado', error);
    return {};
  }
};

const persistCart = (cartMap: CartStorageRecord): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartMap));
};

export interface UseLocalStorageCartResult {
  cartMap: CartStorageRecord;
  setQuantity: (key: string, quantity: number) => void;
  increment: (key: string, delta?: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useLocalStorageCart = (): UseLocalStorageCartResult => {
  const [cartMap, setCartMap] = useState<CartStorageRecord>(readCartFromStorage);

  useEffect((): void => {
    persistCart(cartMap);
  }, [cartMap]);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const listener = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) {
        setCartMap(readCartFromStorage());
      }
    };

    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number): void => {
    setCartMap((previous) => {
      if (quantity <= 0) {
        if (!(key in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[key];
        return next;
      }

      return { ...previous, [key]: quantity };
    });
  }, []);

  const increment = useCallback((key: string, delta: number = 1): void => {
    setCartMap((previous) => {
      const nextQuantity = (previous[key] ?? 0) + delta;
      if (nextQuantity <= 0) {
        if (!(key in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[key];
        return next;
      }

      return { ...previous, [key]: nextQuantity };
    });
  }, []);

  const remove = useCallback((key: string): void => {
    setCartMap((previous) => {
      if (!(key in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const clear = useCallback((): void => {
    setCartMap({});
  }, []);

  return { cartMap, setQuantity, increment, remove, clear };
};
