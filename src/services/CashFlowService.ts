import type { CashEntry, CashFlowSnapshot, CashFlowSummaryQuery, PaymentMethod } from '../types/cash';
import type { OrderResponse } from '../types/order';

export interface CashEntryRepository {
  append(entry: Omit<CashEntry, 'id'>): Promise<CashEntry>;
  appendBatch?(entries: Array<Omit<CashEntry, 'id'>>): Promise<CashEntry[]>;
}

export interface CashFlowReadRepository {
  getDailySnapshot(date: string): Promise<CashFlowSnapshot | null>;
  getSummary(query: CashFlowSummaryQuery): Promise<CashFlowSnapshot[]>;
}

export interface CashFlowUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  readonly cashEntryRepository: CashEntryRepository;
  readonly cashFlowReadRepository: CashFlowReadRepository;
}

export type CashFlowUnitOfWorkFactory = () => Promise<CashFlowUnitOfWork>;

export interface CashFlowEventPublisher {
  publish(entry: CashEntry): Promise<void>;
  publishBatch?(entries: CashEntry[]): Promise<void>;
}

export interface CashFlowServiceOptions {
  unitOfWorkFactory?: CashFlowUnitOfWorkFactory;
  defaultPaymentMethod?: PaymentMethod;
  now?: () => Date;
  eventPublisher?: CashFlowEventPublisher;
  endpoint?: string;
}

interface RequestBuilderOptions {
  endpoint: string;
}

class HttpCashEntryRepository implements CashEntryRepository {
  private readonly endpoint: string;

  public constructor(options: RequestBuilderOptions) {
    this.endpoint = options.endpoint;
  }

  public async append(entry: Omit<CashEntry, 'id'>): Promise<CashEntry> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao registrar evento de caixa: ${response.status} ${errorText || response.statusText}`.trim(),
      );
    }

    const parsed = await this.parseJsonResponse<CashEntry>(response);
    return parsed ?? this.createFallbackEntry(entry);
  }

  public async appendBatch(entries: Array<Omit<CashEntry, 'id'>>): Promise<CashEntry[]> {
    const response = await fetch(`${this.endpoint}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao registrar lote de eventos de caixa: ${response.status} ${
          errorText || response.statusText
        }`.trim(),
      );
    }

    const parsed = await this.parseJsonResponse<CashEntry[]>(response);
    if (parsed) {
      return parsed;
    }

    return entries.map((entry) => this.createFallbackEntry(entry));
  }

  private createFallbackEntry = (entry: Omit<CashEntry, 'id'>): CashEntry => ({
    ...entry,
    id: `cash-entry-${Date.now()}`,
  });

  private async parseJsonResponse<T>(response: Response): Promise<T | null> {
    try {
      return (await response.clone().json()) as T;
    } catch (error) {
      console.warn('Resposta sem JSON estruturado para evento de caixa.', error);
      return null;
    }
  }
}

class HttpCashFlowReadRepository implements CashFlowReadRepository {
  private readonly endpoint: string;

  public constructor(options: RequestBuilderOptions) {
    this.endpoint = options.endpoint;
  }

  public async getDailySnapshot(date: string): Promise<CashFlowSnapshot | null> {
    const query = new URLSearchParams({ date });
    const response = await fetch(`${this.endpoint}?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao carregar resumo diário do caixa: ${response.status} ${
          errorText || response.statusText
        }`.trim(),
      );
    }

    return this.parseJsonResponse<CashFlowSnapshot | null>(response);
  }

  public async getSummary(query: CashFlowSummaryQuery): Promise<CashFlowSnapshot[]> {
    const params = new URLSearchParams();
    if (query.date) {
      params.set('date', query.date);
    }
    if (query.startDate) {
      params.set('startDate', query.startDate);
    }
    if (query.endDate) {
      params.set('endDate', query.endDate);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;
    const response = await fetch(targetUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao carregar resumo de fluxo de caixa: ${response.status} ${
          errorText || response.statusText
        }`.trim(),
      );
    }

    const parsed = await this.parseJsonResponse<CashFlowSnapshot[]>(response);
    return parsed ?? [];
  }

  private async parseJsonResponse<T>(response: Response): Promise<T | null> {
    try {
      return (await response.clone().json()) as T;
    } catch (error) {
      console.warn('Resposta sem JSON estruturado para resumo de caixa.', error);
      return null;
    }
  }
}

class HttpCashFlowUnitOfWork implements CashFlowUnitOfWork {
  public readonly cashEntryRepository: CashEntryRepository;

  public readonly cashFlowReadRepository: CashFlowReadRepository;

  public constructor(baseEndpoint: string) {
    const normalized = baseEndpoint.replace(/\/$/, '');
    this.cashEntryRepository = new HttpCashEntryRepository({ endpoint: `${normalized}/entries` });
    this.cashFlowReadRepository = new HttpCashFlowReadRepository({ endpoint: `${normalized}/summary` });
  }

  public async begin(): Promise<void> {
    // Em chamadas HTTP a transação é coordenada pelo backend; aqui apenas compatibilizamos a interface.
  }

  public async commit(): Promise<void> {
    // Commit delegado ao backend. Método mantido para compatibilidade com o padrão Unit of Work.
  }

  public async rollback(): Promise<void> {
    // Sem transação local para desfazer; incluído para manter o contrato do padrão.
  }
}

const DEFAULT_CASH_FLOW_ENDPOINT: string =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_CASH_FLOW_ENDPOINT
    ? import.meta.env.VITE_CASH_FLOW_ENDPOINT
    : '/api/cash-flow';

export class CashFlowService {
  private readonly unitOfWorkFactory: CashFlowUnitOfWorkFactory;

