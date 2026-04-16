"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ClipboardList, Trash2, ChevronDown, ChevronUp,
  Clock, Calendar, Dumbbell, Target, Zap, Timer, Weight,
  RefreshCw, Info, Pencil, CheckCircle2,
} from "lucide-react";

import {
  getRoutines, deleteRoutine, updateRoutine, createWorkout, getMe,
  Routine, RoutineContent, RoutineDay, RoutineExercise, User,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import GenerateRoutineModal from "@/components/GenerateRoutineModal";
import CreateRoutineManualModal from "@/components/CreateRoutineManualModal";
import EditRoutineModal from "@/components/EditRoutineModal";
import ConfirmModal from "@/components/ConfirmModal";

// ── Markdown renderer (convierte **bold** y listas - en JSX) ─────────────────

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const boldify = (str: string) =>
    str.split(/(\*\*.*?\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>
        : part
    );

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc pl-5 space-y-1 my-2">
        {listItems.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 leading-relaxed">{boldify(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); continue; }
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-sm text-gray-600 leading-relaxed">{boldify(trimmed)}</p>
      );
    }
  }
  flushList();
  return <div className="space-y-1">{elements}</div>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_EMOJI: Record<string, string> = {
  "Pérdida de grasa": "🔥",
  "Ganancia muscular": "💪",
  "Fuerza máxima": "🏋️",
  "Resistencia cardiovascular": "🏃",
  "Definición muscular": "⚡",
  "Salud general y bienestar": "🌿",
  "Atletismo y rendimiento": "🎯",
  "Flexibilidad y movilidad": "🧘",
};

const GOAL_COLOR: Record<string, string> = {
  "Pérdida de grasa": "from-orange-400 to-red-500",
  "Ganancia muscular": "from-blue-500 to-indigo-600",
  "Fuerza máxima": "from-gray-600 to-gray-800",
  "Resistencia cardiovascular": "from-green-400 to-teal-500",
  "Definición muscular": "from-purple-500 to-pink-500",
  "Salud general y bienestar": "from-emerald-400 to-green-500",
  "Atletismo y rendimiento": "from-yellow-400 to-orange-500",
  "Flexibilidad y movilidad": "from-teal-400 to-cyan-500",
};

const INTENSITY_COLOR: Record<string, string> = {
  Alta: "bg-red-100 text-red-700",
  Media: "bg-yellow-100 text-yellow-700",
  Baja: "bg-green-100 text-green-700",
  Moderada: "bg-blue-100 text-blue-700",
};

// Valores válidos del enum WorkoutType en el backend
const VALID_WORKOUT_TYPES = ["Cardio","Fuerza","HIIT","Flexibilidad","Deporte","Caminata","Natación","Ciclismo","Otro"] as const;
type WorkoutTypeValue = typeof VALID_WORKOUT_TYPES[number];

function detectWorkoutType(focus: string): WorkoutTypeValue {
  const f = focus.toLowerCase();
  if (f.includes("cardio") || f.includes("carrera") || f.includes("correr")) return "Cardio";
  if (f.includes("hiit")) return "HIIT";
  if (f.includes("flexib") || f.includes("movilidad") || f.includes("yoga") || f.includes("stretching")) return "Flexibilidad";
  if (f.includes("natación") || f.includes("natacion") || f.includes("piscina")) return "Natación";
  if (f.includes("ciclismo") || f.includes("bicicleta")) return "Ciclismo";
  if (f.includes("caminata") || f.includes("caminar")) return "Caminata";
  if (f.includes("deporte") || f.includes("fútbol") || f.includes("tenis") || f.includes("baloncesto")) return "Deporte";
  return "Fuerza";
}

