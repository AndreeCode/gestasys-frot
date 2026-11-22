import styles from "./feedback.module.css";

export function LoadingState({ text = "Cargando..." }: { text?: string }) {
  return <div className={styles.state}>{text}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className={styles.state}>{text}</div>;
}

export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className={styles.error} role="alert">
      {error}
      {onRetry && <button onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total === 0) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className={styles.pagination}>
      <span>
        Mostrando <strong>{offset + 1}</strong>–<strong>{Math.min(offset + limit, total)}</strong> de{" "}
        <strong>{total}</strong>
      </span>
      <div>
        <button disabled={page <= 1} onClick={() => onChange(Math.max(0, offset - limit))}>
          Anterior
        </button>
        <span>
          {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => onChange(offset + limit)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
