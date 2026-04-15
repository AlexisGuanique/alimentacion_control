"use client";

import { useState } from "react";
import { MealPlan, MealPlanContent, MealPlanDay, MealPlanFood, MealPlanMeal, updateMealPlan } from "@/lib/api";

interface Props {
  plan: MealPlan;
  onClose: () => void;
  onUpdated: (updated: MealPlan) => void;
}

function FoodEditor({
  food,
  onChange,
}: {
  food: MealPlanFood;
  onChange: (f: MealPlanFood) => void;
}) {
  const [open, setOpen] = useState(false);

  function field(
    label: string,
    key: keyof MealPlanFood,
    type: "text" | "number" = "text",
    unit?: string
  ) {
    return (
      <div>
        <label className="text-gray-400 text-xs block mb-1">{label}{unit ? ` (${unit})` : ""}</label>
        <input
          type={type}
          value={food[key] as string | number}
          onChange={(e) =>
            onChange({ ...food, [key]: type === "number" ? Number(e.target.value) : e.target.value })
          }
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500"
        />
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        <span className="text-white text-sm font-medium truncate">{food.name}</span>
        <span className="text-gray-400 text-xs ml-2 flex-shrink-0">{food.calories} kcal · {food.amount}</span>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-2 gap-3 border-t border-white/10">
          <div className="col-span-2">{field("Alimento", "name")}</div>
          <div className="col-span-2">{field("Cantidad / Porción", "amount")}</div>
          {field("Calorías", "calories", "number", "kcal")}
          {field("Proteínas", "protein_g", "number", "g")}
          {field("Carbohidratos", "carbs_g", "number", "g")}
          {field("Grasas", "fat_g", "number", "g")}
          <div className="col-span-2">
            <label className="text-gray-400 text-xs block mb-1">Preparación</label>
            <textarea
              rows={2}
              value={food.preparation || ""}
              onChange={(e) => onChange({ ...food, preparation: e.target.value })}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm resize-none focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditMealPlanModal({ plan, onClose, onUpdated }: Props) {
  const initial: MealPlanContent = JSON.parse(plan.content_json);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || "");
  const [content, setContent] = useState<MealPlanContent>(initial);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateFood(dayIdx: number, mealIdx: number, foodIdx: number, food: MealPlanFood) {
    const days = content.days.map((d, di) => {
      if (di !== dayIdx) return d;
      const meals = d.meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        const foods = m.foods.map((f, fi) => (fi === foodIdx ? food : f));
        const totalCals = foods.reduce((s, f) => s + f.calories, 0);
        const totalProt = foods.reduce((s, f) => s + f.protein_g, 0);
        const totalCarbs = foods.reduce((s, f) => s + f.carbs_g, 0);
        const totalFat = foods.reduce((s, f) => s + f.fat_g, 0);
        return { ...m, foods, total_calories: totalCals, total_protein_g: totalProt, total_carbs_g: totalCarbs, total_fat_g: totalFat };
      });
      const dayTotalCals = meals.reduce((s, m) => s + m.total_calories, 0);
      return { ...d, meals, total_calories: dayTotalCals };
    });
    setContent({ ...content, days });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateMealPlan(plan.id, {
        name,
        description,
        content_json: JSON.stringify(content),
      });
      onUpdated(updated);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const day = content.days[activeDay];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Editar Plan de Comidas</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Plan info */}
          <div className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Nombre del plan</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1">Descripción</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Day tabs */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Días del plan</p>
            <div className="flex gap-1 flex-wrap">
              {content.days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeDay === i
                      ? "bg-green-600 border-green-500 text-white"
                      : "border-white/20 text-gray-400 hover:border-white/40"
                  }`}
                >
                  {d.day_name}
                </button>
              ))}
            </div>
          </div>

          {/* Day meals */}
          {day && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">{day.day_name}</h3>
                <span className="text-green-400 text-sm font-medium">{Math.round(day.total_calories)} kcal</span>
              </div>
              {day.meals.map((meal, mealIdx) => (
                <div key={mealIdx} className="bg-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-semibold text-sm">{meal.meal_type}</span>
                      <span className="text-gray-500 text-xs ml-2">{meal.time_suggestion}</span>
                    </div>
                    <span className="text-orange-400 text-sm">{Math.round(meal.total_calories)} kcal</span>
                  </div>
                  <div className="space-y-2">
                    {meal.foods.map((food, foodIdx) => (
                      <FoodEditor
                        key={foodIdx}
                        food={food}
                        onChange={(f) => updateFood(activeDay, mealIdx, foodIdx, f)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
