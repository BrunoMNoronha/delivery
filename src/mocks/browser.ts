import { setupWorker, type SetupWorker } from 'msw/browser';
import type { HttpHandler } from 'msw';
import { orderHandlers } from './handlers/orders';

const handlers: HttpHandler[] = [...orderHandlers];

export const worker: SetupWorker = setupWorker(...handlers);
