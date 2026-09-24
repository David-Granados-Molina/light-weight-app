# HANDOFF — Light Weight

Estado del proyecto al **24 de septiembre de 2026**.
Rama activa: **`main`**, HEAD en `534ad13`, árbol limpio, **todo subido y desplegado en Render**.

---

## 1. Dónde estamos

Sobre las dos tandas de la versión 2 hay ahora una **tercera, fusionada por la primera pull request del proyecto** ([#1](https://github.com/David-Granados-Molina/light-weight-app/pull/1)): cinco fallos vistos usando la aplicación, más dos agujeros de permisos que aparecieron por el camino. Ver el apartado 12.

**No queda nada bloqueante.** Los códigos de acceso llegan; lo que sigue costando es que los de los demás usuarios pasan por tu buzón, y eso lo cierra un dominio verificado. Ver el apartado 6.

La estructura huérfana está limpia: la quinta migración, la primera destructiva del proyecto, se aplicó en el despliegue. Ver el apartado 3.

**Esta tanda no trae migraciones**: no se toca el esquema.

---

## 2. Mapa de ramas

| Rama | HEAD | Para qué sirve |
|---|---|---|
| `main` | `534ad13` | **Producción.** Despliega en Render al hacer push. |
| `fix/entrenos-duplicados-borrado-historial` | `db4b6c5` | La tercera tanda, fusionada en `main` por la PR #1. Histórica. |
| `v1.0` | `325fd7e` | **Copia de seguridad** de la producción anterior a la versión 2. No tocar. |
| `v2.0` | `2ec512b` | La rama donde se revisó la tanda, ya fusionada en `main`. Histórica. |
| `rediseno/hoja-de-registro` | `1d62138` | La variante de diseño elegida. Histórica. |
| `rediseno/consola-de-sesion` | `aaaa65b` | La variante descartada, salvo la consola de sesión, que se recuperó de aquí. Histórica. |

`v1.0` es el punto de retorno si algo sale mal: es exactamente lo que había en producción antes de todo esto.

### Los commits de `main`

La primera tanda, la de la versión 2:

| Commit | Qué trae |
|---|---|
| `2ec512b` | Acceso por código, dieta, calentamiento, gestión de rutinas ajenas, `asyncHandler` |
| `3ac657d` | Rutinas de la hoja 3 del Excel para Filo; línea de diagnóstico del correo al arrancar |
| `4f4a686` | Icono nuevo de la aplicación |
| `e85f3af` | Recorte correcto del icono y `manifest.webmanifest` para Android |

La segunda:

| Commit | Qué trae |
|---|---|
| `1ad03f3` | Limpieza del esquema huérfano en una sola migración, la primera destructiva |
| `59b10f2` · `09d23bf` · `c05cc7a` | `googleId` en la limpieza, variables de correo en `render.yaml` y el handoff al día |
| `9c98a58` | **La nota del ejercicio se perdía al crear el entreno** (apartado 7) |
| `d753759` | La consola de sesión: el entreno en curso, en todas las pantallas |
| `8f32358` | Series anteriores en móvil, y el vídeo del ejercicio dentro de la aplicación |
| `597638e` | La nota es del entreno; la descripción, de la rutina |
| `09f2a69` | Tres retoques de colocación sobre lo anterior |

La tercera, entrada por la PR #1 (`1fed38d` es el commit de fusión):

| Commit | Qué trae |
|---|---|
| `b049a1d` | Los cinco fallos de la tanda y el dueño en las rutas de entrenos por id |
| `d02cf0b` | La cuenta de demostración no entraba en local; el diálogo decía «del hoy» |
| `01016d3` | Esa cuenta nunca es admin; el botón de Inicio dice de qué día es el borrador |
| `db4b6c5` | Mensaje del código de acceso más corto y analítica del CLI apagada |

Y después de la fusión, directos sobre `main`:

| Commit | Qué trae |
|---|---|
| `aa6065d` | Este handoff con la tercera tanda |
| `e897117` | El buscador del selector de ejercicios coge el foco al abrirlo |
| `534ad13` | En el rail estrecho, registrar entreno es solo el `+` |

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

- **Calentamiento por rutina** (descripción y/o vídeo), independiente de los ejercicios. Se define con el botón «Añadir calentamiento» del formulario y aparece en la hoja de registro como una banda **CALENTAMIENTO** entre el buscador y el primer ejercicio. El vídeo **se incrusta dentro de la aplicación**, no saca a nadie a otra pestaña a mitad de entreno.
- **El admin gestiona las rutinas de otros**: desde `/amigos/:userId/rutinas` puede crear, editar y eliminar. Usa el mismo formulario que las propias; lo único que cambia es el `userId` de la ruta, que decide a qué servicio se habla. Las tres operaciones de escritura viven en `routines.ts` (`createRoutineFor`, `updateRoutineFor`, `deleteRoutineFor`) y las comparten los dos routers, para que añadir un campo no deje una copia atrás.
- **Rutinas de Filo cargadas**: «Rutina Empuje 2», «Rutina Tirón 2» y «Rutina Pierna 2», de la hoja 3 del Excel. El script es `backend/prisma/seed-routines-filo.ts`, idempotente y con simulación por defecto (sin `--apply` solo enseña lo que haría). Reutiliza los ejercicios que Filo ya tenía en vez de duplicarlos, porque el progreso se sigue por ejercicio y duplicar habría partido su historial en dos.

### Notas y descripción: dos cosas que se llamaban igual

Se separaron, porque compartir nombre las hacía intercambiables y no lo son:

- La **nota** es lo que se apunta en el momento de hacer la serie —«hoy ha salido floja»— y vive en el entreno (`SessionExercise.note`). Se escribe en «Registrar» y se lee después en Historial, Calendario e Inicio. En Historial la fila cerrada lleva una marca junto a la categoría cuando guarda notas dentro.
- La **descripción** («Cómo hacerlo») es lo permanente de ESE ejercicio en ESA rutina, y vive en la rutina.

Por eso **el modal de detalles de la rutina ya no tiene campo de nota**: solo «Cómo hacerlo» y «Vídeo». La rutina tampoco precarga ya una nota en el entreno, que era el camino por el que un texto permanente acababa copiado en cada sesión.

**Las notas que había ya están pasadas a la descripción.** Eran cinco, con texto real («3 seg excéntrico», «Barra: 20kg»), y se habrían perdido de una en una: el formulario ya no envía el campo y las filas se recrean en cada guardado, así que la primera vez que se guardase cada rutina se iban. Las movió `prisma/migrate-routine-notes-to-description.ts`, idempotente y con simulación por defecto como el resto; relanzarlo ahora dice que no queda ninguna.

`RoutineExercise.note` se queda en la base, ya vacía. Es deuda del mismo tipo que la del apartado 3 y se borra en la siguiente migración de limpieza.

### Vídeos: YouTube, TikTok e Instagram

Los tres, en los dos sitios donde se puede pegar un enlace —el vídeo del calentamiento y el del ejercicio—, y los tres se incrustan dentro de la aplicación. Se ven desde la hoja de registro y también desde el formulario de la rutina, con un botón en la propia fila del ejercicio: al montar una rutina se comprueban varios vídeos seguidos, y abrir la ficha de detalles para cada uno es un paso de más. `frontend/src/app/core/utils/video.ts` reconoce las formas que reparte cada sitio: barra de direcciones, «Compartir», Shorts, Reels y las de vídeo ya incrustado.

Dos límites que conviene saber antes de pegar un enlace y extrañarse:

- **Los acortados de TikTok (`vm.tiktok.com/…`) no valen**: no llevan dentro el id del vídeo, así que no hay nada que incrustar sin seguir la redirección. Hay que usar el enlace largo, el de `/@usuario/video/…`.
- **El diálogo lo pinta el sitio de origen, no nosotros.** El incrustado de TikTok enseña su propio aviso de cookies dentro del marco la primera vez, y algunos vídeos de Instagram piden sesión. No es un fallo de la aplicación y no se puede quitar desde aquí.

Un enlace de cualquier otro sitio no se rechaza: se guarda, se avisa de que no se puede ver dentro y se ofrece abrirlo fuera.

### La consola de sesión: el entreno en curso, en todas las pantallas

Recuperada de la rama `rediseno/consola-de-sesion`, que por lo demás sigue descartada. `WorkoutDraftStore` ya guardaba el entreno a medias, pero la única señal de que existía era un punto de 6 px sobre el icono de registrar; ahora ese estado es un objeto visible desde cualquier pantalla, con los ejercicios metidos y un botón para volver.

Un solo DOM y tres presentaciones: barra acoplada sobre la tab-bar en móvil, tarjeta flotante entre 900 y 1279 px, y tercera columna pegajosa a partir de 1280. En la barra del móvil el botón dice solo **«Continuar»**: con las dos palabras no cabía y se comía la fecha de al lado. Quién la muestra lo decide `App`, que es lo único que conoce a la vez la ruta y el hueco que hay que reservar al pie: se esconde dentro de «Registrar», donde el entreno ya es la pantalla entera.

### Lo que trajo la tercera tanda

Eliminar entrenos deslizando la fila en Historial e Inicio, el filtro **General** del historial de 5 en 5, el aviso antes de guardar un segundo entreno el mismo día y copiar una rutina a otra cuenta. Todo en el apartado 12.

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

**Las notas del entreno no se guardaban.** El `POST` de sesiones mapeaba `exerciseId`, `order`, `inputTypeOverride` y las series, y se dejaba `note` fuera; el `PUT` sí la escribía. O sea: la nota sobrevivía si editabas un entreno ya guardado, y se perdía siempre que registrabas uno nuevo —que es justo cuando se escribe—. Se veía como «las notas no aparecen en ningún sitio», y por eso parecía un problema de las pantallas que las muestran, que llevaban meses correctas. Reproducido con el usuario de prueba antes de tocar nada y verificado después: nota escrita, entreno guardado, nota en la base y en Historial.

**Agujero de lectura cerrado.** `GET /api/routines/:id` filtraba solo por `id`: cualquier usuario autenticado podía leer la rutina de otro sabiendo su id. Ahora filtra también por dueño. Verificado: leer, editar o borrar una rutina ajena devuelve 404, y los endpoints de admin devuelven 403 a quien no lo es.

**El mismo agujero seguía abierto en entrenos**, y se cerró en la tercera tanda junto con el de la cuenta de demostración. Apartado 12.

---

## 8. Diseño

`PRODUCT.md` (verdad de producto) y `DESIGN.md` (tokens en frontmatter YAML + 8 secciones canónicas) siguen siendo la autoridad. Todo color, espaciado y tipografía sale de ahí.

- **Escritorio nativo**, no móvil estirado: `side-rail` en ≥900px (solo iconos entre 900–1099px), `tab-bar` en móvil.
- **La casilla fantasma también en móvil.** Lo que se levantó en esa misma serie el último día estaba solo a partir de 900px, o sea en todas partes menos donde se entrena. Ahora va en la fila del número de serie, con un «ÚLTIMA VEZ · fecha» encima del bloque: en el móvil no hay tooltip que consultar, y repetir la fecha en cada casilla tapaba lo que se viene a leer.
- **El marco de vídeo (`.lw-video`) vive en `styles.css`**, no en un componente: lo comparten el diálogo del calentamiento y el del ejercicio, y duplicarlo sacaba a `register-workout.css` de su presupuesto de 14 kB.
- **Accesibilidad del acento**: cuatro de los ocho acentos daban 2,4:1–3,5:1 sobre el fondo oscuro. Resuelto con *relative color syntax* — suelo de luminosidad en oscuro, y en claro una función escalón que elige tinta blanca o negra. Verificado con los ocho acentos en ambos temas.
- **`--avatar-canvas: #FFFFFF`**: el fondo de todo avatar, **idéntico en los dos temas**. Los SVG son dibujos de trazo negro sobre transparente y sobre cualquier plano oscuro el contorno desaparecía. Es la única superficie que no se invierte con el tema, y está documentado como tal.

### Excepciones sancionadas
- Borde de acento de 2px en la tarjeta «completado» (pedido explícitamente) — única excepción al grosor de 1px.
- `#ffbf00` en `index.html` como `accent-default` del splash.
- Dos `ignore-value` en el detector: `broken-image` en `profile.html` (binding a blob URL) y `marquee` en `index.html` (barra de arranque indeterminada).

---

## 9. Estado de la compilación

- Backend `tsc --noEmit`: **0 errores**.
- Build de producción: **508,45 kB initial / 120,17 kB transferidos**, sin avisos de presupuesto. La tercera tanda apenas movió la cifra: +0,14 kB.
- Presupuestos: `initial` warning en 560 kB; `anyComponentStyle` warning 14 kB, error 18 kB.

---

## 10. Pendiente

### Bloqueante
Nada.

### Conviene, sin prisa
- **Borrar `RoutineExercise.note`**, ya vacía, en la próxima migración de limpieza (apartado 4). De una vez con lo que haya, no de una en una.
- **Ver la pantalla de Dieta con tu propia cuenta.** Se verificó entera sobre el usuario de prueba, con tus mismos datos cargados y borrados después; lo que no se ha visto es tu cuenta real. Ya no hay nada que lo impida: el acceso por código funciona.
- **Verificar dominio propio en Resend** y con él cerrar el apartado 6 del todo: cambiar `FROM_ADDRESS` en `backend/src/lib/mailer.ts` y borrar `LOGIN_CODE_RELAY_TO` de las variables y de `render.yaml`. Hasta que el dominio esté verificado no se puede tocar el remitente: un dominio sin verificar hace que Resend rechace **todos** los envíos, incluidos los que hoy sí llegan por reenvío.

- **Borrar la rama `pruebas-pr-1` en Neon**, la copia que se usó para probar la tercera tanda. Dentro quedaron un par de entrenos de prueba y una copia de la rutina «Tirón» en la cuenta de Adri; nada de eso está en producción.

### Cerrado desde el handoff anterior
- **Los cinco fallos de uso y los dos agujeros de permisos**: apartado 12.
- **Los códigos de acceso**: llegan. El reenvío estaba bien configurado; apartado 6.
- La deuda de esquema: limpiada en la quinta migración, ya aplicada; apartado 3.
- El acceso directo del Pixel: descartado a propósito.
- `GOOGLE_CLIENT_ID`: quitado de las variables de Render y de `render.yaml`.
- `User.googleId`: borrado en la misma migración.
- Las notas de rutina: pasadas a la descripción; apartado 4.
- **Las notas del entreno**: se guardaban a medias y ya no; apartado 7.
- `graphify update .`: lanzado, el grafo vuelve a estar al día.

---

## 11. Notas de entorno

- **El backend en marcha se queda con el cliente de Prisma antiguo** después de un `prisma generate`. `tsx watch` vigila el código fuente, no `node_modules`, así que tras generar hay que tocar un fichero de `src/` para forzar el reinicio. Ha pasado dos veces y las dos se manifestó como un 500 o un 404 desconcertante.
- **`prisma migrate deploy` no se puede lanzar desde aquí**: el clasificador de permisos lo bloquea por escribir en producción. Tampoco hace falta a mano: el `buildCommand` del servicio de API en `render.yaml` termina en `npx prisma migrate deploy`, así que cada despliegue lo ejecuta. La consecuencia es que **una migración destructiva se aplica en cuanto se empuja**, sin un paso aparte donde pararse a pensar.
- **El panel del navegador oculto congela las transiciones CSS** en `currentTime: 0` y bloquea `requestAnimationFrame`, y pinta negro al hacer scroll. Da valores computados falsos. Para medir, `getAnimations().forEach(a => a.finish())` o un viewport alto en vez de scroll. **No es un bug de la aplicación.**
- **`graphify` se invoca como `python -m graphify`**, no por npm ni como binario suelto en el PATH. El paquete de PyPI se llama **`graphifyy`**, con dos íes griegas, y el extra de SQL (`graphifyy[sql]`) es lo que hace que las migraciones entren en el grafo.
- **En PowerShell, `npm` resuelve a `npm.ps1`**, y con la política de ejecución en `Restricted` —el valor por defecto de una instalación nueva de Windows— no se ejecuta. Las tareas de VS Code llaman a **`npm.cmd`**, que no pasa por esa política, para no depender de un ajuste de seguridad de la máquina. A mano, o se usa `npm.cmd` o se levanta la política con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **`.vscode/tasks.json` levanta los dos servidores con Ctrl+Shift+B**, cada uno en su terminal. Está en `.gitignore`, así que **no se sube y se pierde al formatear**.
- **`tsx watch` no vigila el `.env`.** Cambiar `DATABASE_URL` o `ADMIN_EMAIL` no reinicia nada: hay que tocar un fichero de `src/`. Y `dotenv` **no pisa** una variable que ya esté en el entorno del proceso.
- **Una variable vacía en el `.env` no es lo mismo que una variable ausente.** `process.env.X ?? 'defecto'` devuelve la cadena vacía, no el valor por defecto, y `.env.example` deja varias vacías. Por eso la cuenta de demostración no entraba en local (apartado 12); en el código vivo se usa `||`, pero el resto de valores por defecto con `??` siguen ahí.
- **Para probar contra datos reales sin tocarlos, una rama de Neon.** Se crea en el panel en segundos, es copia completa y su cadena se pega en `backend/.env`. Conviene comprobar el aislamiento antes de borrar nada: crear un usuario marcador en la rama y preguntar por él a la API de producción, que debe responder 404. Al terminar, restaurar la cadena original y borrar la rama.

---

## 12. La tercera tanda: cinco fallos de uso y dos de permisos

Entró por la **PR #1**, la primera del proyecto. Cuatro correcciones, una función nueva y dos agujeros de permisos que aparecieron al hacerlas. Probada sobre una rama de Neon con la cuenta de demostración; el apartado 11 cuenta cómo.

### El mismo entreno se guardaba dos veces

Eran dos fallos con una raíz común: **el borrador solo se limpiaba al cerrar el diálogo de «Entreno guardado»**, y cerrarlo es opcional. Quien guardaba y salía dejaba el entreno entero en `localStorage`; al volver, la aplicación le ofrecía «Continuar el entreno de hoy» por algo que ya estaba guardado, y continuarlo lo guardaba otra vez.

Ahora `WorkoutDraftStore` tiene `committed`: en cuanto el servidor responde, el borrador deja de serlo, se borra del disco y `hasInProgress` pasa a falso. Los ejercicios siguen en memoria porque el resumen y el texto de compartir los necesitan.

La otra mitad: entrar a Registrar **para hoy** parte siempre de una pantalla en blanco —decisión deliberada, comentada en el constructor—, y nada comprobaba si ese día ya tenía entreno. Antes de crear uno nuevo se pregunta ahora por la fecha; si ya hay algo, sale un diálogo que dice qué hay y ofrece **actualizar el que hay**, **guardar aparte** o volver. Editar no pregunta: ahí ya se sabe a qué entreno se escribe.

Se permiten dos entrenos el mismo día a propósito (gym por la mañana, calistenia por la tarde); lo que no se permite es hacerlo sin enterarse. El permiso de «guardar aparte» dura un guardado y se retira al cerrar o al cambiar de día.

Para la tercera salida, `ConfirmDialog` admite un `altText` opcional. Vacío por defecto, así que los seis diálogos que ya lo usaban no cambian; con tres botones se apilan en columna, porque en 420 px no caben en fila.

**Los duplicados que ya había no se tocaron**: esto evita los siguientes, los viejos se borran a mano.

### El hover apagaba el ejercicio marcado

La cabecera del acordeón de PrimeNG pintaba `--surface-raised` al pasar por encima, y como es la única superficie del panel, tapaba el ámbar de `.ex-panel.is-done`. En un dedo el `:hover` se queda pegado tras tocar, así que el ejercicio se quedaba apagado hasta tocar otra cosa. Se veía sobre todo **editando**, porque un entreno guardado entra con todos los ejercicios marcados.

Las tres variables de fondo valen ahora `transparent`. La fila se sigue anunciando pulsable por el cursor y por el chevrón.

### Eliminar entrenos, deslizando la fila

En Historial e Inicio el lápiz de la esquina se cambió por un carril que **se desliza en horizontal** y descubre Editar y Eliminar. Es `scroll-snap`, CSS puro: ancla la fila donde se suelte, sin gestos en JavaScript. A partir de 900 px el carril deja de desplazarse y los dos botones se quedan a la vista, solo icono: deslizar con rueda o trackpad es torpe cuando sobra ancho.

Eliminar confirma con el día y el tipo delante, y la fila desaparece **solo cuando el servidor lo confirma**; si falla, el diálogo reintenta sobre el mismo entreno. En Inicio se vuelve a pedir el resumen entero en vez de quitar la tarjeta a mano, porque de ese entreno cuelgan el contador de la semana y las barras de días.

### El historial escondía lo anterior a un parón

«Todas las fechas» pedía **semana a semana hacia atrás** y se plantaba tras dos semanas vacías seguidas. Con el último entreno el 7 de septiembre y el calendario en el 23, el historial salía vacío: el backend estaba bien, la estrategia de carga no.

Ahora la pestaña se llama **General** y pide entrenos, no días: `limit=5` y `offset`, con «Cargar más», y queda más si la tanda vino llena. Probado hasta el final: 160 entrenos seguidos, atravesando todos los huecos. `GET /api/sessions` y el equivalente de admin aceptan `offset`; el historial de un amigo es la misma pantalla y pide igual.

### Copiar una rutina a otra cuenta

Botón en Rutinas (solo para el admin) y en las rutinas de un amigo, los dos abren el mismo `RoutineCopyDialog`. Es **copia, no compartir**: la rutina que llega es suya y puede cambiarla sin que la original se entere. Los ejercicios no se duplican —apuntan al mismo catálogo compartido—, así que el progreso de los dos sigue contando por el mismo ejercicio, igual que se hizo al cargar las rutinas de Filo.

El endpoint es `POST /api/admin/routines/:routineId/copy` y no cuelga de `/users/:userId` porque el origen puede ser una rutina ajena o propia. La lógica está en `copyRoutineTo`, junto a las otras tres funciones de `routines.ts` que llevan el dueño como parámetro.

### Permisos: entrenos ajenos y la cuenta pública

**`GET`, `PUT` y `DELETE /api/sessions/:id` filtraban solo por id.** Cualquier usuario autenticado podía leer, editar o borrar el entreno de otro sabiendo su id: el mismo agujero que se cerró en rutinas (apartado 7), pero en entrenos seguía abierto. Con un botón de borrar en la interfaz ya no era asumible. Las tres rutas filtran también por dueño, y el borrado usa `deleteMany` con el `userId` dentro del filtro: una sola consulta, sin orden que equivocar.

**La cuenta de demostración no puede ser admin.** Entra sin email ni código y la conoce cualquiera; si se configurase como `ADMIN_EMAIL`, ese cualquiera podría crear, editar y borrar las rutinas de los demás y ver sus historiales. La regla de quién es admin vivía repetida en `toPublicUser` —que solo viste la interfaz— y en `requireAdmin` —que es la puerta de verdad—, así que se unificó en `isAdminEmail` (`lib/accounts.ts`), que excluye esa cuenta pase lo que pase con la variable. Comprobado con `ADMIN_EMAIL=test@test.com`: el token sale con `isAdmin` falso y `/api/admin/users` responde 403.

### Dos cosas más, encontradas al probar

- **La cuenta de demostración no entraba en local.** `.env.example` deja `TEST_USER_EMAIL` vacío y el código resolvía el valor por defecto con `??`: se buscaba un usuario con email `""`. En producción la variable no está declarada, así que allí nunca se notó. La cuenta existe en la base desde siempre; era el código.
- **El diálogo de eliminar decía «del hoy»**, y el botón de Inicio ofrecía «Continuar el entreno de hoy» aunque el borrador fuese de otro día. La preposición la pone ahora `dayPhrase` en `format.ts`: «de hoy», «de ayer», «del lunes» o «del 28/12/26».

### Dos retoques después de la fusión

- **El buscador del selector de ejercicios coge el foco al abrirlo.** Antes había que pulsar el campo antes de poder escribir, un toque de más en mitad del entreno. El `p-multiselect` ya lo resuelve con `autofocusFilter`, que viene en `false`. Va en `ExercisePicker`, el componente compartido, así que vale para nueva rutina, editar rutina y registrar entreno, que son las tres pantallas donde se añaden ejercicios. Efecto secundario en el móvil: el teclado se abre al desplegar el selector y acorta la lista hasta que escribes.
- **En el rail estrecho (900–1099 px), registrar entreno es solo el `+`.** La etiqueta se partía en dos líneas y desbordaba el botón de 44 px: el CSS que esconde las etiquetas del rail no la alcanzaba porque era un nodo de texto suelto, sin elemento al que apuntar. Ahora va en un `span` y entra en la misma regla, que oculta a la vista pero deja el nombre para el lector de pantalla. Por debajo de 900 px no hay rail —manda la tab-bar, que ya tenía su `+`— y a partir de 1100 px la etiqueta vuelve.
