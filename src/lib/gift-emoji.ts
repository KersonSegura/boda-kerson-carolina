export const DEFAULT_GIFT_EMOJI = "🎁";

/** Guarda el emoji tal cual (cualquier emoji del picker). */
export function normalizeGiftEmoji(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) return DEFAULT_GIFT_EMOJI;
  if (/[<>`]/.test(trimmed)) return DEFAULT_GIFT_EMOJI;
  return trimmed;
}

export function resolveGiftEmoji(gift: { emoji?: string }): string {
  const trimmed = gift.emoji?.trim();
  return trimmed || DEFAULT_GIFT_EMOJI;
}
