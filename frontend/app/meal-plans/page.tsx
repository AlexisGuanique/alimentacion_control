"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import GenerateMealPlanModal from "@/components/GenerateMealPlanModal";
import EditMealPlanModal from "@/components/EditMealPlanModal";
import CreateMealPlanManualModal from "@/components/CreateMealPlanManualModal";
import {
  getMealPlans,
  deleteMealPlan,
  createMealManual,
  MealPlan,
  MealPlanContent,
  MealPlanDay,
  MealPlanFood,
  MealPlanMeal,
} from "@/lib/api";
import { Pencil, Trash2, ChevronDown, ChevronRight, ShoppingBag, Lightbulb, Droplets, CheckCircle2 } from "lucide-react";

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(<ul key={elements.length} className="list-disc list-inside space-y-0.5 text-gray-300 text-sm">{listItems}</ul>);
      listItems = [];
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.slice(2);
      listItems.push(<li key={i}>{renderBold(content)}</li>);
    } else {
      flushList();
      if (trimmed) {
        elements.push(<p key={i} className="text-gray-300 text-sm">{renderBold(trimmed)}</p>);
      }
    }
  });
  flushList();
  return <div className="space-y-1">{elements}</div>;
}

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
  );
}

// ─── Macro chip ───────────────────────────────────────────────────────────────

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label} {Math.round(value)}g
    </span>
  );
}

// ─── Mark as consumed modal ───────────────────────────────────────────────────

interface ConsumeTarget {
  food?: MealPlanFood;
  meal?: MealPlanMeal;
  type: "food" | "meal";
}

