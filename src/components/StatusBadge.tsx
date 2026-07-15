import type { GiftStatus } from "@/types/gift";

interface StatusBadgeProps {
  status: GiftStatus;
}

const statusConfig = {
  disponible: {
    label: "Disponible",
    dot: "🟢",
    className: "bg-emerald-50 text-emerald-800",
  },
  reservado: {
    label: "Reservado",
    dot: "🔴",
    className: "bg-red-50 text-red-800",
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      <span aria-hidden="true">{config.dot}</span>
      {config.label}
    </span>
  );
}
