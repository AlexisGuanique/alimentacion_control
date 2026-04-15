"use client";

import { useState } from "react";
import { createMealPlanManual, MealPlan, MealPlanContent, MealPlanDay, MealPlanFood, MealPlanMeal } from "@/lib/api";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const GOALS = [
  "Pérdida de grasa",
  "Ganancia muscular",
  "Mantenimiento",
  "Rendimiento deportivo",
  "Salud general",
];

const RESTRICTIONS = [
  "Ninguna",
  "Vegetariano",
  "Vegano",
  "Sin gluten",
  "Sin lactosa",
  "Keto / Bajo en carbohidratos",
];

const MEAL_TYPES = ["Desayuno", "Almuerzo", "Merienda", "Cena", "Snack"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
  "Día 8", "Día 9", "Día 10", "Día 11", "Día 12", "Día 13", "Día 14"];

function emptyFood(): MealPlanFood {
  return { name: "", amount: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, preparation: "" };
}

function emptyMeal(type: string): MealPlanMeal {
  return {
    meal_type: type,
    time_suggestion: "",
    total_calories: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    foods: [emptyFood()],
  };
}

function buildEmptyDays(count: number): MealPlanDay[] {
  return Array.from({ length: count }, (_, i) => ({
    day_number: i + 1,
    day_name: DAY_NAMES[i] || `Día ${i + 1}`,
    total_calories: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    meals: [emptyMeal("Desayuno"), emptyMeal("Almuerzo"), emptyMeal("Cena")],
  }));
}

// ─── Food editor inline ───────────────────────────────────────────────────────

