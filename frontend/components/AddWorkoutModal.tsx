"use client";

import { useState } from "react";
import { X, Dumbbell, Timer, Flame } from "lucide-react";
import { createWorkout } from "@/lib/api";

const WORKOUT_TYPES = [
  { value: "Cardio", label: "Cardio", met: 9 },
  { value: "Fuerza", label: "Fuerza", met: 5 },
  { value: "HIIT", label: "HIIT", met: 11 },
  { value: "Flexibilidad", label: "Flexibilidad / Yoga", met: 3 },
  { value: "Deporte", label: "Deporte", met: 7 },
  { value: "Caminata", label: "Caminata", met: 4 },
  { value: "Natación", label: "Natación", met: 8 },
  { value: "Ciclismo", label: "Ciclismo", met: 8 },
  { value: "Otro", label: "Otro", met: 5 },
];

interface Props {
  userWeightKg?: number | null;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddWorkoutModal({ userWeightKg, onClose, onAdded }: Props) {
  const weight = userWeightKg || 70;

  const [workoutType, setWorkoutType] = useState("Cardio");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = WORKOUT_TYPES.find((t) => t.value === workoutType)!;
  const estimatedCalories = Math.round(selectedType.met * weight * (duration / 60));
  const [calories, setCalories] = useState<number>(estimatedCalories);

  const handleTypeChange = (type: string) => {
    const t = WORKOUT_TYPES.find((x) => x.value === type)!;
    setWorkoutType(type);
    setCalories(Math.round(t.met * weight * (duration / 60)));
  };

  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    setCalories(Math.round(selectedType.met * weight * (mins / 60)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) { setError("La duración debe ser mayor a 0."); return; }
    setLoading(true);
    setError("");
    try {
      await createWorkout({
        workout_type: workoutType,
        duration_minutes: duration,
        calories_burned: calories,
        notes: notes || undefined,
      });
      onAdded();
    } catch {
      setError("No se pudo registrar el entrenamiento. Intenta de nuevo.");
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Registrar Ejercicio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de ejercicio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
                    workoutType === t.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Timer className="w-4 h-4 inline mr-1.5 text-gray-400" />
              Duración (minutos)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={duration}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Calorías estimadas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Flame className="w-4 h-4 inline mr-1.5 text-orange-400" />
              Calorías quemadas (estimadas, editable)
            </label>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Calculado con MET × {weight} kg × {duration} min
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Series, distancia, intensidad..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