  private readonly defaultPaymentMethod: PaymentMethod;

  private readonly now: () => Date;

  private readonly eventPublisher?: CashFlowEventPublisher;

  public constructor(options: CashFlowServiceOptions = {}) {
    const endpoint = (options.endpoint ?? DEFAULT_CASH_FLOW_ENDPOINT).replace(/\/$/, '');
    this.unitOfWorkFactory =
      options.unitOfWorkFactory ?? (async () => new HttpCashFlowUnitOfWork(endpoint));
    this.defaultPaymentMethod = options.defaultPaymentMethod ?? 'cash';
    this.now = options.now ?? (() => new Date());
    this.eventPublisher = options.eventPublisher;
  }

  public async recordPayment(order: OrderResponse, amount: number): Promise<CashFlowSnapshot> {
    const unitOfWork = await this.unitOfWorkFactory();
    await unitOfWork.begin();

    try {
      const timestamp = this.now().toISOString();
      const entryPayload: Omit<CashEntry, 'id'> = {
        orderId: order.id,
        operation: 'inflow',
        amount,
        paymentMethod: this.resolvePaymentMethod(order),
        recordedAt: timestamp,
        effectiveAt: this.resolveEffectiveDate(order) ?? timestamp,
        description: `Pagamento confirmado para o pedido #${order.id}`,
        metadata: {
          origin: 'admin-dashboard',
          customer: order.customer.name,
          itemsCount: order.items.length,
        },
      };

      const entry = await unitOfWork.cashEntryRepository.append(entryPayload);
      const snapshot =
        (await unitOfWork.cashFlowReadRepository.getDailySnapshot(entry.effectiveAt.slice(0, 10))) ??
        this.createFallbackSnapshot(entry);

      await unitOfWork.commit();
      if (this.eventPublisher) {
        await this.eventPublisher.publish(entry);
      }

      return snapshot;
    } catch (error) {
      await this.safeRollback(unitOfWork);
      throw this.toDomainError(error, 'Falha ao confirmar pagamento.');
    }
  }

  public async getDailySummary(target: Date | string | CashFlowSummaryQuery = new Date()): Promise<CashFlowSnapshot | null> {
    const query = this.normalizeSummaryQuery(target);
    const unitOfWork = await this.unitOfWorkFactory();
    await unitOfWork.begin();

    try {
      let snapshot: CashFlowSnapshot | null = null;
      if (query.date) {
        snapshot = await unitOfWork.cashFlowReadRepository.getDailySnapshot(query.date);
      } else {
        const summaries = await unitOfWork.cashFlowReadRepository.getSummary(query);
        snapshot = summaries.at(-1) ?? null;
      }

      await unitOfWork.commit();
      return snapshot;
    } catch (error) {
      await this.safeRollback(unitOfWork);
      throw this.toDomainError(error, 'Falha ao carregar resumo diário do caixa.');
    }
  }

  private resolvePaymentMethod(order: OrderResponse): PaymentMethod {
    const metadataMethod = this.extractPaymentMethodFromMetadata(order.metadata);
    return metadataMethod ?? this.defaultPaymentMethod;
  }

  private resolveEffectiveDate(order: OrderResponse): string | null {
    const metadata = order.metadata;
    if (metadata && typeof metadata === 'object' && metadata !== null) {
      const value = (metadata as Record<string, unknown>).effectiveAt;
      if (typeof value === 'string') {
        return value;
      }
    }
    return null;
  }

  private extractPaymentMethodFromMetadata(metadata: OrderResponse['metadata']): PaymentMethod | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const value = (metadata as Record<string, unknown>).paymentMethod;
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.toLowerCase();
    return this.isPaymentMethod(normalized) ? normalized : null;
  }

  private isPaymentMethod(value: string): value is PaymentMethod {
    return [
      'cash',
      'credit_card',
      'debit_card',
      'pix',
      'voucher',
      'bank_transfer',
      'digital_wallet',
      'other',
    ].includes(value as PaymentMethod);
  }

  private createFallbackSnapshot(entry: CashEntry): CashFlowSnapshot {
    return {
      date: entry.effectiveAt.slice(0, 10),
      totalInflow: entry.amount,
      totalOutflow: 0,
      netChange: entry.amount,
      balance: entry.amount,
      lastEntryId: entry.id,
      lastEntryAt: entry.effectiveAt,
      breakdownByMethod: {
        [entry.paymentMethod]: entry.amount,
      },
    };
  }

  private normalizeSummaryQuery(target: Date | string | CashFlowSummaryQuery): CashFlowSummaryQuery {
    if (target instanceof Date) {
      return { date: this.formatIsoDate(target) };
    }

    if (typeof target === 'string') {
      return { date: this.normalizeDateString(target) };
    }

    const query: CashFlowSummaryQuery = {};
    if (target.date) {
      query.date = this.normalizeDateString(target.date);
    }
    if (target.startDate) {
      query.startDate = this.normalizeDateString(target.startDate);
    }
    if (target.endDate) {
      query.endDate = this.normalizeDateString(target.endDate);
    }
    return query;
  }

  private formatIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private normalizeDateString(value: string): string {
    if (value.length === 10) {
      return value;
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return this.formatIsoDate(this.now());
    }
    return new Date(parsed).toISOString().slice(0, 10);
  }

  private async safeRollback(unitOfWork: CashFlowUnitOfWork): Promise<void> {
    try {
      await unitOfWork.rollback();
    } catch (rollbackError) {
      console.error('Falha ao reverter transação de caixa.', rollbackError);
    }
  }

  private toDomainError(original: unknown, fallbackMessage: string): Error {
    if (original instanceof Error) {
      return original;
    }
    return new Error(fallbackMessage);
  }
}
