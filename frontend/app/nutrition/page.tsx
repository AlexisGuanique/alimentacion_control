"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Apple, Target, TrendingUp, Plus, Activity, Award, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getMeals, getDailyStats, getWeeklyStats, getMonthlyNutritionStats, getMe,
  Meal, DailyStats, MonthlyNutritionStats, User,
} from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/utils";
import MealTable from "@/components/MealTable";
import ChatWidget from "@/components/ChatWidget";
import AddMealModal from "@/components/AddMealModal";
import AppLayout from "@/components/AppLayout";
import PeriodNav, { PeriodMode } from "@/components/PeriodNav";

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NutritionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyNutritionStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [mode, setMode] = useState<PeriodMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(todayYM);

  const fetchDayData = useCallback(async (targetDate: string) => {
    const [userData, mealsData, statsData, weeklyRaw] = await Promise.all([
      getMe(),
      getMeals(targetDate, targetDate),
      getDailyStats(targetDate),
      getWeeklyStats(),
    ]);
    setUser(userData);
    setMeals(mealsData);
    setStats(statsData);
    setMonthlyStats(null);
    const formatted = Object.entries(weeklyRaw.weekly_data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, calories]) => ({
        day: new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }),
        calories,
      }));
    setWeeklyData(formatted);
  }, []);

  const fetchMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const [userData, ms] = await Promise.all([
      getMe(),
      getMonthlyNutritionStats(year, month),
    ]);
    setUser(userData);
    setMonthlyStats(ms);
    setStats(null);
    setMeals([]);
    setWeeklyData([]);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "day") await fetchDayData(selectedDate);
      else await fetchMonthData(selectedMonth);
    } catch {
      localStorage.removeItem("nutritrack_token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [mode, selectedDate, selectedMonth, fetchDayData, fetchMonthData, router]);

  useEffect(() => {
    const token = localStorage.getItem("nutritrack_token");
    if (!token) { router.push("/login"); return; }
    fetchData();
  }, [fetchData, router]);

  const handleLogout = () => {
    localStorage.removeItem("nutritrack_token");
    router.push("/login");
  };

  const handleMealDeleted = (id: number) => {
    const deleted = meals.find((m) => m.id === id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    if (deleted && stats) {
      setStats({
        ...stats,
        total_calories: Math.max(0, stats.total_calories - deleted.calories),
        meal_count: stats.meal_count - 1,
        breakdown: {
          ...stats.breakdown,
          [deleted.category]: Math.max(0, (stats.breakdown[deleted.category] || 0) - deleted.calories),
        },
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

  // ── Vista diaria ──────────────────────────────────────────────────────────
  const progressPct = Math.min(((stats?.total_calories || 0) / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - (stats?.total_calories || 0), 0);
  const topBreakdown = Object.entries(stats?.breakdown || {}).sort(([, a], [, b]) => b - a).slice(0, 5);

  // ── Vista mensual ─────────────────────────────────────────────────────────
  const monthChartData = (monthlyStats?.daily_data || []).map((d) => ({
    day: new Date(d.date + "T12:00:00").getDate(),
    calories: d.calories,
    date: d.date,
  }));
  const monthlyTopBreakdown = Object.entries(monthlyStats?.category_breakdown || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const monthlyTotalCat = Object.values(monthlyStats?.category_breakdown || {}).reduce((s, v) => s + v, 0);

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Nutrición</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <PeriodNav
              mode={mode}
              onModeChange={setMode}
              date={selectedDate}
              onDateChange={setSelectedDate}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            {mode === "day" && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Registrar
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════ VISTA DIARIA ═══════════════ */}
        {mode === "day" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Calorías", value: `${(stats?.total_calories || 0).toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal`, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Comidas", value: stats?.meal_count || 0, sub: "registradas hoy", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Restantes", value: `${remaining.toFixed(0)} kcal`, sub: `${progressPct.toFixed(0)}% de la meta`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Prom. semanal", value: weeklyData.length ? `${(weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.length).toFixed(0)} kcal` : "—", sub: "últimos 7 días", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Progress + Breakdown */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  Progreso Diario
                </h3>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-red-500" : progressPct >= 80 ? "bg-orange-500" : "bg-primary"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>{(stats?.total_calories || 0).toFixed(0)} kcal</span>
                  <span>{dailyGoal.toFixed(0)} kcal meta</span>
                </div>
                {progressPct >= 100 && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Meta superada
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">Desglose por Categoría</h3>
                {topBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sin registros hoy</p>
                ) : (
                  <div className="space-y-2.5">
                    {topBreakdown.map(([cat, cal]) => {
                      const pct = ((cal / (stats?.total_calories || 1)) * 100).toFixed(0);
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{cal.toFixed(0)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de comidas */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Apple className="w-4 h-4 text-primary" />
                Comidas del día
              </h3>
              <MealTable
                meals={meals}
                onDelete={handleMealDeleted}
                onUpdate={(updated) => setMeals((prev) => prev.map((m) => m.id === updated.id ? updated : m))}
              />
            </div>
          </>
        )}

        {/* ═══════════════ VISTA MENSUAL ═══════════════ */}
        {mode === "month" && (
          <>
            {/* KPI Cards mensuales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total del mes", value: `${(monthlyStats?.total_calories || 0).toFixed(0)} kcal`, sub: "kcal consumidas", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Promedio diario", value: `${(monthlyStats?.avg_daily_calories || 0).toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal/día`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Total comidas", value: monthlyStats?.total_meals || 0, sub: "registradas", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Días con registro", value: monthlyStats?.days_with_data || 0, sub: "días activos", icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico por día del mes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Calorías por día
              </h3>
              {monthChartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin registros este mes</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthChartData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Consumidas"]}
                      labelFormatter={(l) => `Día ${l}`}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }}
                    />
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                      {monthChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.calories > dailyGoal ? "#f87171" : entry.calories >= dailyGoal * 0.85 ? "#fb923c" : "hsl(142.1 76.2% 36.3%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Desglose por categoría mensual */}
            {monthlyTopBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Categorías del mes</h3>
                <div className="space-y-2.5">
                  {monthlyTopBreakdown.map(([cat, cal]) => {
                    const pct = ((cal / monthlyTotalCat) * 100).toFixed(0);
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">{cal.toFixed(0)} kcal</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ChatWidget onDataChanged={() => fetchData()} />

      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchData(); setShowModal(false); }}
        />
      )}
    </AppLayout>
  );
}
