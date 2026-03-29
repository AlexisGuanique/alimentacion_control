"use client";

import { useState } from "react";
import { X, Plus, Wand2 } from "lucide-react";
import { createMealManual, createMealAI, Meal } from "@/lib/api";

const CATEGORIES = [
  "Proteína", "Carbohidrato", "Grasa", "Verdura",
  "Fruta", "Lácteo", "Bebida", "Snack", "Otro",
];

interface AddMealModalProps {
  onClose: () => void;
  onAdded: (meal: Meal) => void;
}

export default function AddMealModal({ onClose, onAdded }: AddMealModalProps) {
  const [tab, setTab] = useState<"manual" | "ai">("ai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [manual, setManual] = useState({
    description: "",
    calories: "",
    category: "Otro",
  });
  const [aiText, setAiText] = useState("");

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const meal = await createMealManual({
        description: manual.description,
        calories: parseFloat(manual.calories),
        category: manual.category,
        source: "Manual",
      });
      onAdded(meal);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const meal = await createMealAI(aiText);
      onAdded(meal);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Registrar Comida</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-0">
          <button
            onClick={() => setTab("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "ai"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            Con IA
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === "manual"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Plus className="w-4 h-4" />
            Manual
          </button>
        </div>

        <div className="p-5">
          {tab === "ai" ? (
            <form onSubmit={handleAI} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe lo que comiste
                </label>
                <textarea
                  value={aiText}
                  onChange={(e) => { setAiText(e.target.value); setError(""); }}
                  placeholder="Ej: Me comí una milanesa con puré, una porción grande"
                  rows={3}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" />
                  La IA calculará las calorías automáticamente
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !aiText.trim()}
                className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {loading ? "Analizando con IA..." : "Analizar y Guardar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManual} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descripción
                </label>
                <input
                  type="text"
                  value={manual.description}
                  onChange={(e) => setManual((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ej: Pollo grillado con ensalada"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Calorías (kcal)
                  </label>
                  <input
                    type="number"
                    value={manual.calories}
                    onChange={(e) => setManual((p) => ({ ...p, calories: e.target.value }))}
                    placeholder="350"
                    min={0}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={manual.category}
                    onChange={(e) => setManual((p) => ({ ...p, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {loading ? "Guardando..." : "Guardar Comida"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
