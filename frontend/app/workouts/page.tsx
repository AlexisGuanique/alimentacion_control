"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Flame, Timer, TrendingUp, Plus, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getWorkouts, getFitnessDaily, getFitnessWeekly, getMonthlyFitnessStats, getMe,
  Workout, FitnessStats, MonthlyFitnessStats, User,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import WorkoutList from "@/components/WorkoutList";
import AddWorkoutModal from "@/components/AddWorkoutModal";
import PeriodNav, { PeriodMode } from "@/components/PeriodNav";

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<FitnessStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyFitnessStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [mode, setMode] = useState<PeriodMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(todayYM);

  const fetchDayData = useCallback(async (targetDate: string) => {
    const [userData, workoutsData, statsData, weeklyRaw] = await Promise.all([
      getMe(),
      getWorkouts(targetDate, targetDate),
      getFitnessDaily(targetDate),
      getFitnessWeekly(),
    ]);
    setUser(userData);
    setWorkouts(workoutsData);
    setStats(statsData);
    setMonthlyStats(null);
    const formatted = Object.entries(weeklyRaw.weekly_data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, calories]) => ({ date, day: new Date(date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }), calories }));
    setWeeklyData(formatted);
  }, []);

  const fetchMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const [userData, ms] = await Promise.all([getMe(), getMonthlyFitnessStats(year, month)]);
    setUser(userData);
    setMonthlyStats(ms);
    setStats(null);
    setWorkouts([]);
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

  const handleWorkoutDeleted = (id: number) => {
    const deleted = workouts.find((w) => w.id === id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (deleted && stats) {
      setStats({
        ...stats,
        total_calories_burned: Math.max(0, stats.total_calories_burned - deleted.calories_burned),
        workout_count: stats.workout_count - 1,
        total_duration_minutes: Math.max(0, stats.total_duration_minutes - deleted.duration_minutes),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto animate-pulse">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  const weeklyAvg = weeklyData.length ? weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.length : 0;

  // Gráfico mensual
  const monthChartData = (monthlyStats?.daily_data || []).map((d) => ({
    day: new Date(d.date + "T12:00:00").getDate(),
    calories: d.calories_burned,
    date: d.date,
  }));
  const monthlyTypeBreakdown = Object.entries(monthlyStats?.type_breakdown || {}).sort(([, a], [, b]) => b - a);
  const monthlyTotalType = Object.values(monthlyStats?.type_breakdown || {}).reduce((s, v) => s + v, 0);

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Actividad Física</h1>
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
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Kcal quemadas", value: `${(stats?.total_calories_burned || 0).toFixed(0)} kcal`, sub: "hoy", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Entrenamientos", value: stats?.workout_count || 0, sub: "hoy", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Tiempo total", value: `${stats?.total_duration_minutes || 0} min`, sub: "hoy", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Prom. semanal", value: `${weeklyAvg.toFixed(0)} kcal`, sub: "últimos 7 días", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
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

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Kcal quemadas — últimos 7 días
              </h3>
              {weeklyData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin datos semanales</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 12 }} />
                    <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                      {weeklyData.map((entry, i) => (
                        <Cell key={i} fill={entry.date === selectedDate ? "#2563eb" : "#bfdbfe"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-blue-500" />
                Entrenamientos del día
              </h3>
              <WorkoutList
                workouts={workouts}
                onDelete={handleWorkoutDeleted}
                onUpdate={(updated) => setWorkouts((prev) => prev.map((w) => w.id === updated.id ? updated : w))}
                userWeightKg={user?.weight_kg}
              />
            </div>
          </>
        )}

        {/* ═══════════════ VISTA MENSUAL ═══════════════ */}
        {mode === "month" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total quemado", value: `${(monthlyStats?.total_calories_burned || 0).toFixed(0)} kcal`, sub: "este mes", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Prom. diario", value: `${(monthlyStats?.avg_daily_calories_burned || 0).toFixed(0)} kcal`, sub: "por día activo", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
                { label: "Entrenamientos", value: monthlyStats?.total_workouts || 0, sub: "este mes", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Tiempo total", value: `${monthlyStats?.total_duration_minutes || 0} min`, sub: `${monthlyStats?.days_active || 0} días activos`, icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
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

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Kcal quemadas por día
              </h3>
              {monthChartData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin entrenamientos este mes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthChartData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} labelFormatter={(l) => `Día ${l}`} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                      {monthChartData.map((_, i) => (
                        <Cell key={i} fill="#2563eb" fillOpacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {monthlyTypeBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Desglose por tipo de ejercicio</h3>
                <div className="space-y-2.5">
                  {monthlyTypeBreakdown.map(([type, cal]) => {
                    const pct = ((cal / monthlyTotalType) * 100).toFixed(0);
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center flex-shrink-0 bg-blue-100 text-blue-700">{type}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400/70 rounded-full" style={{ width: `${pct}%` }} />
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

      {showModal && (
        <AddWorkoutModal
          userWeightKg={user?.weight_kg}
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchData(); setShowModal(false); }}
        />
      )}
    </AppLayout>
  );
}
