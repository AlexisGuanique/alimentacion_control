# NutriTrack IA 🥗

Solución integral de gestión nutricional con IA. Registra tu ingesta calórica mediante lenguaje natural, chatbot web o WhatsApp.

## Stack

| Capa            | Tecnología                                    |
| --------------- | ---------------------------------------------- |
| Backend         | FastAPI + SQLModel + LangChain + Gemini        |
| Frontend        | Next.js 14 + TypeScript + Tailwind + Shadcn/UI |
| Base de datos   | SQLite (persistida en Docker volume)           |
| Infraestructura | Docker + Docker Compose                        |

## Inicio Rápido

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env y completar GEMINI_API_KEY y JWT_SECRET
```

### 2. Levantar con Docker

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs

### 3. Desarrollo local (sin Docker)

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Estructura del Proyecto

```
control_calorias/
├── backend/
│   ├── main.py          # FastAPI app + rutas
│   ├── auth.py          # OAuth2 + JWT
│   ├── models.py        # SQLModel schemas
│   ├── database.py      # Engine SQLite
│   ├── ai_service.py    # LangChain + Gemini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── dashboard/   # Panel principal
│   │   └── login/       # Auth
│   ├── components/
│   │   ├── MealTable.tsx    # Tabla de comidas
│   │   ├── ChatWidget.tsx   # Chatbot flotante
│   │   └── AddMealModal.tsx # Modal registro
│   ├── lib/
│   │   ├── api.ts       # Cliente HTTP
│   │   └── utils.ts     # Helpers
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

| Método | Ruta               | Descripción            |
| ------- | ------------------ | ----------------------- |
| POST    | `/auth/register` | Registro de usuario     |
| POST    | `/auth/token`    | Login → JWT            |
| GET     | `/auth/me`       | Usuario autenticado     |
| GET     | `/meals`         | Listar comidas          |
| POST    | `/meals`         | Crear comida manual     |
| POST    | `/meals/ai`      | Crear comida con IA     |
| DELETE  | `/meals/{id}`    | Eliminar comida         |
| GET     | `/stats/daily`   | Estadísticas del día  |
| GET     | `/stats/weekly`  | Estadísticas semanales |
| POST    | `/chat`          | Chat con NutriBot       |

## Generación de JWT_SECRET seguro

```bash
openssl rand -hex 32
```
