"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Apple, Target, TrendingUp, Plus, Activity,
  Award, CalendarDays, ChevronDown, ChevronUp, Pencil, Trash2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getMeals, getDailyStats, getMonthlyNutritionStats, getMe,
  deleteMeal,
  Meal, DailyStats, MonthlyNutritionStats, User,
} from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/utils";
import MealTable from "@/components/MealTable";
import ChatWidget from "@/components/ChatWidget";
import AddMealModal from "@/components/AddMealModal";
import EditMealModal from "@/components/EditMealModal";
import ConfirmModal from "@/components/ConfirmModal";
import AppLayout from "@/components/AppLayout";
import PeriodNav, { PeriodMode, getMondayOf, getSundayOf } from "@/components/PeriodNav";

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Proteína": "🥩", "Carbohidrato": "🍞", "Grasa": "🧈",
  "Verdura": "🥦", "Fruta": "🍎", "Lácteo": "🥛",
  "Bebida": "🥤", "Snack": "🍿", "Otro": "🍽️",
};

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

// ── Sub-componente: lista de comidas de un rango agrupadas por día ─────────────
function MealsByDay({
  meals,
  dailyGoal,
  onDelete,
  onEdit,
}: {
  meals: Meal[];
  dailyGoal: number;
  onDelete: (id: number) => void;
  onEdit: (meal: Meal) => void;
}) {
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const grouped: Record<string, Meal[]> = {};
  for (const m of meals) {
    const day = m.created_at.split("T")[0];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(m);
  }
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    // Expandir el primer día por defecto
    if (days.length > 0) {
      setOpenDays({ [days[0]]: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals.length]);

  if (days.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Apple className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Sin comidas registradas en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-hidden">
      {days.map((day) => {
        const dayMeals = grouped[day];
        const dayTotal = dayMeals.reduce((s, m) => s + m.calories, 0);
        const isOpen = openDays[day] ?? false;
        const overGoal = dayTotal > dailyGoal;

        return (
          <div key={day} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Header del día */}
            <button
              className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setOpenDays((p) => ({ ...p, [day]: !p[day] }))}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overGoal ? "bg-red-400" : "bg-primary"}`} />
                <span className="text-sm font-semibold text-gray-800 capitalize truncate">{formatDayHeader(day)}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-sm font-bold whitespace-nowrap ${overGoal ? "text-red-500" : "text-gray-700"}`}>
                  {dayTotal.toFixed(0)} kcal
                </span>
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">{dayMeals.length} comida{dayMeals.length !== 1 ? "s" : ""}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>
            </button>

            {/* Lista de comidas */}
            {isOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50/50 transition-colors group">
                    <span className="text-lg flex-shrink-0">{CATEGORY_EMOJI[meal.category] || "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{meal.description}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[meal.category] || "bg-gray-100 text-gray-500"}`}>
                        {meal.category}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0 whitespace-nowrap">{meal.calories.toFixed(0)} kcal</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit(meal)} className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(meal.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Barra de progreso mini */}
                <div className="px-4 py-2 bg-gray-50/50">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{dayTotal.toFixed(0)} / {dailyGoal.toFixed(0)} kcal</span>
                    <span>{Math.min((dayTotal / dailyGoal) * 100, 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overGoal ? "bg-red-400" : "bg-primary/70"}`}
                      style={{ width: `${Math.min((dayTotal / dailyGoal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // Período
  const [mode, setMode] = useState<PeriodMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedWeek, setSelectedWeek] = useState(() => getMondayOf(new Date().toISOString().split("T")[0]));
  const [selectedMonth, setSelectedMonth] = useState(todayYM);

  // Datos por modo
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [dayStats, setDayStats] = useState<DailyStats | null>(null);
  const [weekMeals, setWeekMeals] = useState<Meal[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyNutritionStats | null>(null);
  const [monthMeals, setMonthMeals] = useState<Meal[]>([]);

  const fetchDayData = useCallback(async (d: string) => {
    const [userData, mealsData, statsData] = await Promise.all([
      getMe(), getMeals(d, d), getDailyStats(d),
    ]);
    setUser(userData); setDayMeals(mealsData); setDayStats(statsData);
  }, []);

  const fetchWeekData = useCallback(async (monday: string) => {
    const sunday = getSundayOf(monday);
    const [userData, mealsData] = await Promise.all([getMe(), getMeals(monday, sunday)]);
    setUser(userData); setWeekMeals(mealsData);
  }, []);

  const fetchMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const since = `${ym}-01`;
    const until = `${ym}-${String(lastDay).padStart(2, "0")}`;
    const [userData, ms, mealsData] = await Promise.all([
      getMe(), getMonthlyNutritionStats(year, month), getMeals(since, until),
    ]);
    setUser(userData); setMonthlyStats(ms); setMonthMeals(mealsData);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "day") await fetchDayData(selectedDate);
      else if (mode === "week") await fetchWeekData(selectedWeek);
      else await fetchMonthData(selectedMonth);
    } catch {
      localStorage.removeItem("nutritrack_token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [mode, selectedDate, selectedWeek, selectedMonth, fetchDayData, fetchWeekData, fetchMonthData, router]);

  useEffect(() => {
    const token = localStorage.getItem("nutritrack_token");
    if (!token) { router.push("/login"); return; }
    fetchData();
  }, [fetchData, router]);

  const handleLogout = () => { localStorage.removeItem("nutritrack_token"); router.push("/login"); };

  const handleDeleteMeal = async (id: number) => {
    try {
      await deleteMeal(id);
      await fetchData();
    } catch { /* ignore */ }
    setConfirmId(null);
  };

  const handleDayDeleted = (id: number) => {
    const deleted = dayMeals.find((m) => m.id === id);
    setDayMeals((prev) => prev.filter((m) => m.id !== id));
    if (deleted && dayStats) {
      setDayStats({
        ...dayStats,
        total_calories: Math.max(0, dayStats.total_calories - deleted.calories),
        meal_count: dayStats.meal_count - 1,
        breakdown: { ...dayStats.breakdown, [deleted.category]: Math.max(0, (dayStats.breakdown[deleted.category] || 0) - deleted.calories) },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto animate-pulse">
          <Apple className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  const dailyGoal = user?.daily_calories_target || 2000;

  // ── Día ───────────────────────────────────────────────────────────────────
  const progressPct = Math.min(((dayStats?.total_calories || 0) / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - (dayStats?.total_calories || 0), 0);
  const topBreakdown = Object.entries(dayStats?.breakdown || {}).sort(([, a], [, b]) => b - a).slice(0, 5);

  // ── Semana ────────────────────────────────────────────────────────────────
  const weekChartData = (() => {
    const grouped: Record<string, number> = {};
    for (const m of weekMeals) {
      const d = m.created_at.split("T")[0];
      grouped[d] = (grouped[d] || 0) + m.calories;
    }
    const days: { day: string; calories: number; date: string }[] = [];
    const monday = new Date(selectedWeek + "T12:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      days.push({ day: d.toLocaleDateString("es-AR", { weekday: "short" }), calories: grouped[iso] || 0, date: iso });
    }
    return days;
  })();
  const weekTotal = weekMeals.reduce((s, m) => s + m.calories, 0);
  const weekDaysWithData = new Set(weekMeals.map((m) => m.created_at.split("T")[0])).size;
  const weekAvg = weekDaysWithData ? weekTotal / weekDaysWithData : 0;

  // ── Mes ───────────────────────────────────────────────────────────────────
  const monthChartData = (monthlyStats?.daily_data || []).map((d) => ({
    day: new Date(d.date + "T12:00:00").getDate(),
    calories: d.calories,
    date: d.date,
  }));
  const monthlyTopBreakdown = Object.entries(monthlyStats?.category_breakdown || {}).sort(([, a], [, b]) => b - a).slice(0, 6);
  const monthlyTotalCat = Object.values(monthlyStats?.category_breakdown || {}).reduce((s, v) => s + v, 0);

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Nutrición</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <PeriodNav
              mode={mode} onModeChange={setMode}
              date={selectedDate} onDateChange={setSelectedDate}
              week={selectedWeek} onWeekChange={setSelectedWeek}
              month={selectedMonth} onMonthChange={setSelectedMonth}
            />
            {mode === "day" && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Registrar
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════ VISTA DIARIA ══════════════════ */}
        {mode === "day" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Calorías", value: `${(dayStats?.total_calories || 0).toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal`, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Comidas", value: dayStats?.meal_count || 0, sub: "registradas hoy", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Restantes", value: `${remaining.toFixed(0)} kcal`, sub: `${progressPct.toFixed(0)}% de la meta`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Promedio 7d", value: "—", sub: "ver vista semana/mes", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary" />Progreso Diario</h3>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-red-500" : progressPct >= 80 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>{(dayStats?.total_calories || 0).toFixed(0)} kcal</span>
                  <span>{dailyGoal.toFixed(0)} kcal meta</span>
                </div>
                {progressPct >= 100 && <p className="text-xs text-red-500 flex items-center gap-1"><Award className="w-3 h-3" /> Meta superada</p>}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">Desglose por Categoría</h3>
                {topBreakdown.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin registros hoy</p> : (
                  <div className="space-y-2.5">
                    {topBreakdown.map(([cat, cal]) => {
                      const pct = ((cal / (dayStats?.total_calories || 1)) * 100).toFixed(0);
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{cal.toFixed(0)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Comidas del día</h3>
              <MealTable
                meals={dayMeals}
                onDelete={handleDayDeleted}
                onUpdate={(updated) => setDayMeals((prev) => prev.map((m) => m.id === updated.id ? updated : m))}
              />
            </div>
          </>
        )}

        {/* ══════════════════ VISTA SEMANAL ══════════════════ */}
        {mode === "week" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total semana", value: `${weekTotal.toFixed(0)} kcal`, sub: "consumidas", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Promedio diario", value: `${weekAvg.toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal/día`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Total comidas", value: weekMeals.length, sub: "registradas", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Días con registro", value: weekDaysWithData, sub: "de 7 días", icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico semanal */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Calorías por día</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Consumidas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                  <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                    {weekChartData.map((e, i) => (
                      <Cell key={i} fill={e.calories > dailyGoal ? "#f87171" : e.calories > 0 ? "hsl(142.1 76.2% 36.3%)" : "#e5e7eb"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lista por día */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Comidas por día</h3>
              <MealsByDay
                meals={weekMeals}
                dailyGoal={dailyGoal}
                onDelete={(id) => setConfirmId(id)}
                onEdit={(m) => setEditMeal(m)}
              />
            </div>
          </>
        )}

        {/* ══════════════════ VISTA MENSUAL ══════════════════ */}
        {mode === "month" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total del mes", value: `${(monthlyStats?.total_calories || 0).toFixed(0)} kcal`, sub: "consumidas", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Promedio diario", value: `${(monthlyStats?.avg_daily_calories || 0).toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal/día`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Total comidas", value: monthlyStats?.total_meals || 0, sub: "registradas", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Días con registro", value: monthlyStats?.days_with_data || 0, sub: "días activos", icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico por día */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Calorías por día del mes</h3>
              {monthChartData.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin registros este mes</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthChartData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Consumidas"]} labelFormatter={(l) => `Día ${l}`} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                      {monthChartData.map((e, i) => (
                        <Cell key={i} fill={e.calories > dailyGoal ? "#f87171" : "hsl(142.1 76.2% 36.3%)"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Categorías + Lista por día */}
            <div className="grid lg:grid-cols-3 gap-4">
              {monthlyTopBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Categorías del mes</h3>
                  <div className="space-y-2.5">
                    {monthlyTopBreakdown.map(([cat, cal]) => {
                      const pct = ((cal / monthlyTotalCat) * 100).toFixed(0);
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{cal.toFixed(0)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className={monthlyTopBreakdown.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Comidas por día</h3>
                <MealsByDay
                  meals={monthMeals}
                  dailyGoal={dailyGoal}
                  onDelete={(id) => setConfirmId(id)}
                  onEdit={(m) => setEditMeal(m)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <ChatWidget onDataChanged={() => fetchData()} />

      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchData(); setShowModal(false); }}
          selectedDate={mode === "day" ? selectedDate : undefined}
        />
      )}

      {editMeal && (
        <EditMealModal
          meal={editMeal}
          onClose={() => setEditMeal(null)}
          onUpdated={() => { fetchData(); setEditMeal(null); }}
        />
      )}

      {confirmId !== null && (
        <ConfirmModal
          title="Eliminar comida"
          description="¿Estás seguro de que querés eliminar esta comida? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => handleDeleteMeal(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </AppLayout>
  );
}
