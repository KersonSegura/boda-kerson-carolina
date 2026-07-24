"use client";

import type { PublicGift } from "@/types/gift";
import { resolveGiftEmoji } from "@/lib/gift-emoji";
import { StatusBadge } from "./StatusBadge";

interface GiftCardProps {
  gift: PublicGift;
  categoriaNombre?: string;
  onSelect: (gift: PublicGift) => void;
}

export function GiftCard({ gift, categoriaNombre, onSelect }: GiftCardProps) {
  const emoji = resolveGiftEmoji(gift);
  const isAvailable = gift.estado === "disponible";

  return (
    <button
      type="button"
      onClick={() => onSelect(gift)}
      disabled={!isAvailable}
      className={`w-full rounded-2xl border-2 bg-white p-5 text-left transition-all duration-200 sm:p-6 ${
        isAvailable
          ? "cursor-pointer border-beige-200 hover:border-sage-300 hover:shadow-md hover:shadow-sage-900/5 active:scale-[0.99]"
          : "cursor-default border-red-100 bg-red-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl leading-snug text-sage-900 sm:text-2xl">
          <span aria-hidden="true" className="mr-2">
            {emoji}
          </span>
          {gift.nombre}
        </h3>
        {categoriaNombre && (
          <span className="shrink-0 rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-sage-800 sm:text-sm">
            {categoriaNombre}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {gift.especificaciones.trim() && (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">
              Especificaciones
            </p>
            <p className="mt-1.5 text-base leading-relaxed text-sage-800">
              {gift.especificaciones}
            </p>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">
            Estado
          </p>
          <div className="mt-2">
            <StatusBadge status={gift.estado} size="large" />
          </div>
        </div>

        {isAvailable ? (
          <p className="text-base font-semibold text-sage-700">
            Toca aquí para reservar →
          </p>
        ) : (
          <p className="text-base font-semibold text-red-800">
            Ya reservado — no disponible
          </p>
        )}
      </div>
    </button>
  );
}
