"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Gift } from "@/types/gift";
import { GiftCard } from "./GiftCard";
import { ReserveModal } from "./ReserveModal";

export function GiftListPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  const fetchGifts = useCallback(async () => {
    try {
      const res = await fetch("/api/gifts");
      if (res.ok) {
        setGifts(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const handleSelectGift = (gift: Gift) => {
    if (gift.estado === "disponible") {
      setSelectedGift(gift);
    }
  };

  const handleReserve = async (giftId: string, nombre: string) => {
    const res = await fetch(`/api/gifts/${giftId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo reservar el regalo");
    }

    setGifts((prev) => prev.map((g) => (g.id === giftId ? data : g)));
  };

  const availableCount = gifts.filter((g) => g.estado === "disponible").length;

  return (
    <main className="pb-12">
      <header className="px-4 pt-8 text-center sm:px-6 sm:pt-12">
        <div className="relative mx-auto aspect-[3/4] max-w-xs overflow-hidden rounded-2xl">
          <Image
            src="/hero.png"
            alt="Kerson y Carolina"
            fill
            className="object-cover object-top"
            priority
            sizes="(max-width: 640px) 90vw, 320px"
          />
        </div>

        <h1 className="mt-8 font-serif text-3xl leading-tight text-sage-900 sm:text-4xl">
          Lista de regalos
        </h1>
        <p className="mt-2 font-serif text-lg italic text-sage-700">
          Kerson & Carolina
        </p>
        <div className="mx-auto mt-4 h-px w-12 bg-gold-400" />
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
          Té de cocina — elige un regalo y apunta tu nombre para reservarlo.
        </p>
      </header>

      <section className="mx-auto mt-10 max-w-lg px-4 sm:px-6">
        {!loading && (
          <p className="mb-5 text-center text-sm text-gray-500">
            {availableCount} regalo{availableCount !== 1 ? "s" : ""} disponible
            {availableCount !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-beige-100"
              />
            ))}
          </div>
        ) : gifts.length === 0 ? (
          <p className="py-12 text-center text-gray-400">
            Aún no hay regalos en la lista.
          </p>
        ) : (
          <div className="grid gap-4">
            {gifts.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                onSelect={handleSelectGift}
              />
            ))}
          </div>
        )}
      </section>

      <ReserveModal
        gift={selectedGift}
        onClose={() => setSelectedGift(null)}
        onReserve={handleReserve}
      />
    </main>
  );
}
