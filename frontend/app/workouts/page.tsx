"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell, Flame, Timer, TrendingUp, Plus, CalendarDays,
  ChevronDown, ChevronUp, Pencil, Trash2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

import {
  getWorkouts, getFitnessDaily, getMonthlyFitnessStats, getMe,
  deleteWorkout,
  Workout, FitnessStats, MonthlyFitnessStats, User,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import WorkoutList from "@/components/WorkoutList";
import AddWorkoutModal from "@/components/AddWorkoutModal";
import EditWorkoutModal from "@/components/EditWorkoutModal";
import ConfirmModal from "@/components/ConfirmModal";
import PeriodNav, { PeriodMode, getMondayOf, getSundayOf } from "@/components/PeriodNav";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TYPE_EMOJI: Record<string, string> = {
  Cardio: "🏃", Fuerza: "🏋️", HIIT: "⚡", Flexibilidad: "🧘",
  Deporte: "⚽", Caminata: "🚶", "Natación": "🏊", Ciclismo: "🚴", Otro: "💪",
};

const TYPE_COLORS: Record<string, string> = {
  Cardio: "bg-orange-100 text-orange-700",
  Fuerza: "bg-blue-100 text-blue-700",
  HIIT: "bg-purple-100 text-purple-700",
  Flexibilidad: "bg-teal-100 text-teal-700",
  Deporte: "bg-yellow-100 text-yellow-700",
  Caminata: "bg-green-100 text-green-700",
  "Natación": "bg-cyan-100 text-cyan-700",
  Ciclismo: "bg-amber-100 text-amber-700",
  Otro: "bg-gray-100 text-gray-700",
};

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

// ── Sub-componente: entrenamientos agrupados por día ─────────────────────────
function WorkoutsByDay({
  workouts,
  onDelete,
  onEdit,
}: {
  workouts: Workout[];
  onDelete: (id: number) => void;
  onEdit: (w: Workout) => void;
}) {
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const grouped: Record<string, Workout[]> = {};
  for (const w of workouts) {
    const day = w.created_at.split("T")[0];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(w);
  }
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    if (days.length > 0) setOpenDays({ [days[0]]: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.length]);

  if (days.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Sin entrenamientos registrados en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-hidden">
      {days.map((day) => {
        const dayWorkouts = grouped[day];
        const dayCalories = dayWorkouts.reduce((s, w) => s + w.calories_burned, 0);
        const dayMinutes = dayWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
        const isOpen = openDays[day] ?? false;

        return (
          <div key={day} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Header del día */}
            <button
              className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setOpenDays((p) => ({ ...p, [day]: !p[day] }))}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                <span className="text-sm font-semibold text-gray-800 capitalize truncate">{formatDayHeader(day)}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-sm font-bold text-orange-500 whitespace-nowrap">{dayCalories.toFixed(0)} kcal</span>
                <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">{dayMinutes} min · {dayWorkouts.length} sesión{dayWorkouts.length !== 1 ? "es" : ""}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>
            </button>

            {/* Lista de entrenamientos */}
            {isOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {dayWorkouts.map((w) => (
                  <div key={w.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50/50 transition-colors group">
                    <span className="text-xl flex-shrink-0">{TYPE_EMOJI[w.workout_type] || "💪"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[w.workout_type] || "bg-gray-100 text-gray-700"}`}>
                          {w.workout_type}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{w.duration_minutes} min</span>
                      </div>
                      {w.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{w.notes}</p>}
                    </div>
                    <span className="text-sm font-semibold text-orange-500 flex-shrink-0 whitespace-nowrap">{w.calories_burned.toFixed(0)} kcal</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button onClick={() => onEdit(w)} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(w.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Resumen del día */}
                <div className="px-4 py-2 bg-gray-50/50 flex justify-between text-xs text-gray-400 gap-2">
                  <span className="flex-shrink-0">{dayWorkouts.length} sesión{dayWorkouts.length !== 1 ? "es" : ""}</span>
                  <span className="flex-shrink-0">{dayMinutes} min · {dayCalories.toFixed(0)} kcal quemadas</span>
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

export default function WorkoutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editWorkout, setEditWorkout] = useState<Workout | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // Período — se persiste en sessionStorage para sobrevivir refrescos
  const [mode, setMode] = useState<PeriodMode>(() =>
    (typeof window !== "undefined" && (sessionStorage.getItem("nt_wkt_mode") as PeriodMode)) || "day"
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    (typeof window !== "undefined" && sessionStorage.getItem("nt_wkt_date")) || localToday()
  );
  const [selectedWeek, setSelectedWeek] = useState(() =>
    (typeof window !== "undefined" && sessionStorage.getItem("nt_wkt_week")) || getMondayOf(localToday())
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    (typeof window !== "undefined" && sessionStorage.getItem("nt_wkt_month")) || todayYM()
  );

  // Datos por modo
  const [dayWorkouts, setDayWorkouts] = useState<Workout[]>([]);
  const [dayStats, setDayStats] = useState<FitnessStats | null>(null);
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyFitnessStats | null>(null);
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);

  const fetchDayData = useCallback(async (d: string) => {
    const [userData, workoutsData, statsData] = await Promise.all([
      getMe(), getWorkouts(d, d), getFitnessDaily(d),
    ]);
    setUser(userData); setDayWorkouts(workoutsData); setDayStats(statsData);
  }, []);

  const fetchWeekData = useCallback(async (monday: string) => {
    const sunday = getSundayOf(monday);
    const [userData, workoutsData] = await Promise.all([getMe(), getWorkouts(monday, sunday)]);
    setUser(userData); setWeekWorkouts(workoutsData);
  }, []);

  const fetchMonthData = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const since = `${ym}-01`;
    const until = `${ym}-${String(lastDay).padStart(2, "0")}`;
    const [userData, ms, workoutsData] = await Promise.all([
      getMe(), getMonthlyFitnessStats(year, month), getWorkouts(since, until),
    ]);
    setUser(userData); setMonthlyStats(ms); setMonthWorkouts(workoutsData);
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

  // Refresca los datos en segundo plano sin mostrar pantalla de carga (para después de agregar un ejercicio)
  const fetchDataSilent = useCallback(async () => {
    try {
      if (mode === "day") await fetchDayData(selectedDate);
      else if (mode === "week") await fetchWeekData(selectedWeek);
      else await fetchMonthData(selectedMonth);
    } catch { /* ignorar */ }
  }, [mode, selectedDate, selectedWeek, selectedMonth, fetchDayData, fetchWeekData, fetchMonthData]);

  // Persiste el período en sessionStorage
  useEffect(() => { sessionStorage.setItem("nt_wkt_mode", mode); }, [mode]);
  useEffect(() => { sessionStorage.setItem("nt_wkt_date", selectedDate); }, [selectedDate]);
  useEffect(() => { sessionStorage.setItem("nt_wkt_week", selectedWeek); }, [selectedWeek]);
  useEffect(() => { sessionStorage.setItem("nt_wkt_month", selectedMonth); }, [selectedMonth]);

  useEffect(() => {
    const token = localStorage.getItem("nutritrack_token");
    if (!token) { router.push("/login"); return; }
    fetchData();
  }, [fetchData, router]);

  const handleLogout = () => { localStorage.removeItem("nutritrack_token"); router.push("/login"); };

  const handleDeleteWorkout = async (id: number) => {
    try {
      await deleteWorkout(id);
      await fetchData();
    } catch { /* ignore */ }
    setConfirmId(null);
  };

  const handleDayDeleted = (id: number) => {
    const deleted = dayWorkouts.find((w) => w.id === id);
    setDayWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (deleted && dayStats) {
      setDayStats({
        ...dayStats,
        total_calories_burned: Math.max(0, dayStats.total_calories_burned - deleted.calories_burned),
        workout_count: dayStats.workout_count - 1,
        total_duration_minutes: Math.max(0, dayStats.total_duration_minutes - deleted.duration_minutes),
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

  // ── Semana ────────────────────────────────────────────────────────────────
  const weekChartData = (() => {
    const grouped: Record<string, number> = {};
    for (const w of weekWorkouts) {
      const d = w.created_at.split("T")[0];
      grouped[d] = (grouped[d] || 0) + w.calories_burned;
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
  const weekTotal = weekWorkouts.reduce((s, w) => s + w.calories_burned, 0);
  const weekMinutes = weekWorkouts.reduce((s, w) => s + w.duration_minutes, 0);
  const weekDaysActive = new Set(weekWorkouts.map((w) => w.created_at.split("T")[0])).size;

  // ── Mes ───────────────────────────────────────────────────────────────────
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
              mode={mode} onModeChange={setMode}
              date={selectedDate} onDateChange={setSelectedDate}
              week={selectedWeek} onWeekChange={setSelectedWeek}
              month={selectedMonth} onMonthChange={setSelectedMonth}
            />
            {mode === "day" && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm"
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
                { label: "Kcal quemadas", value: `${(dayStats?.total_calories_burned || 0).toFixed(0)} kcal`, sub: "hoy", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Entrenamientos", value: dayStats?.workout_count || 0, sub: "hoy", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Tiempo total", value: `${dayStats?.total_duration_minutes || 0} min`, sub: "hoy", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Sesiones", value: dayWorkouts.length, sub: "registradas", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-blue-500" /> Entrenamientos del día
              </h3>
              <WorkoutList
                workouts={dayWorkouts}
                onDelete={handleDayDeleted}
                onUpdate={(updated) => setDayWorkouts((prev) => prev.map((w) => w.id === updated.id ? updated : w))}
                userWeightKg={user?.weight_kg}
              />
            </div>
          </>
        )}

        {/* ══════════════════ VISTA SEMANAL ══════════════════ */}
        {mode === "week" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total quemado", value: `${weekTotal.toFixed(0)} kcal`, sub: "esta semana", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Tiempo total", value: `${weekMinutes} min`, sub: "en ejercicio", icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Sesiones", value: weekWorkouts.length, sub: "entrenamientos", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Días activos", value: weekDaysActive, sub: "de 7 días", icon: CalendarDays, color: "text-green-500", bg: "bg-green-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Kcal quemadas por día
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                  <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                    {weekChartData.map((e, i) => (
                      <Cell key={i} fill={e.calories > 0 ? "#2563eb" : "#e5e7eb"} fillOpacity={e.calories > 0 ? 0.8 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-blue-500" /> Entrenamientos por día
              </h3>
              <WorkoutsByDay
                workouts={weekWorkouts}
                onDelete={(id) => setConfirmId(id)}
                onEdit={(w) => setEditWorkout(w)}
              />
            </div>
          </>
        )}

        {/* ══════════════════ VISTA MENSUAL ══════════════════ */}
        {mode === "month" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total quemado", value: `${(monthlyStats?.total_calories_burned || 0).toFixed(0)} kcal`, sub: "este mes", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Prom. diario", value: `${(monthlyStats?.avg_daily_calories_burned || 0).toFixed(0)} kcal`, sub: "por día activo", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
                { label: "Sesiones", value: monthlyStats?.total_workouts || 0, sub: "este mes", icon: Dumbbell, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Tiempo total", value: `${monthlyStats?.total_duration_minutes || 0} min`, sub: `${monthlyStats?.days_active || 0} días activos`, icon: Timer, color: "text-purple-500", bg: "bg-purple-50" },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Kcal quemadas por día del mes
              </h3>
              {monthChartData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin entrenamientos este mes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthChartData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Quemadas"]} labelFormatter={(l) => `Día ${l}`} contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: 11 }} />
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                      {monthChartData.map((_, i) => (<Cell key={i} fill="#2563eb" fillOpacity={0.75} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Desglose por tipo + Lista por día */}
            <div className="grid lg:grid-cols-3 gap-4">
              {monthlyTypeBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Tipos de ejercicio</h3>
                  <div className="space-y-2.5">
                    {monthlyTypeBreakdown.map(([type, cal]) => {
                      const pct = ((cal / monthlyTotalType) * 100).toFixed(0);
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${TYPE_COLORS[type] || "bg-gray-100 text-gray-700"}`}>{type}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400/70 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{cal.toFixed(0)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className={monthlyTypeBreakdown.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-500" /> Entrenamientos por día
                </h3>
                <WorkoutsByDay
                  workouts={monthWorkouts}
                  onDelete={(id) => setConfirmId(id)}
                  onEdit={(w) => setEditWorkout(w)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <AddWorkoutModal
          userWeightKg={user?.weight_kg}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); fetchDataSilent(); }}
          selectedDate={mode === "day" ? selectedDate : undefined}
        />
      )}

      {editWorkout && (
        <EditWorkoutModal
          workout={editWorkout}
          userWeightKg={user?.weight_kg}
          onClose={() => setEditWorkout(null)}
          onUpdated={() => { fetchData(); setEditWorkout(null); }}
        />
      )}

      {confirmId !== null && (
        <ConfirmModal
          title="Eliminar entrenamiento"
          description="¿Estás seguro de que querés eliminar este entrenamiento? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => handleDeleteWorkout(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </AppLayout>
  );
}
