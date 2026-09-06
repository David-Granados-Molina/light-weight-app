# HANDOFF — Light Weight

Estado del proyecto al **6 de septiembre de 2026**.
Rama activa: **`main`**, HEAD en `e85f3af`, árbol limpio, **todo subido y desplegado en Render**.

---

## 1. Dónde estamos

La tanda de la versión 2 está **cerrada y en producción**. Lo que en el handoff anterior eran 79 ficheros sin commitear hoy son cuatro commits en `main`, ya desplegados.

**No queda nada bloqueante.** Los códigos de acceso, que era el asunto abierto del handoff anterior, llegan: el reenvío estaba bien configurado y solo faltaba comprobarlo. Lo que sigue costando es que los códigos de los demás usuarios pasan por tu buzón, y eso lo cierra un dominio verificado. Ver el apartado 6.

La estructura huérfana está limpia: la quinta migración, la primera destructiva del proyecto, se aplicó en el despliegue. Ver el apartado 3.

---

## 2. Mapa de ramas

| Rama | HEAD | Para qué sirve |
|---|---|---|
| `main` | `e85f3af` | **Producción.** Despliega en Render al hacer push. |
| `v1.0` | `325fd7e` | **Copia de seguridad** de la producción anterior a la versión 2. No tocar. |
| `v2.0` | `2ec512b` | La rama donde se revisó la tanda, ya fusionada en `main`. Histórica. |
| `rediseno/hoja-de-registro` | `1d62138` | La variante de diseño elegida. Histórica. |
| `rediseno/consola-de-sesion` | `aaaa65b` | La variante descartada. Histórica. |

`v1.0` es el punto de retorno si algo sale mal: es exactamente lo que había en producción antes de todo esto.

### Los cuatro commits de `main`

| Commit | Qué trae |
|---|---|
| `2ec512b` | Acceso por código, dieta, calentamiento, gestión de rutinas ajenas, `asyncHandler` |
| `3ac657d` | Rutinas de la hoja 3 del Excel para Filo; línea de diagnóstico del correo al arrancar |
| `4f4a686` | Icono nuevo de la aplicación |
| `e85f3af` | Recorte correcto del icono y `manifest.webmanifest` para Android |

---

## 3. Base de datos

`DATABASE_URL` apunta a **Neon, que es producción**. Las cuatro migraciones de esta tanda están **aplicadas**, y todas son aditivas: crean tablas y columnas, no borran nada.

| Migración | Qué hace |
|---|---|
| `20260902160000_muscles_description_video_rest` | Músculos por ejercicio; descripción, vídeo y descanso por ejercicio de rutina |
| `20260903180000_login_codes` | Tabla `LoginCode` para el acceso por código |
| `20260904120000_routine_warmup` | `Routine.warmupDescription` y `warmupVideoUrl` |
| `20260904140000_diet` | `Diet`, `DietMeal`, `DietItem`, `ShoppingItem` y sus enums |
| `20260904160000_diet_slots_and_plan` | `DietSlotInfo`, `DietSupplement`, `DietPlanEntry` y `Diet.shoppingNotes` |

### La quinta migración: la limpieza

`20260906120000_drop_password_and_diet_item_kind` es la **primera migración destructiva** del proyecto. Se hizo de una vez, no de una en una, y borra lo que sobraba:

- `User.passwordHash` y la tabla `PasswordResetToken`, huérfanas desde que el login pasa por código.
- `User.googleId`, huérfana desde que no hay login con Google. Su índice único se va con la columna.
- `DietItem.kind` y su enum `DietItemKind`: los suplementos se movieron a `DietSlotInfo` y desde entonces la columna valía `alimento` en todas las filas.

Nada de eso se leía ni se escribía desde el código: comprobado buscando los cinco nombres en `backend/src` y `frontend/src`. El `schema.prisma`, el `create` de `diet.ts` y el seed `seed-diet-david.ts` ya no los mencionan; `tsc --noEmit` sigue en cero.

