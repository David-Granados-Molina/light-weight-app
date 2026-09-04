# HANDOFF — Light Weight

Estado del proyecto al **4 de septiembre de 2026**.
Rama activa: **`version-2`** (local, sin push). HEAD en `1d62138`, con ~79 ficheros modificados **sin commitear**, a la espera de tu revisión.

---

## 1. Instrucción permanente

> «no subas los cambios a la rama version-2, deja que lo revise antes en local»

Nada se ha commiteado ni subido en `version-2`. `main` sigue intacta.

---

## 2. Mapa de ramas

| Rama | HEAD | Estado |
|---|---|---|
| `main` | `325fd7e` | Intacta, sin tocar. Despliega en Render. |
| `rediseno/consola-de-sesion` | `aaaa65b` | Subida. Opción 2 (consola de sesión persistente). |
| `rediseno/hoja-de-registro` | `1d62138` | Subida. Opción 1 (hoja de registro) — la que elegiste. |
| `version-2` | `1d62138` + cambios locales | **Solo local.** Todo el trabajo actual. |

---

## 3. Base de datos

`DATABASE_URL` apunta a **Neon, que es producción**. Las cuatro migraciones nuevas de esta tanda están **aplicadas**, y todas son aditivas: crean tablas y columnas, no borran nada.

| Migración | Qué hace | Estado |
|---|---|---|
| `20260902160000_muscles_description_video_rest` | Músculos por ejercicio; descripción, vídeo y descanso por ejercicio de rutina | Aplicada |
| `20260903180000_login_codes` | Tabla `LoginCode` para el acceso por código | Aplicada |
| `20260904120000_routine_warmup` | `Routine.warmupDescription` y `warmupVideoUrl` | Aplicada |
| `20260904140000_diet` | `Diet`, `DietMeal`, `DietItem`, `ShoppingItem` y sus enums | Aplicada |
| `20260904160000_diet_slots_and_plan` | `DietSlotInfo`, `DietSupplement`, `DietPlanEntry` y `Diet.shoppingNotes` | Aplicada |

**Deuda consciente**, toda del mismo tipo —estructura que sobra pero cuyo borrado sería una migración destructiva sobre producción—:
- `User.passwordHash` y la tabla `PasswordResetToken`, huérfanas desde el cambio de login.
- El enum `DietItemKind`: los suplementos se movieron a `DietSlotInfo` y hoy todos los `DietItem` son `alimento`.

Ninguna molesta. Convendría limpiarlas de una vez, no de una en una.

---

## 4. Lo que hace la aplicación ahora

### Acceso: código por email, sin contraseñas

Se acabaron el registro público, la contraseña y el login con Google. Ahora:

1. Escribes tu email. Si no está en la base de datos, sale **«Ese email no tiene acceso a Light Weight.»** — un 404 explícito y no el genérico «si existe, te llegará un correo», porque aquí las cuentas las das de alta tú a mano y dejar a alguien esperando un correo que no va a llegar es peor que decirle que no.
2. Llega un código de **8 dígitos**, válido **10 minutos**, de **un solo uso**, con **5 intentos** antes de quemarse. Se guarda hasheado con bcrypt: un volcado de la tabla no da acceso a nadie. Pedir uno nuevo invalida el anterior.
3. Sigue existiendo **«Acceder como test»**, sin email ni código, deliberadamente público.

**Todas las sesiones anteriores se invalidaron.** El token lleva dentro `AUTH_TOKEN_VERSION = 2` y `verifyToken` rechaza cualquier otra versión. Se hizo así y no cambiando `JWT_SECRET` (no depende de tocar variables en Render) ni con un campo por usuario (`requireAuth` no consulta la base; costaría una query por petición).

