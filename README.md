# NutriTrack IA

Plataforma de nutricion y entrenamiento asistida por IA. Permite registrar comidas y ejercicios, generar rutinas y planes de comidas, ver progreso por dia/semana/mes y administrar usuarios con aprobacion por email.

Este documento esta escrito para dos perfiles:
- **No tecnico:** para entender que hace el producto y como se usa.
- **Tecnico:** para entender arquitectura, stack, componentes y despliegue.

---

## 1) Que es NutriTrack IA

NutriTrack IA es una aplicacion web para seguimiento de salud y rendimiento:
- Registro de comidas manual y con IA.
- Registro de entrenamientos manual y con IA.
- Dashboard con metricas nutricionales y de actividad.
- Rutinas de entrenamiento generadas por IA.
- Planes de alimentacion generados por IA.
- Perfil fisico para personalizacion (peso, altura, edad, objetivo, actividad).
- Sistema de aprobacion de usuarios por administrador.

---

## 2) Arquitectura general

### Vista simple (no tecnica)
- El usuario interactua con una app web.
- La app consulta una API.
- La API guarda datos en base de datos y usa IA para analizar/generar contenido.
- Todo se ejecuta en contenedores Docker para despliegue estable.

### Vista tecnica
- **Frontend:** Next.js 14 + React + TypeScript.
- **Backend:** FastAPI + SQLModel + JWT.
- **IA:** LangChain + Google Gemini.
- **DB:** SQLite (con volumen Docker persistente en produccion).
- **Infra:** Docker Compose (+ opcion Nginx/prod compose).

---

## 3) Backend en detalle

### Stack backend
- `FastAPI` para endpoints REST.
- `SQLModel` para modelos y acceso a datos.
- `Alembic` para migraciones.
- `python-jose` + OAuth2 bearer para JWT.
- `passlib[bcrypt]` para hashing de contraseñas.
- `langchain` + `langchain-google-genai` para orquestacion de prompts.
- `uvicorn` como servidor ASGI.

### Modelo de IA utilizado
- Modelo configurado en `backend/ai_service.py`: `gemini-2.5-flash`.
- Uso principal:
  - Analisis de comidas (`/meals/ai`)
  - Analisis de ejercicios (`/workouts/ai`)
  - Chat nutricional (`/chat`)
  - Calculo de objetivos (`/profile/calculate-goal`)
  - Generacion de rutinas (`/routines/ai`)
  - Generacion de planes de comidas (`/meal-plans/ai`)

### Robustez de parsing IA
El backend limpia respuestas antes de parsear JSON:
- elimina bloques markdown,
- extrae bloque JSON principal,
- remueve comentarios,
- remueve comas colgantes.

Esto reduce errores cuando el LLM devuelve JSON imperfecto.

### Seguridad y autenticacion
- Login con JWT bearer (`/auth/token`).
- Expiracion de token configurable por `ACCESS_TOKEN_EXPIRE_MINUTES` (por defecto 7 dias en el codigo actual).
- Passwords hasheadas con bcrypt.
- Usuarios nuevos se crean inactivos (`is_active=false`), requieren aprobacion del admin.

### Aprobacion de usuarios por email
- Al registrarse un usuario, se envia correo al admin.
- El admin activa cuenta via link firmado (token HMAC).
- El usuario recibe correo de activacion con link de login.
- Endpoints admin para listar/activar/desactivar/eliminar usuarios.

### Dominios de negocio modelados
En `backend/models.py`:
- `User` (perfil y estado activo/inactivo)
- `Meal`
- `WorkoutSession`
- `WeightEntry`
- `Routine`
- `MealPlan`

---

## 4) Frontend en detalle

### Stack frontend
- `Next.js 14` (App Router)
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- `Radix UI` (primitivos de UI)
- `Lucide React` (iconos)
- `Recharts` (graficos)