**Se aplicó al desplegar**, no a mano: el `buildCommand` del servicio de API en `render.yaml` termina en `npx prisma migrate deploy`, así que el push la ejecutó contra Neon. Antes se hizo una *snapshot* de la base en Neon, que es el único camino de vuelta —un `DROP COLUMN` no se deshace con otra migración—.

> **Si algún día se repite una migración destructiva**, entre el commit y el despliegue hay una ventana en la que el código ya no escribe la columna pero la base todavía la exige. Aquí duró lo que tardó el despliegue y afectaba solo a guardar una dieta (`DietItem.kind` es `NOT NULL` sin valor por defecto). Como `DATABASE_URL` apunta a Neon también en local, la ventana vale igual arrancando aquí.

---

## 4. Lo que hace la aplicación ahora

### Acceso: código por email, sin contraseñas

Se acabaron el registro público, la contraseña y el login con Google. Ahora:

1. Escribes tu email. Si no está en la base de datos, sale **«Ese email no tiene acceso a Light Weight.»** — un 404 explícito y no el genérico «si existe, te llegará un correo», porque aquí las cuentas las das de alta tú a mano y dejar a alguien esperando un correo que no va a llegar es peor que decirle que no.
2. Llega un código de **8 dígitos**, válido **10 minutos**, de **un solo uso**, con **5 intentos** antes de quemarse. Se guarda hasheado con bcrypt: un volcado de la tabla no da acceso a nadie. Pedir uno nuevo invalida el anterior.
3. Sigue existiendo **«Acceder como test»**, sin email ni código, deliberadamente público.

**Todas las sesiones anteriores se invalidaron.** El token lleva dentro `AUTH_TOKEN_VERSION = 2` y `verifyToken` rechaza cualquier otra versión. Se hizo así y no cambiando `JWT_SECRET` (no depende de tocar variables en Render) ni con un campo por usuario (`requireAuth` no consulta la base; costaría una query por petición).

### Rutinas

- **Calentamiento por rutina** (descripción y/o vídeo de YouTube), independiente de los ejercicios. Se define con el botón «Añadir calentamiento» del formulario y aparece en la hoja de registro como una banda **CALENTAMIENTO** entre el buscador y el primer ejercicio. El vídeo **se incrusta dentro de la aplicación** (`youtube-nocookie.com`), no saca a nadie a YouTube a mitad de entreno. El enlace se valida antes de guardar: acepta las cuatro formas de URL de YouTube (barra de direcciones, «Compartir», Shorts y embed) y rechaza el resto.
- **El admin gestiona las rutinas de otros**: desde `/amigos/:userId/rutinas` puede crear, editar y eliminar. Usa el mismo formulario que las propias; lo único que cambia es el `userId` de la ruta, que decide a qué servicio se habla. Las tres operaciones de escritura viven en `routines.ts` (`createRoutineFor`, `updateRoutineFor`, `deleteRoutineFor`) y las comparten los dos routers, para que añadir un campo no deje una copia atrás.
- **Rutinas de Filo cargadas**: «Rutina Empuje 2», «Rutina Tirón 2» y «Rutina Pierna 2», de la hoja 3 del Excel. El script es `backend/prisma/seed-routines-filo.ts`, idempotente y con simulación por defecto (sin `--apply` solo enseña lo que haría). Reutiliza los ejercicios que Filo ya tenía en vez de duplicarlos, porque el progreso se sigue por ejercicio y duplicar habría partido su historial en dos.

### Dieta (`/dieta`)

Pantalla nueva, con el botón en el perfil. **El botón solo lo ve el admin**, pero la API y la ruta son por usuario: abrirla al resto es quitar un `@if`, no rehacer nada.

