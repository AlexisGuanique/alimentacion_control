"use client";

import { useState } from "react";
import { createRoutineManual, Routine, RoutineContent, RoutineDay, RoutineExercise } from "@/lib/api";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const GOALS = [
  "Pérdida de grasa",
  "Ganancia muscular",
  "Resistencia cardiovascular",
  "Fuerza máxima",
  "Flexibilidad y movilidad",
  "Bienestar general",
];

const LEVELS = ["Principiante", "Intermedio", "Avanzado"];

const EQUIPMENT_OPTIONS = [
  "Gimnasio completo",
  "Mancuernas y barra",
  "Solo mancuernas",
  "Solo peso corporal",
  "Bandas elásticas",
  "Kettlebells",
  "Gimnasio en casa",
];

function emptyExercise(): RoutineExercise {
  return {
    name: "",
    sets: 3,
    reps: "10",
    rest_seconds: 60,
    intensity: "Moderada",
    weight_suggestion: "",
    technique_tip: "",
  };
}

function emptyDay(i: number): RoutineDay {
  return {
    day_number: i + 1,
    day_name: `Día ${i + 1}`,
    focus: "",
    duration_minutes: 60,
    warmup: "5-10 minutos de calentamiento suave.",
    cooldown: "5 minutos de elongación.",
    exercises: [emptyExercise()],
  };
}

// ─── Exercise editor ──────────────────────────────────────────────────────────

