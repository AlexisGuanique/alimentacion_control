"use client";

import { useState } from "react";
import { generateMealPlan, MealPlan, MealPlanCreateRequest } from "@/lib/api";

const GOALS = [
  { id: "Pérdida de grasa", emoji: "🔥", label: "Pérdida de grasa", desc: "Déficit calórico, alta proteína, baja en grasas saturadas" },
  { id: "Ganancia muscular", emoji: "💪", label: "Ganancia muscular", desc: "Superávit controlado, proteína elevada, carbohidratos de calidad" },
  { id: "Mantenimiento", emoji: "⚖️", label: "Mantenimiento", desc: "Calorías de equilibrio, macros balanceados" },
  { id: "Rendimiento deportivo", emoji: "🏅", label: "Rendimiento deportivo", desc: "Alto en carbohidratos, proteína moderada, enfocado en energía" },
  { id: "Salud general", emoji: "🥗", label: "Salud general", desc: "Alimentos naturales, nutrientes variados, antiinflamatorio" },
];

const RESTRICTIONS = [
  "Ninguna",
  "Vegetariano",
  "Vegano",
  "Sin gluten",
  "Sin lactosa",
  "Sin gluten ni lactosa",
  "Keto / Bajo en carbohidratos",
];

interface Props {
  onClose: () => void;
  onGenerated: (plan: MealPlan) => void;
  dailyCalories?: number | null;
}

export default function GenerateMealPlanModal({ onClose, onGenerated, dailyCalories }: Props) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [calorieTarget, setCalorieTarget] = useState<string>(dailyCalories ? String(Math.round(dailyCalories)) : "");
  const [dietary, setDietary] = useState("Ninguna");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!goal) return;
    setLoading(true);
    setError("");
    try {
      const payload: MealPlanCreateRequest = {
        goal,
        days,
        dietary_restrictions: dietary,
        extra_notes: notes || undefined,
      };
      if (calorieTarget && !isNaN(Number(calorieTarget))) {
        payload.calorie_target = Number(calorieTarget);
      }
      const plan = await generateMealPlan(payload);
      onGenerated(plan);
    } catch {
      setError("No se pudo generar el plan. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">Generar Plan de Comidas con IA</h2>
            <p className="text-gray-400 text-sm">Paso {step} de 2</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm font-medium mb-4">¿Cuál es tu objetivo principal?</p>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    goal === g.id
                      ? "border-green-500 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{g.label}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Duración del plan</label>
                <div className="flex gap-2 flex-wrap">
                  {[3, 5, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        days === d
                          ? "bg-green-600 border-green-500 text-white"
                          : "border-white/20 text-gray-300 hover:border-white/40"
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">
                  Objetivo calórico diario (kcal) <span className="text-gray-500">— opcional</span>
                </label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  placeholder="Ej: 1800 — déjalo vacío para que la IA calcule"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Restricciones dietéticas</label>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setDietary(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        dietary === r
                          ? "bg-green-600 border-green-500 text-white"
                          : "border-white/20 text-gray-300 hover:border-white/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">
                  Notas adicionales <span className="text-gray-500">— opcional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ej: No me gustan los lácteos, prefiero pollo sobre carne roja..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center">
          {step === 1 ? (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
          ) : (
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white text-sm">← Atrás</button>
          )}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!goal}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando…
                </>
              ) : (
                "✨ Generar Plan"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
