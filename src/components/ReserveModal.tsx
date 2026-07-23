"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Gift } from "@/types/gift";

interface ReserveModalProps {
  gift: Gift | null;
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (gift) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [gift, onClose]);

  if (!gift) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor escribe tu nombre");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onReserve(gift.id, nombre.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reservar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="reserve-title"
              className="font-serif text-xl text-sage-900"
            >
              ¿Quieres reservar este regalo?
            </h2>
            <p className="mt-1 text-sm text-gray-500">{gift.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-beige-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombre"
              className="mb-1.5 block text-sm font-medium text-sage-800"
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
              className="w-full rounded-xl border border-beige-200 bg-beige-50 px-4 py-3 text-sm text-sage-900 outline-none transition-colors focus:border-sage-300 focus:bg-white"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-beige-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-beige-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-sage-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sage-800 disabled:opacity-60"
            >
              {loading ? "Reservando…" : "Reservar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
