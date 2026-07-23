"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Gift } from "@/types/gift";
import { StatusBadge } from "@/components/StatusBadge";
import { getGiftEmoji } from "@/lib/gift-emoji";

interface GiftFormData {
  nombre: string;
  especificaciones: string;
}

const emptyForm: GiftFormData = { nombre: "", especificaciones: "" };

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<GiftFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/admin/session");
    const data = await res.json();
    setAuthenticated(data.authenticated);
  }, []);

  const fetchGifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gifts");
      if (res.ok) setGifts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (authenticated) fetchGifts();
  }, [authenticated, fetchGifts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError("Contraseña incorrecta");
        return;
      }
      setAuthenticated(true);
      setPassword("");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setFormError("El nombre es requerido");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingId) {
        const res = await fetch(`/api/gifts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGifts((prev) => prev.map((g) => (g.id === editingId ? data : g)));
      } else {
        const res = await fetch("/api/gifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGifts((prev) => [...prev, data]);
      }
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (gift: Gift) => {
    setEditingId(gift.id);
    setForm({
      nombre: gift.nombre,
      especificaciones: gift.especificaciones,
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este regalo?")) return;
    const res = await fetch(`/api/gifts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGifts((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) handleCancelEdit();
    }
  };

  const handleToggleStatus = async (gift: Gift) => {
    const newStatus = gift.estado === "disponible" ? "reservado" : "disponible";
    const body =
      newStatus === "disponible"
        ? { estado: "disponible", reservadoPor: null }
        : {
            estado: "reservado",
            reservadoPor: gift.reservadoPor ?? "Admin",
          };

    const res = await fetch(`/api/gifts/${gift.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setGifts((prev) => prev.map((g) => (g.id === gift.id ? updated : g)));
    }
  };

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-200 border-t-sage-700" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-sage-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la lista
          </Link>

          <h1 className="font-serif text-2xl text-sage-900">Administración</h1>
          <p className="mt-2 text-sm text-gray-500">
            Ingresa la contraseña para administrar la lista de regalos.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-xl border border-beige-200 bg-beige-50 px-4 py-3 text-sm outline-none focus:border-sage-300 focus:bg-white"
            />
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-sage-700 py-3 text-sm font-medium text-white hover:bg-sage-800 disabled:opacity-60"
            >
              {loginLoading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-12">
      <header className="sticky top-0 z-10 border-b border-beige-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-sage-900">Administración</h1>
            <p className="text-xs text-gray-400">{gifts.length} regalos</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-beige-100"
            >
              Ver lista
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-beige-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-beige-200 bg-beige-50 p-5"
        >
          <h2 className="flex items-center gap-2 font-serif text-lg text-sage-900">
            {editingId ? (
              <>
                <Pencil className="h-4 w-4" />
                Editar regalo
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Agregar regalo
              </>
            )}
          </h2>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del regalo"
              className="w-full rounded-xl border border-beige-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-300"
            />
            <textarea
              value={form.especificaciones}
              onChange={(e) =>
                setForm({ ...form, especificaciones: e.target.value })
              }
              placeholder="Especificaciones"
              rows={2}
              className="w-full resize-none rounded-xl border border-beige-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-300"
            />
          </div>

          {formError && (
            <p className="mt-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="mt-4 flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 rounded-xl border border-beige-200 py-2.5 text-sm text-gray-600 hover:bg-white"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-sage-700 py-2.5 text-sm font-medium text-white hover:bg-sage-800 disabled:opacity-60"
            >
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Agregar"}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-3">
          <h2 className="font-serif text-lg text-sage-900">Regalos</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-beige-100"
                />
              ))}
            </div>
          ) : gifts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No hay regalos todavía.
            </p>
          ) : (
            gifts.map((gift) => (
              <div
                key={gift.id}
                className="rounded-2xl border border-beige-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-sage-900">
                      <span aria-hidden="true" className="mr-1.5">
                        {getGiftEmoji(gift.nombre)}
                      </span>
                      {gift.nombre}
                    </p>
                    {gift.especificaciones && (
                      <p className="mt-1 text-sm text-gray-500">
                        {gift.especificaciones}
                      </p>
                    )}
                    <div className="mt-2">
                      <StatusBadge status={gift.estado} />
                    </div>
                    {gift.estado === "reservado" && gift.reservadoPor && (
                      <p className="mt-2 text-sm text-sage-700">
                        Reservado por:{" "}
                        <span className="font-medium">{gift.reservadoPor}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(gift)}
                      className="rounded-lg p-2 text-sage-600 hover:bg-sage-50"
                      title={
                        gift.estado === "disponible"
                          ? "Marcar como reservado"
                          : "Marcar como disponible"
                      }
                    >
                      {gift.estado === "disponible" ? (
                        <ToggleLeft className="h-5 w-5" />
                      ) : (
                        <ToggleRight className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(gift)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-beige-50"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(gift.id)}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
