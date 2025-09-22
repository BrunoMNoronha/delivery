import { useContext } from 'react';
import { OrderQueueContext, type OrderQueueContextValue } from './OrderQueueContext';

export const useOrderQueue = (): OrderQueueContextValue => {
  const context = useContext(OrderQueueContext);
  if (!context) {
    throw new Error('useOrderQueue deve ser usado dentro de um OrderQueueProvider.');
  }
  return context;
};
