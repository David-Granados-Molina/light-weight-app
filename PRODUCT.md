# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuario principal: una persona que entrena por su cuenta (gimnasio de barrio, box de calistenia o parque) y quiere llevar registro de lo que levanta para saber si progresa. No es atleta de competición ni cliente de un entrenador: no hay plan externo que seguir, la rutina se la construye él mismo.

Escena de uso real, dos contextos distintos y confirmados por el usuario:

- **Móvil, dentro del entreno.** Teléfono en una mano, entre serie y serie, a veces con guantes o manos sudadas, descansos de 60–180 segundos. Aquí se registra: se abre una rutina, se rellenan peso y repeticiones serie a serie, se guarda. La interacción tiene que sobrevivir a poca atención y una sola mano.
- **Escritorio, fuera del entreno.** Sentado, con tiempo. Aquí se planifica y se analiza: crear y editar rutinas, mirar gráficas de progreso, repasar el historial, revisar el calendario del mes.

Segunda audiencia confirmada: un rol **admin** (`isAdmin`) que consulta historial, progreso y rutinas de otros usuarios a través de la sección "Amigos" (`/amigos`, `/amigos/:userId/…`). Es inspección de solo lectura sobre los mismos datos, no una consola de administración aparte.

## Product Purpose

Registrar entrenamientos reales con la fidelidad suficiente para que las gráficas de progreso digan la verdad, y hacerlo lo bastante rápido como para que el registro no se abandone a mitad de sesión. El éxito es un historial continuo: si el usuario deja de registrar durante dos semanas, el producto ha fallado, por buena que sea cualquier pantalla concreta.

## Positioning

El catálogo de ejercicios lleva un `inputType` (`peso`, `reps`, `tiempo`, `emom`, `min`) y la UI de registro cambia de forma según ese tipo: un press de banca pide kg × reps, una plancha pide segundos, un EMOM pide rondas × reps por ronda, el cardio pide horas + minutos. Un log genérico de "series × reps" no puede representar calistenia ni EMOM sin mentir; aquí el modelo de datos y la interfaz están construidos alrededor de esa diferencia.

Segunda diferencia real: el borrador del entreno (`WorkoutDraftStore`) sobrevive a la navegación y a la recarga de página, porque en el gimnasio la app se cierra y se reabre a mitad de sesión constantemente.

## Operating Context

- **Rutinas como plantilla, sesiones como hecho.** `Routine` define objetivos (series, rango de repeticiones, peso objetivo, RIR); `WorkoutSession` guarda lo que realmente se hizo ese día. Registrar carga una rutina y la rellena.
- **Registro retroactivo.** El usuario puede fijar una fecha pasada; si ya existe sesión ese día se entra en modo edición en vez de duplicar. El calendario del mes muestra puntos de color en los días con entreno.
- **Categorías como dato.** Cada ejercicio y cada sesión es `gym` o `calistenia`. La categoría se codifica en color en toda la app (dashboard, historial, calendario, rutinas, progreso) y es información, no decoración.
- **Historial paginado hacia atrás.** Se carga semana a semana retrocediendo desde hoy; dos semanas vacías seguidas cortan la paginación. Filtros por categoría, texto libre, y modo día/mes/año.
- **Compartir.** Al guardar un entreno se genera un resumen en texto que se comparte por Web Share API, WhatsApp o portapapeles.
- **Idioma.** Toda la interfaz y los datos formateados están en español (`es-ES`). No hay i18n multiidioma y no se pide.

## Capabilities and Constraints

Rutas confirmadas (14 pantallas): `/login`, `/recuperar`, `/restablecer` (sin tab-bar), `/inicio`, `/registrar`, `/historial`, `/progreso`, `/perfil`, `/calendario`, `/rutinas`, `/rutinas/nueva`, `/rutinas/:id`, y las de admin `/amigos`, `/amigos/:userId/historial|progreso|rutinas`.

Restricciones técnicas que el diseño no puede romper:

