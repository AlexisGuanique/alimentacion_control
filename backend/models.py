from datetime import datetime
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
    is_active: bool = Field(default=True)
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
    pass


class MealRead(MealBase):
    id: int
    user_id: str
    created_at: datetime


class DailyStats(SQLModel):
    date: str
    total_calories: float
    meal_count: int
    breakdown: dict


class Token(SQLModel):
    access_token: str
    token_type: str


class TokenData(SQLModel):
    user_id: Optional[str] = None