function MarkConsumedModal({
  target,
  onClose,
  onSuccess,
}: {
  target: ConsumeTarget;
  onClose: () => void;
  onSuccess: (label: string) => void;
}) {
  const isMeal = target.type === "meal";
  const displayName = isMeal ? target.meal!.meal_type : target.food!.name;
  const calories = isMeal ? target.meal!.total_calories : target.food!.calories;
  const protein = isMeal ? target.meal!.total_protein_g : target.food!.protein_g;
  const carbs = isMeal ? target.meal!.total_carbs_g : target.food!.carbs_g;
  const fat = isMeal ? target.meal!.total_fat_g : target.food!.fat_g;

  // Build description with all foods in the meal or just the food itself
  const description = isMeal
    ? target.meal!.foods.map((f) => `${f.name} (${f.amount})`).join(", ")
    : `${target.food!.amount}`;

  const MEAL_CATEGORIES: Record<string, string> = {
    Desayuno: "Desayuno",
    Almuerzo: "Almuerzo",
    Cena: "Cena",
    Merienda: "Merienda",
    Snack: "Snack",
  };

  const guessCategory = (): string => {
    if (isMeal) {
      const t = target.meal!.meal_type;
      return MEAL_CATEGORIES[t] || "Comida";
    }
    return "Snack";
  };

  const [category, setCategory] = useState(guessCategory());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConsume() {
    setLoading(true);
    setError("");
    try {
      await createMealManual({
        name: displayName,
        description,
        calories: Math.round(calories),
        protein_g: Math.round(protein),
        carbs_g: Math.round(carbs),
        fat_g: Math.round(fat),
        category,
      });
      onSuccess(displayName);
    } catch {
      setError("No se pudo registrar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-bold">Registrar como consumido</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-white font-semibold text-sm">{displayName}</p>
            <p className="text-gray-400 text-xs">{description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-semibold">{Math.round(calories)} kcal</span>
              <MacroChip label="P" value={protein} color="bg-blue-500/20 text-blue-400" />
              <MacroChip label="C" value={carbs} color="bg-yellow-500/20 text-yellow-400" />
              <MacroChip label="G" value={fat} color="bg-orange-500/20 text-orange-400" />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {["Desayuno", "Almuerzo", "Merienda", "Cena", "Snack"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    category === c
                      ? "bg-green-600 border-green-500 text-white"
                      : "border-white/20 text-gray-400 hover:border-white/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex justify-between items-center">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
          <button
            onClick={handleConsume}
            disabled={loading}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Food row ─────────────────────────────────────────────────────────────────

function FoodRow({
  food,
  consumed,
  onConsume,
}: {
  food: MealPlanFood;
  consumed: boolean;
  onConsume: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg group transition-colors ${consumed ? "opacity-50" : "hover:bg-white/5"}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${consumed ? "line-through text-gray-500" : "text-white"}`}>{food.name}</p>
        <p className="text-xs text-gray-500 truncate">{food.amount}</p>
        {food.preparation && (
          <p className="text-xs text-gray-600 italic truncate">{food.preparation}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-green-400 font-semibold whitespace-nowrap">{Math.round(food.calories)} kcal</span>
        <button
          onClick={onConsume}
          disabled={consumed}
          title={consumed ? "Ya registrado" : "Registrar como consumido"}
          className={`p-1.5 rounded-lg border text-xs transition-all ${
            consumed
              ? "border-green-700 text-green-700 cursor-default"
              : "border-white/20 text-gray-400 hover:border-green-500 hover:text-green-400 opacity-0 group-hover:opacity-100"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Meal section ─────────────────────────────────────────────────────────────

function MealSection({
  meal,
  consumedFoods,
  consumedMeals,
  onConsumeFood,
  onConsumeMeal,
}: {
  meal: MealPlanMeal;
  consumedFoods: Set<string>;
  consumedMeals: Set<string>;
  onConsumeFood: (food: MealPlanFood) => void;
  onConsumeMeal: (meal: MealPlanMeal) => void;
}) {
  const [open, setOpen] = useState(true);
  const mealKey = `${meal.meal_type}-${meal.time_suggestion}`;
  const mealConsumed = consumedMeals.has(mealKey);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 ${mealConsumed ? "bg-green-900/20" : "bg-white/5"}`}>
        <button onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <div className="min-w-0 text-left">
            <span className={`font-semibold text-sm ${mealConsumed ? "line-through text-gray-500" : "text-white"}`}>{meal.meal_type}</span>
            <span className="text-gray-500 text-xs ml-2">{meal.time_suggestion}</span>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-green-400 text-sm font-semibold">{Math.round(meal.total_calories)} kcal</span>
          <button
            onClick={() => onConsumeMeal(meal)}
            disabled={mealConsumed}
            title={mealConsumed ? "Comida registrada" : "Registrar comida completa"}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              mealConsumed
                ? "border-green-700 text-green-700 cursor-default"
                : "border-white/20 text-gray-400 hover:border-green-500 hover:text-green-400"
            }`}
          >
            {mealConsumed ? "✓ Registrado" : "Registrar todo"}
          </button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-0.5 border-t border-white/5">
          {meal.foods.map((food, fi) => {
            const key = `${mealKey}-${food.name}-${fi}`;
            return (
              <FoodRow
                key={fi}
                food={food}
                consumed={consumedFoods.has(key) || mealConsumed}
                onConsume={() => onConsumeFood(food)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: MealPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [consumedFoods, setConsumedFoods] = useState<Set<string>>(new Set());
  const [consumedMeals, setConsumedMeals] = useState<Set<string>>(new Set());
  const [consumeTarget, setConsumeTarget] = useState<ConsumeTarget | null>(null);
  const [toast, setToast] = useState("");

  const content: MealPlanContent = JSON.parse(plan.content_json);
  const day = content.days[activeDay];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleConsumeFood(food: MealPlanFood, mealIdx: number) {
    const mealKey = `${day.meals[mealIdx].meal_type}-${day.meals[mealIdx].time_suggestion}`;
    const key = `${mealKey}-${food.name}-${day.meals[mealIdx].foods.indexOf(food)}`;
    setConsumeTarget({ food, type: "food" });
  }

  function handleConsumeMeal(meal: MealPlanMeal) {
    setConsumeTarget({ meal, type: "meal" });
  }

  function handleConsumeSuccess(label: string) {
    if (consumeTarget?.type === "food") {
      // find the key
      for (const meal of day.meals) {
        const mealKey = `${meal.meal_type}-${meal.time_suggestion}`;
        const idx = meal.foods.findIndex((f) => f === consumeTarget.food);
        if (idx >= 0) {
          setConsumedFoods((prev) => new Set(prev).add(`${mealKey}-${consumeTarget.food!.name}-${idx}`));
          break;
        }
      }
    } else if (consumeTarget?.type === "meal") {
      const meal = consumeTarget.meal!;
      setConsumedMeals((prev) => new Set(prev).add(`${meal.meal_type}-${meal.time_suggestion}`));
    }
    setConsumeTarget(null);
    showToast(`✓ "${label}" registrado en Nutrición`);
  }

  return (
    <div className="bg-gray-800/50 border border-white/10 rounded-2xl overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="mx-4 mt-4 bg-green-900/80 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">{plan.goal}</span>
            <span className="text-gray-500 text-xs">{plan.days} días · {plan.dietary_restrictions}</span>
          </div>
          <h3 className="text-white font-bold text-base mt-1">{plan.name}</h3>
          {plan.description && <p className="text-gray-400 text-sm mt-1 leading-relaxed">{plan.description}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500">{Math.round(content.daily_calories)} kcal/día</span>
            <MacroChip label="P" value={content.daily_protein_g} color="bg-blue-500/20 text-blue-400" />
            <MacroChip label="C" value={content.daily_carbs_g} color="bg-yellow-500/20 text-yellow-400" />
            <MacroChip label="G" value={content.daily_fat_g} color="bg-orange-500/20 text-orange-400" />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium transition-colors border-t border-white/5"
      >
        {expanded ? <><ChevronDown className="w-3.5 h-3.5" /> Ocultar plan</> : <><ChevronRight className="w-3.5 h-3.5" /> Ver plan completo</>}
      </button>

      {expanded && (
        <div className="p-5 space-y-5 border-t border-white/10">
          {/* Day tabs */}
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

          {/* Day detail */}
          {day && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{day.day_name}</h4>
                <div className="flex items-center gap-3">
                  <MacroChip label="P" value={day.total_protein_g} color="bg-blue-500/20 text-blue-400" />
                  <MacroChip label="C" value={day.total_carbs_g} color="bg-yellow-500/20 text-yellow-400" />
                  <MacroChip label="G" value={day.total_fat_g} color="bg-orange-500/20 text-orange-400" />
                  <span className="text-green-400 font-semibold text-sm">{Math.round(day.total_calories)} kcal</span>
                </div>
              </div>
              {day.meals.map((meal, mi) => (
                <MealSection
                  key={mi}
                  meal={meal}
                  consumedFoods={consumedFoods}
                  consumedMeals={consumedMeals}
                  onConsumeFood={(food) => {
                    const mealKey = `${meal.meal_type}-${meal.time_suggestion}`;
                    const idx = meal.foods.indexOf(food);
                    setConsumeTarget({ food, type: "food" });
                  }}
                  onConsumeMeal={handleConsumeMeal}
                />
              ))}
            </div>
          )}

          {/* Shopping list */}
          {content.shopping_list && content.shopping_list.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Lista de compras</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {content.shopping_list.map((item, i) => (
                  <p key={i} className="text-gray-300 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tips & Hydration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.general_tips && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-semibold text-sm">Consejos</span>
                </div>
                <MarkdownText text={content.general_tips} />
              </div>
            )}
            {content.hydration && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-semibold text-sm">Hidratación</span>
                </div>
                <MarkdownText text={content.hydration} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consume modal */}
      {consumeTarget && (
        <MarkConsumedModal
          target={consumeTarget}
          onClose={() => setConsumeTarget(null)}
          onSuccess={handleConsumeSuccess}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MealPlansPage() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editTarget, setEditTarget] = useState<MealPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [dailyCalories, setDailyCalories] = useState<number | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [plansData] = await Promise.all([getMealPlans()]);
      setPlans(plansData);
      // Try to get user daily calories from localStorage
      const stored = localStorage.getItem("nt_daily_calories");
      if (stored) setDailyCalories(Number(stored));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function handleGenerated(plan: MealPlan) {
    setPlans((prev) => [plan, ...prev]);
    setShowGenerate(false);
    setShowManual(false);
  }

  function handleUpdated(updated: MealPlan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditTarget(null);
  }

  async function handleDelete(id: number) {
    await deleteMealPlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold">Plan de Comidas</h1>
            <p className="text-gray-400 text-sm mt-1">Planes de alimentación generados con IA</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManual(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-sm font-medium rounded-xl border border-white/20 transition-colors"
            >
              Crear manualmente
            </button>
            <button
              onClick={() => setShowGenerate(true)}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              ✨ Generar con IA
            </button>
          </div>
        </div>

        {/* KPIs */}
        {plans.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{plans.length}</p>
              <p className="text-gray-400 text-xs mt-1">Planes creados</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{plans.reduce((s, p) => s + p.days, 0)}</p>
              <p className="text-gray-400 text-xs mt-1">Días totales</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{new Set(plans.map((p) => p.goal)).size}</p>
              <p className="text-gray-400 text-xs mt-1">Objetivos distintos</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && plans.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">🥗</div>
            <h2 className="text-white text-xl font-bold">Sin planes de comidas</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Genera tu primer plan nutricional personalizado con IA. Incluye comidas, porciones en gramos y lista de compras.
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <button
                onClick={() => setShowGenerate(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                ✨ Generar con IA
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="px-6 py-3 bg-white/10 hover:bg-white/15 text-gray-300 font-medium rounded-xl border border-white/20 transition-colors"
              >
                Crear manualmente
              </button>
            </div>
          </div>
        )}

        {/* Plans */}
        {!loading && plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => setEditTarget(plan)}
            onDelete={() => setConfirmDelete(plan.id)}
          />
        ))}
      </div>

      {/* Manual create modal */}
      {showManual && (
        <CreateMealPlanManualModal
          onClose={() => setShowManual(false)}
          onCreated={handleGenerated}
        />
      )}

      {/* Generate modal */}
      {showGenerate && (
        <GenerateMealPlanModal
          onClose={() => setShowGenerate(false)}
          onGenerated={handleGenerated}
          dailyCalories={dailyCalories}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditMealPlanModal
          plan={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-white font-bold text-lg">Eliminar plan</h3>
            <p className="text-gray-400 text-sm">¿Seguro que quieres eliminar este plan de comidas? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-white/20 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
