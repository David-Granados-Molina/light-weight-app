# Light Weight 🏋️

Aplicación web progresiva para el registro y seguimiento personal de entrenamientos. Diseñada para funcionar como una PWA móvil, con interfaz oscura y sistema de temas personalizables.

**Demo:** [light-weight-app.onrender.com](https://light-weight-app.onrender.com/)

---

## Características

### Registro de entrenamientos
- Registra series y repeticiones, peso, tiempo o rondas EMOM según el tipo de ejercicio
- Hoja de registro plegable: cada ejercicio en su panel, con sus músculos, sus consejos y la marca de completado
- Consulta lo que hiciste la última vez en ese mismo ejercicio, sin salir de la hoja
- El entreno a medias sobrevive a cambiar de pantalla o recargar, y se ve desde cualquier sitio en la consola de sesión
- Avisa antes de guardar un segundo entreno el mismo día: actualizar el que hay o crear uno aparte
- Edita o elimina cualquier entreno pasado desde el historial o desde inicio
- Comparte el resumen del entreno por WhatsApp o portapapeles

### Rutinas
- Crea rutinas de gym y calistenia con ejercicios, series y rangos de repeticiones objetivo
- Calentamiento por rutina, con explicación y vídeo
- Consejos y vídeo por ejercicio: YouTube, TikTok e Instagram se ven dentro de la aplicación
- Carga una rutina al registrar para partir de una plantilla prefijada
- Copia una rutina a la cuenta de otra persona, sin rehacerla ejercicio a ejercicio

### Historial
- Modo general paginado de cinco en cinco, para no cargar todo de golpe
- Filtros por categoría (gym / calistenia) y texto libre por nombre de ejercicio
- Vistas por día, mes o año
- Las filas con notas dentro se anuncian con una marca

### Progreso
- Gráficas por ejercicio (Chart.js) con rangos de 1 mes, 3 meses y 1 año
- Volumen total, máximo peso y récord de repeticiones por periodo

### Dieta
- Objetivos del día en kcal, proteínas, carbohidratos y grasas
- Desayuno, comida y cena con varias opciones, cada una con sus alimentos y cantidades
- Suplementos e indicación por comida, no por opción
- Calendario semanal de siete días por tres comidas, eligiendo las opciones con su contenido delante
- Lista de la compra por secciones de supermercado
- La API y la ruta son por usuario, aunque hoy el botón solo lo ve quien administra

### Perfil
- 9 avatares SVG que adaptan su color al tema activo
- 8 temas de color (ámbar, rosa, rojo, verde, azul, morado, gris, menta)
- Lightbox del avatar con rendering nítido (sin blur por upscaling)

### Acceso
- Sin contraseñas: escribes tu email y recibes un código de 8 dígitos
- El código vale 10 minutos, es de un solo uso, admite 5 intentos y se guarda hasheado
- Las cuentas se dan de alta a mano; si el email no está, se dice claramente
- Cuenta de demostración pública, sin email ni código, que nunca tiene permisos de administración

### Administración
- Quien administra consulta el historial y el progreso del resto de usuarios
- Crea, edita y elimina rutinas ajenas con el mismo formulario que las propias

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| Angular 21 | Framework principal — componentes standalone, signals, OnPush |
| PrimeNG | Gráficas (p-chart), acordeón de la hoja de registro y selector de ejercicios |
| Chart.js | Motor de gráficas |
| Angular CDK | Reordenar ejercicios arrastrando |
| Angular SSR | Prerenderizado de rutas estáticas |

### Backend
| Tecnología | Uso |
|---|---|
| Express | Servidor HTTP y API REST |
| Prisma | ORM — migraciones y acceso a base de datos |
| PostgreSQL (Neon) | Base de datos en producción |
| Zod | Validación de esquemas en los endpoints |
| JSON Web Tokens | Autenticación stateless |
| Resend | Envío de los códigos de acceso (HTTPS, no SMTP) |
| bcryptjs | Hash de los códigos de acceso |

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
│   │   │   ├── guards/        # authGuard, guestGuard y adminGuard
│   │   │   ├── models/        # Interfaces TypeScript
│   │   │   ├── services/      # AuthService, SessionService, WorkoutDraftStore…
│   │   │   └── utils/         # format.ts, avatar.ts, video.ts
│   │   ├── features/          # Páginas (inicio, historial, registrar, dieta…)
│   │   └── shared/            # Componentes reutilizables
│   ├── public/avatars/        # SVGs y PNGs de avatares
│   └── public/icons/          # Iconos de la PWA, incluidos los maskable
│
├── backend/                   # API Express
│   ├── src/
│   │   ├── lib/               # prisma.ts, dateUtils.ts, mailer.ts, accounts.ts
│   │   ├── middleware/        # requireAuth y requireAdmin
│   │   └── routes/            # auth, sessions, routines, progress, dashboard, diet, admin
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
     ├─< WorkoutSession ──< SessionExercise >── Exercise
     │                     └─< SessionSet
     ├─< LoginCode
     └─- Diet ──< DietMeal ──< DietItem
               ├─< DietSlotInfo ──< DietSupplement
               ├─< DietPlanEntry
               └─< ShoppingItem
```

- **Exercise**: catálogo compartido con `inputType` (peso, reps, tiempo, emom, min)
- **Routine**: plantilla de entreno con series, repeticiones objetivo, calentamiento, consejos y vídeos
- **WorkoutSession**: entreno registrado (fecha, categoría, ejercicios y series reales)
- **LoginCode**: código de acceso hasheado, con caducidad, intentos y marca de uso
- **Diet**: una por usuario, con sus comidas, opciones, suplementos, plan semanal y lista de la compra

---

## Desarrollo local

### Requisitos
- Node.js `^20.19` · `^22.12` · `>=24`, que es lo que exige Angular 21
- PostgreSQL local o una base de datos Neon

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/David-Granados-Molina/light-weight-app.git
cd light-weight-app

cd backend && npm install
cd ../frontend && npm install
```

### 2. Variables de entorno del backend

Crea `backend/.env` a partir de `backend/.env.example`:

```env
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_db
PORT=3000
CORS_ORIGIN=http://localhost:4200
FRONTEND_URL=http://localhost:4200

JWT_SECRET=un_secreto_largo_y_aleatorio
JWT_EXPIRES_IN=180d

# Email de quien administra: ve el historial, el progreso y las rutinas del resto.
ADMIN_EMAIL=tu@email.com

# Cuenta de demostración del botón "Acceder como test". Por defecto test@test.com.
TEST_USER_EMAIL=

# Sin API key los códigos no se envían: se escriben en el log del servidor con
# la marca [CODIGO-ACCESO], que sirve para desarrollar pero no para producción.
RESEND_API_KEY=

# Apaño mientras no haya un dominio propio verificado en Resend: manda todos los
# códigos a esta dirección, con el email de quien lo pidió en el asunto.
LOGIN_CODE_RELAY_TO=
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
cd frontend && npm start
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

El `buildCommand` de la API termina en `npx prisma migrate deploy`, así que **cada despliegue aplica las migraciones pendientes**: no hay un paso manual donde pararse a pensar antes de que una migración llegue a producción.

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

## Instalación como aplicación

`manifest.webmanifest` declara `display: standalone`, así que desde la pantalla de inicio abre a pantalla completa, sin barra de direcciones. Los iconos incluyen los dos `maskable` que Android necesita para llenar la máscara circular del lanzador en vez de flotar dentro de un círculo blanco.

Al cambiar el icono hay que rehacer el acceso directo: Android lo guarda al crearlo y no lo refresca solo.

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
