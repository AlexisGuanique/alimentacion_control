"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Apple, Target, TrendingUp, Award,
  Activity, Sparkles, AlertCircle, Dumbbell, Timer,
  ArrowDown, ArrowUp, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

import {
  getMeals, getDailyStats, getWeeklyStats, getMe,
  getFitnessDaily, getFitnessWeekly,
  DailyStats, FitnessStats, User,
} from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import DateNav from "@/components/DateNav";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [fitnessStats, setFitnessStats] = useState<FitnessStats | null>(null);
  const [weeklyNutrition, setWeeklyNutrition] = useState<{ day: string; calories: number; date: string }[]>([]);
  const [weeklyFitness, setWeeklyFitness] = useState<{ day: string; calories: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async (targetDate: string) => {
    try {
      const [userData, , statsData, weeklyRaw, fitnessData, fitnessWeeklyRaw] = await Promise.all([
        getMe(),
        getMeals(targetDate, targetDate),
        getDailyStats(targetDate),
        getWeeklyStats(),
        getFitnessDaily(targetDate),
        getFitnessWeekly(),
      ]);

      setUser(userData);
      setStats(statsData);
      setFitnessStats(fitnessData);

      const toChartData = (raw: Record<string, number>) =>
        Object.entries(raw)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, calories]) => ({
            date,
            day: new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }),
            calories,
          }));

      setWeeklyNutrition(toChartData(weeklyRaw.weekly_data));
      setWeeklyFitness(toChartData(fitnessWeeklyRaw.weekly_data));
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
    fetchData(selectedDate);
  }, [fetchData, selectedDate, router]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setLoading(true);
  };

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
  const consumed = stats?.total_calories || 0;
  const burned = fitnessStats?.total_calories_burned || 0;

  // Lógica del balance:
  // - La meta ya incluye tu TDEE (nivel de actividad base).
  // - "Disponibles" = cuánto más podés comer para alcanzar la meta de ingesta.
  // - "Déficit/Superávit real" = neto contando también el ejercicio extra del día.
  const remaining = dailyGoal - consumed;                 // margen vs meta de ingesta
  const netCalories = consumed - burned;                  // ingesta − ejercicio = neto real
  const deficit = dailyGoal - netCalories;                // cuánto bajo de la meta
  const consumedPct = Math.min((consumed / dailyGoal) * 100, 100);

  const topBreakdown = Object.entries(stats?.breakdown || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Alerta objetivo no configurado */}
        {!user?.daily_calories_target && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 flex-1">
              No configuraste tu objetivo calórico. Se usa 2000 kcal por defecto.
            </p>
            <button onClick={() => router.push("/settings")} className="text-xs font-semibold text-amber-700 underline whitespace-nowrap">
              Configurar
            </button>
          </div>
        )}

        {/* Header + DateNav */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedDate === new Date().toISOString().split("T")[0]
                ? `Buen día, ${user?.full_name?.split(" ")[0]} 👋`
                : "Resumen del día"}
            </h1>
            {user?.fitness_goal && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-1">
                <Sparkles className="w-3 h-3" />
                {user.fitness_goal}
              </span>
            )}
          </div>
          <DateNav date={selectedDate} onChange={handleDateChange} />
        </div>

        {/* ── Balance Calórico ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-4">
            Balance Calórico del Día
          </h2>

          {/* 3 métricas principales */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Consumidas */}
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-orange-400">{consumed.toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-0.5">kcal comidas</p>
            </div>
            {/* Quemadas ejercicio */}
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Dumbbell className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
              <p className="text-2xl font-bold text-blue-400">{burned.toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-0.5">kcal ejercicio</p>
            </div>
            {/* Disponibles para comer */}
            <div className={`rounded-xl p-4 text-center ${remaining < 0 ? "bg-red-500/25" : "bg-green-500/20"}`}>
              <Target className={`w-4 h-4 mx-auto mb-1.5 ${remaining < 0 ? "text-red-400" : "text-green-400"}`} />
              <p className={`text-2xl font-bold ${remaining < 0 ? "text-red-400" : "text-green-400"}`}>
                {Math.abs(remaining).toFixed(0)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {remaining < 0 ? "kcal de más" : "kcal disponibles"}
              </p>
            </div>
          </div>

          {/* Barra: comidas vs meta */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Ingeridas: {consumed.toFixed(0)} kcal</span>
              <span>Meta: {dailyGoal.toFixed(0)} kcal</span>
            </div>
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${consumed > dailyGoal ? "bg-red-500" : consumedPct >= 85 ? "bg-orange-400" : "bg-green-400"}`}
                style={{ width: `${consumedPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {remaining >= 0
                ? `Podés comer ${remaining.toFixed(0)} kcal más para llegar a tu meta`
                : `Superaste tu meta en ${Math.abs(remaining).toFixed(0)} kcal`}
            </p>
          </div>

          {/* Línea separadora */}
          <div className="border-t border-white/10 pt-3 mt-1">
            <p className="text-xs text-gray-500 mb-2">Balance neto real del día (comidas − ejercicio):</p>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                deficit > 0 ? "bg-green-500/20 text-green-400" :
                deficit < 0 ? "bg-red-500/20 text-red-400" :
                "bg-white/10 text-gray-300"
              }`}>
                {deficit > 0 ? <ArrowDown className="w-3.5 h-3.5" /> : deficit < 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                {deficit > 0 ? `Déficit de ${deficit.toFixed(0)} kcal` :
                 deficit < 0 ? `Superávit de ${Math.abs(deficit).toFixed(0)} kcal` :
                 "En equilibrio"}
              </div>
              <p className="text-xs text-gray-500">
                {deficit > 0 ? "¡Bien! Vas camino a tu objetivo." :
                 deficit < 0 ? "Consumiste más de lo que gastaste." :
                 "Ingesta = gasto."}
              </p>
            </div>
          </div>
        </div>

        {/* KPI rápidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Comidas registradas", value: stats?.meal_count || 0, sub: "del día", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
            { label: "Restantes", value: `${Math.max(remaining, 0).toFixed(0)} kcal`, sub: remaining < 0 ? "meta superada" : "para tu meta", icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Kcal quemadas", value: `${burned.toFixed(0)} kcal`, sub: `${fitnessStats?.workout_count || 0} entrenamientos`, icon: Dumbbell, color: "text-red-500", bg: "bg-red-50" },
            { label: "Tiempo activo", value: `${fitnessStats?.total_duration_minutes || 0} min`, sub: "en ejercicio", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
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

        {/* Breakdown categorías + tipos de ejercicio */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Apple className="w-4 h-4 text-primary" />
              Categorías de Comida
            </h3>
            {topBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin registros este día</p>
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
                      <span className="text-xs text-gray-500 w-16 text-right">{cal.toFixed(0)} kcal</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-blue-500" />
              Actividad por Tipo
            </h3>
            {Object.keys(fitnessStats?.breakdown || {}).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin entrenamientos este día</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(fitnessStats?.breakdown || {}).map(([type, cal]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 bg-blue-100 text-blue-700">{type}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${((cal / (fitnessStats?.total_calories_burned || 1)) * 100)}%` }} />
                    </div>
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
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Nutrición — últimos 7 días
            </h3>
            {weeklyNutrition.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyNutrition} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={dailyGoal} stroke="#f87171" strokeDasharray="4 3" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#f87171" }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Ingeridas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                  <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                    {weeklyNutrition.map((entry, i) => (
                      <Cell key={i} fill={entry.date === selectedDate ? "hsl(142.1 76.2% 36.3%)" : "#d1fae5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Actividad Física — últimos 7 días
            </h3>
            {weeklyFitness.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyFitness} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                  <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                    {weeklyFitness.map((entry, i) => (
                      <Cell key={i} fill={entry.date === selectedDate ? "#2563eb" : "#bfdbfe"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
