import json
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

from models import FoodCategory, GoalCalculationResult

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"

MEAL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """Eres un nutricionista experto y asistente de salud.
Tu tarea es analizar descripciones de alimentos en lenguaje natural (pueden ser informales, en español o con errores) y devolver información nutricional precisa.

INSTRUCCIONES:
1. Extrae el alimento o comida mencionada.
2. Estima las calorías basándote en porciones estándar si el usuario no especifica cantidad.
3. Clasifica el alimento en una de estas categorías: Proteína, Carbohidrato, Grasa, Verdura, Fruta, Lácteo, Bebida, Snack, Otro.
4. Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{{"description": "nombre del alimento normalizado", "calories": 350.0, "category": "Proteína"}}

EJEMPLOS:
- "me comí una milanesa con puré" → {{"description": "Milanesa con puré de papas", "calories": 620, "category": "Proteína"}}
- "un café con leche y medialunas" → {{"description": "Café con leche y medialunas (2)", "calories": 380, "category": "Carbohidrato"}}
- "ensalada mixta grande" → {{"description": "Ensalada mixta grande", "calories": 120, "category": "Verdura"}}""",
    ),
    ("human", "{texto}"),
])

CHAT_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """Eres NutriBot, un asistente nutricional amigable y experto en nutrición.
Ayudas al usuario a registrar sus comidas y le das consejos de nutrición personalizados.
Si el usuario menciona que comió algo, confirma las calorías aproximadas y anímalo a mantener buenos hábitos.
Responde siempre en español de forma clara, concisa y motivadora.""",
    ),
    ("human", "Historial de conversación:\n{historial}\n\nMensaje actual: {mensaje}"),
])

GOAL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """Eres un nutricionista y entrenador personal experto. Basándote en los datos físicos del usuario, calcula su objetivo calórico diario y macronutrientes.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura (sin texto adicional, sin markdown):
{{
  "daily_calories_target": 2200.0,
  "protein_g": 165.0,
  "carbs_g": 220.0,
  "fat_g": 73.0,
  "summary": "Resumen personalizado de máximo 2 oraciones explicando el plan.",
  "recommendations": ["Consejo 1", "Consejo 2", "Consejo 3"]
}}

Usa la fórmula de Mifflin-St Jeor para calcular el BMR y aplica el factor de actividad correspondiente.
Luego ajusta las calorías según el objetivo:
- Pérdida de grasa: déficit de 300-500 kcal
- Aumento muscular: superávit de 200-300 kcal
- Definición: déficit moderado de 200-300 kcal
- Mantenimiento / Salud general: mantener TDEE""",
    ),
    (
        "human",
        """Datos del usuario:
- Altura: {height_cm} cm
- Peso: {weight_kg} kg
- Edad: {age} años
- Género: {gender}
- Nivel de actividad: {activity_level}
- Objetivo: {fitness_goal}

Calcula su plan nutricional personalizado.""",
    ),
])


WORKOUT_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """Eres un entrenador personal experto. Analiza la descripción de ejercicio del usuario y devuelve datos estructurados.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura (sin texto adicional, sin markdown):
{{
  "workout_type": "Fuerza",
  "duration_minutes": 60,
  "calories_burned": 320.0,
  "notes": "Descripción resumida del entrenamiento",
  "details": {{}}
}}

Tipos válidos: Cardio, Fuerza, HIIT, Flexibilidad, Deporte, Caminata, Natación, Ciclismo, Otro

Para el campo "details" usa la estructura apropiada según el tipo:
- Fuerza: {{"exercises": [{{"name": "Sentadillas", "sets": 4, "reps": 10, "weight_kg": 80}}]}}
- Cardio/Caminata/Ciclismo: {{"distance_km": 10.0, "pace": "5:30 min/km"}}
- Natación: {{"distance_m": 2000, "style": "Libre", "pace": "2:15 min/100m"}}
- HIIT: {{"rounds": 8, "work_seconds": 40, "rest_seconds": 20, "exercises": ["Burpees", "Saltos"]}}
- Deporte: {{"sport": "Fútbol", "description": "Partido de 90 minutos"}}
- Otros: {{}}

Para estimar calorías usa MET × peso_kg × horas. Peso del usuario: {weight_kg} kg.
Si no se especifica duración, estímala según la descripción.""",
    ),
    ("human", "Descripción del entrenamiento: {texto}"),
])