function FoodEditorInline({
  food,
  onChange,
  onRemove,
  canRemove,
}: {
  food: MealPlanFood;
  onChange: (f: MealPlanFood) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  function num(key: keyof MealPlanFood, val: string) {
    onChange({ ...food, [key]: val === "" ? 0 : Number(val) });
  }
  function txt(key: keyof MealPlanFood, val: string) {
    onChange({ ...food, [key]: val });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
      <div className="flex gap-2">
        <input
          placeholder="Nombre del alimento *"
          value={food.name}
          onChange={(e) => txt("name", e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500"
        />
        {canRemove && (
          <button onClick={onRemove} className="p-1.5 text-red-500 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Cantidad (ej: 80g avena)"
          value={food.amount}
          onChange={(e) => txt("amount", e.target.value)}
          className="col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-green-500"
        />
        {[
          { key: "calories" as const, label: "Kcal" },
          { key: "protein_g" as const, label: "Prot (g)" },
          { key: "carbs_g" as const, label: "Carbs (g)" },
          { key: "fat_g" as const, label: "Grasas (g)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-gray-500 text-xs block mb-0.5">{label}</label>
            <input
              type="number"
              min={0}
              value={food[key] || ""}
              onChange={(e) => num(key, e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-900 text-xs focus:outline-none focus:border-green-500"
            />
          </div>
        ))}
      </div>
      <input
        placeholder="Preparación breve (opcional)"
        value={food.preparation || ""}
        onChange={(e) => txt("preparation", e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-green-500"
      />
    </div>
  );
}

// ─── Meal editor ─────────────────────────────────────────────────────────────

function MealEditor({
  meal,
  onChange,
  onRemove,
  canRemove,
}: {
  meal: MealPlanMeal;
  onChange: (m: MealPlanMeal) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(true);

  function recomputeTotals(foods: MealPlanFood[]): MealPlanMeal {
    return {
      ...meal,
      foods,
      total_calories: foods.reduce((s, f) => s + (f.calories || 0), 0),
      total_protein_g: foods.reduce((s, f) => s + (f.protein_g || 0), 0),
      total_carbs_g: foods.reduce((s, f) => s + (f.carbs_g || 0), 0),
      total_fat_g: foods.reduce((s, f) => s + (f.fat_g || 0), 0),
    };
  }

  function updateFood(idx: number, f: MealPlanFood) {
    const foods = meal.foods.map((old, i) => (i === idx ? f : old));
    onChange(recomputeTotals(foods));
  }

  function addFood() {
    onChange(recomputeTotals([...meal.foods, emptyFood()]));
  }

  function removeFood(idx: number) {
    onChange(recomputeTotals(meal.foods.filter((_, i) => i !== idx)));
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
        <button onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <select
            value={meal.meal_type}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange({ ...meal, meal_type: e.target.value })}
            className="bg-transparent text-gray-900 text-sm font-semibold focus:outline-none cursor-pointer"
          >
            {MEAL_TYPES.map((t) => <option key={t} value={t} className="bg-white">{t}</option>)}
          </select>
          <span className="text-gray-500 text-xs ml-auto">
            {Math.round(meal.total_calories)} kcal · {meal.foods.length} alimento{meal.foods.length !== 1 ? "s" : ""}
          </span>
        </button>
        {canRemove && (
          <button onClick={onRemove} className="p-1 text-red-500 hover:text-red-400 flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="p-3 space-y-2 border-t border-gray-200">
          <input
            placeholder="Horario sugerido (ej: 07:00 - 08:00)"
            value={meal.time_suggestion}
            onChange={(e) => onChange({ ...meal, time_suggestion: e.target.value })}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
          {meal.foods.map((f, fi) => (
            <FoodEditorInline
              key={fi}
              food={f}
              onChange={(nf) => updateFood(fi, nf)}
              onRemove={() => removeFood(fi)}
              canRemove={meal.foods.length > 1}
            />
          ))}
          <button
            onClick={addFood}
            className="flex items-center gap-1.5 text-green-600 hover:text-green-500 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar alimento
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCreated: (plan: MealPlan) => void;
}

export default function CreateMealPlanManualModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [days, setDays] = useState(7);
  const [calorieTarget, setCalorieTarget] = useState("");
  const [dietary, setDietary] = useState("Ninguna");
  const [description, setDescription] = useState("");

  // Step 2 fields
  const [planDays, setPlanDays] = useState<MealPlanDay[]>([]);
  const [shoppingList, setShoppingList] = useState("");
  const [tips, setTips] = useState("");
  const [hydration, setHydration] = useState("Beber al menos 2 litros de agua al día.");
  const [activeDay, setActiveDay] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function goToStep2() {
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    setError("");
    setPlanDays(buildEmptyDays(days));
    setStep(2);
  }

  function updateDay(idx: number, day: MealPlanDay) {
    const updated = planDays.map((d, i) => (i === idx ? day : d));
    const total_calories = day.meals.reduce((s, m) => s + m.total_calories, 0);
    const total_protein_g = day.meals.reduce((s, m) => s + m.total_protein_g, 0);
    const total_carbs_g = day.meals.reduce((s, m) => s + m.total_carbs_g, 0);
    const total_fat_g = day.meals.reduce((s, m) => s + m.total_fat_g, 0);
    updated[idx] = { ...day, total_calories, total_protein_g, total_carbs_g, total_fat_g };
    setPlanDays(updated);
  }

  function addMealToDay() {
    const day = planDays[activeDay];
    updateDay(activeDay, { ...day, meals: [...day.meals, emptyMeal("Snack")] });
  }

  function updateMeal(mealIdx: number, meal: MealPlanMeal) {
    const day = planDays[activeDay];
    const meals = day.meals.map((m, i) => (i === mealIdx ? meal : m));
    updateDay(activeDay, { ...day, meals });
  }

  function removeMeal(mealIdx: number) {
    const day = planDays[activeDay];
    const meals = day.meals.filter((_, i) => i !== mealIdx);
    updateDay(activeDay, { ...day, meals });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const avgCalories = planDays.reduce((s, d) => s + d.total_calories, 0) / (planDays.length || 1);
      const content: MealPlanContent = {
        name,
        description,
        daily_calories: calorieTarget ? Number(calorieTarget) : avgCalories,
        daily_protein_g: planDays.reduce((s, d) => s + d.total_protein_g, 0) / (planDays.length || 1),
        daily_carbs_g: planDays.reduce((s, d) => s + d.total_carbs_g, 0) / (planDays.length || 1),
        daily_fat_g: planDays.reduce((s, d) => s + d.total_fat_g, 0) / (planDays.length || 1),
        days: planDays,
        shopping_list: shoppingList.split("\n").map((s) => s.trim()).filter(Boolean),
        general_tips: tips,
        hydration,
      };

      const plan = await createMealPlanManual({
        name,
        goal,
        days,
        calorie_target: calorieTarget ? Number(calorieTarget) : undefined,
        dietary_restrictions: dietary,
        description: description || undefined,
        content_json: JSON.stringify(content),
      });
      onCreated(plan);
    } catch {
      setError("No se pudo guardar. Revisa los datos e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const day = planDays[activeDay];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-bold text-lg">Crear plan de comidas</h2>
            <p className="text-gray-400 text-sm">Paso {step} de 2 — {step === 1 ? "Información básica" : "Armar el plan"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">Nombre del plan *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mi plan de semana"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Objetivo</label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        goal === g ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Duración del plan</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 5, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        days === d ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}
                    >
                      {d} {d === 1 ? "día" : "días"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">
                  Objetivo calórico diario (kcal) <span className="text-gray-500">— opcional</span>
                </label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  placeholder="Ej: 1800"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">Restricciones dietéticas</label>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setDietary(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        dietary === r ? "bg-green-600 border-green-500 text-white" : "border-gray-200 text-gray-700 hover:border-green-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-700 text-sm font-medium block mb-1">
                  Descripción <span className="text-gray-500">— opcional</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción breve del plan..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none focus:outline-none focus:border-green-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && day && (
            <div className="space-y-5">
              {/* Day tabs */}
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Seleccioná el día</p>
                <div className="flex gap-1 flex-wrap">
                  {planDays.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        activeDay === i
                          ? "bg-green-600 border-green-500 text-white"
                          : "border-gray-200 text-gray-400 hover:border-green-400"
                      }`}
                    >
                      {d.day_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day name edit */}
              <div className="flex items-center gap-3">
                <input
                  value={day.day_name}
                  onChange={(e) => updateDay(activeDay, { ...day, day_name: e.target.value })}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-semibold text-sm focus:outline-none focus:border-green-500"
                />
                <span className="text-green-400 text-sm font-semibold flex-shrink-0">
                  {Math.round(day.total_calories)} kcal
                </span>
              </div>

              {/* Meals */}
              <div className="space-y-3">
                {day.meals.map((meal, mi) => (
                  <MealEditor
                    key={mi}
                    meal={meal}
                    onChange={(m) => updateMeal(mi, m)}
                    onRemove={() => removeMeal(mi)}
                    canRemove={day.meals.length > 1}
                  />
                ))}
                <button
                  onClick={addMealToDay}
                  className="flex items-center gap-2 text-green-600 hover:text-green-500 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar comida al día
                </button>
              </div>

              {/* Shopping list & tips */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Información general del plan</p>
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1">
                    Lista de compras <span className="text-gray-500">— un ítem por línea</span>
                  </label>
                  <textarea
                    rows={4}
                    value={shoppingList}
                    onChange={(e) => setShoppingList(e.target.value)}
                    placeholder={"Avena: 500g\nLeche descremada: 2L\nPechuga de pollo: 1kg"}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1">Consejos generales</label>
                  <textarea
                    rows={2}
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    placeholder="Ej: Preparar las comidas con anticipación..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1">Hidratación</label>
                  <input
                    value={hydration}
                    onChange={(e) => setHydration(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
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
            <button
              onClick={goToStep2}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando…</>
              ) : (
                "Guardar plan"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