- Objetivos del día: kcal, proteínas, carbohidratos, grasas.
- Desayuno, comida y cena, cada una con **varias opciones**. Cada opción tiene sus alimentos con cantidades y sus notas.
- **Los suplementos y la indicación son de la comida entera, no de la opción**: se toman con el desayuno / la comida / la cena, se elija lo que se elija. Al principio se modelaron por opción; las hojas originales dejaron claro que no era así.
- **Calendario semanal**: siete días por tres comidas. Cada casilla muestra el **nombre de la opción y sus alimentos**, y al pulsarla se eligen las opciones viéndolas con su contenido delante. Sustituye a la tabla de números, cuyo problema era tener que ir a mirar a otro sitio qué llevaba cada número.
- Lista de la compra por las diez secciones de súper, con marcar/desmarcar y «quitar lo ya comprado».
- Se guarda entera de una vez, igual que una rutina. El calendario viaja **por índice** dentro del mismo cuerpo, porque las opciones se recrean en cada guardado y su id no existe todavía cuando el cliente arma la petición.

La dieta real está cargada: 15 opciones, 54 alimentos, 8 suplementos, 46 artículos de compra y 10 casillas de semana. La carga `backend/prisma/seed-diet-david.ts`, idempotente y con el email como argumento opcional.

---

## 5. Iconos y pantalla de inicio

El icono es la figura dorada sobre baldosa oscura, recortada de la imagen original sin redibujarla. Hubo dos problemas y los dos están resueltos:

**Residuo blanco en las esquinas.** La baldosa del original es un **squircle** (curvatura continua, estilo iOS), no un rectángulo redondeado, y se estaba recortando con la forma equivocada; por los huecos entre una curva y otra se colaba el blanco del montaje —unos 250 píxeles por esquina—. Ahora la silueta no se supone, **se mide**: para cada fila se busca dónde empieza y acaba lo oscuro, lo cual vale porque un squircle es convexo por filas, así que el recorte sigue el contorno real. Después se erosionan dos píxeles del borde para comerse la franja mezclada con el blanco. Comprobado: cero píxeles claros en las cuatro esquinas.

**El círculo blanco de Android.** Sin `manifest`, Chrome mete el icono pequeño dentro de un círculo blanco que se inventa. Con `manifest.webmanifest` y los iconos `maskable`, el dibujo llena el círculo entero: se encoge al 80 % —la zona segura de la especificación, porque la máscara circular recorta un 10 % por lado— y el fondo sangra hasta el borde. Para el enmascarable se separan figura y fondo en vez de pegar la baldosa dentro del lienzo, que dejaba ver su borde curvo; y el fondo va **plano**, porque el degradado de la baldosa recorre solo 12 niveles de luminancia y al pasar a paleta se rompía en cuatro escalones que se veían más que el propio degradado.

**El redondeo en sí no se puede quitar.** Los *adaptive icons* de Android son del sistema: la máscara la pone el lanzador y ni el navegador ni el manifest pueden desactivarla. Lo que se consigue es que el icono llene esa forma en vez de flotar dentro de ella.

Ocho ficheros en `frontend/public/icons/`: `favicon-16x16`, `favicon-32x32`, `apple-touch-icon` (180 px, aplanado sobre `#0D1620` porque iOS no admite transparencia), `light-weight-icon` (256 px, el del splash y el rail), `icon-192x192`, `icon-512x512` y los dos `icon-maskable-*`. Todos a paleta de 256 colores: en color verdadero el de 512 pesaba 322 kB, así baja a 39 kB sin bandeado visible.

El manifest declara **`display: standalone`**, así que desde la pantalla de inicio la aplicación abre a pantalla completa, sin barra de direcciones. Si eso llega a molestar —no poder ver la URL ni compartir desde ahí—, cambiar a `"browser"` en `frontend/public/manifest.webmanifest` y vuelve a comportarse como una pestaña normal.

> **Al desplegar un icono nuevo hay que rehacer el acceso directo.** Android guarda el icono en el momento de crear el acceso y no lo refresca solo: quitarlo de la pantalla de inicio y volver a añadirlo. En escritorio, el favicon lo cachea el navegador con ganas; recarga forzada.

---

## 6. Los códigos de acceso: funcionando, por reenvío

**Cerrado.** La línea del arranque dice `[mailer] API key OK · reenvío activo: TODOS los códigos van a davidgranadosmolina@gmail.com`, y los códigos llegan. Nunca hubo un fallo distinto del que ya se conocía: la variable sí estaba llegando al proceso. Lo que quedaba de este apartado era comprobarlo.

