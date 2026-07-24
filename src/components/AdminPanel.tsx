"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  Tag,
  Trash2,
  ToggleLeft,
  Undo2,
} from "lucide-react";
import type { Category } from "@/types/category";
import type { Gift } from "@/types/gift";
import { fetchJson } from "@/lib/fetch-json";
import { matchesGiftSearch } from "@/lib/gift-search";
import { isGiftAvailable } from "@/lib/gift-model";
import { StatusBadge } from "@/components/StatusBadge";
import { EmojiPicker } from "@/components/EmojiPicker";
import { GiftSearchBar } from "@/components/GiftSearchBar";
import { DEFAULT_GIFT_EMOJI, resolveGiftEmoji } from "@/lib/gift-emoji";

interface GiftFormData {
  nombre: string;
  emoji: string;
  especificaciones: string;
  cantidad: string;
  categoriaId: string;
}

const emptyForm: GiftFormData = {
  nombre: "",
  emoji: DEFAULT_GIFT_EMOJI,
  especificaciones: "",
  cantidad: "1",
  categoriaId: "",
};

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<GiftFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [giftSearch, setGiftSearch] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.nombre])),
    [categories],
  );

  const filteredGifts = useMemo(
    () => gifts.filter((gift) => matchesGiftSearch(gift.nombre, giftSearch)),
    [gifts, giftSearch],
  );

  const checkSession = useCallback(async () => {
    const res = await fetchJson<{ authenticated: boolean }>(
      "/api/admin/session",
    );
    if (res.ok) setAuthenticated(res.data.authenticated);
  }, []);

  const fetchGifts = useCallback(async () => {
    const res = await fetchJson<Gift[]>(`/api/admin/gifts?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (res.ok) setGifts(res.data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetchJson<Category[]>("/api/admin/categories", {
      cache: "no-store",
    });
    if (res.ok) setCategories(res.data);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchGifts(), fetchCategories()]);
    } finally {
      setLoading(false);
    }
  }, [fetchGifts, fetchCategories]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (authenticated) fetchAll();
  }, [authenticated, fetchAll]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const res = await fetchJson<{ success: boolean }>("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.trim() }),
    });
    if (!res.ok) {
      const onVercel =
        typeof window !== "undefined" &&
        (window.location.hostname.includes("vercel.app") ||
          window.location.hostname.endsWith(".vercel.app"));
      setLoginError(
        onVercel
          ? "Contraseña incorrecta. En Vercel ve a Settings → Environment Variables, agrega ADMIN_PASSWORD con tu contraseña y redeploya."
          : "Contraseña incorrecta. Si cambiaste .env.local, reinicia el servidor con npm run dev.",
      );
    } else {
      setAuthenticated(true);
      setPassword("");
    }
    setLoginLoading(false);
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

    const cantidad = parseInt(form.cantidad, 10);
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      setFormError("La cantidad debe ser al menos 1");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      nombre: form.nombre,
      emoji: form.emoji,
      especificaciones: form.especificaciones,
      cantidad,
      categoriaId: form.categoriaId || null,
    };

    const result = editingId
      ? await fetchJson<Gift>(`/api/gifts/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetchJson<Gift>("/api/gifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!result.ok) {
      setFormError(result.error);
    } else if (editingId) {
      setGifts((prev) =>
        prev.map((g) => (g.id === editingId ? result.data : g)),
      );
      setForm(emptyForm);
      setEditingId(null);
    } else {
      setGifts((prev) => [...prev, result.data]);
      setForm(emptyForm);
    }

    setSaving(false);
  };

  const handleEdit = (gift: Gift) => {
    setEditingId(gift.id);
    setForm({
      nombre: gift.nombre,
      emoji: resolveGiftEmoji(gift),
      especificaciones: gift.especificaciones,
      cantidad: String(gift.cantidad),
      categoriaId: gift.categoriaId ?? "",
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
    const res = await fetchJson<{ success: boolean }>(
      `/api/gifts/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setGifts((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) handleCancelEdit();
    }
  };

  const handleMarkReserved = async (gift: Gift) => {
    if (!confirm("¿Agregar una reserva manual (Admin) a este regalo?")) return;

    const res = await fetchJson<Gift>(
      `/api/gifts/${encodeURIComponent(gift.id)}/reserve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "Admin" }),
      },
    );

    if (res.ok) {
      await fetchGifts();
    }
  };

  const handleClearReservation = async (gift: Gift) => {
    const count = gift.reservas.length;
    const message =
      count === 1
        ? `¿Quitar la reserva de ${gift.reservas[0].nombre}? El regalo volverá a estar disponible.`
        : `¿Quitar las ${count} reservas de este regalo? Volverá a estar disponible para todos.`;

    if (!confirm(message)) return;

    const res = await fetchJson<Gift>(
      `/api/gifts/${encodeURIComponent(gift.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearReservas: true }),
      },
    );

    if (res.ok) {
      setGifts((prev) => prev.map((g) => (g.id === gift.id ? res.data : g)));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      setCategoryError("Escribe un nombre para la categoría");
      return;
    }

    setCategorySaving(true);
    setCategoryError("");

    const res = await fetchJson<Category>("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newCategory.trim() }),
    });

    if (!res.ok) {
      setCategoryError(res.error);
    } else {
      setCategories((prev) => [...prev, res.data]);
      setNewCategory("");
    }

    setCategorySaving(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const res = await fetchJson<{ success: boolean }>(
      `/api/admin/categories?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleResetCatalog = async () => {
    if (
      !confirm(
        "¿Reemplazar todos los regalos y categorías con la plantilla del sitio? Se perderán reservas y cambios actuales.",
      )
    ) {
      return;
    }

    const res = await fetchJson<{ giftCount: number; categoryCount: number }>(
      "/api/admin/reset-catalog",
      { method: "POST" },
    );

    if (res.ok) {
      await fetchAll();
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-beige-200 bg-beige-50 py-3.5 pl-4 pr-12 text-base text-sage-900 outline-none focus:border-sage-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sage-600 hover:bg-beige-100"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {loginError && (
              <p className="text-sm leading-relaxed text-red-700">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-sage-700 py-3.5 text-base font-semibold text-white hover:bg-sage-800 disabled:opacity-60"
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
            <p className="text-xs text-gray-400">
              {gifts.length} regalos · {categories.length} categorías
            </p>
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

      <div className="mx-auto max-w-lg space-y-8 px-4 pt-6 sm:px-6">
        {/* Categorías */}
        <section className="rounded-2xl border border-beige-200 bg-beige-50 p-5">
          <h2 className="flex items-center gap-2 font-serif text-lg text-sage-900">
            <Tag className="h-4 w-4" />
            Categorías
          </h2>

          <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ej. Cocina, Hogar…"
              className="min-w-0 flex-1 rounded-xl border border-beige-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sage-300"
            />
            <button
              type="submit"
              disabled={categorySaving}
              className="shrink-0 rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sage-800 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {categoryError && (
            <p className="mt-2 text-sm text-red-600">{categoryError}</p>
          )}

          {categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center gap-1 rounded-full bg-white pl-3 pr-1 py-1 text-sm text-sage-800 shadow-sm"
                >
                  {cat.nombre}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="rounded-full p-1 text-red-400 hover:bg-red-50"
                    aria-label={`Eliminar ${cat.nombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleResetCatalog}
            className="mt-4 w-full rounded-xl border border-beige-300 bg-white py-2.5 text-sm font-medium text-sage-700 hover:bg-beige-100"
          >
            Restablecer catálogo desde plantilla
          </button>
        </section>

        {/* Formulario regalo */}
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
            <EmojiPicker
              value={form.emoji}
              onChange={(emoji) => setForm({ ...form, emoji })}
            />
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
            <div>
              <label
                htmlFor="gift-cantidad"
                className="mb-1.5 block text-sm font-medium text-sage-800"
              >
                Cantidad de reservas
              </label>
              <input
                id="gift-cantidad"
                type="number"
                min={1}
                max={99}
                value={form.cantidad}
                onChange={(e) =>
                  setForm({ ...form, cantidad: e.target.value })
                }
                className="w-full rounded-xl border border-beige-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-300"
              />
              <p className="mt-1 text-xs text-sage-600">
                Cuántas personas pueden reservar este mismo regalo (ej. 3 platos).
              </p>
            </div>
            <select
              value={form.categoriaId}
              onChange={(e) =>
                setForm({ ...form, categoriaId: e.target.value })
              }
              className="w-full rounded-xl border border-beige-200 bg-white px-4 py-3 text-sm outline-none focus:border-sage-300"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
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

        {/* Lista regalos */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg text-sage-900">Regalos</h2>

          <GiftSearchBar
            id="admin-gift-search"
            value={giftSearch}
            onChange={setGiftSearch}
            placeholder="Buscar regalo por nombre…"
          />

          {giftSearch.trim() && (
            <p className="text-center text-sm text-sage-600">
              {filteredGifts.length} resultado
              {filteredGifts.length !== 1 ? "s" : ""}
            </p>
          )}

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
          ) : filteredGifts.length === 0 ? (
            <p className="py-8 text-center text-sm text-sage-600">
              No hay regalos que coincidan con tu búsqueda.
            </p>
          ) : (
            filteredGifts.map((gift) => (
              <div
                key={gift.id}
                className="rounded-2xl border border-beige-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-sage-900">
                      <span aria-hidden="true" className="mr-1.5">
                        {resolveGiftEmoji(gift)}
                      </span>
                      {gift.nombre}
                    </p>
                    {gift.categoriaId && (
                      <p className="mt-1 text-xs text-sage-600">
                        {categoryMap.get(gift.categoriaId) ?? gift.categoriaId}
                      </p>
                    )}
                    {gift.cantidad > 1 && (
                      <p className="mt-1 text-xs text-sage-600">
                        Cantidad: {gift.cantidad} reservas
                      </p>
                    )}
                    {gift.especificaciones && (
                      <p className="mt-1 text-sm text-gray-500">
                        {gift.especificaciones}
                      </p>
                    )}
                    <div className="mt-2">
                      <StatusBadge status={gift.estado} />
                    </div>
                    {gift.reservas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-sage-700">
                          {gift.reservas.length}/{gift.cantidad} reservados
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {gift.reservas.map((reserva, index) => (
                            <li
                              key={`${reserva.reservadoEn}-${index}`}
                              className="text-sm text-sage-600"
                            >
                              · {reserva.nombre}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gift.reservas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearReservation(gift)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-sage-300 bg-sage-50 px-3 py-2 text-sm font-medium text-sage-800 hover:bg-sage-100"
                      >
                        <Undo2 className="h-4 w-4" />
                        Quitar reservas
                      </button>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    {isGiftAvailable(gift) && (
                      <button
                        type="button"
                        onClick={() => handleMarkReserved(gift)}
                        className="rounded-lg p-2 text-sage-600 hover:bg-sage-50"
                        title="Agregar reserva manual"
                      >
                        <ToggleLeft className="h-5 w-5" />
                      </button>
                    )}
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
        </section>
      </div>
    </main>
  );
}
