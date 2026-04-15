from datetime import date, datetime
from enum import Enum
from typing import Optional
import uuid

from sqlmodel import Field, SQLModel


class FoodCategory(str, Enum):
    PROTEINA = "Proteína"
    CARBOHIDRATO = "Carbohidrato"
    GRASA = "Grasa"
    VERDURA = "Verdura"
    FRUTA = "Fruta"
    LACTEO = "Lácteo"
    BEBIDA = "Bebida"
    SNACK = "Snack"
    OTRO = "Otro"


class MealSource(str, Enum):
    MANUAL = "Manual"
    CHATBOT = "Chatbot"


class FitnessGoal(str, Enum):
    PERDIDA_GRASA = "Pérdida de grasa"
    AUMENTO_MUSCULAR = "Aumento muscular"
    MANTENIMIENTO = "Mantenimiento"
    DEFINICION = "Definición"
    SALUD_GENERAL = "Salud general"


class ActivityLevel(str, Enum):
    SEDENTARIO = "Sedentario"
    LIGERO = "Ligero"
    MODERADO = "Moderado"
    ACTIVO = "Activo"
    MUY_ACTIVO = "Muy activo"


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: str


class User(UserBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    password_hash: str
    is_active: bool = Field(default=False)  # requiere aprobación del admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Perfil físico
    height_cm: Optional[float] = Field(default=None)
    weight_kg: Optional[float] = Field(default=None)
    age: Optional[int] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    activity_level: Optional[str] = Field(default=None)
    # Objetivo
    fitness_goal: Optional[str] = Field(default=None)
    daily_calories_target: Optional[float] = Field(default=None)
    goal_summary: Optional[str] = Field(default=None)


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    fitness_goal: Optional[str] = None
    daily_calories_target: Optional[float] = None
    goal_summary: Optional[str] = None


class UserProfileUpdate(SQLModel):
    full_name: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    fitness_goal: Optional[str] = None
    daily_calories_target: Optional[float] = None
    goal_summary: Optional[str] = None


class PasswordChange(SQLModel):
    current_password: str
    new_password: str


class GoalCalculationRequest(SQLModel):
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: str
    fitness_goal: str


class GoalCalculationResult(SQLModel):
    daily_calories_target: float
    protein_g: float
    carbs_g: float
    fat_g: float
    summary: str
    recommendations: list[str]


class WorkoutType(str, Enum):
    CARDIO = "Cardio"
    FUERZA = "Fuerza"
    HIIT = "HIIT"
    FLEXIBILIDAD = "Flexibilidad"
    DEPORTE = "Deporte"
    CAMINATA = "Caminata"
    NATACION = "Natación"
    CICLISMO = "Ciclismo"
    OTRO = "Otro"


class WorkoutSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    workout_type: WorkoutType
    duration_minutes: int
    calories_burned: float
    notes: Optional[str] = Field(default=None)
    details_json: Optional[str] = Field(default=None)  # JSON string con datos específicos del deporte
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkoutCreate(SQLModel):
    workout_type: WorkoutType
    duration_minutes: int
    calories_burned: float
    notes: Optional[str] = None
    details_json: Optional[str] = None
    recorded_at: Optional[datetime] = None  # si se provee, se usa como created_at


class WorkoutUpdate(SQLModel):
    workout_type: Optional[WorkoutType] = None
    duration_minutes: Optional[int] = None
    calories_burned: Optional[float] = None
    notes: Optional[str] = None
    details_json: Optional[str] = None


class WorkoutRead(SQLModel):
    id: int
    user_id: str
    workout_type: WorkoutType
    duration_minutes: int
    calories_burned: float
    notes: Optional[str]
    details_json: Optional[str]
    created_at: datetime


class FitnessStats(SQLModel):
    date: str
    total_calories_burned: float
    workout_count: int
    total_duration_minutes: int
    breakdown: dict


class MealBase(SQLModel):
    description: str
    calories: float
    category: FoodCategory
    source: MealSource = MealSource.MANUAL
    raw_text: Optional[str] = None


class Meal(MealBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MealCreate(MealBase):
    recorded_at: Optional[datetime] = None  # si se provee, se usa como created_at


class MealUpdate(SQLModel):
    description: Optional[str] = None
    calories: Optional[float] = None
    category: Optional[FoodCategory] = None


class MealRead(MealBase):
    id: int
    user_id: str
    created_at: datetime


class DailyStats(SQLModel):
    date: str
    total_calories: float
    meal_count: int
    breakdown: dict


class WeightEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    weight_kg: float
    notes: Optional[str] = Field(default=None)
    recorded_at: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WeightEntryCreate(SQLModel):
    weight_kg: float
    notes: Optional[str] = None
    recorded_at: Optional[date] = None


class WeightEntryRead(SQLModel):
    id: int
    user_id: str
    weight_kg: float
    notes: Optional[str]
    recorded_at: date
    created_at: datetime


class Routine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    goal: str
    description: Optional[str] = Field(default=None)
    duration_weeks: int = Field(default=4)
    days_per_week: int = Field(default=3)
    fitness_level: str = Field(default="Intermedio")
    equipment: str = Field(default="Gimnasio completo")
    content_json: str  # Rutina completa serializada como JSON
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RoutineCreate(SQLModel):
    goal: str
    duration_weeks: int = 8
    days_per_week: int = 4
    fitness_level: str = "Intermedio"
    equipment: str = "Gimnasio completo"
    extra_notes: Optional[str] = None


class RoutineRead(SQLModel):
    id: int
    user_id: str
    name: str
    goal: str
    description: Optional[str]
    duration_weeks: int
    days_per_week: int
    fitness_level: str
    equipment: str
    content_json: str
    created_at: datetime


class RoutineManualCreate(SQLModel):
    name: str
    goal: str
    description: Optional[str] = None
    duration_weeks: int = 4
    days_per_week: int = 3
    fitness_level: str = "Intermedio"
    equipment: str = "Gimnasio completo"
    content_json: str


class RoutineUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content_json: Optional[str] = None


class MealPlan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    goal: str
    description: Optional[str] = Field(default=None)
    days: int = Field(default=7)
    calorie_target: Optional[float] = Field(default=None)
    dietary_restrictions: str = Field(default="Ninguna")
    content_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MealPlanCreate(SQLModel):
    goal: str
    days: int = 7
    calorie_target: Optional[float] = None
    dietary_restrictions: str = "Ninguna"
    extra_notes: Optional[str] = None


class MealPlanRead(SQLModel):
    id: int
    user_id: str
    name: str
    goal: str
    description: Optional[str]
    days: int
    calorie_target: Optional[float]
    dietary_restrictions: str
    content_json: str
    created_at: datetime


class MealPlanManualCreate(SQLModel):
    name: str
    goal: str
    days: int = 7
    calorie_target: Optional[float] = None
    dietary_restrictions: str = "Ninguna"
    description: Optional[str] = None
    content_json: str


class MealPlanUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content_json: Optional[str] = None


class Token(SQLModel):
    access_token: str
    token_type: str


class TokenData(SQLModel):
    user_id: Optional[str] = None