### Cómo está entregando ahora

El remitente es `onboarding@resend.dev`, la dirección compartida de pruebas de Resend, que **solo entrega al correo dueño de la cuenta**. Ninguna API key arregla eso, y `light-weight-app.onrender.com` no vale para verificar dominio: esa zona DNS es de Render, no tuya.

Por eso está `LOGIN_CODE_RELAY_TO`. Con esa variable **todos los códigos van a un solo buzón** —el tuyo— con el email de quien lo pidió en el asunto. El código se escribe además en el log con la marca `[CODIGO-ACCESO]` (`mailer.ts:54`), por si el correo tarda.

### Lo que esto todavía cuesta

Que funcione no quiere decir que esté terminado. Con el reenvío puesto:

- **Ningún otro usuario puede entrar solo.** Cuando Filo pide un código, el código llega a tu buzón, no al suyo; hay que leerlo y pasárselo. Para ti es transparente —tu propio código llega a tu propio correo, que es el mismo buzón—, y por eso desde dentro parece que todo va bien.
- Quien administra ve el código de cualquier usuario y puede entrar en cualquier cuenta. Hoy no importa: el único administrador eres tú y las cuentas las das de alta tú. Queda dicho por si algún día administra otro.

### El arreglo definitivo

Verificar un dominio propio en Resend → Domains (ojo con no crear un segundo registro SPF; se fusiona con el que ya haya), cambiar `FROM_ADDRESS` en `backend/src/lib/mailer.ts` a una dirección de ese dominio y **borrar `LOGIN_CODE_RELAY_TO`** de las variables y de `render.yaml`. Los códigos irán solos a su destinatario sin tocar más código.

**No se puede adelantar.** Cambiar el remitente antes de verificar el dominio hace que Resend rechace *todos* los envíos, incluidos los que hoy sí llegan.

### La línea de diagnóstico, para la próxima

Se imprime **en el arranque**, después de `fitness-api escuchando en…` (`index.ts:68`), en el servicio `light-weight-api` y no en el estático. Si el servicio lleva días levantado no la verás en la cola del log: hay que subir hasta el último despliegue o reiniciar.

| Línea | Significado |
|---|---|
| `[mailer] SIN RESEND_API_KEY: …` | La API key no llega al proceso. |
| `[mailer] API key OK · SIN reenvío: …` | La key llega pero `LOGIN_CODE_RELAY_TO` no. |
| `[mailer] API key OK · reenvío activo: …` | **El caso actual.** |

Nunca imprime la API key, solo si está o no.

---

## 7. Fiabilidad: errores que ahora se ven

**`asyncHandler` en los 32 handlers** (`backend/src/lib/async-handler.ts`), más `requireAdmin`. Express 4 no hace `await` de los handlers: si un `async` rechazaba, la promesa no volvía a Express y **la petición se quedaba colgada** hasta el timeout del cliente. Ahora el rechazo pasa por `next(error)` y el middleware devuelve un 500 en JSON. Comprobado levantando la API con una `DATABASE_URL` inválida: 500 en 2,1 s y cero `unhandledRejection`.

**Fuera los `catch` que disfrazaban de 404 cualquier fallo.** `PUT` y `DELETE` de rutinas devolvían «Rutina no encontrada» ante *cualquier* error. Eso escondió un problema real durante el desarrollo. Ahora el 404 es solo cuando la rutina de verdad no está.

**Agujero de lectura cerrado.** `GET /api/routines/:id` filtraba solo por `id`: cualquier usuario autenticado podía leer la rutina de otro sabiendo su id. Ahora filtra también por dueño. Verificado: leer, editar o borrar una rutina ajena devuelve 404, y los endpoints de admin devuelven 403 a quien no lo es.

---

## 8. Diseño

`PRODUCT.md` (verdad de producto) y `DESIGN.md` (tokens en frontmatter YAML + 8 secciones canónicas) siguen siendo la autoridad. Todo color, espaciado y tipografía sale de ahí.

