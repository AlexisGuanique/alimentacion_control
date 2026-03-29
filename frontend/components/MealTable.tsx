"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Search, Clock, Flame, Pencil } from "lucide-react";
import { Meal, deleteMeal } from "@/lib/api";
import { formatDate, CATEGORY_COLORS, SOURCE_ICONS } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import MealDetailModal from "@/components/MealDetailModal";
import EditMealModal from "@/components/EditMealModal";

interface MealTableProps {
  meals: Meal[];
  onDelete: (id: number) => void;
  onUpdate?: (updated: Meal) => void;
}

type SortKey = "created_at" | "calories" | "category";

export default function MealTable({ meals, onDelete, onUpdate }: MealTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleDelete = async () => {
    if (confirmId === null) return;
    setDeleting(confirmId);
    try {
      await deleteMeal(confirmId);
      onDelete(confirmId);
      setConfirmId(null);
    } catch {
      setConfirmId(null);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = meals
    .filter((m) =>
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA: string | number = a[sortKey];
      let valB: string | number = b[sortKey];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  const mealToDelete = filtered.find((m) => m.id === confirmId);

  return (
    <>
    {detailMeal && (
      <MealDetailModal
        meal={detailMeal}
        onClose={() => setDetailMeal(null)}
        onDelete={(id) => { setDetailMeal(null); setConfirmId(id); }}
        onEdit={(meal) => { setDetailMeal(null); setEditMeal(meal); }}
      />
    )}
    {editMeal && (
      <EditMealModal
        meal={editMeal}
        onClose={() => setEditMeal(null)}
        onUpdated={(updated) => {
          onUpdate?.(updated);
          setEditMeal(null);
        }}
      />
    )}
    {confirmId !== null && (
      <ConfirmModal
        title="Eliminar comida"
        description={`¿Estás seguro que querés eliminar "${mealToDelete?.description}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting === confirmId}
      />
    )}
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Search bar — siempre visible */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar comidas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} registros
        </span>
      </div>

      {/* ── Vista móvil: cards ── */}
      <div className="sm:hidden divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">
            No hay comidas registradas
          </p>
        ) : (
            filtered.map((meal) => (
            <div
              key={meal.id}
              className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/70 transition-colors"
              onClick={() => setDetailMeal(meal)}
            >
              {/* Icono fuente */}
              <div className="text-xl flex-shrink-0 mt-0.5">
                {SOURCE_ICONS[meal.source] || "📋"}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
                    {meal.description}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditMeal(meal); }}
                      className="text-gray-300 hover:text-primary transition-colors p-0.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(meal.id); }}
                      disabled={deleting === meal.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50 p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      CATEGORY_COLORS[meal.category] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {meal.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                    <Flame className="w-3 h-3 text-orange-400" />
                    {meal.calories.toFixed(0)} kcal
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(meal.created_at)}
                  </span>
                </div>

                {meal.raw_text && meal.raw_text !== meal.description && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    &ldquo;{meal.raw_text}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Vista desktop: tabla ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("created_at")}
              >
                Fecha <SortIcon col="created_at" />
              </th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("category")}
              >
                Categoría <SortIcon col="category" />
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-gray-700"
                onClick={() => handleSort("calories")}
              >
                Calorías <SortIcon col="calories" />
              </th>
              <th className="px-4 py-3 text-center">Fuente</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No hay comidas registradas
                </td>
              </tr>
            ) : (
              filtered.map((meal) => (
                <tr
                  key={meal.id}
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  onClick={() => setDetailMeal(meal)}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {formatDate(meal.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 line-clamp-1">
                      {meal.description}
                    </div>
                    {meal.raw_text && meal.raw_text !== meal.description && (
                      <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                        &ldquo;{meal.raw_text}&rdquo;
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        CATEGORY_COLORS[meal.category] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {meal.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {meal.calories.toFixed(0)}{" "}
                    <span className="text-xs font-normal text-gray-400">kcal</span>
                  </td>
                  <td className="px-4 py-3 text-center text-base">
                    <span title={meal.source}>
                      {SOURCE_ICONS[meal.source] || "📋"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditMeal(meal); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(meal.id); }}
                        disabled={deleting === meal.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
