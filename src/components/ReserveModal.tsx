"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { PublicGift } from "@/types/gift";
import { Modal } from "./Modal";

interface ReserveModalProps {
  gift: PublicGift | null;
  onClose: () => void;
  onReserve: (giftId: string, nombre: string) => Promise<void>;
}

export function ReserveModal({ gift, onClose, onReserve }: ReserveModalProps) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (gift) {
      setNombre("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [gift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor escribe tu nombre");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onReserve(gift!.id, nombre.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reservar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!gift} onClose={onClose} ariaLabelledBy="reserve-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2
            id="reserve-title"
            className="font-serif text-2xl leading-snug text-sage-900"
          >
            ¿Quieres reservar este regalo?
          </h2>
          {gift && (
            <p className="mt-2 text-base text-sage-700">{gift.nombre}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-sage-600 hover:bg-beige-100"
          aria-label="Cerrar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="nombre"
            className="mb-2 block text-base font-semibold text-sage-800"
          >
            Apunta tu nombre
          </label>
          <input
            ref={inputRef}
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full rounded-xl border-2 border-beige-200 bg-beige-50 px-4 py-3.5 text-base text-sage-900 outline-none transition-colors focus:border-sage-400 focus:bg-white"
            disabled={loading}
          />
        </div>

        {error && <p className="text-base font-medium text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-beige-200 px-4 py-3.5 text-base font-semibold text-sage-700 transition-colors hover:bg-beige-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-sage-800 disabled:opacity-60"
          >
            {loading ? "Reservando…" : "Reservar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
