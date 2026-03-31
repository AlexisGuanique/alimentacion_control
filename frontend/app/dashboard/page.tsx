"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Apple, Target, TrendingUp,
  Activity, Sparkles, AlertCircle, Dumbbell, Timer,
  ArrowDown, ArrowUp, Minus, Scale, Plus, CalendarDays,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  LineChart, Line, Dot,
} from "recharts";

import {
  getMeals, getDailyStats, getWeeklyStats, getMe,
  getFitnessDaily, getFitnessWeekly, getWeightHistory,
  getMonthlyNutritionStats, getMonthlyFitnessStats,
  DailyStats, FitnessStats, User, WeightEntry,
  MonthlyNutritionStats, MonthlyFitnessStats,
} from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import PeriodNav, { PeriodMode, getMondayOf, getSundayOf } from "@/components/PeriodNav";

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Día
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [fitnessStats, setFitnessStats] = useState<FitnessStats | null>(null);
  const [weeklyNutrition, setWeeklyNutrition] = useState<{ day: string; calories: number; date: string }[]>([]);
  const [weeklyFitness, setWeeklyFitness] = useState<{ day: string; calories: number; date: string }[]>([]);

  // Mes
  const [monthlyNutrition, setMonthlyNutrition] = useState<MonthlyNutritionStats | null>(null);
  const [monthlyFitness, setMonthlyFitness] = useState<MonthlyFitnessStats | null>(null);

  // Peso (siempre)
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<PeriodMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedWeek, setSelectedWeek] = useState(() => getMondayOf(new Date().toISOString().split("T")[0]));
  const [selectedMonth, setSelectedMonth] = useState(todayYM);

  const fetchDayData = useCallback(async (targetDate: string) => {
    const [userData, , statsData, weeklyRaw, fitnessData, fitnessWeeklyRaw, weightData] = await Promise.all([
      getMe(),
      getMeals(targetDate, targetDate),
      getDailyStats(targetDate),
      getWeeklyStats(),
      getFitnessDaily(targetDate),
      getFitnessWeekly(),
      getWeightHistory(6),
    ]);
    setUser(userData);
    setStats(statsData);
    setFitnessStats(fitnessData);
    setWeightHistory(weightData);
    setMonthlyNutrition(null);
    setMonthlyFitness(null);

    const toChart = (raw: Record<string, number>) =>
      Object.entries(raw).sort(([a], [b]) => a.localeCompare(b)).map(([date, calories]) => ({
        date,
        day: new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }),
        calories,
      }));
    setWeeklyNutrition(toChart(weeklyRaw.weekly_data));
    setWeeklyFitness(toChart(fitnessWeeklyRaw.weekly_data));
  }, []);

  const fetchMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const [userData, mn, mf, weightData] = await Promise.all([
      getMe(),
      getMonthlyNutritionStats(year, month),
      getMonthlyFitnessStats(year, month),
      getWeightHistory(6),
    ]);
    setUser(userData);
    setMonthlyNutrition(mn);
    setMonthlyFitness(mf);
    setWeightHistory(weightData);
    setStats(null);
    setFitnessStats(null);
    setWeeklyNutrition([]);
    setWeeklyFitness([]);
  }, []);

  const fetchWeekData = useCallback(async (monday: string) => {
    const sunday = getSundayOf(monday);
    const [userData, nutMeals, fitWorkouts, weightData] = await Promise.all([
      getMe(),
      getMeals(monday, sunday),
      getFitnessWeekly(), // reutilizamos weekly como base visual
      getWeightHistory(6),
    ]);
    setUser(userData);
    setWeightHistory(weightData);
    setStats(null); setFitnessStats(null);
    setMonthlyNutrition(null); setMonthlyFitness(null);

    // Construir chart de los 7 días de la semana seleccionada
    const nutByDay: Record<string, number> = {};
    for (const m of nutMeals) { const d = m.created_at.split("T")[0]; nutByDay[d] = (nutByDay[d] || 0) + m.calories; }
    const fitByDay = fitWorkouts.weekly_data; // últimos 7 días (puede no coincidir exactamente, pero sirve para referencia)

    const weekNut: { day: string; calories: number; date: string }[] = [];
    const weekFit: { day: string; calories: number; date: string }[] = [];
    const mon = new Date(monday + "T12:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("es-AR", { weekday: "short" });
      weekNut.push({ day: label, calories: nutByDay[iso] || 0, date: iso });
      weekFit.push({ day: label, calories: fitByDay[iso] || 0, date: iso });
    }
    setWeeklyNutrition(weekNut);
    setWeeklyFitness(weekFit);

    // KPIs de semana reutilizando estructura monthly
    const totalNutCal = nutMeals.reduce((s, m) => s + m.calories, 0);
    const daysNut = new Set(nutMeals.map((m) => m.created_at.split("T")[0])).size;
    const totalFitCal = weekNut.reduce((s, d) => s + (fitByDay[d.date] || 0), 0);

    setMonthlyNutrition({
      year: 0, month: 0,
      total_calories: totalNutCal,
      total_meals: nutMeals.length,
      days_with_data: daysNut,
      avg_daily_calories: daysNut ? totalNutCal / daysNut : 0,
      category_breakdown: {},
      daily_data: [],
    });
    setMonthlyFitness({
      year: 0, month: 0,
      total_calories_burned: totalFitCal,
      total_workouts: 0,
      total_duration_minutes: 0,
      days_active: weekFit.filter((d) => d.calories > 0).length,
      avg_daily_calories_burned: 0,
      type_breakdown: {},
      daily_data: [],
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto animate-pulse">
          <Activity className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  const dailyGoal = user?.daily_calories_target || 2000;

  // ── Día ──────────────────────────────────────────────────────────────────
  const consumed = stats?.total_calories || 0;
  const burned = fitnessStats?.total_calories_burned || 0;
  const remaining = dailyGoal - consumed;
  const netCalories = consumed - burned;
  const deficit = dailyGoal - netCalories;
  const consumedPct = Math.min((consumed / dailyGoal) * 100, 100);
  const topBreakdown = Object.entries(stats?.breakdown || {}).sort(([, a], [, b]) => b - a).slice(0, 4);

  // ── Mes ──────────────────────────────────────────────────────────────────
  const mNutChart = (monthlyNutrition?.daily_data || []).map((d) => ({
    day: new Date(d.date + "T12:00:00").getDate(),
    calories: d.calories,
    date: d.date,
  }));
  const mFitChart = (monthlyFitness?.daily_data || []).map((d) => ({
    day: new Date(d.date + "T12:00:00").getDate(),
    calories: d.calories_burned,
    date: d.date,
  }));
  const mTotalDef = monthlyNutrition && monthlyFitness
    ? monthlyNutrition.total_calories - monthlyFitness.total_calories_burned
    : null;

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {!user?.daily_calories_target && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 flex-1">No configuraste tu objetivo calórico. Se usa 2000 kcal por defecto.</p>
            <button onClick={() => router.push("/settings")} className="text-xs font-semibold text-amber-700 underline whitespace-nowrap">Configurar</button>
          </div>
        )}

        {/* Header + PeriodNav */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "day" && selectedDate === new Date().toISOString().split("T")[0]
                ? `Buen día, ${user?.full_name?.split(" ")[0]} 👋`
                : mode === "week" ? "Resumen semanal"
                : "Resumen mensual"}
            </h1>
            {user?.fitness_goal && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-1">
                <Sparkles className="w-3 h-3" /> {user.fitness_goal}
              </span>
            )}
          </div>
          <PeriodNav
            mode={mode}
            onModeChange={setMode}
            date={selectedDate}
            onDateChange={setSelectedDate}
            week={selectedWeek}
            onWeekChange={setSelectedWeek}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>

        {/* ═══════════════ VISTA DIARIA ═══════════════ */}
        {mode === "day" && (
          <>
            {/* Balance calórico */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">Balance Calórico del Día</h2>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-orange-400">{consumed.toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">kcal comidas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Dumbbell className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-blue-400">{burned.toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">kcal ejercicio</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${remaining < 0 ? "bg-red-500/25" : "bg-green-500/20"}`}>
                  <Target className={`w-4 h-4 mx-auto mb-1.5 ${remaining < 0 ? "text-red-400" : "text-green-400"}`} />
                  <p className={`text-2xl font-bold ${remaining < 0 ? "text-red-400" : "text-green-400"}`}>{Math.abs(remaining).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{remaining < 0 ? "kcal de más" : "kcal disponibles"}</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Ingeridas: {consumed.toFixed(0)} kcal</span>
                  <span>Meta: {dailyGoal.toFixed(0)} kcal</span>
                </div>
                <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${consumed > dailyGoal ? "bg-red-500" : consumedPct >= 85 ? "bg-orange-400" : "bg-green-400"}`} style={{ width: `${consumedPct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{remaining >= 0 ? `Podés comer ${remaining.toFixed(0)} kcal más para llegar a tu meta` : `Superaste tu meta en ${Math.abs(remaining).toFixed(0)} kcal`}</p>
              </div>
              <div className="border-t border-white/10 pt-3 mt-1">
                <p className="text-xs text-gray-500 mb-2">Balance neto real del día (comidas − ejercicio):</p>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${deficit > 0 ? "bg-green-500/20 text-green-400" : deficit < 0 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-300"}`}>
                    {deficit > 0 ? <ArrowDown className="w-3.5 h-3.5" /> : deficit < 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {deficit > 0 ? `Déficit de ${deficit.toFixed(0)} kcal` : deficit < 0 ? `Superávit de ${Math.abs(deficit).toFixed(0)} kcal` : "En equilibrio"}
                  </div>
                  <p className="text-xs text-gray-500">{deficit > 0 ? "¡Bien! Vas camino a tu objetivo." : deficit < 0 ? "Consumiste más de lo que gastaste." : "Ingesta = gasto."}</p>
                </div>
              </div>
            </div>

            {/* KPIs diarios */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Comidas registradas", value: stats?.meal_count || 0, sub: "del día", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Restantes", value: `${Math.max(remaining, 0).toFixed(0)} kcal`, sub: remaining < 0 ? "meta superada" : "para tu meta", icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Kcal quemadas", value: `${burned.toFixed(0)} kcal`, sub: `${fitnessStats?.workout_count || 0} entrenamientos`, icon: Dumbbell, color: "text-red-500", bg: "bg-red-50" },
                { label: "Tiempo activo", value: `${fitnessStats?.total_duration_minutes || 0} min`, sub: "en ejercicio", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Breakdown categorías + ejercicio */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Categorías de Comida</h3>
                {topBreakdown.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin registros este día</p> : (
                  <div className="space-y-2.5">
                    {topBreakdown.map(([cat, cal]) => {
                      const pct = ((cal / (stats?.total_calories || 1)) * 100).toFixed(0);
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-gray-500 w-16 text-right">{cal.toFixed(0)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" />Actividad por Tipo</h3>
                {Object.keys(fitnessStats?.breakdown || {}).length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin entrenamientos este día</p> : (
                  <div className="space-y-2.5">
                    {Object.entries(fitnessStats?.breakdown || {}).map(([type, cal]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 bg-blue-100 text-blue-700">{type}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${((cal / (fitnessStats?.total_calories_burned || 1)) * 100)}%` }} /></div>
                        <span className="text-xs text-gray-500 w-16 text-right">{cal.toFixed(0)} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Gráficos semanales */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Nutrición — últimos 7 días</h3>
                {weeklyNutrition.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyNutrition} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <ReferenceLine y={dailyGoal} stroke="#f87171" strokeDasharray="4 3" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#f87171" }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Ingeridas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                        {weeklyNutrition.map((entry, i) => (<Cell key={i} fill={entry.date === selectedDate ? "hsl(142.1 76.2% 36.3%)" : "#d1fae5"} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Actividad Física — últimos 7 días</h3>
                {weeklyFitness.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyFitness} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                        {weeklyFitness.map((entry, i) => (<Cell key={i} fill={entry.date === selectedDate ? "#2563eb" : "#bfdbfe"} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ VISTA SEMANAL ═══════════════ */}
        {mode === "week" && (
          <>
            {/* Balance semana */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Kcal consumidas", value: `${(monthlyNutrition?.total_calories || 0).toFixed(0)}`, sub: "esta semana", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Comidas", value: monthlyNutrition?.total_meals || 0, sub: "registradas", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Prom. diario", value: `${(monthlyNutrition?.avg_daily_calories || 0).toFixed(0)} kcal`, sub: `meta ${dailyGoal.toFixed(0)} kcal`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Días con registro", value: monthlyNutrition?.days_with_data || 0, sub: "de 7 días", icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Nutrición — semana</h3>
                {weeklyNutrition.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyNutrition} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <ReferenceLine y={dailyGoal} stroke="#f87171" strokeDasharray="4 3" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#f87171" }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Ingeridas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                        {weeklyNutrition.map((e, i) => (<Cell key={i} fill={e.calories > dailyGoal ? "#f87171" : e.calories > 0 ? "hsl(142.1 76.2% 36.3%)" : "#e5e7eb"} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Actividad — semana</h3>
                {weeklyFitness.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyFitness} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                        {weeklyFitness.map((e, i) => (<Cell key={i} fill={e.calories > 0 ? "#2563eb" : "#e5e7eb"} fillOpacity={e.calories > 0 ? 0.8 : 1} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ VISTA MENSUAL ═══════════════ */}
        {mode === "month" && (
          <>
            {/* Resumen balance mensual */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">Balance del Mes</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-orange-400">{(monthlyNutrition?.total_calories || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">kcal consumidas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Dumbbell className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-blue-400">{(monthlyFitness?.total_calories_burned || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">kcal quemadas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Target className="w-4 h-4 text-green-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-green-400">{(monthlyNutrition?.avg_daily_calories || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">prom. diario kcal</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${mTotalDef !== null && mTotalDef < 0 ? "bg-red-500/25" : "bg-green-500/20"}`}>
                  <Activity className={`w-4 h-4 mx-auto mb-1.5 ${mTotalDef !== null && mTotalDef < 0 ? "text-red-400" : "text-green-400"}`} />
                  <p className={`text-xl font-bold ${mTotalDef !== null && mTotalDef < 0 ? "text-red-400" : "text-green-400"}`}>
                    {mTotalDef !== null ? `${mTotalDef > 0 ? "+" : ""}${mTotalDef.toFixed(0)}` : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">neto del mes</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center border-t border-white/10 pt-4">
                <div><p className="text-lg font-bold text-white">{monthlyNutrition?.total_meals || 0}</p><p className="text-xs text-gray-400">comidas</p></div>
                <div><p className="text-lg font-bold text-white">{monthlyFitness?.total_workouts || 0}</p><p className="text-xs text-gray-400">entrenamientos</p></div>
                <div><p className="text-lg font-bold text-white">{monthlyFitness?.total_duration_minutes || 0} min</p><p className="text-xs text-gray-400">tiempo activo</p></div>
              </div>
            </div>

            {/* KPIs del mes */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Días con comidas", value: monthlyNutrition?.days_with_data || 0, sub: "días registrados", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
                { label: "Días activos", value: monthlyFitness?.days_active || 0, sub: "con ejercicio", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Prom. kcal/día", value: `${(monthlyNutrition?.avg_daily_calories || 0).toFixed(0)}`, sub: `meta ${dailyGoal.toFixed(0)} kcal`, icon: Target, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Prom. quemadas", value: `${(monthlyFitness?.avg_daily_calories_burned || 0).toFixed(0)} kcal`, sub: "por día activo", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Gráficos del mes */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Nutrición del mes</h3>
                {mNutChart.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mNutChart} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <ReferenceLine y={dailyGoal} stroke="#f87171" strokeDasharray="4 3" />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`]} labelFormatter={(l) => `Día ${l}`} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[3, 3, 0, 0]}>
                        {mNutChart.map((entry, i) => (
                          <Cell key={i} fill={entry.calories > dailyGoal ? "#f87171" : "hsl(142.1 76.2% 36.3%)"} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" />Actividad del mes</h3>
                {mFitChart.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mFitChart} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal quemadas`]} labelFormatter={(l) => `Día ${l}`} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                      <Bar dataKey="calories" radius={[3, 3, 0, 0]}>
                        {mFitChart.map((_, i) => (<Cell key={i} fill="#2563eb" fillOpacity={0.75} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* Evolución de peso (siempre visible) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Scale className="w-4 h-4 text-primary" />Evolución del peso</h3>
            <button onClick={() => router.push("/settings?tab=peso")} className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              <Plus className="w-3.5 h-3.5" /> Registrar
            </button>
          </div>
          {weightHistory.length < 2 ? (
            <div className="text-center py-8 text-gray-400">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Registrá al menos 2 pesajes para ver la evolución.</p>
              <button onClick={() => router.push("/settings?tab=peso")} className="text-xs text-primary mt-2 hover:underline">Ir a Seguimiento de peso →</button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightHistory.map((e) => ({ date: new Date(e.recorded_at + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }), peso: e.weight_kg }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => `${v}kg`} />
                <Tooltip formatter={(v: number) => [`${v} kg`, "Peso"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={2.5} dot={<Dot r={4} fill="hsl(142.1 76.2% 36.3%)" stroke="white" strokeWidth={2} />} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Categorías del mes (monthly) o 7 días (day) */}
        {mode === "month" && (monthlyNutrition?.category_breakdown || monthlyFitness?.type_breakdown) && (
          <div className="grid lg:grid-cols-2 gap-4">
            {monthlyNutrition && Object.keys(monthlyNutrition.category_breakdown).length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Apple className="w-4 h-4 text-primary" />Categorías del mes</h3>
                <div className="space-y-2.5">
                  {Object.entries(monthlyNutrition.category_breakdown).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, cal]) => {
                    const total = Object.values(monthlyNutrition.category_breakdown).reduce((s, v) => s + v, 0);
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>{cat}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${((cal / total) * 100).toFixed(0)}%` }} /></div>
                        <span className="text-xs text-gray-500 w-16 text-right">{cal.toFixed(0)} kcal</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {monthlyFitness && Object.keys(monthlyFitness.type_breakdown).length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Dumbbell className="w-4 h-4 text-blue-500" />Tipos de ejercicio</h3>
                <div className="space-y-2.5">
                  {Object.entries(monthlyFitness.type_breakdown).sort(([, a], [, b]) => b - a).map(([type, cal]) => {
                    const total = Object.values(monthlyFitness.type_breakdown).reduce((s, v) => s + v, 0);
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 bg-blue-100 text-blue-700">{type}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${((cal / total) * 100).toFixed(0)}%` }} /></div>
                        <span className="text-xs text-gray-500 w-16 text-right">{cal.toFixed(0)} kcal</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
