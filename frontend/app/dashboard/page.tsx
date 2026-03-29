"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Apple, Target, TrendingUp, Plus,
  Leaf, Calendar, Award, Activity, Sparkles, AlertCircle,
  Dumbbell, Timer, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getMeals, getDailyStats, getWeeklyStats, getMe,
  getFitnessDaily, getFitnessWeekly,
  Meal, DailyStats, FitnessStats, User,
} from "@/lib/api";
import { CATEGORY_COLORS } from "@/lib/utils";
import MealTable from "@/components/MealTable";
import ChatWidget from "@/components/ChatWidget";
import AddMealModal from "@/components/AddMealModal";
import AppLayout from "@/components/AppLayout";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [fitnessStats, setFitnessStats] = useState<FitnessStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [userData, mealsData, statsData, weeklyRaw, fitnessData] = await Promise.all([
        getMe(),
        getMeals(today),
        getDailyStats(),
        getWeeklyStats(),
        getFitnessDaily(),
      ]);

      setUser(userData);
      setMeals(mealsData);
      setStats(statsData);
      setFitnessStats(fitnessData);

      const formatted = Object.entries(weeklyRaw.weekly_data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, calories]) => ({
          day: new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }),
          calories,
        }));
      setWeeklyData(formatted);
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

  const handleLogout = () => {
    localStorage.removeItem("nutritrack_token");
    router.push("/login");
  };

  const handleMealAdded = () => fetchData();

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
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-500 text-sm">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  const dailyGoal = user?.daily_calories_target || 2000;
  const progressPct = Math.min(((stats?.total_calories || 0) / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - (stats?.total_calories || 0), 0);
  const netCalories = (stats?.total_calories || 0) - (fitnessStats?.total_calories_burned || 0);

  const topBreakdown = Object.entries(stats?.breakdown || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Banner: sin objetivo configurado */}
        {!user?.daily_calories_target && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 flex-1">
              Todavía no configuraste tu objetivo calórico. Se está usando la meta por defecto de 2000 kcal.
            </p>
            <button
              onClick={() => router.push("/settings")}
              className="text-xs font-semibold text-amber-700 underline whitespace-nowrap hover:text-amber-900"
            >
              Configurar ahora
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Buen día, {user?.full_name?.split(" ")[0]} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-gray-500 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString("es-AR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              {user?.fitness_goal && (
                <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  {user.fitness_goal}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Comida
          </button>
        </div>

        {/* KPI Cards — Nutrición */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Apple className="w-3.5 h-3.5" /> Nutrición hoy
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Calorías Hoy", value: `${(stats?.total_calories || 0).toFixed(0)} kcal`, sub: `Meta: ${dailyGoal.toFixed(0)} kcal`, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
              { label: "Comidas Hoy", value: stats?.meal_count || 0, sub: "registradas", icon: Apple, color: "text-green-500", bg: "bg-green-50" },
              { label: "Restantes", value: `${remaining.toFixed(0)} kcal`, sub: `${progressPct.toFixed(0)}% de la meta`, icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
              { label: "Promedio Sem.", value: weeklyData.length ? `${(weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.length).toFixed(0)} kcal` : "—", sub: "últimos 7 días", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
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
        </div>

        {/* KPI Cards — Fitness */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" /> Actividad física hoy
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Kcal Quemadas", value: `${(fitnessStats?.total_calories_burned || 0).toFixed(0)} kcal`, icon: Flame, color: "text-red-500", bg: "bg-red-50" },
              { label: "Entrenamientos", value: fitnessStats?.workout_count || 0, icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
              { label: "Tiempo Activo", value: `${fitnessStats?.total_duration_minutes || 0} min`, icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Balance neto + Progreso + Breakdown */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Balance neto */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-500" />
              Balance Calórico
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Consumidas</span>
                <span className="font-semibold text-orange-600">+{(stats?.total_calories || 0).toFixed(0)} kcal</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Quemadas</span>
                <span className="font-semibold text-blue-600">-{(fitnessStats?.total_calories_burned || 0).toFixed(0)} kcal</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Neto</span>
                <span className={`text-lg font-bold ${netCalories > dailyGoal ? "text-red-500" : netCalories < 0 ? "text-blue-600" : "text-gray-900"}`}>
                  {netCalories.toFixed(0)} kcal
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-red-500" : progressPct >= 80 ? "bg-orange-500" : "bg-primary"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{(stats?.total_calories || 0).toFixed(0)} kcal</span>
              <span>Meta {dailyGoal.toFixed(0)} kcal</span>
            </div>
            {progressPct >= 100 && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Meta superada. ¡Cuidado con el exceso!
              </p>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Desglose por Categoría
            </h3>
            {topBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin registros hoy</p>
            ) : (
              <div className="space-y-2.5">
                {topBreakdown.map(([cat, cal]) => {
                  const pct = ((cal / (stats?.total_calories || 1)) * 100).toFixed(0);
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                        {cat}
                      </span>
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

        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Calorías Consumidas — Últimos 7 Días
          </h3>
          {weeklyData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos semanales</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Calorías"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 12 }} />
                <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill={i === weeklyData.length - 1 ? "hsl(142.1 76.2% 36.3%)" : "#d1fae5"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Meals Table */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Apple className="w-4 h-4 text-primary" />
            Comidas de Hoy
          </h3>
          <MealTable meals={meals} onDelete={handleMealDeleted} />
        </div>
      </div>

      <ChatWidget onDataChanged={handleMealAdded} />

      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onAdded={() => { handleMealAdded(); setShowModal(false); }}
        />
      )}
    </AppLayout>
  );
}