- **Escritorio nativo**, no móvil estirado: `side-rail` en ≥900px (solo iconos entre 900–1099px), `tab-bar` en móvil.
- **Accesibilidad del acento**: cuatro de los ocho acentos daban 2,4:1–3,5:1 sobre el fondo oscuro. Resuelto con *relative color syntax* — suelo de luminosidad en oscuro, y en claro una función escalón que elige tinta blanca o negra. Verificado con los ocho acentos en ambos temas.
- **`--avatar-canvas: #FFFFFF`**: el fondo de todo avatar, **idéntico en los dos temas**. Los SVG son dibujos de trazo negro sobre transparente y sobre cualquier plano oscuro el contorno desaparecía. Es la única superficie que no se invierte con el tema, y está documentado como tal.

### Excepciones sancionadas
- Borde de acento de 2px en la tarjeta «completado» (pedido explícitamente) — única excepción al grosor de 1px.
- `#ffbf00` en `index.html` como `accent-default` del splash.
- Dos `ignore-value` en el detector: `broken-image` en `profile.html` (binding a blob URL) y `marquee` en `index.html` (barra de arranque indeterminada).

---

## 9. Estado de la compilación

- Backend `tsc --noEmit`: **0 errores**.
- Build de producción: **~498 kB initial / ~117 kB transferidos**, sin avisos de presupuesto.
- Presupuestos: `initial` warning en 560 kB; `anyComponentStyle` warning 14 kB, error 18 kB.

---

## 10. Pendiente

### Bloqueante
Nada.

### Conviene, sin prisa
- **Ver la pantalla de Dieta con tu propia cuenta.** Se verificó entera sobre el usuario de prueba, con tus mismos datos cargados y borrados después; lo que no se ha visto es tu cuenta real. Ya no hay nada que lo impida: el acceso por código funciona.
- **Verificar dominio propio en Resend** y con él cerrar el apartado 6 del todo: cambiar `FROM_ADDRESS` en `backend/src/lib/mailer.ts` y borrar `LOGIN_CODE_RELAY_TO` de las variables y de `render.yaml`. Hasta que el dominio esté verificado no se puede tocar el remitente: un dominio sin verificar hace que Resend rechace **todos** los envíos, incluidos los que hoy sí llegan por reenvío.

### Cerrado desde el handoff anterior
- **Los códigos de acceso**: llegan. El reenvío estaba bien configurado; apartado 6.
- La deuda de esquema: limpiada en la quinta migración, ya aplicada; apartado 3.
- El acceso directo del Pixel: descartado a propósito.
- `GOOGLE_CLIENT_ID`: quitado de las variables de Render y de `render.yaml`.
- `User.googleId`: borrado en la misma migración.
- `graphify update .`: lanzado, el grafo vuelve a estar al día.

---

## 11. Notas de entorno

- **El backend en marcha se queda con el cliente de Prisma antiguo** después de un `prisma generate`. `tsx watch` vigila el código fuente, no `node_modules`, así que tras generar hay que tocar un fichero de `src/` para forzar el reinicio. Ha pasado dos veces y las dos se manifestó como un 500 o un 404 desconcertante.
- **`prisma migrate deploy` no se puede lanzar desde aquí**: el clasificador de permisos lo bloquea por escribir en producción. Tampoco hace falta a mano: el `buildCommand` del servicio de API en `render.yaml` termina en `npx prisma migrate deploy`, así que cada despliegue lo ejecuta. La consecuencia es que **una migración destructiva se aplica en cuanto se empuja**, sin un paso aparte donde pararse a pensar.
- **El panel del navegador oculto congela las transiciones CSS** en `currentTime: 0` y bloquea `requestAnimationFrame`, y pinta negro al hacer scroll. Da valores computados falsos. Para medir, `getAnimations().forEach(a => a.finish())` o un viewport alto en vez de scroll. **No es un bug de la aplicación.**
- **`graphify` se invoca como `python -m graphify`**, no por npm ni como binario suelto en el PATH.
