"use client";

import { Search, X } from "lucide-react";

interface GiftSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function GiftSearchBar({
  value,
  onChange,
  placeholder = "Buscar regalo…",
  id = "gift-search",
}: GiftSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sage-500"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-beige-200 bg-white py-3.5 pl-12 pr-12 text-base text-sage-900 outline-none transition-colors placeholder:text-sage-400 focus:border-sage-400"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sage-600 hover:bg-beige-100"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