def _is_configured() -> bool:
    return bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))


class NutritionistAI:
    def __init__(self) -> None:
        if not _is_configured():
            logger.warning("API key de Gemini no configurada (GOOGLE_API_KEY o GEMINI_API_KEY).")
            self.meal_chain = None
            self.chat_chain = None
            self.goal_chain = None
            self.workout_chain = None
            self.routine_chain = None
            return

        meal_model = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.2)
        chat_model = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.7)
        goal_model = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.3)
        workout_model = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.2)
        routine_model = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.4)

        self.meal_chain = MEAL_PROMPT | meal_model
        self.chat_chain = CHAT_PROMPT | chat_model
        self.goal_chain = GOAL_PROMPT | goal_model
        self.workout_chain = WORKOUT_PROMPT | workout_model
        self.routine_chain = ROUTINE_PROMPT | routine_model

    def _extract_text(self, content) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict):
                    parts.append(block.get("text", ""))
                else:
                    parts.append(str(block))
            return " ".join(parts)
        return str(content)

    def _parse_response(self, content) -> dict:
        response_text = self._extract_text(content)
        cleaned = re.sub(r"```(?:json)?|```", "", response_text).strip()
        data = json.loads(cleaned)
        valid_categories = {c.value for c in FoodCategory}
        if data.get("category") not in valid_categories:
            data["category"] = FoodCategory.OTRO.value
        data["calories"] = float(data.get("calories", 0))
        return data

    async def analyze_meal(self, text: str) -> Optional[dict]:
        if not self.meal_chain:
            return {
                "description": text,
                "calories": 250.0,
                "category": FoodCategory.OTRO.value,
            }
        try:
            response = await self.meal_chain.ainvoke({"texto": text})
            return self._parse_response(response.content)
        except json.JSONDecodeError as exc:
            logger.error("Error al parsear respuesta de IA: %s", exc)
            return None
        except Exception as exc:
            logger.error("Error en analyze_meal: %s", exc)
            return None

    async def chat_response(self, user_message: str, history: list[dict]) -> str:
        if not self.chat_chain:
            return "El servicio de IA no está disponible. Por favor configura GOOGLE_API_KEY."
        try:
            historial_str = ""
            for msg in history[-6:]:
                rol = "Usuario" if msg["role"] == "user" else "Asistente"
                historial_str += f"{rol}: {msg['content']}\n"
            if not historial_str:
                historial_str = "No hay conversación previa."

            response = await self.chat_chain.ainvoke({
                "mensaje": user_message,
                "historial": historial_str,
            })
            return self._extract_text(response.content)
        except Exception as exc:
            logger.error("Error en chat_response: %s", exc)
            return "Lo siento, ocurrió un error. Por favor intenta de nuevo."

    async def calculate_goal(
        self,
        height_cm: float,
        weight_kg: float,
        age: int,
        gender: str,
        activity_level: str,
        fitness_goal: str,
    ) -> Optional[GoalCalculationResult]:
        if not self.goal_chain:
            return None
        try:
            response = await self.goal_chain.ainvoke({
                "height_cm": height_cm,
                "weight_kg": weight_kg,
                "age": age,
                "gender": gender,
                "activity_level": activity_level,
                "fitness_goal": fitness_goal,
            })
            text = self._extract_text(response.content)
            cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
            data = json.loads(cleaned)
            return GoalCalculationResult(**data)
        except Exception as exc:
            logger.error("Error en calculate_goal: %s", exc)
            return None


    async def analyze_workout(self, text: str, weight_kg: float = 75.0) -> Optional[dict]:
        if not self.workout_chain:
            return None
        try:
            response = await self.workout_chain.ainvoke({
                "texto": text,
                "weight_kg": weight_kg,
            })
            raw = self._extract_text(response.content)
            cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
            data = json.loads(cleaned)
            data["calories_burned"] = float(data.get("calories_burned", 0))
            data["duration_minutes"] = int(data.get("duration_minutes", 0))
            return data
        except Exception as exc:
            logger.error("Error en analyze_workout: %s", exc)
            return None


    async def generate_routine(
        self,
        goal: str,
        duration_weeks: int,
        days_per_week: int,
        fitness_level: str,
        equipment: str,
        weight_kg: float = 75.0,
        height_cm: float = 170.0,
        age: int = 30,
        gender: str = "Masculino",
        extra_notes: str = "",
    ) -> Optional[dict]:
        if not self.routine_chain:
            return None
        try:
            response = await self.routine_chain.ainvoke({
                "goal": goal,
                "duration_weeks": duration_weeks,
                "days_per_week": days_per_week,
                "fitness_level": fitness_level,
                "equipment": equipment,
                "weight_kg": weight_kg,
                "height_cm": height_cm,
                "age": age,
                "gender": gender,
                "extra_notes": extra_notes or "Sin notas adicionales",
            })
            raw = self._extract_text(response.content)
            cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
            return json.loads(cleaned)
        except Exception as exc:
            logger.error("Error en generate_routine: %s", exc)
            return None