> **Cómo se entregan hoy los códigos.** El remitente es `onboarding@resend.dev`, la dirección compartida de pruebas de Resend, que **solo entrega al correo dueño de la cuenta**. Ninguna API key arregla eso: hace falta un dominio propio verificado, y `light-weight-app.onrender.com` no vale porque esa zona DNS es de Render, no de David.
>
> Mientras tanto se usa `LOGIN_CODE_RELAY_TO`: con esa variable puesta, **todos los códigos van a ese buzón** —con el email de quien lo pidió en el asunto— y se pasan a mano. El código se escribe además en el log con la marca `[CODIGO-ACCESO]`, por si el correo tarda. Sin `RESEND_API_KEY` no se envía nada y solo queda el log.
>
> Para pasar al modo definitivo: verificar un dominio en Resend → Domains (ojo con no crear un segundo registro SPF; se fusiona con el que ya haya), cambiar `FROM_ADDRESS` en `src/lib/mailer.ts` a una dirección de ese dominio, y **borrar `LOGIN_CODE_RELAY_TO`**. Los códigos irán solos a su destinatario sin tocar código.
>
> El reencaminamiento tiene una consecuencia que conviene tener presente: quien administra ve el código de acceso de cualquier usuario, y por tanto puede entrar en cualquier cuenta. En una aplicación personal donde además él da de alta los usuarios a mano, es un intercambio razonable, pero es un motivo más para quitarlo en cuanto haya dominio.

### Rutinas

- **Calentamiento por rutina** (descripción y/o vídeo de YouTube), independiente de los ejercicios. Se define con el botón «Añadir calentamiento» del formulario y aparece en la hoja de registro como una banda **CALENTAMIENTO** entre el buscador y el primer ejercicio. El vídeo **se incrusta dentro de la aplicación** (`youtube-nocookie.com`), no saca a nadie a YouTube a mitad de entreno. El enlace se valida antes de guardar: acepta las cuatro formas de URL de YouTube (barra de direcciones, «Compartir», Shorts y embed) y rechaza el resto.
- **El admin gestiona las rutinas de otros**: desde `/amigos/:userId/rutinas` puede crear, editar y eliminar. Usa el mismo formulario que las propias; lo único que cambia es el `userId` de la ruta, que decide a qué servicio se habla. Las tres operaciones de escritura viven en `routines.ts` (`createRoutineFor`, `updateRoutineFor`, `deleteRoutineFor`) y las comparten los dos routers, para que añadir un campo no deje una copia atrás.

### Dieta (`/dieta`)

Pantalla nueva, con el botón en el perfil. **El botón solo lo ve el admin**, pero la API y la ruta son por usuario: abrirla al resto es quitar un `@if`, no rehacer nada.

- Objetivos del día: kcal, proteínas, carbohidratos, grasas.
- Desayuno, comida y cena, cada una con **varias opciones**. Cada opción tiene sus alimentos con cantidades y sus notas.
- **Los suplementos y la indicación son de la comida entera, no de la opción**: se toman con el desayuno / la comida / la cena, se elija lo que se elija. Al principio se modelaron por opción; las hojas originales de David dejaron claro que no era así.
- **Calendario semanal**: siete días por tres comidas. Cada casilla muestra el **nombre de la opción y sus alimentos**, y al pulsarla se eligen las opciones viéndolas con su contenido delante. Sustituye a la tabla de números, cuyo problema era tener que ir a mirar a otro sitio qué llevaba cada número.
- Lista de la compra por las diez secciones de súper, con marcar/desmarcar y «quitar lo ya comprado».
- Se guarda entera de una vez, igual que una rutina. El calendario viaja **por índice** dentro del mismo cuerpo, porque las opciones se recrean en cada guardado y su id no existe todavía cuando el cliente arma la petición.

La dieta real de David está cargada: 15 opciones, 54 alimentos, 8 suplementos, 46 artículos de compra y 10 casillas de semana. El script que la carga es `backend/prisma/seed-diet-david.ts`, idempotente y con el email como argumento opcional.

---

## 5. Fiabilidad: errores que ahora se ven

Esta es la línea de trabajo que más ha cambiado por dentro.

**`asyncHandler` en los 32 handlers** (`backend/src/lib/async-handler.ts`), más `requireAdmin`. Express 4 no hace `await` de los handlers: si un `async` rechazaba, la promesa no volvía a Express y **la petición se quedaba colgada** hasta el timeout del cliente. Ahora el rechazo pasa por `next(error)` y el middleware devuelve un 500 en JSON. Comprobado levantando la API con una `DATABASE_URL` inválida: 500 en 2,1 s y cero `unhandledRejection`.

