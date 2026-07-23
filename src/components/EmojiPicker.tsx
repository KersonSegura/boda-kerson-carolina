"use client";

import { GIFT_EMOJI_OPTIONS } from "@/lib/gift-emoji";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-sage-800">
        Emoji del regalo
      </legend>
      <div
        className="grid grid-cols-6 gap-2 sm:grid-cols-8"
        role="radiogroup"
        aria-label="Elegir emoji"
      >
        {GIFT_EMOJI_OPTIONS.map((emoji) => {
          const selected = value === emoji;
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Emoji ${emoji}`}
              onClick={() => onChange(emoji)}
              className={`flex h-11 items-center justify-center rounded-xl border-2 text-2xl transition-colors sm:h-10 ${
                selected
                  ? "border-sage-500 bg-sage-50 ring-2 ring-sage-200"
                  : "border-beige-200 bg-white hover:border-sage-300 hover:bg-beige-50"
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
