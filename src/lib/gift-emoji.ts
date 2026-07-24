export const DEFAULT_GIFT_EMOJI = "🎁";

/** Acepta emojis Unicode estándar (incluye tonos de piel y secuencias ZWJ). */
export function isValidGiftEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) return false;
  if (/[a-zA-Z0-9<>{}]/.test(trimmed)) return false;
  return /\p{Extended_Pictographic}/u.test(trimmed);
}

/** Fallback para regalos sin emoji guardado o con valor inválido. */
export function resolveGiftEmoji(gift: { emoji?: string }): string {
  if (gift.emoji && isValidGiftEmoji(gift.emoji)) {
    return gift.emoji;
  }
  return DEFAULT_GIFT_EMOJI;
}
