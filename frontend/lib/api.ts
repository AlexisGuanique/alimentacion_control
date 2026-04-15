const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Meal {
  id: number;
  description: string;
  calories: number;
  category: string;
  source: string;
  raw_text: string | null;
  created_at: string;
  user_id: string;
}

export interface DailyStats {
  date: string;
  total_calories: number;
  meal_count: number;
  breakdown: Record<string, number>;
}

export interface WeeklyData {
  weekly_data: Record<string, number>;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  fitness_goal: string | null;
  daily_calories_target: number | null;
  goal_summary: string | null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nutritrack_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email: string, password: string): Promise<string> {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!res.ok) throw new Error("Credenciales inválidas");
  const data = await res.json();
  return data.access_token;
}

export async function register(payload: {
  email: string;
  password: string;
  full_name: string;
}): Promise<User> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Error al registrarse");
  }
  return res.json();
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("No autenticado");
  return res.json();
}

export async function getMeals(since?: string, until?: string): Promise<Meal[]> {
  const p = new URLSearchParams();
  if (since) p.set("since", since);
  if (until) p.set("until", until);
  const qs = p.toString() ? `?${p}` : "";
  const res = await fetch(`${API_URL}/meals${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener comidas");
  return res.json();
}

export async function createMealManual(meal: {
  description: string;
  calories: number;
  category: string;
  source?: string;
  recorded_at?: string;
}): Promise<Meal> {
  const res = await fetch(`${API_URL}/meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ...meal, source: meal.source || "Manual" }),
  });
  if (!res.ok) throw new Error("Error al crear comida");
  return res.json();
}

