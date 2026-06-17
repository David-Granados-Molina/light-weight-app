# Light Weight 🏋️

Aplicación web progresiva para el registro y seguimiento personal de entrenamientos. Diseñada para funcionar como una PWA móvil, con interfaz oscura y sistema de temas personalizables.

**Demo:** [light-weight-app.onrender.com](https://light-weight-app.onrender.com/)

---

## Características

### Registro de entrenamientos
- Registra series y repeticiones, peso, tiempo o rondas EMOM según el tipo de ejercicio
- Edita cualquier entreno pasado directamente desde el historial o el dashboard
- Comparte el resumen del entreno por WhatsApp o portapapeles

### Rutinas
- Crea rutinas de gym y calistenia con ejercicios, series y rangos de repeticiones objetivo
- Carga una rutina al registrar para partir de una plantilla prefijada

### Historial
- Paginación semana a semana para no cargar todos los datos de golpe
- Filtros por categoría (gym / calistenia) y texto libre por nombre de ejercicio
- Vistas por día, mes o año

### Progreso
- Gráficas por ejercicio (Chart.js) con rangos de 1 mes, 3 meses y 1 año
- Volumen total, máximo peso y récord de repeticiones por periodo

### Perfil
- 9 avatares SVG que adaptan su color al tema activo
- 8 temas de color (ámbar, rosa, rojo, verde, azul, morado, gris, menta)
- Lightbox del avatar con rendering nítido (sin blur por upscaling)

### Autenticación
- Registro y login con email + contraseña
- Login con Google (OAuth 2.0)
- Recuperación de contraseña por email (enlace seguro de un solo uso)

### Parsing con IA
- Endpoint `/api/whatsapp` que acepta un mensaje de texto libre y extrae el entreno usando la API de Anthropic (Claude)

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| Angular 21 | Framework principal — componentes standalone, signals, OnPush |
| PrimeNG | Componente de gráficas (p-chart) |
| Chart.js | Motor de gráficas |
| Angular SSR | Prerenderizado de rutas estáticas |

### Backend
| Tecnología | Uso |
|---|---|
| Express | Servidor HTTP y API REST |
| Prisma | ORM — migraciones y acceso a base de datos |
| PostgreSQL (Neon) | Base de datos en producción |
| Zod | Validación de esquemas en los endpoints |
| JSON Web Tokens | Autenticación stateless |
| Google Auth Library | Verificación de tokens de Google OAuth |
| Nodemailer | Envío de emails para recuperación de contraseña |
| Anthropic SDK | Parsing de entrenamientos con Claude |
| bcryptjs | Hash de contraseñas |

### Infraestructura
| Servicio | Uso |
|---|---|
| Render | Hosting frontend (Static Site) y backend (Web Service) |
| Neon | PostgreSQL serverless |
| GitHub | Control de versiones + CI/CD automático vía Render Blueprints |

---

## Estructura del repositorio

```
/
├── frontend/                  # Aplicación Angular
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── config/        # URL base de la API (dev/prod)
│   │   │   ├── guards/        # authGuard y guestGuard
│   │   │   ├── models/        # Interfaces TypeScript
│   │   │   ├── services/      # AuthService, SessionService, etc.
│   │   │   └── utils/         # format.ts, avatar.ts
│   │   ├── features/          # Páginas (dashboard, historial, registrar…)
│   │   └── shared/            # Componentes reutilizables
│   └── public/avatars/        # SVGs y PNGs de avatares
│
├── backend/                   # API Express
│   ├── src/
│   │   ├── lib/               # prisma.ts, dateUtils.ts, mailer.ts
│   │   ├── middleware/        # authMiddleware.ts
│   │   └── routes/            # auth, sessions, routines, progress, dashboard…
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts            # Catálogo de ejercicios
│
└── render.yaml                # Blueprint de Render (ambos servicios)
```

---

## Modelo de datos

```
User ──< Routine ──< RoutineExercise >── Exercise
     └─< WorkoutSession ──< SessionExercise >── Exercise
                          └─< SessionSet
```

- **Exercise**: catálogo compartido con `inputType` (peso, reps, tiempo, emom, min)
- **Routine**: plantilla de entreno con series y rangos de repeticiones objetivo
- **WorkoutSession**: entreno registrado (fecha, categoría, ejercicios y series reales)

---

## Desarrollo local

### Requisitos
- Node.js ≥ 18
- PostgreSQL local o una base de datos Neon

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/David-Granados-Molina/light-weight-app.git
cd light-weight-app

cd backend && npm install
cd ../frontend && npm install
```

### 2. Variables de entorno del backend

Crea `backend/.env`:

```env
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_db
JWT_SECRET=un_secreto_largo_y_aleatorio
JWT_EXPIRES_IN=180d

GOOGLE_CLIENT_ID=tu_google_client_id

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password

FRONTEND_URL=http://localhost:4200
CORS_ORIGIN=http://localhost:4200

ANTHROPIC_API_KEY=sk-ant-...   # opcional, solo para el endpoint de WhatsApp
```

### 3. Migraciones y seed

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Arrancar en desarrollo

```bash
# Terminal 1 — backend (puerto 3000)
cd backend && npm run dev

# Terminal 2 — frontend (puerto 4200, proxy hacia :3000)
cd frontend && ng serve
```

El proxy de Angular (`proxy.conf.json`) redirige `/api` al backend local automáticamente.

---

## Despliegue en Render

El repositorio incluye `render.yaml` que define dos servicios:

| Servicio | Tipo | Build | Start |
|---|---|---|---|
| `light-weight-api` | Web Service | `npm install && npm run build && npx prisma migrate deploy` | `npm start` |
| `light-weight-app` | Static Site | `npm install && npm run build` | — |

Al conectar el repositorio en Render → **New Blueprint**, ambos servicios se crean automáticamente. Solo es necesario rellenar las variables de entorno marcadas como secretas en el panel de Render.

La compilación del frontend para producción usa `fileReplacements` en `angular.json` para sustituir `api.config.ts` por `api.config.prod.ts`, que apunta al backend en Render.

---

## Tipos de ejercicio

| `inputType` | Ruedas de entrada |
|---|---|
| `peso` | kg × reps |
| `reps` | reps (peso opcional a 0) |
| `tiempo` | segundos |
| `emom` | rondas × reps por ronda |
| `min` | horas + minutos (cardio) |

---

## Capturas de pantalla

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/inicio.png" width="180"/><br/><sub>Inicio</sub></td>
    <td align="center"><img src="docs/screenshots/historial.png" width="180"/><br/><sub>Historial</sub></td>
    <td align="center"><img src="docs/screenshots/registrar.png" width="180"/><br/><sub>Registrar</sub></td>
    <td align="center"><img src="docs/screenshots/progreso.png" width="180"/><br/><sub>Progreso</sub></td>
    <td align="center"><img src="docs/screenshots/rutinas.png" width="180"/><br/><sub>Rutinas</sub></td>
  </tr>
</table>

---

## Licencia

Proyecto personal. Todos los derechos reservados.
