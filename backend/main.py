import logging
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, col, func, select

from ai_service import nutritionist_ai
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
)
from database import create_db_and_tables, get_session
from models import (
    DailyStats,
    FitnessStats,
    GoalCalculationRequest,
    GoalCalculationResult,
    Meal,
    MealCreate,
    MealRead,
    MealUpdate,
    MealSource,
    PasswordChange,
    MealPlan,
    MealPlanCreate,
    MealPlanManualCreate,
    MealPlanRead,
    MealPlanUpdate,
    Routine,
    RoutineCreate,
    RoutineManualCreate,
    RoutineRead,
    RoutineUpdate,
    Token,
    User,
    UserCreate,
    UserProfileUpdate,
    UserRead,
    WeightEntry,
    WeightEntryCreate,
    WeightEntryRead,
    WorkoutCreate,
    WorkoutRead,
    WorkoutSession,
    WorkoutUpdate,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NutriTrack IA API",
    description="API para gestión nutricional inteligente con soporte de WhatsApp",
    version="1.0.0",
)

_ALLOWED_ORIGINS = [
    # Producción con dominio
    "https://simplenamed.com",
    "https://www.simplenamed.com",
    # Servidor por IP
    "http://34.29.59.97:3010",
    "http://34.29.59.97",
    # Desarrollo local
    "http://localhost:3000",
    "http://localhost:3010",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    logger.info("Base de datos inicializada correctamente.")


# ─── Auth ────────────────────────────────────────────────────────────────────


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado.")
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=hash_password(user_in.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.post("/auth/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer")


@app.get("/auth/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Profile ─────────────────────────────────────────────────────────────────


@app.patch("/profile", response_model=UserRead)
def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@app.post("/profile/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from auth import verify_password, hash_password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
    current_user.password_hash = hash_password(data.new_password)
    session.add(current_user)
    session.commit()


@app.post("/profile/calculate-goal", response_model=GoalCalculationResult)
async def calculate_goal(
    data: GoalCalculationRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    result = await nutritionist_ai.calculate_goal(
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        age=data.age,
        gender=data.gender,
        activity_level=data.activity_level,
        fitness_goal=data.fitness_goal,
    )
    if not result:
        raise HTTPException(status_code=422, detail="No se pudo calcular el objetivo.")

    current_user.height_cm = data.height_cm
    current_user.weight_kg = data.weight_kg
    current_user.age = data.age
    current_user.gender = data.gender
    current_user.activity_level = data.activity_level
    current_user.fitness_goal = data.fitness_goal
    current_user.daily_calories_target = result.daily_calories_target
    current_user.goal_summary = result.summary
    session.add(current_user)
    session.commit()

    return result


# ─── Meals ───────────────────────────────────────────────────────────────────


@app.get("/meals", response_model=list[MealRead])
def list_meals(
    limit: int = 50,
    offset: int = 0,
    since: Optional[date] = None,
    until: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(Meal).where(Meal.user_id == current_user.id)
    if since:
        since_dt = datetime.combine(since, datetime.min.time())
        query = query.where(col(Meal.created_at) >= since_dt)
    if until:
        until_dt = datetime.combine(until + timedelta(days=1), datetime.min.time())
        query = query.where(col(Meal.created_at) < until_dt)
    query = query.order_by(col(Meal.created_at).desc()).offset(offset).limit(limit)
    return session.exec(query).all()


@app.post("/meals", response_model=MealRead, status_code=status.HTTP_201_CREATED)
def create_meal(
    meal_in: MealCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    data = meal_in.model_dump(exclude={"recorded_at"})
    meal = Meal(**data, user_id=current_user.id)
    if meal_in.recorded_at:
        meal.created_at = meal_in.recorded_at
    session.add(meal)
    session.commit()
    session.refresh(meal)
    return meal


@app.post("/meals/ai", response_model=MealRead, status_code=status.HTTP_201_CREATED)
async def create_meal_ai(
    request: Request,
    source: MealSource = MealSource.CHATBOT,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    body = await request.json()
    raw_text = body.get("text", "")
    recorded_at_str = body.get("recorded_at")
    if not raw_text:
        raise HTTPException(status_code=400, detail="El campo 'text' es requerido.")

    result = await nutritionist_ai.analyze_meal(raw_text)
    if not result:
        raise HTTPException(status_code=422, detail="No se pudo analizar el alimento.")

    meal = Meal(
        user_id=current_user.id,
        description=result["description"],
        calories=result["calories"],
        category=result["category"],
        source=source,
        raw_text=raw_text,
    )
    if recorded_at_str:
        try:
            meal.created_at = datetime.fromisoformat(recorded_at_str)
        except ValueError:
            pass
    session.add(meal)
    session.commit()
    session.refresh(meal)
    return meal


@app.patch("/meals/{meal_id}", response_model=MealRead)
def update_meal(
    meal_id: int,
    meal_in: MealUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    meal = session.get(Meal, meal_id)
    if not meal or meal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Comida no encontrada.")
    data = meal_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(meal, field, value)
    session.add(meal)
    session.commit()
    session.refresh(meal)
    return meal


@app.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    meal = session.get(Meal, meal_id)
    if not meal or meal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Comida no encontrada.")
    session.delete(meal)
    session.commit()


# ─── Stats ───────────────────────────────────────────────────────────────────


@app.get("/stats/daily", response_model=DailyStats)
def daily_stats(
    target_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    target = target_date or date.today()
    start = datetime.combine(target, datetime.min.time())
    end = start + timedelta(days=1)

    meals = session.exec(
        select(Meal).where(
            Meal.user_id == current_user.id,
            col(Meal.created_at) >= start,
            col(Meal.created_at) < end,
        )
    ).all()

    total_calories = sum(m.calories for m in meals)
    breakdown: dict[str, float] = {}
    for meal in meals:
        breakdown[meal.category] = breakdown.get(meal.category, 0) + meal.calories

    return DailyStats(
        date=target.isoformat(),
        total_calories=total_calories,
        meal_count=len(meals),
        breakdown=breakdown,
    )


@app.get("/stats/weekly")
def weekly_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    start = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    meals = session.exec(
        select(Meal).where(
            Meal.user_id == current_user.id,
            col(Meal.created_at) >= start,
        )
    ).all()

    daily: dict[str, float] = {}
    for meal in meals:
        day = meal.created_at.date().isoformat()
        daily[day] = daily.get(day, 0) + meal.calories

    return {"weekly_data": daily}


@app.get("/stats/monthly")
def monthly_nutrition_stats(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import calendar as cal_module
    first_day = date(year, month, 1)
    last_day = date(year, month, cal_module.monthrange(year, month)[1])
    start = datetime.combine(first_day, datetime.min.time())
    end = datetime.combine(last_day + timedelta(days=1), datetime.min.time())

    meals = session.exec(
        select(Meal).where(
            Meal.user_id == current_user.id,
            col(Meal.created_at) >= start,
            col(Meal.created_at) < end,
        )
    ).all()

    daily: dict[str, dict] = {}
    category_totals: dict[str, float] = {}
    for meal in meals:
        day = meal.created_at.date().isoformat()
        if day not in daily:
            daily[day] = {"date": day, "calories": 0.0, "meal_count": 0}
        daily[day]["calories"] += meal.calories
        daily[day]["meal_count"] += 1
        category_totals[meal.category] = category_totals.get(meal.category, 0) + meal.calories

    total_calories = sum(d["calories"] for d in daily.values())
    total_meals = sum(d["meal_count"] for d in daily.values())
    days_with_data = len(daily)

    return {
        "year": year,
        "month": month,
        "total_calories": total_calories,
        "total_meals": total_meals,
        "days_with_data": days_with_data,
        "avg_daily_calories": total_calories / days_with_data if days_with_data else 0,
        "category_breakdown": category_totals,
        "daily_data": sorted(daily.values(), key=lambda x: x["date"]),
    }


# ─── Workouts ────────────────────────────────────────────────────────────────


@app.get("/workouts", response_model=list[WorkoutRead])
def list_workouts(
    limit: int = 50,
    offset: int = 0,
    since: Optional[date] = None,
    until: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(WorkoutSession).where(WorkoutSession.user_id == current_user.id)
    if since:
        since_dt = datetime.combine(since, datetime.min.time())
        query = query.where(col(WorkoutSession.created_at) >= since_dt)
    if until:
        until_dt = datetime.combine(until + timedelta(days=1), datetime.min.time())
        query = query.where(col(WorkoutSession.created_at) < until_dt)
    query = query.order_by(col(WorkoutSession.created_at).desc()).offset(offset).limit(limit)
    return session.exec(query).all()


@app.post("/workouts", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_in: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    data = workout_in.model_dump(exclude={"recorded_at"})
    workout = WorkoutSession(**data, user_id=current_user.id)
    if workout_in.recorded_at:
        workout.created_at = workout_in.recorded_at
    session.add(workout)
    session.commit()
    session.refresh(workout)
    return workout


@app.post("/workouts/ai", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
async def create_workout_ai(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import json as _json
    body = await request.json()
    raw_text = body.get("text", "")
    recorded_at_str = body.get("recorded_at")
    if not raw_text:
        raise HTTPException(status_code=400, detail="El campo 'text' es requerido.")

    weight = current_user.weight_kg or 75.0
    result = await nutritionist_ai.analyze_workout(raw_text, weight_kg=weight)
    if not result:
        raise HTTPException(status_code=422, detail="No se pudo analizar el entrenamiento.")

    workout = WorkoutSession(
        user_id=current_user.id,
        workout_type=result.get("workout_type", "Otro"),
        duration_minutes=result.get("duration_minutes", 0),
        calories_burned=result.get("calories_burned", 0),
        notes=result.get("notes"),
        details_json=_json.dumps(result.get("details", {}), ensure_ascii=False),
    )
    if recorded_at_str:
        try:
            workout.created_at = datetime.fromisoformat(recorded_at_str)
        except ValueError:
            pass
    session.add(workout)
    session.commit()
    session.refresh(workout)
    return workout


@app.patch("/workouts/{workout_id}", response_model=WorkoutRead)
def update_workout(
    workout_id: int,
    workout_in: WorkoutUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    workout = session.get(WorkoutSession, workout_id)
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entrenamiento no encontrado.")
    data = workout_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(workout, field, value)
    session.add(workout)
    session.commit()
    session.refresh(workout)
    return workout


@app.delete("/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    workout = session.get(WorkoutSession, workout_id)
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entrenamiento no encontrado.")
    session.delete(workout)
    session.commit()


@app.get("/stats/fitness/daily", response_model=FitnessStats)
def fitness_daily_stats(
    target_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    target = target_date or date.today()
    start = datetime.combine(target, datetime.min.time())
    end = start + timedelta(days=1)

    workouts = session.exec(
        select(WorkoutSession).where(
            WorkoutSession.user_id == current_user.id,
            col(WorkoutSession.created_at) >= start,
            col(WorkoutSession.created_at) < end,
        )
    ).all()

    total_calories = sum(w.calories_burned for w in workouts)
    total_duration = sum(w.duration_minutes for w in workouts)
    breakdown: dict[str, float] = {}
    for w in workouts:
        breakdown[w.workout_type] = breakdown.get(w.workout_type, 0) + w.calories_burned

    return FitnessStats(
        date=target.isoformat(),
        total_calories_burned=total_calories,
        workout_count=len(workouts),
        total_duration_minutes=total_duration,
        breakdown=breakdown,
    )


@app.get("/stats/fitness/monthly")
def monthly_fitness_stats(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import calendar as cal_module
    first_day = date(year, month, 1)
    last_day = date(year, month, cal_module.monthrange(year, month)[1])
    start = datetime.combine(first_day, datetime.min.time())
    end = datetime.combine(last_day + timedelta(days=1), datetime.min.time())

    workouts = session.exec(
        select(WorkoutSession).where(
            WorkoutSession.user_id == current_user.id,
            col(WorkoutSession.created_at) >= start,
            col(WorkoutSession.created_at) < end,
        )
    ).all()

    daily: dict[str, dict] = {}
    type_totals: dict[str, float] = {}
    for w in workouts:
        day = w.created_at.date().isoformat()
        if day not in daily:
            daily[day] = {"date": day, "calories_burned": 0.0, "workout_count": 0, "duration_minutes": 0}
        daily[day]["calories_burned"] += w.calories_burned
        daily[day]["workout_count"] += 1
        daily[day]["duration_minutes"] += w.duration_minutes
        type_totals[w.workout_type] = type_totals.get(w.workout_type, 0) + w.calories_burned

    total_calories = sum(d["calories_burned"] for d in daily.values())
    total_workouts = sum(d["workout_count"] for d in daily.values())
    total_duration = sum(d["duration_minutes"] for d in daily.values())
    days_active = len(daily)

    return {
        "year": year,
        "month": month,
        "total_calories_burned": total_calories,
        "total_workouts": total_workouts,
        "total_duration_minutes": total_duration,
        "days_active": days_active,
        "avg_daily_calories_burned": total_calories / days_active if days_active else 0,
        "type_breakdown": type_totals,
        "daily_data": sorted(daily.values(), key=lambda x: x["date"]),
    }


@app.get("/stats/fitness/weekly")
def fitness_weekly_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    start = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    workouts = session.exec(
        select(WorkoutSession).where(
            WorkoutSession.user_id == current_user.id,
            col(WorkoutSession.created_at) >= start,
        )
    ).all()

    daily: dict[str, float] = {}
    for w in workouts:
        day = w.created_at.date().isoformat()
        daily[day] = daily.get(day, 0) + w.calories_burned

    return {"weekly_data": daily}


# ─── Weight tracking ─────────────────────────────────────────────────────────


@app.post("/weight", response_model=WeightEntryRead, status_code=status.HTTP_201_CREATED)
def log_weight(
    entry_in: WeightEntryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    entry = WeightEntry(
        user_id=current_user.id,
        weight_kg=entry_in.weight_kg,
        notes=entry_in.notes,
        recorded_at=entry_in.recorded_at or date.today(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@app.get("/weight", response_model=list[WeightEntryRead])
def list_weight(
    months: int = 12,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    since = date.today() - timedelta(days=months * 31)
    entries = session.exec(
        select(WeightEntry)
        .where(
            WeightEntry.user_id == current_user.id,
            col(WeightEntry.recorded_at) >= since,
        )
        .order_by(col(WeightEntry.recorded_at).asc())
    ).all()
    return entries


@app.delete("/weight/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    entry = session.get(WeightEntry, entry_id)
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Registro de peso no encontrado.")
    session.delete(entry)
    session.commit()


# ─── Rutinas ─────────────────────────────────────────────────────────────────


@app.post("/routines/ai", response_model=RoutineRead, status_code=status.HTTP_201_CREATED)
async def create_routine_ai(
    routine_in: RoutineCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import json as _json
    result = await nutritionist_ai.generate_routine(
        goal=routine_in.goal,
        duration_weeks=routine_in.duration_weeks,
        days_per_week=routine_in.days_per_week,
        fitness_level=routine_in.fitness_level,
        equipment=routine_in.equipment,
        weight_kg=current_user.weight_kg or 75.0,
        height_cm=current_user.height_cm or 170.0,
        age=current_user.age or 30,
        gender=current_user.gender or "Masculino",
        extra_notes=routine_in.extra_notes or "",
    )
    if not result:
        raise HTTPException(status_code=422, detail="No se pudo generar la rutina. Intenta de nuevo.")

    routine = Routine(
        user_id=current_user.id,
        name=result.get("name", f"Rutina de {routine_in.goal}"),
        goal=routine_in.goal,
        description=result.get("description"),
        duration_weeks=routine_in.duration_weeks,
        days_per_week=routine_in.days_per_week,
        fitness_level=routine_in.fitness_level,
        equipment=routine_in.equipment,
        content_json=_json.dumps(result, ensure_ascii=False),
    )
    session.add(routine)
    session.commit()
    session.refresh(routine)
    return routine


@app.post("/routines", response_model=RoutineRead, status_code=status.HTTP_201_CREATED)
def create_routine_manual(
    routine_in: RoutineManualCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    routine = Routine(
        user_id=current_user.id,
        name=routine_in.name,
        goal=routine_in.goal,
        description=routine_in.description,
        duration_weeks=routine_in.duration_weeks,
        days_per_week=routine_in.days_per_week,
        fitness_level=routine_in.fitness_level,
        equipment=routine_in.equipment,
        content_json=routine_in.content_json,
    )
    session.add(routine)
    session.commit()
    session.refresh(routine)
    return routine


@app.get("/routines", response_model=list[RoutineRead])
def get_routines(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Routine)
        .where(Routine.user_id == current_user.id)
        .order_by(col(Routine.created_at).desc())
    ).all()


@app.get("/routines/{routine_id}", response_model=RoutineRead)
def get_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    routine = session.get(Routine, routine_id)
    if not routine or routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
    return routine


@app.patch("/routines/{routine_id}", response_model=RoutineRead)
def update_routine(
    routine_id: int,
    routine_in: RoutineUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    routine = session.get(Routine, routine_id)
    if not routine or routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
    data = routine_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(routine, field, value)
    session.add(routine)
    session.commit()
    session.refresh(routine)
    return routine


@app.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(
    routine_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    routine = session.get(Routine, routine_id)
    if not routine or routine.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Rutina no encontrada.")
    session.delete(routine)
    session.commit()


# ─── Planes de Alimentación ───────────────────────────────────────────────────


@app.post("/meal-plans/ai", response_model=MealPlanRead, status_code=status.HTTP_201_CREATED)
async def create_meal_plan_ai(
    plan_in: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    import json as _json
    result = await nutritionist_ai.generate_meal_plan(
        goal=plan_in.goal,
        days=plan_in.days,
        calorie_target=plan_in.calorie_target,
        dietary_restrictions=plan_in.dietary_restrictions,
        weight_kg=current_user.weight_kg or 75.0,
        height_cm=current_user.height_cm or 170.0,
        age=current_user.age or 30,
        gender=current_user.gender or "Masculino",
        activity_level=current_user.activity_level or "Moderado",
        extra_notes=plan_in.extra_notes or "",
    )
    if not result:
        raise HTTPException(status_code=422, detail="No se pudo generar el plan. Intenta de nuevo.")

    plan = MealPlan(
        user_id=current_user.id,
        name=result.get("name", f"Plan de {plan_in.goal}"),
        goal=plan_in.goal,
        description=result.get("description"),
        days=plan_in.days,
        calorie_target=plan_in.calorie_target or result.get("daily_calories"),
        dietary_restrictions=plan_in.dietary_restrictions,
        content_json=_json.dumps(result, ensure_ascii=False),
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@app.post("/meal-plans", response_model=MealPlanRead, status_code=status.HTTP_201_CREATED)
def create_meal_plan_manual(
    plan_in: MealPlanManualCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = MealPlan(
        user_id=current_user.id,
        name=plan_in.name,
        goal=plan_in.goal,
        description=plan_in.description,
        days=plan_in.days,
        calorie_target=plan_in.calorie_target,
        dietary_restrictions=plan_in.dietary_restrictions,
        content_json=plan_in.content_json,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@app.get("/meal-plans", response_model=list[MealPlanRead])
def get_meal_plans(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(MealPlan)
        .where(MealPlan.user_id == current_user.id)
        .order_by(col(MealPlan.created_at).desc())
    ).all()


@app.patch("/meal-plans/{plan_id}", response_model=MealPlanRead)
def update_meal_plan(
    plan_id: int,
    plan_in: MealPlanUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(MealPlan, plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan no encontrado.")
    data = plan_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(plan, field, value)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@app.delete("/meal-plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    plan = session.get(MealPlan, plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan no encontrado.")
    session.delete(plan)
    session.commit()


# ─── Chat ────────────────────────────────────────────────────────────────────


@app.post("/chat")
async def chat(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    body = await request.json()
    message = body.get("message", "")
    history = body.get("history", [])

    if not message:
        raise HTTPException(status_code=400, detail="El campo 'message' es requerido.")

    response = await nutritionist_ai.chat_response(message, history)
    return {"response": response}


