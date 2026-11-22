import { Stat, StatsGrid } from "@/components/common/stat";
import type { Stats } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

export function RecordStats({ stats }: { stats: Stats | null }) {
  const value = (n: number | undefined) => (stats ? formatNumber(n ?? 0) : "—");
  const growth = stats?.growth_percent ?? 0;
  return (
    <StatsGrid>
      <Stat
        label="Total de registros"
        value={value(stats?.total)}
        detail={stats ? `${growth >= 0 ? "+" : ""}${growth}% vs. mes anterior` : "Cargando..."}
        positive={growth > 0}
      />
      <Stat
        label="En seguimiento"
        value={value(stats?.in_followup)}
        detail={stats ? `${stats.in_followup_percent}% del total` : ""}
      />
      <Stat
        label="Pendientes de revisión"
        value={value(stats?.pending)}
        detail={stats ? `${stats.new_pending_week} nuevos esta semana` : ""}
        warning={Boolean(stats && stats.pending > 0)}
      />
      <Stat
        label="Registros completados"
        value={value(stats?.completed)}
        detail={stats ? `${stats.completed_percent}% del total` : ""}
      />
    </StatsGrid>
  );
}
