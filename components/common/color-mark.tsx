import { cn } from "@/lib/utils";

const NAMES: [string, [number, number, number]][] = [
  ["rojo", [220, 38, 38]],
  ["naranja", [237, 125, 49]],
  ["amarillo", [255, 220, 0]],
  ["verde", [112, 173, 71]],
  ["celeste", [91, 155, 213]],
  ["azul", [68, 114, 196]],
  ["morado", [126, 87, 194]],
  ["rosado", [236, 112, 160]],
  ["gris", [165, 165, 165]],
  ["marrón", [150, 100, 60]],
];

/** Nombre aproximado del color (misma tabla que el back, `colors.py`). */
export function colorName(hex: string | null | undefined): string {
  if (!hex || hex.length !== 6) return "sin color";
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (Math.min(...rgb) > 235) return "blanco";
  return NAMES.reduce((best, [name, ref]) => {
    const d = ref.reduce((acc, v, i) => acc + (v - rgb[i]) ** 2, 0);
    return d < best.d ? { name, d } : best;
  }, { name: "color", d: Infinity }).name;
}

/** Texto legible sobre un fondo de color. */
export function readableText(hex: string): string {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111827" : "#ffffff";
}

/** Marca de color del Excel MINSA: cuadrito con el color y su valor 0/1. */
export function ColorMark({ color, showName, className }: { color: string | null; showName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)} title={color ? `Fila pintada de ${colorName(color)} (#${color})` : "Sin color"}>
      <span
        className={cn("size-3.5 shrink-0 rounded-[4px] ring-1 ring-foreground/15", !color && "bg-card")}
        style={color ? { background: `#${color}` } : undefined}
      />
      <strong className="font-semibold tabular-nums">{color ? 1 : 0}</strong>
      {showName && <span className="text-muted-foreground">{color ? colorName(color) : "sin color"}</span>}
    </span>
  );
}