export async function createMealAI(text: string, recorded_at?: string): Promise<Meal> {
  const res = await fetch(`${API_URL}/meals/ai?source=Chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text, ...(recorded_at ? { recorded_at } : {}) }),
  });
  if (!res.ok) throw new Error("Error al analizar alimento");
  return res.json();
}

export async function updateMeal(id: number, data: { description?: string; calories?: number; category?: string }): Promise<Meal> {
  const res = await fetch(`${API_URL}/meals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar comida");
  return res.json();
}

export async function deleteMeal(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/meals/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar comida");
}

export async function getDailyStats(date?: string): Promise<DailyStats> {
  const params = date ? `?target_date=${date}` : "";
  const res = await fetch(`${API_URL}/stats/daily${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener estadísticas");
  return res.json();
}

export async function getWeeklyStats(): Promise<WeeklyData> {
  const res = await fetch(`${API_URL}/stats/weekly`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener estadísticas semanales");
  return res.json();
}

export async function chat(
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Error en el chat");
  const data = await res.json();
  return data.response;
}

export interface Workout {
  id: number;
  user_id: string;
  workout_type: string;
  duration_minutes: number;
  calories_burned: number;
  notes: string | null;
  details_json: string | null;
  created_at: string;
}

export interface FitnessStats {
  date: string;
  total_calories_burned: number;
  workout_count: number;
  total_duration_minutes: number;
  breakdown: Record<string, number>;
}

export async function getWorkouts(since?: string, until?: string): Promise<Workout[]> {
  const p = new URLSearchParams();
  if (since) p.set("since", since);
  if (until) p.set("until", until);
  const qs = p.toString() ? `?${p}` : "";
  const res = await fetch(`${API_URL}/workouts${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener entrenamientos");
  return res.json();
}

export async function createWorkout(data: {
  workout_type: string;
  duration_minutes: number;
  calories_burned: number;
  notes?: string;
  details_json?: string;
  recorded_at?: string;
}): Promise<Workout> {
  const res = await fetch(`${API_URL}/workouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al registrar entrenamiento");
  return res.json();
}

export async function updateWorkout(id: number, data: { workout_type?: string; duration_minutes?: number; calories_burned?: number; notes?: string; details_json?: string }): Promise<Workout> {
  const res = await fetch(`${API_URL}/workouts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar entrenamiento");
  return res.json();
}

export async function deleteWorkout(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/workouts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar entrenamiento");
}

export async function getFitnessDaily(date?: string): Promise<FitnessStats> {
  const params = date ? `?target_date=${date}` : "";
  const res = await fetch(`${API_URL}/stats/fitness/daily${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener stats de fitness");
  return res.json();
}

export async function getFitnessWeekly(): Promise<{ weekly_data: Record<string, number> }> {
  const res = await fetch(`${API_URL}/stats/fitness/weekly`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener stats semanales de fitness");
  return res.json();
}

export interface MonthlyNutritionStats {
  year: number;
  month: number;
  total_calories: number;
  total_meals: number;
  days_with_data: number;
  avg_daily_calories: number;
  category_breakdown: Record<string, number>;
  daily_data: { date: string; calories: number; meal_count: number }[];
}

export interface MonthlyFitnessStats {
  year: number;
  month: number;
  total_calories_burned: number;
  total_workouts: number;
  total_duration_minutes: number;
  days_active: number;
  avg_daily_calories_burned: number;
  type_breakdown: Record<string, number>;
  daily_data: { date: string; calories_burned: number; workout_count: number; duration_minutes: number }[];
}

export async function getMonthlyNutritionStats(year: number, month: number): Promise<MonthlyNutritionStats> {
  const res = await fetch(`${API_URL}/stats/monthly?year=${year}&month=${month}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener stats mensuales de nutrición");
  return res.json();
}

export async function getMonthlyFitnessStats(year: number, month: number): Promise<MonthlyFitnessStats> {
  const res = await fetch(`${API_URL}/stats/fitness/monthly?year=${year}&month=${month}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener stats mensuales de fitness");
  return res.json();
}

export interface GoalResult {
  daily_calories_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  summary: string;
  recommendations: string[];
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const res = await fetch(`${API_URL}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar perfil");
  return res.json();
}

export async function changePassword(
  current_password: string,
  new_password: string
): Promise<void> {
  const res = await fetch(`${API_URL}/profile/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Error al cambiar contraseña");
  }
}

export interface WeightEntry {
  id: number;
  user_id: string;
  weight_kg: number;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export async function getWeightHistory(months = 12): Promise<WeightEntry[]> {
  const res = await fetch(`${API_URL}/weight?months=${months}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al obtener historial de peso");
  return res.json();
}

export async function logWeight(data: {
  weight_kg: number;
  notes?: string;
  recorded_at?: string;
}): Promise<WeightEntry> {
  const res = await fetch(`${API_URL}/weight`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al registrar peso");
  return res.json();
}

export async function deleteWeightEntry(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/weight/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar registro de peso");
}

export async function calculateGoal(data: {
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: string;
  activity_level: string;
  fitness_goal: string;
}): Promise<GoalResult> {
  const res = await fetch(`${API_URL}/profile/calculate-goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al calcular objetivo");
  return res.json();
}

// ─── Rutinas ──────────────────────────────────────────────────────────────────

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: string;
  weight_suggestion: string;
  rest_seconds: number;
  intensity: string;
  technique_tip: string;
  muscle_group: string;
}

export interface RoutineDay {
  day_number: number;
  day_name: string;
  focus: string;
  warmup: string;
  exercises: RoutineExercise[];
  cooldown: string;
}

export interface RoutineContent {
  name: string;
  description: string;
  days: RoutineDay[];
  progression_notes: string;
  nutrition_tips: string;
  rest_days: string;
}

export interface Routine {
  id: number;
  user_id: string;
  name: string;
  goal: string;
  description: string | null;
  duration_weeks: number;
  days_per_week: number;
  fitness_level: string;
  equipment: string;
  content_json: string;
  created_at: string;
}

export interface RoutineCreateRequest {
  goal: string;
  duration_weeks: number;
  days_per_week: number;
  fitness_level: string;
  equipment: string;
  extra_notes?: string;
}

export async function generateRoutine(data: RoutineCreateRequest): Promise<Routine> {
  const res = await fetch(`${API_URL}/routines/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al generar rutina");
  return res.json();
}

export async function getRoutines(): Promise<Routine[]> {
  const res = await fetch(`${API_URL}/routines`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al obtener rutinas");
  return res.json();
}

export async function deleteRoutine(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/routines/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar rutina");
}
