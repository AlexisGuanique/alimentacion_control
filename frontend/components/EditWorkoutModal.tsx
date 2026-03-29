"use client";

import { useState } from "react";
import { X, Pencil, Timer, Flame, Plus, Trash2 } from "lucide-react";
import { updateWorkout, Workout } from "@/lib/api";

const WORKOUT_TYPES = [
  { value: "Cardio", met: 9 },
  { value: "Fuerza", met: 5 },
  { value: "HIIT", met: 11 },
  { value: "Flexibilidad", met: 3 },
  { value: "Deporte", met: 7 },
  { value: "Caminata", met: 4 },
  { value: "Natación", met: 8 },
  { value: "Ciclismo", met: 8 },
  { value: "Otro", met: 5 },
];

interface Exercise { name: string; sets: number; reps: number; weight_kg: number }

interface Props {
  workout: Workout;
  userWeightKg?: number | null;
  onClose: () => void;
  onUpdated: (updated: Workout) => void;
}

function parseDetails(json: string | null) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

export default function EditWorkoutModal({ workout, userWeightKg, onClose, onUpdated }: Props) {
  const weight = userWeightKg || 70;
  const details = parseDetails(workout.details_json);

  const [workoutType, setWorkoutType] = useState(workout.workout_type);
  const [duration, setDuration] = useState(workout.duration_minutes);
  const [calories, setCalories] = useState(workout.calories_burned);
  const [notes, setNotes] = useState(workout.notes || "");

  // Sport-specific
  const [exercises, setExercises] = useState<Exercise[]>(
    details.exercises?.length ? details.exercises : [{ name: "", sets: 3, reps: 10, weight_kg: 0 }]
  );
  const [distanceKm, setDistanceKm] = useState(details.distance_km ? String(details.distance_km) : "");
  const [distanceM, setDistanceM] = useState(details.distance_m ? String(details.distance_m) : "");
  const [swimStyle, setSwimStyle] = useState(details.style || "Libre");
  const [hiitRounds, setHiitRounds] = useState(details.rounds || 8);
  const [hiitWork, setHiitWork] = useState(details.work_seconds || 40);
  const [hiitRest, setHiitRest] = useState(details.rest_seconds || 20);
  const [sport, setSport] = useState(details.sport || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = WORKOUT_TYPES.find((t) => t.value === workoutType)!;

  const recalcCalories = (type: string, mins: number) => {
    const t = WORKOUT_TYPES.find((x) => x.value === type)!;
    setCalories(Math.round(t.met * weight * (mins / 60)));
  };

  const buildDetailsJson = (): string => {
    if (workoutType === "Fuerza") return JSON.stringify({ exercises });
    if (["Cardio", "Caminata", "Ciclismo"].includes(workoutType)) return JSON.stringify({ distance_km: distanceKm ? parseFloat(distanceKm) : null });
    if (workoutType === "Natación") return JSON.stringify({ distance_m: distanceM ? parseInt(distanceM) : null, style: swimStyle });
    if (workoutType === "HIIT") return JSON.stringify({ rounds: hiitRounds, work_seconds: hiitWork, rest_seconds: hiitRest });
    if (workoutType === "Deporte") return JSON.stringify({ sport });
    return "{}";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) { setError("La duración debe ser mayor a 0."); return; }
    setLoading(true); setError("");
    try {
      const updated = await updateWorkout(workout.id, {
        workout_type: workoutType,
        duration_minutes: duration,
        calories_burned: calories,
        notes: notes || undefined,
        details_json: buildDetailsJson(),
      });
      onUpdated(updated);
    } catch {
      setError("No se pudo actualizar el entrenamiento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Editar Ejercicio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de ejercicio</label>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => { setWorkoutType(t.value); recalcCalories(t.value, duration); }}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${workoutType === t.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  {t.value}
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
            Estimado: MET {selectedType.met} × {weight}kg × {duration}min = {Math.round(selectedType.met * weight * (duration / 60))} kcal
          </p>

          {/* Fuerza */}
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

          {["Cardio", "Caminata", "Ciclismo"].includes(workoutType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Distancia (km) — opcional</label>
              <input type="number" min={0} step={0.1} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="Ej: 10.5"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
          )}

          {workoutType === "Natación" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Distancia (m)</label>
                <input type="number" min={0} value={distanceM} onChange={(e) => setDistanceM(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estilo</label>
                <select value={swimStyle} onChange={(e) => setSwimStyle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                  {["Libre", "Mariposa", "Espalda", "Pecho", "Mixto"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-60">
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
