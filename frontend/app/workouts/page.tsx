"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell, Flame, Timer, TrendingUp, Plus, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getWorkouts, getFitnessDaily, getFitnessWeekly, getMe,
  Workout, FitnessStats, User,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import WorkoutList from "@/components/WorkoutList";
import AddWorkoutModal from "@/components/AddWorkoutModal";
import DateNav from "@/components/DateNav";

export default function WorkoutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<FitnessStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; calories: number; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async (targetDate: string) => {
    try {
      const [userData, workoutsData, statsData, weeklyRaw] = await Promise.all([
        getMe(),
        getWorkouts(targetDate, targetDate),
        getFitnessDaily(targetDate),
        getFitnessWeekly(),
      ]);

      setUser(userData);
      setWorkouts(workoutsData);
      setStats(statsData);

      const formatted = Object.entries(weeklyRaw.weekly_data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, calories]) => ({
          date,
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
    fetchData(selectedDate);
  }, [fetchData, selectedDate, router]);

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
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-500 text-sm">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  const weeklyAvg = weeklyData.length
    ? weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.length
    : 0;

  return (
    <AppLayout
      userName={user?.full_name}
      userEmail={user?.email}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Actividad Física</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateNav date={selectedDate} onChange={(d) => { setSelectedDate(d); setLoading(true); }} />
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Ejercicio
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Calorías Quemadas",
              value: `${(stats?.total_calories_burned || 0).toFixed(0)} kcal`,
              sub: "hoy",
              icon: Flame,
              color: "text-orange-500",
              bg: "bg-orange-50",
            },
            {
              label: "Entrenamientos",
              value: stats?.workout_count || 0,
              sub: "hoy",
              icon: Dumbbell,
              color: "text-blue-500",
              bg: "bg-blue-50",
            },
            {
              label: "Tiempo Total",
              value: `${stats?.total_duration_minutes || 0} min`,
              sub: "hoy",
              icon: Timer,
              color: "text-purple-500",
              bg: "bg-purple-50",
            },
            {
              label: "Promedio Sem.",
              value: `${weeklyAvg.toFixed(0)} kcal`,
              sub: "últimos 7 días",
              icon: TrendingUp,
              color: "text-green-500",
              bg: "bg-green-50",
            },
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

        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Calorías Quemadas — Últimos 7 Días
          </h3>
          {weeklyData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos semanales</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 12 }}
                />
                  <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.date === selectedDate ? "#2563eb" : "#bfdbfe"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Workouts List */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-500" />
            Entrenamientos de Hoy
          </h3>
          <WorkoutList workouts={workouts} onDelete={handleWorkoutDeleted} />
        </div>
      </div>

      {showModal && (
        <AddWorkoutModal
          userWeightKg={user?.weight_kg}
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchData(selectedDate); setShowModal(false); }}
        />
      )}
    </AppLayout>
  );
}
