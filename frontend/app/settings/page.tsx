"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Lock, Target, Save, Sparkles,
  CheckCircle, AlertCircle, Loader2, Scale, Ruler,
  Activity, ChevronRight,
} from "lucide-react";
import {
  getMe, updateProfile, changePassword, calculateGoal,
  User as UserType, GoalResult,
} from "@/lib/api";
import AppLayout from "@/components/AppLayout";

type Tab = "perfil" | "cuerpo" | "seguridad";

const GOALS = [
  { value: "Pérdida de grasa", label: "Pérdida de grasa", emoji: "🔥", desc: "Reducir grasa corporal manteniendo músculo" },
  { value: "Aumento muscular", label: "Aumento muscular", emoji: "💪", desc: "Ganar masa muscular con superávit calórico" },
  { value: "Mantenimiento", label: "Mantenimiento", emoji: "⚖️", desc: "Mantener el peso y composición actual" },
  { value: "Definición", label: "Definición", emoji: "✂️", desc: "Reducir grasa con déficit moderado" },
  { value: "Salud general", label: "Salud general", emoji: "🌿", desc: "Mejorar hábitos y bienestar general" },
];

const ACTIVITY_LEVELS = [
  { value: "Sedentario", label: "Sedentario", desc: "Sin ejercicio o muy poco" },
  { value: "Ligero", label: "Ligero", desc: "Ejercicio 1-3 días/semana" },
  { value: "Moderado", label: "Moderado", desc: "Ejercicio 3-5 días/semana" },
  { value: "Activo", label: "Activo", desc: "Ejercicio 6-7 días/semana" },
  { value: "Muy activo", label: "Muy activo", desc: "Entrenamiento intenso diario" },
];

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 ${
      type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
    }`}>
      {type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("perfil");
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null);

  const [profileForm, setProfileForm] = useState({ full_name: "" });
  const [bodyForm, setBodyForm] = useState({
    height_cm: "",
    weight_kg: "",
    age: "",
    gender: "Masculino",
    activity_level: "Moderado",
    fitness_goal: "Mantenimiento",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
      setProfileForm({ full_name: u.full_name });
      setBodyForm({
        height_cm: u.height_cm?.toString() || "",
        weight_kg: u.weight_kg?.toString() || "",
        age: u.age?.toString() || "",
        gender: u.gender || "Masculino",
        activity_level: u.activity_level || "Moderado",
        fitness_goal: u.fitness_goal || "Mantenimiento",
      });
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("nutritrack_token");
    if (!token) { router.push("/login"); return; }
    fetchUser();
  }, [fetchUser, router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(profileForm);
      setUser(updated);
      showToast("Perfil actualizado correctamente", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBody = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        height_cm: bodyForm.height_cm ? parseFloat(bodyForm.height_cm) : undefined,
        weight_kg: bodyForm.weight_kg ? parseFloat(bodyForm.weight_kg) : undefined,
        age: bodyForm.age ? parseInt(bodyForm.age) : undefined,
        gender: bodyForm.gender,
        activity_level: bodyForm.activity_level,
        fitness_goal: bodyForm.fitness_goal,
      });
      setUser(updated);
      showToast("Datos corporales guardados", "success");
    } catch {
      showToast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateGoal = async () => {
    if (!bodyForm.height_cm || !bodyForm.weight_kg || !bodyForm.age) {
      showToast("Completa altura, peso y edad primero", "error");
      return;
    }
    setCalculating(true);
    setGoalResult(null);
    try {
      // Primero guarda los datos corporales
      await updateProfile({
        height_cm: parseFloat(bodyForm.height_cm),
        weight_kg: parseFloat(bodyForm.weight_kg),
        age: parseInt(bodyForm.age),
        gender: bodyForm.gender,
        activity_level: bodyForm.activity_level,
        fitness_goal: bodyForm.fitness_goal,
      });
      // Luego calcula el objetivo con IA
      const result = await calculateGoal({
        height_cm: parseFloat(bodyForm.height_cm),
        weight_kg: parseFloat(bodyForm.weight_kg),
        age: parseInt(bodyForm.age),
        gender: bodyForm.gender,
        activity_level: bodyForm.activity_level,
        fitness_goal: bodyForm.fitness_goal,
      });
      setGoalResult(result);
      await fetchUser();
      showToast("Datos guardados y objetivo calculado", "success");
    } catch {
      showToast("Error al guardar o calcular objetivo", "error");
    } finally {
      setCalculating(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("Las contraseñas nuevas no coinciden", "error");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showToast("La nueva contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    setSaving(true);
    try {
      await changePassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      showToast("Contraseña cambiada correctamente", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al cambiar contraseña", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "perfil", label: "Perfil", icon: <User className="w-4 h-4" /> },
    { id: "cuerpo", label: "Cuerpo y Objetivo", icon: <Target className="w-4 h-4" /> },
    { id: "seguridad", label: "Seguridad", icon: <Lock className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("nutritrack_token");
    router.push("/login");
  };

  return (
    <AppLayout userName={user?.full_name} userEmail={user?.email} onLogout={handleLogout}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona tu perfil y objetivos</p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Perfil ── */}
        {tab === "perfil" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Información personal</h2>
              <p className="text-sm text-gray-400">Actualizá tu nombre y datos de cuenta.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">El email no se puede modificar.</p>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        )}

        {/* ── Tab: Cuerpo y Objetivo ── */}
        {tab === "cuerpo" && (
          <div className="space-y-4">
            {/* Datos físicos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Datos físicos</h2>
                <p className="text-sm text-gray-400">La IA usa estos datos para calcular tu objetivo calórico.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Ruler className="w-3.5 h-3.5 text-gray-400" /> Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={bodyForm.height_cm}
                    onChange={(e) => setBodyForm((p) => ({ ...p, height_cm: e.target.value }))}
                    placeholder="175"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Scale className="w-3.5 h-3.5 text-gray-400" /> Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={bodyForm.weight_kg}
                    onChange={(e) => setBodyForm((p) => ({ ...p, weight_kg: e.target.value }))}
                    placeholder="75"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Edad</label>
                  <input
                    type="number"
                    value={bodyForm.age}
                    onChange={(e) => setBodyForm((p) => ({ ...p, age: e.target.value }))}
                    placeholder="28"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Género</label>
                  <select
                    value={bodyForm.gender}
                    onChange={(e) => setBodyForm((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              {/* Nivel de actividad */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                  <Activity className="w-3.5 h-3.5 text-gray-400" /> Nivel de actividad
                </label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <label
                      key={a.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        bodyForm.activity_level === a.value
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="activity"
                        value={a.value}
                        checked={bodyForm.activity_level === a.value}
                        onChange={(e) => setBodyForm((p) => ({ ...p, activity_level: e.target.value }))}
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.label}</p>
                        <p className="text-xs text-gray-400">{a.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Objetivo */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Mi objetivo</h2>
                <p className="text-sm text-gray-400">Elegí tu objetivo y la IA calculará tu plan calórico.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <label
                    key={g.value}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      bodyForm.fitness_goal === g.value
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g.value}
                      checked={bodyForm.fitness_goal === g.value}
                      onChange={(e) => setBodyForm((p) => ({ ...p, fitness_goal: e.target.value }))}
                      className="accent-primary mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{g.emoji} {g.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-1">
                <button
                  onClick={handleCalculateGoal}
                  disabled={calculating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando y calculando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Guardar y calcular con IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado de IA */}
            {(goalResult || user?.daily_calories_target) && (
              <div className="bg-gradient-to-br from-primary/10 to-emerald-50 rounded-2xl border border-primary/20 p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Tu plan nutricional personalizado
                </h3>

                {/* Macros */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Calorías", value: `${(goalResult?.daily_calories_target ?? user?.daily_calories_target ?? 0).toFixed(0)}`, unit: "kcal/día", color: "text-orange-600" },
                    { label: "Proteínas", value: goalResult ? goalResult.protein_g.toFixed(0) : "—", unit: "g", color: "text-blue-600" },
                    { label: "Carbohidratos", value: goalResult ? goalResult.carbs_g.toFixed(0) : "—", unit: "g", color: "text-amber-600" },
                    { label: "Grasas", value: goalResult ? goalResult.fat_g.toFixed(0) : "—", unit: "g", color: "text-purple-600" },
                  ].map((m) => (
                    <div key={m.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                      <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-400">{m.unit}</p>
                      <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {(goalResult?.summary || user?.goal_summary) && (
                  <p className="text-sm text-gray-700 bg-white/60 rounded-xl px-4 py-3 leading-relaxed">
                    {goalResult?.summary || user?.goal_summary}
                  </p>
                )}

                {/* Recommendations */}
                {goalResult?.recommendations && goalResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recomendaciones</p>
                    {goalResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Seguridad ── */}
        {tab === "seguridad" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Cambiar contraseña</h2>
              <p className="text-sm text-gray-400">Usá una contraseña de al menos 6 caracteres.</p>
            </div>

            <div className="space-y-4">
              {[
                { key: "current_password", label: "Contraseña actual", placeholder: "••••••••" },
                { key: "new_password", label: "Nueva contraseña", placeholder: "••••••••" },
                { key: "confirm_password", label: "Confirmar nueva contraseña", placeholder: "••••••••" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type="password"
                    value={passwordForm[key as keyof typeof passwordForm]}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Cambiar contraseña
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