ROUTINE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """Eres un entrenador personal de élite con más de 20 años de experiencia diseñando programas de entrenamiento personalizados.
Tu tarea es crear una rutina de ejercicios COMPLETA, DETALLADA y PROGRESIVA basada en el perfil del usuario.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{{
  "name": "Nombre descriptivo de la rutina",
  "description": "Descripción del programa en 2-3 oraciones, explicando la metodología y beneficios esperados.",
  "days": [
    {{
      "day_number": 1,
      "day_name": "Lunes",
      "focus": "Pecho y Tríceps",
      "warmup": "5 min de cardio suave + movilidad de hombros",
      "exercises": [
        {{
          "name": "Press de Banca con Barra",
          "sets": 4,
          "reps": "8-10",
          "weight_suggestion": "70-80% de tu 1RM",
          "rest_seconds": 90,
          "intensity": "Alta",
          "technique_tip": "Baja controlado en 3 segundos, explosivo en la subida",
          "muscle_group": "Pecho"
        }}
      ],
      "cooldown": "5 min de estiramientos de pecho y tríceps"
    }}
  ],
  "progression_notes": "Instrucciones de progresión para las semanas siguientes",
  "nutrition_tips": "2-3 consejos nutricionales específicos para este objetivo",
  "rest_days": "Instrucciones sobre los días de descanso y recuperación"
}}

REGLAS IMPORTANTES:
- Incluye TODOS los días de entrenamiento especificados (days_per_week días)
- Para cada ejercicio incluye: nombre, series, repeticiones/tiempo, sugerencia de peso, descanso, intensidad, consejo de técnica y grupo muscular
- Los ejercicios deben ser apropiados para el nivel de fitness indicado
- Adapta el equipamiento disponible
- La rutina debe ser PROGRESIVA y bien periodizada
- Incluye calentamiento y enfriamiento para cada día
- Para Cardio/Resistencia: incluye duración en lugar de reps
- Para Fuerza: incluye series pesadas con menores repeticiones
- Asegúrate de balancear los grupos musculares a lo largo de la semana""",
    ),
    (
        "human",
        """Genera una rutina de entrenamiento personalizada con estos parámetros:

Objetivo principal: {goal}
Duración del programa: {duration_weeks} semanas
Días de entrenamiento por semana: {days_per_week}
Nivel de fitness: {fitness_level}
Equipamiento disponible: {equipment}
Datos del usuario: Peso {weight_kg} kg, Altura {height_cm} cm, Edad {age} años, Género: {gender}
Notas adicionales: {extra_notes}

Crea una rutina completa, detallada y profesional.""",
    ),
])


nutritionist_ai = NutritionistAI()
