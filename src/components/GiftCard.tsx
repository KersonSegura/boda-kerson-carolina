import type { Gift } from "@/types/gift";
import { StatusBadge } from "./StatusBadge";

const giftEmojis: Record<string, string> = {
  platos: "🍽️",
  ollas: "🍳",
  copas: "🥂",
  batidora: "🧁",
  sábanas: "🛏️",
  cafetera: "☕",
};

function getGiftEmoji(nombre: string): string {
  const key = Object.keys(giftEmojis).find((word) =>
    nombre.toLowerCase().includes(word),
  );
  return key ? giftEmojis[key] : "🎁";
}

interface GiftCardProps {
  gift: Gift;
}

export function GiftCard({ gift }: GiftCardProps) {
  const emoji = getGiftEmoji(gift.nombre);

  return (
    <article className="rounded-2xl border border-beige-200 bg-white p-5 shadow-sm shadow-sage-900/5 transition-shadow duration-300 hover:shadow-md hover:shadow-sage-900/8 sm:p-6">
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
            {gift.especificaciones}
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
      </div>
    </article>
  );
}
