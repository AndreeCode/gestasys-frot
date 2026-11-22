import type { ReactNode } from "react";

import styles from "./page-heading.module.css";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: ReactNode;
  title: string;
  subtitle: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={styles.heading}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {action}
    </section>
  );
}
