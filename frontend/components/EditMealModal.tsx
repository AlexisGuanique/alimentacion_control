"use client";

import { useState } from "react";
import { X, Pencil } from "lucide-react";
import { updateMeal, Meal } from "@/lib/api";

const CATEGORIES = [
  "Proteína", "Carbohidrato", "Grasa", "Verdura",
  "Fruta", "Lácteo", "Bebida", "Snack", "Otro",
];

interface Props {
  meal: Meal;
  onClose: () => void;
  onUpdated: (updated: Meal) => void;
}

export default function EditMealModal({ meal, onClose, onUpdated }: Props) {
  const [description, setDescription] = useState(meal.description);
  const [calories, setCalories] = useState(meal.calories);
  const [category, setCategory] = useState(meal.category);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError("La descripción es requerida."); return; }
    if (calories <= 0) { setError("Las calorías deben ser mayores a 0."); return; }
    setLoading(true); setError("");
    try {
      const updated = await updateMeal(meal.id, { description, calories, category });
      onUpdated(updated);
    } catch {
      setError("No se pudo actualizar la comida.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Editar Comida</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat} type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${category === cat ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Calorías */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Calorías (kcal)</label>
            <input
              type="number" min={1} step={1}
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60">
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