### Estructura funcional (paginas principales)
- `frontend/app/dashboard/page.tsx` -> resumen global.
- `frontend/app/nutrition/page.tsx` -> comidas y estadisticas nutricionales.
- `frontend/app/workouts/page.tsx` -> entrenamientos y estadisticas fitness.
- `frontend/app/routines/page.tsx` -> rutinas (IA + manual + marcar completado).
- `frontend/app/meal-plans/page.tsx` -> planes de comidas (IA + manual + marcar consumido).
- `frontend/app/settings/page.tsx` -> perfil y configuracion.
- `frontend/app/login/page.tsx` -> login/registro/aprobacion pendiente.

### Patrones de UX implementados
- Modales de alta/edicion con variantes manual/IA.
- Navegacion temporal por dia/semana/mes.
- Actualizacion de estado local para reducir recargas completas.
- Soporte responsive para uso movil en navegador.

---

## 5) App movil (estado actual)

### Lo que existe hoy
No hay una app nativa separada (Android/iOS) dentro de este repositorio.

### Como se usa en celular hoy
- La app web es responsive y funciona desde navegador movil.
- Muchas vistas y modales fueron adaptados para pantallas chicas.

### Camino recomendado si se quiere app nativa
- Opcion 1: empaquetar la web con `Capacitor`.
- Opcion 2: construir cliente nativo (React Native/Flutter) consumiendo esta misma API.

---

## 6) Variables de entorno

Copiar base:

```bash
cp .env.example .env
```

Variables relevantes:
- `GEMINI_API_KEY` / `GOOGLE_API_KEY`: clave de IA.
- `JWT_SECRET`: secreto de firma JWT.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duracion del token.
- `NEXT_PUBLIC_API_URL`: URL publica del backend para frontend.
- `DATABASE_URL`: conexion DB (en Docker se apunta a volumen persistente).
- `EMAIL_FROM`, `EMAIL_APP_PASSWORD`, `ADMIN_EMAIL`, `APP_BASE_URL`, `FRONTEND_URL`: flujo de emails de aprobacion.
- `ADMIN_SECRET`: proteccion de endpoints administrativos.

---

## 7) Ejecucion del proyecto

### Opcion A: Docker (recomendada)

```bash
docker compose up -d --build
```

Servicios:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Docs Swagger: `http://localhost:8000/docs`

### Opcion B: Desarrollo local

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## 8) Endpoints principales (resumen)

### Auth y perfil
- `POST /auth/register`
- `POST /auth/token`
- `GET /auth/me`
- `PATCH /profile`
- `POST /profile/password`
- `POST /profile/calculate-goal`

### Nutricion
- `GET /meals`
- `POST /meals`
- `POST /meals/ai`
- `PATCH /meals/{id}`
- `DELETE /meals/{id}`

### Ejercicios
- `GET /workouts`
- `POST /workouts`
- `POST /workouts/ai`
- `PATCH /workouts/{id}`
- `DELETE /workouts/{id}`

### Rutinas y planes
- `GET/POST/PATCH/DELETE /routines`
- `POST /routines/ai`
- `GET/POST/PATCH/DELETE /meal-plans`
- `POST /meal-plans/ai`

### Reportes
- `GET /stats/daily`
- `GET /stats/weekly`
- `GET /stats/monthly`
- `GET /stats/fitness/daily`
- `GET /stats/fitness/weekly`
- `GET /stats/fitness/monthly`
- `GET /weight`
- `POST /weight`
- `DELETE /weight/{id}`

### Admin
- `GET /admin/activate/{token}`
- `GET /admin/users`
- `PATCH /admin/users/{user_id}/activate`
- `PATCH /admin/users/{user_id}/deactivate`
- `DELETE /admin/users/{user_id}`

---

## 9) Estructura del repo

```text
control_calorias/
├── backend/
│   ├── main.py
│   ├── ai_service.py
│   ├── auth.py
│   ├── email_service.py
│   ├── models.py
│   ├── database.py
│   ├── migrations/
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.http.yml
└── README.md
```

---

## 10) Notas importantes de operacion

- Para aplicar cambios de frontend y backend en servidor, reconstruir ambos servicios (`docker compose up -d --build`).
- En entornos Docker, usar `DATABASE_URL` apuntando al volumen persistente para evitar perdida de datos.
- Este README describe el estado actual del repositorio `main`.
