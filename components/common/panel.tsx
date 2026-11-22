import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import styles from "./panel.module.css";

export function Panel({
  as: Tag = "section",
  className,
  children,
}: {
  as?: "section" | "article";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn(styles.panel, className)}>{children}</Tag>;
}

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
