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
    Token,
    User,
    UserCreate,
    UserProfileUpdate,
    UserRead,
    WorkoutCreate,
    WorkoutRead,
    WorkoutSession,
    WorkoutUpdate,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NutriTrack AI API",
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
    meal = Meal(**meal_in.model_dump(), user_id=current_user.id)
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
    workout = WorkoutSession(**workout_in.model_dump(), user_id=current_user.id)
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


