import type { FC } from 'react';
import type { CashFlowSnapshot } from '../../types/cash';
import { formatCurrency } from '../../utils/format';
import styles from '../../styles/admin/CashSummaryWidget.module.css';

interface CashSummaryWidgetProps {
  summary: CashFlowSnapshot | null;
  isLoading: boolean;
  error: string | null;
  onRefresh(): Promise<void>;
}

const formatTime = (timestamp: string | undefined): string => {
  if (!timestamp) {
    return 'Sem movimentações';
  }
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 'Data indisponível';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const CashSummaryWidget: FC<CashSummaryWidgetProps> = ({
  summary,
  isLoading,
  error,
  onRefresh,
}) => {
  const handleRefresh = async (): Promise<void> => {
    await onRefresh();
  };

  const balance = summary?.balance ?? 0;
  const totalInflow = summary?.totalInflow ?? 0;
  const totalOutflow = summary?.totalOutflow ?? 0;
  const netChange = summary?.netChange ?? 0;

  const variationClass = netChange >= 0 ? styles.positive : styles.negative;
  const summaryDate = summary?.date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
      }).format(Date.parse(summary.date))
    : new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
      }).format(Date.now());

  return (
    <section className={styles.card} aria-live="polite" aria-busy={isLoading}>
      <header className={styles.header}>
        <div>
          <span className={styles.caption}>Saldo diário</span>
          <h2 className={styles.balance}>{formatCurrency(balance)}</h2>
          <span className={styles.dateLabel}>Ref. {summaryDate}</span>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt>Entradas</dt>
          <dd>{formatCurrency(totalInflow)}</dd>
        </div>
        <div className={styles.metric}>
          <dt>Saídas</dt>
          <dd>{formatCurrency(totalOutflow)}</dd>
        </div>
        <div className={`${styles.metric} ${variationClass}`}>
          <dt>Variação</dt>
          <dd>{formatCurrency(netChange)}</dd>
        </div>
      </dl>
      <footer className={styles.footer}>
        <span className={styles.footerLabel}>Último registro</span>
        <span className={styles.footerValue}>{formatTime(summary?.lastEntryAt)}</span>
      </footer>
    </section>
  );
};

export default CashSummaryWidget;
