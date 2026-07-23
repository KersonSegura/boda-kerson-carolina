"use client";

import type { Gift } from "@/types/gift";
import { getGiftEmoji } from "@/lib/gift-emoji";
import { StatusBadge } from "./StatusBadge";

interface GiftCardProps {
  gift: Gift;
  onSelect: (gift: Gift) => void;
}

export function GiftCard({ gift, onSelect }: GiftCardProps) {
  const emoji = getGiftEmoji(gift.nombre);
  const isAvailable = gift.estado === "disponible";

  return (
    <button
      type="button"
      onClick={() => onSelect(gift)}
      className={`w-full rounded-2xl border border-beige-200 bg-white p-5 text-left transition-all duration-200 sm:p-6 ${
        isAvailable
          ? "cursor-pointer hover:border-sage-200 hover:shadow-md hover:shadow-sage-900/5 active:scale-[0.99]"
          : "cursor-default opacity-90"
      }`}
    >
      <h3 className="font-serif text-lg text-sage-900">
        <span aria-hidden="true" className="mr-2">
          {emoji}
        </span>
        {gift.nombre}
      </h3>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Especificaciones
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {gift.especificaciones || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Estado
          </p>
          <div className="mt-2">
            <StatusBadge status={gift.estado} />
          </div>
        </div>

        {gift.estado === "reservado" && gift.reservadoPor && (
          <p className="text-xs text-gray-400">
            Reservado por {gift.reservadoPor}
          </p>
        )}

        {isAvailable && (
          <p className="text-xs font-medium text-sage-600">
            Toca para reservar →
          </p>
        )}
      </div>
    </button>
  );
}
