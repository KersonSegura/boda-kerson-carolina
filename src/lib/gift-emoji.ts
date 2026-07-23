/** Emojis disponibles para elegir en el admin */
export const GIFT_EMOJI_OPTIONS = [
  "🎁",
  "🍽️",
  "🍳",
  "🥂",
  "🧁",
  "🛏️",
  "☕",
  "🔪",
  "🥤",
  "🛁",
  "🏠",
  "🛋️",
  "🪴",
  "🕯️",
  "🧺",
  "🍴",
  "🥄",
  "🫖",
  "🧊",
  "📺",
  "💡",
  "🪑",
  "🚿",
  "🧹",
] as const;

export const DEFAULT_GIFT_EMOJI = GIFT_EMOJI_OPTIONS[0];

export function isValidGiftEmoji(value: string): boolean {
  return GIFT_EMOJI_OPTIONS.includes(value as (typeof GIFT_EMOJI_OPTIONS)[number]);
}

/** Fallback para regalos antiguos sin emoji guardado */
export function resolveGiftEmoji(gift: { nombre: string; emoji?: string }): string {
  if (gift.emoji && isValidGiftEmoji(gift.emoji)) {
    return gift.emoji;
  }
  return DEFAULT_GIFT_EMOJI;
}
