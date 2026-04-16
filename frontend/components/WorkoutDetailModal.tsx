"use client";

import { X, Flame, Timer, FileText, Pencil, Trash2, Dumbbell } from "lucide-react";
import { Workout } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  Cardio: "bg-orange-100 text-orange-700",
  Fuerza: "bg-blue-100 text-blue-700",
  HIIT: "bg-purple-100 text-purple-700",
  Flexibilidad: "bg-teal-100 text-teal-700",
  Deporte: "bg-yellow-100 text-yellow-700",
  Caminata: "bg-green-100 text-green-700",
  "Natación": "bg-cyan-100 text-cyan-700",
  Ciclismo: "bg-amber-100 text-amber-700",
  Otro: "bg-gray-100 text-gray-700",
};

const TYPE_EMOJI: Record<string, string> = {
  Cardio: "🏃", Fuerza: "🏋️", HIIT: "⚡", Flexibilidad: "🧘",
  Deporte: "⚽", Caminata: "🚶", Natación: "🏊", Ciclismo: "🚴", Otro: "💪",
};

function DetailRow({ details_json }: { details_json: string | null }) {
  if (!details_json) return null;
  try {
    const d = JSON.parse(details_json);
    if (d.exercises?.length) {
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ejercicios</p>
          {d.exercises.map((ex: { name: string; sets: number; reps: number; weight_kg: number }, i: number) =>
            ex.name ? (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-sm font-medium text-gray-800">{ex.name}</span>
                <span className="text-xs text-gray-500">
                  {ex.sets}×{ex.reps}{ex.weight_kg > 0 ? ` · ${ex.weight_kg}kg` : ""}
                </span>
              </div>
            ) : null
          )}
        </div>
      );
    }
    if (d.distance_km) return <p className="text-sm text-gray-700">📍 {d.distance_km} km</p>;
    if (d.distance_m) return <p className="text-sm text-gray-700">🏊 {d.distance_m}m — {d.style || ""}</p>;
    if (d.rounds) return <p className="text-sm text-gray-700">⚡ {d.rounds} rondas · {d.work_seconds}s / {d.rest_seconds}s descanso</p>;
    if (d.sport) return <p className="text-sm text-gray-700">⚽ {d.sport}</p>;
  } catch { /* ignore */ }
  return null;
}

interface Props {
  workout: Workout;
  onClose: () => void;
  onDelete: (id: number) => void;
  onEdit?: (workout: Workout) => void;
}

export default function WorkoutDetailModal({ workout, onClose, onDelete, onEdit }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100/50 px-5 pt-5 pb-6 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg p-1 transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className="text-4xl mb-3">{TYPE_EMOJI[workout.workout_type] || "💪"}</div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[workout.workout_type] || "bg-gray-100 text-gray-700"}`}>
            {workout.workout_type}
          </span>
        </div>

        <div className="overflow-y-auto min-h-0">
          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="flex flex-col items-center py-4 gap-1">
              <Timer className="w-4 h-4 text-blue-400" />
              <span className="text-lg font-bold text-gray-900">{workout.duration_minutes}</span>
              <span className="text-xs text-gray-400">minutos</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-lg font-bold text-gray-900">{workout.calories_burned.toFixed(0)}</span>
              <span className="text-xs text-gray-400">kcal quemadas</span>
            </div>
          </div>

          {/* Detalles específicos del deporte */}
          <div className="px-5 py-4 space-y-4">
            <DetailRow details_json={workout.details_json} />

            {workout.notes && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{workout.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Registrado
              </span>
              <span className="font-medium text-gray-700">{formatDate(workout.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2 flex-shrink-0 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
            Cerrar
          </button>
          {onEdit && (
            <button
              onClick={() => { onEdit(workout); onClose(); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          )}
          <button
            onClick={() => { onDelete(workout.id); onClose(); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