function parseContent(routine: Routine): RoutineContent | null {
  try { return JSON.parse(routine.content_json); } catch { return null; }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── MarkDoneModal ─────────────────────────────────────────────────────────────

function MarkDoneModal({
  routine, day, onClose, onDone,
}: {
  routine: Routine;
  day: RoutineDay;
  onClose: () => void;
  onDone: () => void;
}) {
  const [duration, setDuration] = useState(60);
  const [calories, setCalories] = useState(350);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const workoutType = detectWorkoutType(day.focus);
      // Usar la fecha local del usuario para evitar desfases de zona horaria
      const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
      await createWorkout({
        workout_type: workoutType,
        duration_minutes: duration,
        calories_burned: calories,
        notes: `${routine.name} — ${day.day_name}: ${day.focus}`,
        details_json: JSON.stringify({
          exercises: day.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight_suggestion: ex.weight_suggestion,
            muscle_group: ex.muscle_group,
          })),
          routine_focus: day.focus,
          from_routine: true,
        }),
        recorded_at: localDate,
      });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el entrenamiento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Marcar día como realizado</h3>
              <p className="text-xs text-gray-400">{day.day_name} — {day.focus}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Resumen de ejercicios */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              {day.exercises.length} ejercicios
            </p>
            <div className="space-y-1">
              {day.exercises.slice(0, 5).map((ex, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                  <span className="truncate">{ex.name}</span>
                  <span className="flex-shrink-0 ml-2 text-gray-400">{ex.sets} × {ex.reps}</span>
                </div>
              ))}
              {day.exercises.length > 5 && (
                <p className="text-xs text-gray-400">+{day.exercises.length - 5} más...</p>
              )}
            </div>
          </div>

          {/* Duración y calorías */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                <Timer className="w-3.5 h-3.5 inline mr-1 text-purple-400" />
                Duración (min)
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                <Zap className="w-3.5 h-3.5 inline mr-1 text-orange-400" />
                Kcal quemadas
              </label>
              <input
                type="number"
                min={0}
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            El entrenamiento se agregará a tu historial de Ejercicios de hoy.
          </p>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Registrando..." : "Registrar entrenamiento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── InfoRow con markdown ──────────────────────────────────────────────────────

function InfoRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-all"
      >
        <span>{icon}</span>
        <span className="text-sm font-medium text-gray-800 flex-1 text-left">{label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <MarkdownText text={text} />
        </div>
      )}
    </div>
  );
}

// ── ExerciseDetailModal ───────────────────────────────────────────────────────

