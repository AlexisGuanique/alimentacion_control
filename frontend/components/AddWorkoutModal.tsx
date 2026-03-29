"use client";

import { useState } from "react";
import { X, Dumbbell, Timer, Flame, Sparkles, Plus, Trash2 } from "lucide-react";
import { createWorkout } from "@/lib/api";

const WORKOUT_TYPES = [
  { value: "Cardio", label: "Cardio", met: 9 },
  { value: "Fuerza", label: "Fuerza", met: 5 },
  { value: "HIIT", label: "HIIT", met: 11 },
  { value: "Flexibilidad", label: "Flexibilidad", met: 3 },
  { value: "Deporte", label: "Deporte", met: 7 },
  { value: "Caminata", label: "Caminata", met: 4 },
  { value: "Natación", label: "Natación", met: 8 },
  { value: "Ciclismo", label: "Ciclismo", met: 8 },
  { value: "Otro", label: "Otro", met: 5 },
];

interface Exercise { name: string; sets: number; reps: number; weight_kg: number }

interface Props {
  userWeightKg?: number | null;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddWorkoutModal({ userWeightKg, onClose, onAdded }: Props) {
  const weight = userWeightKg || 70;
  const [mode, setMode] = useState<"manual" | "ai">("ai");

  // ── Manual state ──────────────────────────────────────────────────────────
  const [workoutType, setWorkoutType] = useState("Cardio");
  const [duration, setDuration] = useState(30);
  const [calories, setCalories] = useState(Math.round(9 * weight * (30 / 60)));
  const [notes, setNotes] = useState("");

  // Sport-specific details
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", sets: 3, reps: 10, weight_kg: 0 }]);
  const [distanceKm, setDistanceKm] = useState("");
  const [distanceM, setDistanceM] = useState("");
  const [swimStyle, setSwimStyle] = useState("Libre");
  const [hiitRounds, setHiitRounds] = useState(8);
  const [hiitWork, setHiitWork] = useState(40);
  const [hiitRest, setHiitRest] = useState(20);
  const [sport, setSport] = useState("");

  // ── AI state ──────────────────────────────────────────────────────────────
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = WORKOUT_TYPES.find((t) => t.value === workoutType)!;

  const recalcCalories = (type: string, mins: number) => {
    const t = WORKOUT_TYPES.find((x) => x.value === type)!;
    setCalories(Math.round(t.met * weight * (mins / 60)));
  };

  const buildDetailsJson = (): string => {
    if (workoutType === "Fuerza") {
      return JSON.stringify({ exercises });
    } else if (["Cardio", "Caminata", "Ciclismo"].includes(workoutType)) {
      return JSON.stringify({ distance_km: distanceKm ? parseFloat(distanceKm) : null });
    } else if (workoutType === "Natación") {
      return JSON.stringify({ distance_m: distanceM ? parseInt(distanceM) : null, style: swimStyle });
    } else if (workoutType === "HIIT") {
      return JSON.stringify({ rounds: hiitRounds, work_seconds: hiitWork, rest_seconds: hiitRest });
    } else if (workoutType === "Deporte") {
      return JSON.stringify({ sport });
    }
    return "{}";
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) { setError("La duración debe ser mayor a 0."); return; }
    setLoading(true); setError("");
    try {
      await createWorkout({
        workout_type: workoutType,
        duration_minutes: duration,
        calories_burned: calories,
        notes: notes || undefined,
        details_json: buildDetailsJson(),
      });
      onAdded();
    } catch { setError("No se pudo registrar el entrenamiento."); }
    finally { setLoading(false); }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) { setError("Describe tu entrenamiento."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/workouts/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("nutritrack_token")}`,
        },
        body: JSON.stringify({ text: aiText }),
      });
      if (!res.ok) throw new Error();
      onAdded();
    } catch { setError("No se pudo analizar el entrenamiento. Intenta de nuevo."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Registrar Ejercicio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mx-6 mt-4 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "manual" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Manual
          </button>
          <button
            onClick={() => setMode("ai")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === "ai" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Registrar con IA
          </button>
        </div>

        {/* ── AI Mode ────────────────────────────────────────────────────── */}
        {mode === "ai" && (
          <form onSubmit={handleAiSubmit} className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Describe tu entrenamiento en lenguaje natural. La IA calculará las calorías y estructurará los datos.
            </p>
            <div className="space-y-2">
              {[
                "Hice 4 series de sentadillas con 80kg, 10 reps, y press de banca 3x8 con 70kg",
                "Corrí 10km en 52 minutos por el parque",
                "Nadé 2km estilo libre en 45 minutos",
                "Clase de HIIT de 30 minutos: 8 rondas de burpees y sentadillas",
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAiText(ex)}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all text-gray-500 border border-gray-100 hover:border-blue-200"
                >
                  "{ex}"
                </button>
              ))}
            </div>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Describe tu entrenamiento..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading || !aiText.trim()} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {loading ? "Analizando..." : "Analizar y Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* ── Manual Mode ────────────────────────────────────────────────── */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de ejercicio</label>
              <div className="grid grid-cols-3 gap-2">
                {WORKOUT_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    onClick={() => { setWorkoutType(t.value); recalcCalories(t.value, duration); }}
                    className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${workoutType === t.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duración + Calorías */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Timer className="w-4 h-4 inline mr-1 text-gray-400" />Duración (min)
                </label>
                <input type="number" min={1} max={300} value={duration}
                  onChange={(e) => { const v = Number(e.target.value); setDuration(v); recalcCalories(workoutType, v); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Flame className="w-4 h-4 inline mr-1 text-orange-400" />Kcal quemadas
                </label>
                <input type="number" min={0} value={calories} onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-3">
              Estimado: MET {selectedType.met} × {weight} kg × {duration} min = {Math.round(selectedType.met * weight * (duration / 60))} kcal
            </p>

            {/* ── Sport-specific fields ────────────────────────────────── */}

            {/* FUERZA */}
            {workoutType === "Fuerza" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ejercicios realizados</label>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                      <input placeholder="Ejercicio" value={ex.name} onChange={(e) => { const arr = [...exercises]; arr[i].name = e.target.value; setExercises(arr); }}
                        className="col-span-4 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <div className="col-span-2 flex flex-col items-center">
                        <span className="text-xs text-gray-400 mb-0.5">Series</span>
                        <input type="number" min={1} value={ex.sets} onChange={(e) => { const arr = [...exercises]; arr[i].sets = Number(e.target.value); setExercises(arr); }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="col-span-2 flex flex-col items-center">
                        <span className="text-xs text-gray-400 mb-0.5">Reps</span>
                        <input type="number" min={1} value={ex.reps} onChange={(e) => { const arr = [...exercises]; arr[i].reps = Number(e.target.value); setExercises(arr); }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="col-span-3 flex flex-col items-center">
                        <span className="text-xs text-gray-400 mb-0.5">Peso (kg)</span>
                        <input type="number" min={0} step={0.5} value={ex.weight_kg} onChange={(e) => { const arr = [...exercises]; arr[i].weight_kg = Number(e.target.value); setExercises(arr); }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <button type="button" onClick={() => setExercises(exercises.filter((_, j) => j !== i))}
                        className="col-span-1 text-gray-400 hover:text-red-500 transition-all self-end pb-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExercises([...exercises, { name: "", sets: 3, reps: 10, weight_kg: 0 }])}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar ejercicio
                  </button>
                </div>
              </div>
            )}

            {/* CARDIO / CAMINATA / CICLISMO */}
            {["Cardio", "Caminata", "Ciclismo"].includes(workoutType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Distancia (km) — opcional</label>
                <input type="number" min={0} step={0.1} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="Ej: 10.5"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>
            )}

            {/* NATACIÓN */}
            {workoutType === "Natación" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Distancia (m)</label>
                  <input type="number" min={0} value={distanceM} onChange={(e) => setDistanceM(e.target.value)}
                    placeholder="Ej: 2000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estilo</label>
                  <select value={swimStyle} onChange={(e) => setSwimStyle(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                    {["Libre", "Mariposa", "Espalda", "Pecho", "Mixto"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* HIIT */}
            {workoutType === "HIIT" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Rondas</label>
                  <input type="number" min={1} value={hiitRounds} onChange={(e) => setHiitRounds(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Trabajo (seg)</label>
                  <input type="number" min={1} value={hiitWork} onChange={(e) => setHiitWork(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Descanso (seg)</label>
                  <input type="number" min={0} value={hiitRest} onChange={(e) => setHiitRest(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>
            )}

            {/* DEPORTE */}
            {workoutType === "Deporte" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Qué deporte?</label>
                <input type="text" value={sport} onChange={(e) => setSport(e.target.value)}
                  placeholder="Ej: Fútbol, Tenis, Básquet..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones adicionales..." rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-60">
                {loading ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
