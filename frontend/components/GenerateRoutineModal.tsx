"use client";

import { useState } from "react";
import { X, Sparkles, Target, Dumbbell, Clock, Zap, ChevronDown } from "lucide-react";
import { generateRoutine, Routine, RoutineCreateRequest } from "@/lib/api";
import AILoadingContent, { AISuccessContent } from "@/components/AILoadingModal";

const GOALS = [
  { value: "Pérdida de grasa", icon: "🔥", desc: "Quemar grasa y mejorar composición corporal" },
  { value: "Ganancia muscular", icon: "💪", desc: "Hipertrofia y aumento de masa muscular" },
  { value: "Fuerza máxima", icon: "🏋️", desc: "Aumentar la fuerza en movimientos compuestos" },
  { value: "Resistencia cardiovascular", icon: "🏃", desc: "Mejorar capacidad aeróbica y resistencia" },
  { value: "Definición muscular", icon: "⚡", desc: "Tonificar y definir el músculo existente" },
  { value: "Salud general y bienestar", icon: "🌿", desc: "Mantenerse activo y saludable en general" },
  { value: "Atletismo y rendimiento", icon: "🎯", desc: "Mejorar rendimiento deportivo específico" },
  { value: "Flexibilidad y movilidad", icon: "🧘", desc: "Mejorar rango de movimiento y flexibilidad" },
];

const LEVELS = ["Principiante", "Intermedio", "Avanzado"];

const EQUIPMENT_OPTIONS = [
  { value: "Gimnasio completo", icon: "🏋️", desc: "Acceso a todo el equipamiento" },
  { value: "Casa con mancuernas", icon: "🏠", desc: "Mancuernas y equipamiento básico en casa" },
  { value: "Solo peso corporal", icon: "🤸", desc: "Sin equipamiento, solo el propio cuerpo" },
  { value: "Gimnasio básico", icon: "💪", desc: "Barras, mancuernas y máquinas básicas" },
];

interface Props {
  onClose: () => void;
  onGenerated: (routine: Routine) => void;
}

export default function GenerateRoutineModal({ onClose, onGenerated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generated, setGenerated] = useState<Routine | null>(null);
  const [error, setError] = useState("");

  const [goal, setGoal] = useState(GOALS[0].value);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [fitnessLevel, setFitnessLevel] = useState("Intermedio");
  const [equipment, setEquipment] = useState(EQUIPMENT_OPTIONS[0].value);
  const [extraNotes, setExtraNotes] = useState("");

  const selectedGoal = GOALS.find((g) => g.value === goal)!;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const data: RoutineCreateRequest = {
        goal,
        duration_weeks: durationWeeks,
        days_per_week: daysPerWeek,
        fitness_level: fitnessLevel,
        equipment,
        extra_notes: extraNotes || undefined,
      };
      const routine = await generateRoutine(data);
      setGenerated(routine);
      setLoading(false);
      setSuccess(true);
    } catch {
      setError("No se pudo generar la rutina. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

        {/* Header — siempre visible */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 leading-tight">Generar Rutina con IA</h2>
              <p className="text-xs text-gray-400">
                {loading ? "Trabajando…" : `Paso ${step} de 2`}
              </p>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!loading && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        )}

        {/* Animación cargando */}
        {loading && <AILoadingContent type="routine" />}

        {/* Animación de éxito */}
        {success && (
          <AISuccessContent
            type="routine"
            onDone={() => { if (generated) onGenerated(generated); }}
          />
        )}

        {/* Formulario — se oculta mientras carga o muestra éxito */}
        <div className={`p-6 space-y-5 ${loading || success ? "hidden" : ""}`}>
          {step === 1 ? (
            <>
              {/* Goal selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <Target className="w-4 h-4 text-blue-500" /> ¿Cuál es tu objetivo?
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                        goal === g.value
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{g.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${goal === g.value ? "text-blue-700" : "text-gray-800"}`}>
                          {g.value}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{g.desc}</p>
                      </div>
                      {goal === g.value && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                Continuar <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </>
          ) : (
            <>
              {/* Selected goal summary */}
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-2xl">{selectedGoal.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800">{selectedGoal.value}</p>
                  <p className="text-xs text-blue-600">{selectedGoal.desc}</p>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <Clock className="w-4 h-4 text-purple-500" /> Duración del programa
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 12].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDurationWeeks(w)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        durationWeeks === w
                          ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {w} sem.
                    </button>
                  ))}
                </div>
              </div>

              {/* Days per week */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <Dumbbell className="w-4 h-4 text-orange-500" /> Días de entrenamiento por semana
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        daysPerWeek === d
                          ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>

              {/* Fitness level */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <Zap className="w-4 h-4 text-yellow-500" /> Nivel de fitness
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFitnessLevel(l)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        fitnessLevel === l
                          ? "border-yellow-500 bg-yellow-50 text-yellow-700 shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="text-sm font-semibold text-gray-800 mb-2 block">🏋️ Equipamiento disponible</label>
                <div className="grid grid-cols-1 gap-2">
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <button
                      key={eq.value}
                      type="button"
                      onClick={() => setEquipment(eq.value)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left border transition-all ${
                        equipment === eq.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{eq.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${equipment === eq.value ? "text-green-700" : "text-gray-700"}`}>
                          {eq.value}
                        </p>
                        <p className="text-xs text-gray-500">{eq.desc}</p>
                      </div>
                      {equipment === eq.value && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra notes */}
              <div>
                <label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  📝 Notas adicionales <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Ej: Tengo una lesión en el hombro derecho, prefiero evitar ejercicios de press..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  ← Atrás
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? "Generando rutina..." : "Generar con IA"}
                </button>
              </div>

              {loading && (
                <p className="text-xs text-gray-400 text-center">
                  La IA está diseñando tu rutina personalizada... esto puede tomar unos segundos.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
