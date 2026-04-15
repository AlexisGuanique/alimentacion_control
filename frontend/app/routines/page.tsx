"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ClipboardList, Trash2, ChevronDown, ChevronUp,
  Clock, Calendar, Dumbbell, Target, Zap, Timer, Weight,
  RefreshCw, Info,
} from "lucide-react";

import {
  getRoutines, deleteRoutine, getMe,
  Routine, RoutineContent, RoutineDay,
  User,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import GenerateRoutineModal from "@/components/GenerateRoutineModal";
import ConfirmModal from "@/components/ConfirmModal";

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

function parseContent(routine: Routine): RoutineContent | null {
  try {
    return JSON.parse(routine.content_json);
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Componente: detalle de un día ─────────────────────────────────────────────

function DayDetail({ day }: { day: RoutineDay }) {
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

      {/* Ejercicios */}
      <div className="space-y-2">
        {day.exercises.map((ex, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 truncate">{ex.name}</h4>
              </div>
              {ex.intensity && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${INTENSITY_COLOR[ex.intensity] || "bg-gray-100 text-gray-700"}`}>
                  {ex.intensity}
                </span>
              )}
            </div>

            {/* Stats row */}
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
                  <span><span className="font-semibold">{ex.rest_seconds}s</span> descanso</span>
                </div>
              )}
              {ex.weight_suggestion && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Weight className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="truncate">{ex.weight_suggestion}</span>
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
                <p className="text-xs text-gray-500 italic">{ex.technique_tip}</p>
              </div>
            )}
          </div>
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
    </div>
  );
}

// ── Componente: tarjeta de rutina ─────────────────────────────────────────────

function RoutineCard({
  routine,
  onDelete,
}: {
  routine: Routine;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const content = parseContent(routine);
  const gradient = GOAL_COLOR[routine.goal] || "from-blue-500 to-indigo-600";
  const emoji = GOAL_EMOJI[routine.goal] || "💪";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card header gradient */}
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
          <button
            onClick={() => onDelete(routine.id)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
            <Calendar className="w-3 h-3" /> {routine.duration_weeks} semanas
          </span>
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
            <Dumbbell className="w-3 h-3" /> {routine.days_per_week} días/sem
          </span>
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
            <Zap className="w-3 h-3" /> {routine.fitness_level}
          </span>
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {formatDate(routine.created_at)}
          </span>
        </div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all border-b border-gray-100"
      >
        {expanded ? (
          <><ChevronUp className="w-4 h-4" /> Ocultar rutina</>
        ) : (
          <><ChevronDown className="w-4 h-4" /> Ver rutina completa</>
        )}
      </button>

      {/* Expanded content */}
      {expanded && content && (
        <div className="p-5 space-y-4">
          {/* Day tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
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

          {/* Active day header */}
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

              <DayDetail day={content.days[activeDay]} />
            </>
          )}

          {/* Extra info accordion */}
          {(content.progression_notes || content.nutrition_tips || content.rest_days) && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {content.progression_notes && (
                <InfoRow icon="📈" label="Progresión" text={content.progression_notes} />
              )}
              {content.nutrition_tips && (
                <InfoRow icon="🥗" label="Nutrición" text={content.nutrition_tips} />
              )}
              {content.rest_days && (
                <InfoRow icon="😴" label="Descanso" text={content.rest_days} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
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
  const [showModal, setShowModal] = useState(false);
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Generar con IA
          </button>
        </div>

        {/* Content */}
        {routines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin rutinas todavía</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Genera tu primera rutina personalizada con IA indicando tu objetivo y nivel de entrenamiento.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Generar mi primera rutina
            </button>
          </div>
        ) : (
          <>
            {/* Stats summary */}
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

            {/* Routine cards */}
            <div className="space-y-4">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onDelete={(id) => setConfirmId(id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <GenerateRoutineModal
          onClose={() => setShowModal(false)}
          onGenerated={(routine) => {
            setRoutines((prev) => [routine, ...prev]);
            setShowModal(false);
          }}
        />
      )}

      {confirmId !== null && (
        <ConfirmModal
          message="¿Eliminar esta rutina? Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </AppLayout>
  );
}
