"use client";

import type { Category } from "@/types/category";

interface CategoryFilterProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedId,
  onSelect,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="mb-6 -mx-1 overflow-x-auto px-1 scrollbar-none">
      <div className="flex gap-2 pb-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            selectedId === null
              ? "bg-sage-700 text-white"
              : "bg-beige-100 text-sage-700 hover:bg-beige-200"
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              selectedId === cat.id
                ? "bg-sage-700 text-white"
                : "bg-beige-100 text-sage-700 hover:bg-beige-200"
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
