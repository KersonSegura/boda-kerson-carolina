"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Category } from "@/types/category";
import type { PublicGift } from "@/types/gift";
import { fetchJson } from "@/lib/fetch-json";
import { CategoryFilter } from "./CategoryFilter";
import { ContactModal } from "./ContactModal";
import { GiftCard } from "./GiftCard";
import { ReserveModal } from "./ReserveModal";
import { SectionDivider } from "./SectionDivider";

interface GiftListPageProps {
  initialGifts: PublicGift[];
  initialCategories: Category[];
}

export function GiftListPage({
  initialGifts,
  initialCategories,
}: GiftListPageProps) {
  const [gifts, setGifts] = useState<PublicGift[]>(initialGifts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<PublicGift | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [giftsRes, categoriesRes] = await Promise.all([
      fetchJson<PublicGift[]>("/api/gifts", { cache: "no-store" }),
      fetchJson<Category[]>("/api/categories", { cache: "no-store" }),
    ]);
    if (giftsRes.ok) setGifts(giftsRes.data);
    if (categoriesRes.ok) setCategories(categoriesRes.data);
  }, []);

  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData]);

  const filteredGifts = useMemo(() => {
    if (!selectedCategory) return gifts;
    return gifts.filter((g) => g.categoriaId === selectedCategory);
  }, [gifts, selectedCategory]);

  const handleSelectGift = (gift: PublicGift) => {
    if (gift.estado === "disponible") {
      setSelectedGift(gift);
    }
  };

  const handleReserve = async (giftId: string, nombre: string) => {
    const result = await fetchJson<PublicGift>(
      `/api/gifts/${encodeURIComponent(giftId)}/reserve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      },
    );

    if (!result.ok) {
      throw new Error(result.error);
    }

    setGifts((prev) => prev.map((g) => (g.id === giftId ? result.data : g)));
  };

  const availableCount = filteredGifts.filter(
    (g) => g.estado === "disponible",
  ).length;
  const totalCount = filteredGifts.length;

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.nombre])),
    [categories],
  );

  const contactButton = (
    <button
      type="button"
      onClick={() => setContactOpen(true)}
      className="font-semibold text-sage-800 underline decoration-sage-400 underline-offset-2 transition-colors hover:text-sage-900"
    >
      contacto
    </button>
  );

  const scrollToFilters = () => {
    document.getElementById("gift-filters")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="pb-12">
      <header className="px-4 pt-8 text-center sm:px-6 sm:pt-12">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl">
          <Image
            src="/hero2.png"
            alt="Kerson y Carolina"
            fill
            className="object-cover object-top"
            priority
            quality={100}
            unoptimized
            sizes="(max-width: 640px) 100vw, 400px"
          />
        </div>

        <h1 className="mt-8 font-serif text-3xl leading-tight text-sage-900 sm:text-4xl">
          Lista de regalos
        </h1>
        <p className="mx-auto mt-2 font-serif text-xl italic text-sage-800 sm:text-2xl">
          Kerson & Carolina
        </p>

        <div className="mt-4 flex justify-center text-sage-500">
          <ChevronDown
            className="h-7 w-7 animate-bounce"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
        <p className="sr-only">Desplázate hacia abajo para ver los regalos</p>

        <div className="mx-auto mt-4 h-px w-12 bg-gold-400" />

        {/* Subtítulo: 1 línea en pantallas amplias; salto tras "nombre" en móvil */}
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-sage-800 sm:text-lg">
          <span className="md:hidden">
            Elige un regalo y apunta tu nombre
            <br />
            para reservarlo.
          </span>
          <span className="hidden md:inline">
            Elige un regalo y apunta tu nombre para reservarlo.
          </span>
        </p>

        {/* Disclaimer: saltos progresivos según ancho (más estrecho = más cortes) */}
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
          {/* Pantallas estrechas (< sm) */}
          <span className="sm:hidden">
            Cualquier consulta, favor de contactar
            <br />a alguno de los novios, {contactButton}.
          </span>
          {/* Móvil mediano (sm – lg) */}
          <span className="hidden sm:inline lg:hidden">
            Cualquier consulta, favor de contactar a alguno de los novios,
            <br />
            {contactButton}.
          </span>
          {/* Pantallas amplias */}
          <span className="hidden lg:inline">
            Cualquier consulta, favor de contactar a alguno de los novios,{" "}
            {contactButton}.
          </span>
        </p>
      </header>

      <SectionDivider className="mt-10 mb-2" />

      <section className="mx-auto mt-6 max-w-lg px-4 sm:px-6">
        <div id="gift-filters" className="scroll-mt-6">
          <CategoryFilter
            categories={categories}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        <p className="mb-5 text-center text-base font-medium text-sage-700">
          {totalCount} regalo{totalCount !== 1 ? "s" : ""} — {availableCount}{" "}
          disponible{availableCount !== 1 ? "s" : ""}
        </p>

        {filteredGifts.length === 0 ? (
          <p className="py-12 text-center text-base text-sage-600">
            {gifts.length === 0
              ? "Aún no hay regalos en la lista."
              : "No hay regalos en esta categoría."}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredGifts.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                categoriaNombre={
                  gift.categoriaId
                    ? categoryMap.get(gift.categoriaId)
                    : undefined
                }
                onSelect={handleSelectGift}
              />
            ))}
          </div>
        )}

        {filteredGifts.length > 0 && (
          <div className="mt-8 flex justify-center pb-4">
            <button
              type="button"
              onClick={scrollToFilters}
              className="inline-flex items-center gap-2 rounded-full border-2 border-sage-300 bg-white px-6 py-3 text-base font-semibold text-sage-800 shadow-sm transition-colors hover:border-sage-400 hover:bg-sage-50 active:scale-[0.98]"
              aria-label="Volver al inicio de la lista"
            >
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
              Volver al inicio de la lista
            </button>
          </div>
        )}
      </section>

      <ReserveModal
        gift={selectedGift}
        onClose={() => setSelectedGift(null)}
        onReserve={handleReserve}
      />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </main>
  );
}
