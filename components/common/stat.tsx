import type { ReactNode } from "react";

import styles from "./stat.module.css";

export function StatsGrid({ children }: { children: ReactNode }) {
  return <section className={styles.grid}>{children}</section>;
}

export function Stat({
  label,
  value,
  detail,
  positive,
  warning,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <article className={styles.card}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small
        className={positive ? styles.positive : warning ? styles.warning : ""}
      >
        {positive ? "↑ " : warning ? "• " : ""}
        {detail}
      </small>
    </article>
  );
}
