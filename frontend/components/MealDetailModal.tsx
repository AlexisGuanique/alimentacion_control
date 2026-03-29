"use client";

import { X, Flame, Tag, Clock, Zap, Trash2, Pencil } from "lucide-react";
import { Meal } from "@/lib/api";
import { CATEGORY_COLORS, SOURCE_ICONS, formatDate } from "@/lib/utils";

interface MealDetailModalProps {
  meal: Meal;
  onClose: () => void;
  onDelete: (id: number) => void;
  onEdit?: (meal: Meal) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Proteína: "🥩",
  Carbohidrato: "🍞",
  Grasa: "🧈",
  Verdura: "🥦",
  Fruta: "🍎",
  Lácteo: "🥛",
  Bebida: "🥤",
  Snack: "🍿",
  Otro: "🍽️",
};

export default function MealDetailModal({ meal, onClose, onDelete, onEdit }: MealDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con color de categoría */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-5 pt-5 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg p-1 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-4xl mb-3">
            {CATEGORY_EMOJI[meal.category] || "🍽️"}
          </div>
          <h2 className="font-bold text-gray-900 text-lg leading-snug pr-6">
            {meal.description}
          </h2>
          {meal.raw_text && meal.raw_text !== meal.description && (
            <p className="text-xs text-gray-500 mt-1 italic">
              &ldquo;{meal.raw_text}&rdquo;
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="flex flex-col items-center py-4 gap-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-lg font-bold text-gray-900">
              {meal.calories.toFixed(0)}
            </span>
            <span className="text-xs text-gray-400">kcal</span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <Tag className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-gray-700 text-center px-1 leading-tight">
              {meal.category}
            </span>
            <span className="text-xs text-gray-400">categoría</span>
          </div>
          <div className="flex flex-col items-center py-4 gap-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-gray-700">
              {SOURCE_ICONS[meal.source] || "📋"} {meal.source}
            </span>
            <span className="text-xs text-gray-400">fuente</span>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Registrado</span>
            </div>
            <span className="text-sm font-medium text-gray-800">
              {formatDate(meal.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Tag className="w-4 h-4" />
              <span>Categoría</span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                CATEGORY_COLORS[meal.category] || "bg-gray-100 text-gray-700"
              }`}
            >
              {meal.category}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            Cerrar
          </button>
          {onEdit && (
            <button
              onClick={() => { onEdit(meal); onClose(); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          )}
          <button
            onClick={() => { onDelete(meal.id); onClose(); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