- **Angular 21 zoneless.** El estado de UI vive en signals; el render se dispara por signals, no por Zone.js. Cualquier estado nuevo de interfaz debe ser signal o `computed`.
- **Componentes standalone, `OnPush`, control de flujo nativo** (`@if` / `@for` / `@switch`). Sin `NgModule`, sin `ngClass`, sin `ngStyle`, sin `*ngIf`.
- **`--color-accent` es dinámico por usuario.** `app.ts` escribe el `themeColor` del usuario logueado sobre el `<html>` en un `effect`. Hay 8 acentos posibles (ámbar, rosa, rojo, verde, azul, morado, gris, menta). Ningún componente puede asumir que el acento es ámbar, y todo par acento/fondo debe mantener contraste con los ocho.
- **PrimeNG está en el árbol** para `p-chart` (Chart.js) en Progreso y `p-multiselect` en el selector de ejercicios. El tema es Aura con modo oscuro atado a la clase `.app-dark` en `<html>`. El panel del multiselect se renderiza en overlay fuera del DOM del componente, por eso `exercise-picker` usa `ViewEncapsulation.None`.
- **Drag & drop con `@angular/cdk`** (`cdkDropList` / `cdkDrag`) para reordenar ejercicios en Registrar y en el formulario de rutina.
- **Angular SSR / prerender**: el CSS y las plantillas no pueden depender de `window` o `document` en el primer render.
- **Avatares SVG inline.** `AvatarService` descarga el SVG, desambigua sus `id` internos y lo inyecta con `[innerHTML]` para que use `currentColor` y siga al acento del usuario. No son `<img>`.
- **API REST propia** bajo `/api`, JWT en `localStorage` (`lw_token`), interceptor que hace `logout()` ante 401.
- **Accesibilidad exigida por el repo** (`frontend/.claude/CLAUDE.md`): AXE limpio y mínimos WCAG AA, incluyendo gestión de foco, contraste y ARIA.

Decisiones de producto explícitamente abiertas: no hay tema claro y no se va a hacer ahora; no hay onboarding de primer uso definido; no hay estados de error de red diseñados más allá de mensajes sueltos.

## Brand Commitments

Confirmados por el usuario como intocables en este rediseño:

- Nombre **Light Weight** y logo existente (`frontend/public/icons/light-weight-icon.svg`, favicons y apple-touch-icon).
- **Base oscura.** La aplicación es oscura; no se entrega tema claro.
- **Sistema de acento personalizable por usuario** (8 colores), expuesto como `--color-accent`.
- **Colores de categoría como significado**: `gym` = cian, `calistenia` = naranja. Son datos codificados en color y no pueden reasignarse por gusto estético.

Todo lo demás del aspecto actual —tipografía (Space Grotesk / Hanken Grotesk), escala tipográfica, forma y peso de las tarjetas, espaciado, radios, layout de columna única de 480 px, tab-bar inferior en escritorio— es evidencia de lo que el producto es, no autoridad sobre lo que debe llegar a ser.

## Evidence on Hand

- Aplicación en producción: `https://light-weight-app.onrender.com` (frontend estático en Render) y `https://light-weight-api.onrender.com/api` (backend Express + Prisma + PostgreSQL en Neon).
- Cuenta de prueba real: `test@test.com` / `test`, con historial sembrado por `backend/prisma/seed.ts`.
- Capturas de la interfaz actual en `docs/screenshots/` (inicio, historial, registrar, progreso, rutinas).
- Grafo de conocimiento del repositorio en `graphify-out/` (679 nodos, 1225 aristas) y recorrido de código archivo por archivo del frontend.
- 9 avatares SVG en `frontend/public/avatars/`.

No existen: testimonios, métricas de uso, estudios de usuario, ni base de usuarios más allá del propio autor y cuentas de prueba. Ningún trabajo futuro debe inventarlos.

## Product Principles

1. **El registro gana a todo lo demás.** Si una decisión de diseño hace la pantalla de registrar más lenta o más frágil con una mano, la decisión está mal, por bien que quede en el resto.
2. **La forma sigue al `inputType`.** El ejercicio dicta qué campos existen. La interfaz no ofrece un formulario genérico con campos apagados.
3. **El color es dato antes que decoración.** Categoría y acento del usuario significan algo; ningún elemento decorativo puede competir con ellos ni imitarlos.
4. **Nada de lo escrito se pierde.** Borrador persistente, confirmación antes de sustituir ejercicios ya introducidos, edición en vez de duplicado al registrar en una fecha con sesión.
5. **Escritorio y móvil son dos escenas, no dos anchos.** En móvil se ejecuta; en escritorio se planifica y se analiza. La misma funcionalidad, distinta composición.

## Accessibility & Inclusion

Requisito confirmado en el repositorio: AXE sin violaciones y mínimos WCAG AA, con foco visible y gestionado en modales y desplegables, contraste AA en texto e iconografía significativa, y ARIA correcto en los componentes propios (`number-wheel`, `routine-select`, `confirm-dialog`, `exercise-loader`, tab-bar).

Restricción específica del producto: el contraste debe sostenerse con los ocho valores posibles de `--color-accent`, no solo con el ámbar por defecto.
