"use client";

import { useState } from "react";
import { X, Save, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { updateRoutine, Routine, RoutineContent, RoutineExercise } from "@/lib/api";

interface Props {
  routine: Routine;
  onClose: () => void;
  onUpdated: (updated: Routine) => void;
}

export default function EditRoutineModal({ routine, onClose, onUpdated }: Props) {
  const parsed: RoutineContent = JSON.parse(routine.content_json);

  const [name, setName] = useState(routine.name);
  const [description, setDescription] = useState(routine.description || "");
  const [days, setDays] = useState(parsed.days.map((d) => ({
    ...d,
    exercises: d.exercises.map((ex) => ({ ...ex })),
  })));
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof RoutineExercise, value: string | number) => {
    setDays((prev) => {
      const next = prev.map((d, di) => di !== dayIdx ? d : {
        ...d,
        exercises: d.exercises.map((ex, ei) => ei !== exIdx ? ex : { ...ex, [field]: value }),
      });
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const newContent: RoutineContent = { ...parsed, days };
      const updated = await updateRoutine(routine.id, {
        name,
        description,
        content_json: JSON.stringify(newContent),
      });
      onUpdated(updated);
    } catch {
      setError("No se pudo guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-bold text-gray-900">Editar Rutina</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nombre y descripción */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nombre de la rutina</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Tabs de días */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Ejercicios por día</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    activeDay === i
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <span className="block font-semibold">{day.day_name}</span>
                  <span className="block text-[10px] opacity-80 truncate max-w-[80px]">{day.focus}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ejercicios del día activo */}
          {days[activeDay] && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {days[activeDay].day_name} — {days[activeDay].focus}
              </p>
              {days[activeDay].exercises.map((ex, ei) => (
                <ExerciseEditor
                  key={ei}
                  index={ei}
                  exercise={ex}
                  onChange={(field, value) => updateExercise(activeDay, ei, field, value)}
                />
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: editor de un ejercicio ────────────────────────────────────

function ExerciseEditor({
  index,
  exercise,
  onChange,
}: {
  index: number;
  exercise: RoutineExercise;
  onChange: (field: keyof RoutineExercise, value: string | number) => void;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all"
      >
        <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-semibold text-gray-900 flex-1 text-left truncate">{exercise.name}</span>
        <span className="text-xs text-gray-400">{exercise.sets} × {exercise.reps}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del ejercicio</label>
            <input
              type="text"
              value={exercise.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Series</label>
              <input
                type="number"
                min={1}
                value={exercise.sets}
                onChange={(e) => onChange("sets", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Repeticiones</label>
              <input
                type="text"
                value={exercise.reps}
                onChange={(e) => onChange("reps", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Descanso (seg)</label>
              <input
                type="number"
                min={0}
                step={15}
                value={exercise.rest_seconds}
                onChange={(e) => onChange("rest_seconds", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Intensidad</label>
              <select
                value={exercise.intensity}
                onChange={(e) => onChange("intensity", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
              >
                {["Baja", "Moderada", "Media", "Alta"].map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Sugerencia de peso</label>
            <input
              type="text"
              value={exercise.weight_suggestion}
              onChange={(e) => onChange("weight_suggestion", e.target.value)}
              placeholder="Ej: 70-80% de tu 1RM"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Consejo de técnica</label>
            <textarea
              value={exercise.technique_tip}
              onChange={(e) => onChange("technique_tip", e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