function ExerciseDetailModal({ ex, index, onClose }: { ex: RoutineExercise; index: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-gray-900 font-bold text-sm leading-tight">{ex.name}</h3>
              {ex.muscle_group && (
                <span className="text-xs text-indigo-600 font-medium">{ex.muscle_group}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {ex.sets && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{ex.sets}</p>
                <p className="text-xs text-blue-600 font-medium">Series</p>
              </div>
            )}
            {ex.reps && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-orange-700">{ex.reps}</p>
                <p className="text-xs text-orange-600 font-medium">Repeticiones</p>
              </div>
            )}
            {ex.rest_seconds && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-purple-700">{ex.rest_seconds}s</p>
                <p className="text-xs text-purple-600 font-medium">Descanso</p>
              </div>
            )}
            {ex.intensity && (
              <div className={`border rounded-xl p-3 text-center ${INTENSITY_COLOR[ex.intensity] || "bg-gray-50 border-gray-100"}`}>
                <p className="text-xl font-bold">{ex.intensity}</p>
                <p className="text-xs font-medium opacity-80">Intensidad</p>
              </div>
            )}
          </div>

          {/* Peso sugerido */}
          {ex.weight_suggestion && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">🏋️</span>
              <div>
                <p className="text-xs font-semibold text-green-700">Peso sugerido</p>
                <p className="text-sm text-green-800">{ex.weight_suggestion}</p>
              </div>
            </div>
          )}

          {/* Técnica */}
          {ex.technique_tip && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-sky-700 mb-1">💡 Consejo de técnica</p>
              <p className="text-sm text-sky-800 leading-relaxed">{ex.technique_tip}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DayDetail ────────────────────────────────────────────────────────────────

function DayDetail({ day, routine, onDone }: { day: RoutineDay; routine: Routine; onDone: () => void }) {
  const [showMarkDone, setShowMarkDone] = useState(false);
  const [detailEx, setDetailEx] = useState<{ ex: RoutineExercise; index: number } | null>(null);

  return (
    <div className="space-y-3">
      {day.warmup && (
        <div className="flex gap-2 px-4 py-2.5 bg-yellow-50 rounded-xl border border-yellow-100">
          <span className="text-sm">🌡️</span>
          <div>
            <p className="text-xs font-semibold text-yellow-700 mb-0.5">Calentamiento</p>
            <p className="text-xs text-yellow-600">{day.warmup}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {day.exercises.map((ex, i) => (
          <button
            key={i}
            onClick={() => setDetailEx({ ex, index: i })}
            className="w-full text-left bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors" title={ex.name}>
                  {ex.name}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {ex.intensity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTENSITY_COLOR[ex.intensity] || "bg-gray-100 text-gray-700"}`}>
                    {ex.intensity}
                  </span>
                )}
                <Info className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {ex.sets && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <RefreshCw className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span><span className="font-semibold">{ex.sets}</span> series</span>
                </div>
              )}
              {ex.reps && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Dumbbell className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span><span className="font-semibold">{ex.reps}</span> reps</span>
                </div>
              )}
              {ex.rest_seconds && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Timer className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <span><span className="font-semibold">{ex.rest_seconds}s</span> desc.</span>
                </div>
              )}
              {ex.weight_suggestion && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Weight className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="truncate" title={ex.weight_suggestion}>{ex.weight_suggestion}</span>
                </div>
              )}
            </div>
            {ex.muscle_group && (
              <span className="inline-block text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium mb-1.5">
                {ex.muscle_group}
              </span>
            )}
            {ex.technique_tip && (
              <div className="flex gap-1.5 mt-1">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 italic truncate" title={ex.technique_tip}>{ex.technique_tip}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {day.cooldown && (
        <div className="flex gap-2 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-sm">❄️</span>
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-0.5">Enfriamiento</p>
            <p className="text-xs text-blue-600">{day.cooldown}</p>
          </div>
        </div>
      )}

      {/* Botón marcar como realizado */}
      <button
        onClick={() => setShowMarkDone(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-all"
      >
        <CheckCircle2 className="w-4 h-4" />
        Marcar día como realizado
      </button>

      {showMarkDone && (
        <MarkDoneModal
          routine={routine}
          day={day}
          onClose={() => setShowMarkDone(false)}
          onDone={() => { setShowMarkDone(false); onDone(); }}
        />
      )}

      {detailEx && (
        <ExerciseDetailModal
          ex={detailEx.ex}
          index={detailEx.index}
          onClose={() => setDetailEx(null)}
        />
      )}
    </div>
  );
}

// ── RoutineCard ───────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onDelete,
  onEdit,
  onUpdate,
}: {
  routine: Routine;
  onDelete: (id: number) => void;
  onEdit: (r: Routine) => void;
  onUpdate: (updated: Routine) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [doneFeedback, setDoneFeedback] = useState(false);
  const content = parseContent(routine);
  const gradient = GOAL_COLOR[routine.goal] || "from-blue-500 to-indigo-600";
  const emoji = GOAL_EMOJI[routine.goal] || "💪";

  const handleDone = () => {
    setDoneFeedback(true);
    setTimeout(() => setDoneFeedback(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className={`bg-gradient-to-r ${gradient} p-5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">{routine.goal}</span>
            </div>
            <h3 className="text-base font-bold leading-tight">{routine.name}</h3>
            {routine.description && (
              <p className="text-sm text-white/80 mt-1 line-clamp-2">{routine.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onEdit(routine)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
              title="Editar rutina"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onDelete(routine.id)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
              title="Eliminar rutina"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { icon: Calendar, label: `${routine.duration_weeks} semanas` },
            { icon: Dumbbell, label: `${routine.days_per_week} días/sem` },
            { icon: Zap, label: routine.fitness_level },
            { icon: Clock, label: formatDate(routine.created_at) },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
              <Icon className="w-3 h-3" /> {label}
            </span>
          ))}
        </div>
      </div>

      {doneFeedback && (
        <div className="flex items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700">
            ¡Entrenamiento registrado! Búscalo en Ejercicios → día de hoy ({new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long" })}).
          </p>
        </div>
      )}

      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all border-b border-gray-100"
      >
        {expanded ? <><ChevronUp className="w-4 h-4" /> Ocultar rutina</> : <><ChevronDown className="w-4 h-4" /> Ver rutina completa</>}
      </button>

      {expanded && content && (
        <div className="p-5 space-y-4">
          {/* Day tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {content.days.map((day, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  activeDay === i
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <span className="block font-semibold">{day.day_name}</span>
                <span className="block text-[10px] opacity-80 truncate max-w-[80px]">{day.focus}</span>
              </button>
            ))}
          </div>

          {content.days[activeDay] && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">{content.days[activeDay].day_name}</p>
                  <p className="text-xs text-blue-600 font-medium">{content.days[activeDay].focus}</p>
                </div>
                <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                  {content.days[activeDay].exercises.length} ejercicios
                </span>
              </div>
              <DayDetail
                day={content.days[activeDay]}
                routine={routine}
                onDone={handleDone}
              />
            </>
          )}

          {(content.progression_notes || content.nutrition_tips || content.rest_days) && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {content.progression_notes && <InfoRow icon="📈" label="Progresión" text={content.progression_notes} />}
              {content.nutrition_tips && <InfoRow icon="🥗" label="Nutrición" text={content.nutrition_tips} />}
              {content.rest_days && <InfoRow icon="😴" label="Descanso" text={content.rest_days} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function RoutinesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, routinesData] = await Promise.all([getMe(), getRoutines()]);
      setUser(userData);
      setRoutines(routinesData);
    } catch {
      localStorage.removeItem("nutritrack_token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("nutritrack_token");
    if (!token) { router.push("/login"); return; }
    fetchData();
  }, [fetchData, router]);

  const handleLogout = () => { localStorage.removeItem("nutritrack_token"); router.push("/login"); };

  const handleDelete = async (id: number) => {
    try {
      await deleteRoutine(id);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
    setConfirmId(null);
  };

  const handleUpdated = (updated: Routine) => {
    setRoutines((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    setEditRoutine(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-600" /> Mis Rutinas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Rutinas de entrenamiento generadas con IA</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-xl border border-gray-200 transition-colors shadow-sm"
            >
              Crear manualmente
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Generar con IA
            </button>
          </div>
        </div>

        {routines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin rutinas todavía</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Genera tu primera rutina personalizada con IA indicando tu objetivo y nivel.
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                <Sparkles className="w-4 h-4" /> Generar con IA
              </button>
              <button
                onClick={() => setShowManualModal(true)}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 font-medium rounded-xl border border-gray-200 transition-colors"
              >
                Crear manualmente
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Rutinas", value: routines.length, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Semanas totales", value: routines.reduce((s, r) => s + r.duration_weeks, 0), icon: Calendar, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Objetivos distintos", value: new Set(routines.map((r) => r.goal)).size, icon: Target, color: "text-orange-500", bg: "bg-orange-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onDelete={(id) => setConfirmId(id)}
                  onEdit={(r) => setEditRoutine(r)}
                  onUpdate={handleUpdated}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showGenerateModal && (
        <GenerateRoutineModal
          onClose={() => setShowGenerateModal(false)}
          onGenerated={(routine) => {
            setRoutines((prev) => [routine, ...prev]);
            setShowGenerateModal(false);
          }}
        />
      )}

      {showManualModal && (
        <CreateRoutineManualModal
          onClose={() => setShowManualModal(false)}
          onCreated={(routine) => {
            setRoutines((prev) => [routine, ...prev]);
            setShowManualModal(false);
          }}
        />
      )}

      {editRoutine && (
        <EditRoutineModal
          routine={editRoutine}
          onClose={() => setEditRoutine(null)}
          onUpdated={handleUpdated}
        />
      )}

      {confirmId !== null && (
        <ConfirmModal
          title="Eliminar rutina"
          description="¿Eliminar esta rutina? Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </AppLayout>
  );
}
