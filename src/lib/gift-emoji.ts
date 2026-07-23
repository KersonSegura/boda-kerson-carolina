const giftEmojis: Record<string, string> = {
  platos: "🍽️",
  ollas: "🍳",
  copas: "🥂",
  batidora: "🧁",
  sabanas: "🛏️",
  cafetera: "☕",
  vajilla: "🍽️",
  cuchillos: "🔪",
  licuadora: "🥤",
  toallas: "🛁",
};

export function getGiftEmoji(nombre: string): string {
  const normalized = nombre.toLowerCase();
  const key = Object.keys(giftEmojis).find((word) => normalized.includes(word));
  return key ? giftEmojis[key] : "🎁";
}
