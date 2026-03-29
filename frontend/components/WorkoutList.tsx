"use client";

import { useState } from "react";
import { Trash2, Dumbbell, Timer, Flame, FileText, Pencil } from "lucide-react";
import { deleteWorkout, Workout } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import ConfirmModal from "./ConfirmModal";
import EditWorkoutModal from "./EditWorkoutModal";

function WorkoutDetails({ details_json }: { details_json: string | null }) {
  if (!details_json) return null;
  try {
    const d = JSON.parse(details_json);
    if (d.exercises?.length) {
      return (
        <div className="mt-2 space-y-1">
          {d.exercises.map((ex: { name: string; sets: number; reps: number; weight_kg: number }, i: number) => (
            ex.name && (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{ex.name}</span>
                <span className="text-gray-400">·</span>
                <span>{ex.sets}×{ex.reps}</span>
                {ex.weight_kg > 0 && <><span className="text-gray-400">·</span><span>{ex.weight_kg}kg</span></>}
              </div>
            )
          ))}
        </div>
      );
    }
    if (d.distance_km) return <p className="text-xs text-gray-500 mt-1">{d.distance_km} km</p>;
    if (d.distance_m) return <p className="text-xs text-gray-500 mt-1">{d.distance_m}m — {d.style || ""}</p>;
    if (d.rounds) return <p className="text-xs text-gray-500 mt-1">{d.rounds} rondas · {d.work_seconds}s trabajo / {d.rest_seconds}s descanso</p>;
    if (d.sport) return <p className="text-xs text-gray-500 mt-1">{d.sport}</p>;
  } catch { /* ignore */ }
  return null;
}

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

interface Props {
  workouts: Workout[];
  onDelete: (id: number) => void;
  onUpdate?: (updated: Workout) => void;
  userWeightKg?: number | null;
}

export default function WorkoutList({ workouts, onDelete, onUpdate, userWeightKg }: Props) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editWorkout, setEditWorkout] = useState<Workout | null>(null);

  const handleDelete = async () => {
    if (confirmId === null) return;
    try {
      await deleteWorkout(confirmId);
      onDelete(confirmId);
    } catch {
      alert("No se pudo eliminar el entrenamiento.");
    } finally {
      setConfirmId(null);
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
          <Dumbbell className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-gray-500 text-sm">Sin entrenamientos registrados hoy</p>
        <p className="text-gray-400 text-xs mt-1">Registra tu primer ejercicio del día</p>
      </div>
    );
  }

  return (
    <>
      {editWorkout && (
        <EditWorkoutModal
          workout={editWorkout}
          userWeightKg={userWeightKg}
          onClose={() => setEditWorkout(null)}
          onUpdated={(updated) => { onUpdate?.(updated); setEditWorkout(null); }}
        />
      )}

      {/* Cards — mobile & tablet */}
      <div className="lg:hidden space-y-3">
        {workouts.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[w.workout_type] || "bg-gray-100 text-gray-700"}`}>
                {w.workout_type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditWorkout(w)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmId(w.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Timer className="w-4 h-4 text-blue-400" />
                <span>{w.duration_minutes} min</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{w.calories_burned.toFixed(0)} kcal</span>
              </div>
            </div>
            <WorkoutDetails details_json={w.details_json} />
            {w.notes && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500">
                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{w.notes}</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">{formatDate(w.created_at)}</p>
          </div>
        ))}
      </div>

      {/* Table — desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duración</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Calorías</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hora</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {workouts.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[w.workout_type] || "bg-gray-100 text-gray-700"}`}>
                    {w.workout_type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-blue-400" />
                    {w.duration_minutes} min
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    {w.calories_burned.toFixed(0)} kcal
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 max-w-xs">
                  <WorkoutDetails details_json={w.details_json} />
                  {w.notes && <p className="text-xs truncate mt-0.5">{w.notes}</p>}
                  {!w.details_json && !w.notes && "—"}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(w.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditWorkout(w)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmId(w.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmId !== null && (
        <ConfirmModal
          title="Eliminar entrenamiento"
          description="¿Estás seguro de que querés eliminar este entrenamiento? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
