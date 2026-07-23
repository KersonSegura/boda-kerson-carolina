"use client";

import type { Gift } from "@/types/gift";

interface StatusBadgeProps {
  status: Gift["estado"];
  size?: "default" | "large";
}

const statusConfig = {
  disponible: {
    label: "Disponible",
    dot: "🟢",
    className: "bg-emerald-100 text-emerald-900",
  },
  reservado: {
    label: "Reservado",
    dot: "🔴",
    className: "bg-red-100 text-red-900",
  },
} as const;

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass =
    size === "large"
      ? "px-4 py-2 text-base font-semibold"
      : "px-3.5 py-1.5 text-sm font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${sizeClass} ${config.className}`}
    >
      <span aria-hidden="true">{config.dot}</span>
      {config.label}
    </span>
  );
}