**Fuera los `catch` que disfrazaban de 404 cualquier fallo.** `PUT` y `DELETE` de rutinas devolvían «Rutina no encontrada» ante *cualquier* error. Eso escondió un problema real durante el desarrollo. Ahora el 404 es solo cuando la rutina de verdad no está.

**Agujero de lectura cerrado.** `GET /api/routines/:id` filtraba solo por `id`: cualquier usuario autenticado podía leer la rutina de otro sabiendo su id. Ahora filtra también por dueño. Verificado: leer, editar o borrar una rutina ajena devuelve 404, y los endpoints de admin devuelven 403 a quien no lo es.

---

## 6. Diseño

`PRODUCT.md` (verdad de producto) y `DESIGN.md` (tokens en frontmatter YAML + 8 secciones canónicas) siguen siendo la autoridad. Todo color, espaciado y tipografía sale de ahí.

- **Escritorio nativo**, no móvil estirado: `side-rail` en ≥900px (solo iconos entre 900–1099px), `tab-bar` en móvil.
- **Accesibilidad del acento**: cuatro de los ocho acentos daban 2,4:1–3,5:1 sobre el fondo oscuro. Resuelto con *relative color syntax* — suelo de luminosidad en oscuro, y en claro una función escalón que elige tinta blanca o negra. Verificado con los ocho acentos en ambos temas.
- **`--avatar-canvas: #FFFFFF`**: el fondo de todo avatar, **idéntico en los dos temas**. Los SVG son dibujos de trazo negro sobre transparente y sobre cualquier plano oscuro el contorno desaparecía. Es la única superficie que no se invierte con el tema, y está documentado como tal.

### Excepciones sancionadas
- Borde de acento de 2px en la tarjeta «completado» (lo pediste explícitamente) — única excepción al grosor de 1px.
- `#ffbf00` en `index.html` como `accent-default` del splash.
- Dos `ignore-value` en el detector: `broken-image` en `profile.html` (binding a blob URL) y `marquee` en `index.html` (barra de arranque indeterminada).

---

## 7. Estado de la compilación

- Backend `tsc --noEmit`: **0 errores**.
- Build de producción: **~498 kB initial / ~117 kB transferidos**, sin avisos de presupuesto.
- Presupuestos: `initial` warning en 560 kB; `anyComponentStyle` warning 14 kB, error 18 kB.

---

## 8. Pendiente

### Tienes que hacerlo tú
- **Revisar todo y decidir si commitear.** Nada está commiteado.
- **Resolver lo de Resend** (ver el aviso del apartado 4). Es lo único que puede dejar a un usuario fuera sin alternativa.
- **Ver la pantalla de Dieta con tu propia cuenta.** Se verificó entera sobre el usuario de prueba, con tus mismos datos cargados y borrados después; lo que no se ha visto es tu cuenta real, porque entrar en ella exige un código enviado a tu buzón.
- **`GOOGLE_CLIENT_ID` ya no se usa**: puedes quitarlo de las variables de Render al desplegar.

### Mantenimiento
- **`graphify update .` sigue sin ejecutarse**: el CLI no está en el PATH de este entorno. Conviene lanzarlo desde tu terminal cuando cierres esta tanda, porque `graphify-out/` está muy por detrás: hay pantallas, servicios y modelos nuevos que el grafo no conoce.

---

## 9. Notas de entorno

- **El backend en marcha se queda con el cliente de Prisma antiguo** después de un `prisma generate`. `tsx watch` vigila el código fuente, no `node_modules`, así que tras generar hay que tocar un fichero de `src/` para forzar el reinicio. Ha pasado dos veces y las dos se manifestó como un 500 o un 404 desconcertante.
- **El panel del navegador oculto congela las transiciones CSS** en `currentTime: 0` y bloquea `requestAnimationFrame`, y pinta negro al hacer scroll. Da valores computados falsos. Para medir, `getAnimations().forEach(a => a.finish())` o un viewport alto en vez de scroll. **No es un bug de la aplicación.**