function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
  canRemove,
}: {
  exercise: RoutineExercise;
  onChange: (e: RoutineExercise) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(false);

  function txt(key: keyof RoutineExercise, val: string) {
    onChange({ ...exercise, [key]: val });
  }
  function num(key: keyof RoutineExercise, val: string) {
    onChange({ ...exercise, [key]: val === "" ? 0 : Number(val) });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
        <button onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <input
            value={exercise.name}
            onChange={(e) => { e.stopPropagation(); txt("name", e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nombre del ejercicio *"
            className="flex-1 bg-transparent text-gray-900 text-sm font-medium focus:outline-none placeholder-gray-400"
          />
        </button>
        <span className="text-gray-500 text-xs flex-shrink-0">{exercise.sets}×{exercise.reps}</span>
        {canRemove && (
          <button onClick={onRemove} className="p-1 text-red-500 hover:text-red-400 flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="p-3 grid grid-cols-2 gap-3 border-t border-gray-200">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Series</label>
            <input type="number" min={1} value={exercise.sets} onChange={(e) => num("sets", e.target.value)}
              className="w-full bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Reps / Tiempo</label>
            <input value={exercise.reps} onChange={(e) => txt("reps", e.target.value)}
              placeholder="10 ó 30s"
              className="w-full bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Descanso (seg)</label>
            <input type="number" min={0} value={exercise.rest_seconds} onChange={(e) => num("rest_seconds", e.target.value)}
              className="w-full bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Intensidad</label>
            <select value={exercise.intensity} onChange={(e) => txt("intensity", e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500">
              {["Baja", "Moderada", "Alta", "Máxima"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-gray-500 text-xs block mb-1">Sugerencia de peso / carga</label>
            <input value={exercise.weight_suggestion || ""} onChange={(e) => txt("weight_suggestion", e.target.value)}
              placeholder="Ej: 20 kg, propio peso, banda media..."
              className="w-full bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div className="col-span-2">
            <label className="text-gray-500 text-xs block mb-1">Consejo técnico</label>
            <input value={exercise.technique_tip || ""} onChange={(e) => txt("technique_tip", e.target.value)}
              placeholder="Ej: Mantener espalda recta durante el movimiento"
              className="w-full bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCreated: (routine: Routine) => void;
}

export default function CreateRoutineManualModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [level, setLevel] = useState("Intermedio");
  const [equipment, setEquipment] = useState("Gimnasio completo");
  const [description, setDescription] = useState("");

  // Step 2
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [progression, setProgression] = useState("");
  const [nutritionTip, setNutritionTip] = useState("");
  const [restTip, setRestTip] = useState("Descansar al menos 7-8 horas por noche.");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function goToStep2() {
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setError("");
    setRoutineDays(Array.from({ length: daysPerWeek }, (_, i) => emptyDay(i)));
    setStep(2);
  }

  function updateDay(idx: number, day: RoutineDay) {
    setRoutineDays((prev) => prev.map((d, i) => (i === idx ? day : d)));
  }

  function updateExercise(exIdx: number, ex: RoutineExercise) {
    const day = routineDays[activeDay];
    const exercises = day.exercises.map((e, i) => (i === exIdx ? ex : e));
    updateDay(activeDay, { ...day, exercises });
  }

  function addExercise() {
    const day = routineDays[activeDay];
    updateDay(activeDay, { ...day, exercises: [...day.exercises, emptyExercise()] });
  }

  function removeExercise(idx: number) {
    const day = routineDays[activeDay];
    updateDay(activeDay, { ...day, exercises: day.exercises.filter((_, i) => i !== idx) });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const content: RoutineContent = {
        overview: description,
        progression,
        nutrition_tips: nutritionTip,
        rest_tips: restTip,
        days: routineDays,
      };
      const routine = await createRoutineManual({
        name,
        goal,
        description: description || undefined,
        duration_weeks: durationWeeks,
        days_per_week: daysPerWeek,
        fitness_level: level,
        equipment,
        content_json: JSON.stringify(content),
      });
      onCreated(routine);
    } catch {
      setError("No se pudo guardar. Revisa los datos e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const day = routineDays[activeDay];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-bold text-lg">Crear rutina de entrenamiento</h2>
            <p className="text-gray-400 text-sm">Paso {step} de 2 — {step === 1 ? "Información básica" : "Armar la rutina"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Nombre de la rutina *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mi rutina de fuerza"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Objetivo</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button key={g} onClick={() => setGoal(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        goal === g ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}>{g}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-2">Duración (semanas)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 4, 6, 8, 12].map((w) => (
                      <button key={w} onClick={() => setDurationWeeks(w)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          durationWeeks === w ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                        }`}>{w}sem</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-2">Días de entrenamiento/semana</label>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 3, 4, 5, 6].map((d) => (
                      <button key={d} onClick={() => setDaysPerWeek(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          daysPerWeek === d ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Nivel</label>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button key={l} onClick={() => setLevel(l)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        level === l ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Equipamiento disponible</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <button key={eq} onClick={() => setEquipment(eq)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        equipment === eq ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}>{eq}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">
                  Descripción <span className="text-gray-500">— opcional</span>
                </label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción general de la rutina..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none focus:outline-none focus:border-green-500" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && day && (
            <div className="space-y-5">
              {/* Day tabs */}
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Día de entrenamiento</p>
                <div className="flex gap-1 flex-wrap">
                  {routineDays.map((d, i) => (
                    <button key={i} onClick={() => setActiveDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        activeDay === i ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-400 hover:border-green-400"
                      }`}>{d.day_name}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Nombre del día</label>
                  <input value={day.day_name} onChange={(e) => updateDay(activeDay, { ...day, day_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Enfoque / Grupo muscular</label>
                  <input value={day.focus || ""} onChange={(e) => updateDay(activeDay, { ...day, focus: e.target.value })}
                    placeholder="Ej: Pecho y tríceps"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Duración estimada (min)</label>
                  <input type="number" min={10} value={day.duration_minutes || 60}
                    onChange={(e) => updateDay(activeDay, { ...day, duration_minutes: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Calentamiento</label>
                  <textarea rows={2} value={day.warmup || ""} onChange={(e) => updateDay(activeDay, { ...day, warmup: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs resize-none focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Vuelta a la calma</label>
                  <textarea rows={2} value={day.cooldown || ""} onChange={(e) => updateDay(activeDay, { ...day, cooldown: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs resize-none focus:outline-none focus:border-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700 text-sm font-semibold">Ejercicios <span className="text-gray-500 font-normal text-xs">— hacé clic en un ejercicio para editar sus detalles</span></p>
                {day.exercises.map((ex, ei) => (
                  <ExerciseEditor
                    key={ei}
                    exercise={ex}
                    onChange={(e) => updateExercise(ei, e)}
                    onRemove={() => removeExercise(ei)}
                    canRemove={day.exercises.length > 1}
                  />
                ))}
                <button onClick={addExercise}
                  className="flex items-center gap-2 text-green-600 hover:text-green-500 text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Agregar ejercicio
                </button>
              </div>

              {/* Global routine tips */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Información general de la rutina</p>
                {[
                  { label: "Progresión", value: progression, setter: setProgression, ph: "Ej: Aumentar 2.5 kg cada 2 semanas..." },
                  { label: "Nutrición", value: nutritionTip, setter: setNutritionTip, ph: "Ej: Consumir proteína dentro de los 30 min post-entrenamiento..." },
                  { label: "Descanso y recuperación", value: restTip, setter: setRestTip, ph: "Ej: 7-8 horas de sueño..." },
                ].map(({ label, value, setter, ph }) => (
                  <div key={label}>
                    <label className="text-gray-700 text-sm font-medium block mb-1">{label}</label>
                    <textarea rows={2} value={value} onChange={(e) => setter(e.target.value)} placeholder={ph}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none focus:outline-none focus:border-green-500" />
                  </div>
                ))}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          {step === 1 ? (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
          ) : (
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600 text-sm">← Atrás</button>
          )}

          {step === 1 ? (
            <button onClick={goToStep2}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-gray-900 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
              ) : "Guardar rutina"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
