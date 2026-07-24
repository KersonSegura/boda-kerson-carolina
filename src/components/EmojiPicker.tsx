"use client";

import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

const EmojiPickerLib = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-xl border border-beige-200 bg-beige-50 text-sm text-sage-600">
      Cargando emojis…
    </div>
  ),
});

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

      <div className="mb-3 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-sage-300 bg-white text-3xl"
        >
          {value}
        </span>
        <p className="text-sm leading-snug text-sage-600">
          Busca o elige cualquier emoji, como en WhatsApp.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-beige-200 [&_.EmojiPickerReact]:!w-full">
        <EmojiPickerLib
          onEmojiClick={(emojiData: EmojiClickData) =>
            onChange(emojiData.emoji)
          }
          theme={Theme.LIGHT}
          lazyLoadEmojis
          searchPlaceholder="Buscar emoji…"
          searchClearButtonLabel="Limpiar"
          width="100%"
          height={380}
          previewConfig={{
            showPreview: true,
            defaultCaption: "Selecciona un emoji",
          }}
        />
      </div>
    </fieldset>
  );
}
