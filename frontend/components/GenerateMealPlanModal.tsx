"use client";

import { useState } from "react";
import { generateMealPlan, MealPlan, MealPlanCreateRequest } from "@/lib/api";
import { Sparkles } from "lucide-react";
import AILoadingContent, { AISuccessContent } from "@/components/AILoadingModal";

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
  const [calorieTarget, setCalorieTarget] = useState<string>(
    dailyCalories ? String(Math.round(dailyCalories)) : ""
  );
  const [dietary, setDietary] = useState("Ninguna");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generated, setGenerated] = useState<MealPlan | null>(null);
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
      setGenerated(plan);
      setLoading(false);
      setSuccess(true);
    } catch {
      setError("No se pudo generar el plan. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header — siempre visible */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" /> Generar Plan con IA
            </h2>
            <p className="text-gray-500 text-sm">
              {loading ? "Trabajando…" : `Paso ${step} de 2`}
            </p>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
              ✕
            </button>
          )}
        </div>

        {/* Animación cargando */}
        {loading && <AILoadingContent type="mealplan" />}

        {/* Animación de éxito */}
        {success && (
          <AISuccessContent
            type="mealplan"
            onDone={() => { if (generated) onGenerated(generated); }}
          />
        )}

        <div className={`overflow-y-auto flex-1 p-6 ${loading || success ? "hidden" : ""}`}>
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-gray-700 text-sm font-medium mb-4">¿Cuál es tu objetivo principal?</p>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    goal === g.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <p className="text-gray-900 font-semibold text-sm">{g.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Duración del plan</label>
                <div className="flex gap-2 flex-wrap">
                  {[3, 5, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        days === d
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-200 text-gray-600 hover:border-green-400"
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Objetivo calórico diario (kcal){" "}
                  <span className="text-gray-400 font-normal">— opcional</span>
                </label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  placeholder="Ej: 1800 — déjalo vacío para que la IA calcule"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Restricciones dietéticas</label>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setDietary(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        dietary === r
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-200 text-gray-600 hover:border-green-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Notas adicionales <span className="text-gray-400 font-normal">— opcional</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ej: No me gustan los lácteos, prefiero pollo sobre carne roja..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t border-gray-100 flex justify-between items-center ${loading || success ? "hidden" : ""}`}>
          {step === 1 ? (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">
              Cancelar
            </button>
          ) : (
            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 text-sm">
              ← Atrás
            </button>
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
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generar Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
