---
name: Light Weight
description: Registro de entrenamiento oscuro y de alta densidad, con el acento del usuario como estado y el color de categoría como dato.
colors:
  ground: "#0A0B0D"
  chrome: "#0D0F13"
  surface: "#101319"
  surface-raised: "#161A22"
  surface-hover: "#1D222C"
  scroll-thumb: "#2A303C"
  scroll-thumb-hover: "#39414F"
  avatar-canvas: "#FFFFFF"
  line: "rgba(255, 255, 255, 0.07)"
  line-strong: "rgba(255, 255, 255, 0.13)"
  text: "#F1F3F7"
  text-secondary: "#98A0AE"
  text-muted: "#666E7C"
  accent-raw: "var(--color-accent)"
  accent-default: "#FFBF00"
  accent-solid: "oklch(from var(--color-accent) max(l, 0.68) c h)"
  accent-text: "oklch(from var(--color-accent) max(l, 0.78) min(c, 0.15) h)"
  accent-ink: "oklch(from var(--color-accent) 0.15 min(c, 0.05) h)"
  accent-soft: "oklch(from var(--color-accent) 0.26 min(c, 0.07) h)"
  accent-line: "oklch(from var(--color-accent) 0.42 min(c, 0.12) h)"
  gym: "#22D3EE"
  cali: "#FB923C"
  positive: "#4ADE80"
  negative: "#F87171"
  scrim: "rgb(4 5 7 / 72%)"
  light-ground: "#F7F8FA"
  light-chrome: "#FFFFFF"
  light-surface: "#FFFFFF"
  light-surface-raised: "#F1F3F7"
  light-surface-hover: "#E7EAF0"
  light-scroll-thumb: "#C6CCD6"
  light-scroll-thumb-hover: "#AEB6C2"
  light-line: "rgba(15, 23, 42, 0.10)"
  light-line-strong: "rgba(15, 23, 42, 0.18)"
  light-text: "#12151C"
  light-text-secondary: "#4C5563"
  light-text-muted: "#656D7B"
  light-accent-solid: "var(--color-accent)"
  light-accent-ink: "oklch(from var(--color-accent) clamp(0, (0.62 - l) * 1000, 1) 0 h)"
  light-accent-text: "oklch(from var(--color-accent) min(l, 0.45) min(c, 0.16) h)"
  light-accent-soft: "oklch(from var(--color-accent) 0.95 min(c, 0.04) h)"
  light-accent-line: "oklch(from var(--color-accent) 0.78 min(c, 0.09) h)"
  light-gym: "#0E7490"
  light-cali: "#C2410C"
  light-positive: "#15803D"
  light-negative: "#B91C1C"
  light-scrim: "rgb(15 23 42 / 32%)"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.016em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 450
    lineHeight: 1.5
    letterSpacing: "-0.006em"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  data:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-solid}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-text}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.xs}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "7px 14px"
    height: "34px"
  chip-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "46px"
  rail-link:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "42px"
  rail-link-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
---

# Design

<!-- Contrato de dirección de esta reconstrucción. Sesión code-led: no hubo ronda de comps
     (este entorno no dispone de generación de imagen), así que la ambición vive aquí y se
     audita contra el resultado construido.

     VARIANTE DE ESTA RAMA: "Hoja de registro", el lead de la tirada 92170c1f de
     concept-seed. La otra estructura repartida, "Consola de sesión persistente",
     está construida en la rama rediseno/consola-de-sesion. Ambas comparten el
     mismo sistema de diseño; solo cambia la composición. -->

## Overview

Light Weight es una superficie **Operate**: el usuario está dentro de una tarea, no leyendo ni siendo persuadido. La herramienta debe desaparecer bajo el gesto de "meter el peso que acabo de levantar".

El mundo es un **panel de instrumento oscuro**: negro azulado con capas de elevación reales, retículas de tipo industrial, y color usado exclusivamente como significado. Nada brilla porque sí. La única fuente de calidez es el acento del usuario, y aparece únicamente donde hay estado: acción primaria, selección actual, indicador de progreso.

La estructura de toda la aplicación es la **hoja de registro**: la libreta de entreno que se lleva al gimnasio, con ejercicios en filas y series en columnas. Registrar deja de ser una lista de tarjetas y pasa a ser una retícula donde todos los ejercicios comparten las mismas columnas, y encima de cada casilla aparece lo que se levantó en esa misma serie el último día. Comparar deja de depender de la memoria: la serie de hoy y la de la última vez ocupan la misma columna.

Historial y Rutinas heredan esa retícula —filas ruladas dentro de un solo marco, con cabecera de columnas— para que las tres pantallas de datos se lean con el mismo gesto.

Dos escenas, no dos anchos:

- **Móvil** es el gimnasio: una mano, poca atención, descansos de 90 segundos. Objetivos de toque grandes, jerarquía brutal, la acción siguiente siempre a la vista.
- **Escritorio** es la mesa: planificar rutinas, leer gráficas, repasar el mes. Densidad, varias columnas, teclado.

## Colors

Dos temas: oscuro (por defecto) y claro. `ThemeService` resuelve la opción «sistema» en TypeScript y estampa siempre `data-theme="light"` o `data-theme="dark"` en `<html>`, de modo que la hoja de estilos solo necesita un bloque de tokens claros en vez de repetirlo bajo el atributo y bajo `prefers-color-scheme`. `index.html` resuelve el tema en un script previo al primer pintado para que la pantalla de arranque no dé un fogonazo.

### Primary

`--color-accent` es el valor crudo que `app.ts` escribe en `<html>` desde el `themeColor` del usuario. **Nunca se usa directamente para texto ni para rellenos con texto encima.** Cuatro de los ocho temas (`#9d1d1d` rojo, `#005492` azul, `#69418b` morado, `#32673d` verde) son colores oscuros: sobre el fondo negro dan entre 2,4:1 y 3,5:1 y en la implementación anterior hacían ilegible el botón principal.

Todo consume tokens derivados con sintaxis de color relativa, que preservan el tono elegido y normalizan la luminosidad:

| Token | Derivación | Uso |
|---|---|---|
| `--accent-solid` | `oklch(from var(--color-accent) max(l, 0.68) c h)` | Rellenos de acción primaria, barra de progreso, punto de borrador |
| `--accent-text` | `oklch(from var(--color-accent) max(l, 0.78) min(c, 0.15) h)` | Texto e iconos de acento sobre fondo oscuro |
| `--accent-ink` | `oklch(from var(--color-accent) 0.15 min(c, 0.05) h)` | Texto sobre `--accent-solid` |
| `--accent-soft` | `oklch(from var(--color-accent) 0.26 min(c, 0.07) h)` | Fondo de estado seleccionado (chip activo, enlace de rail activo) |
| `--accent-line` | `oklch(from var(--color-accent) 0.42 min(c, 0.12) h)` | Bordes de elementos seleccionados, anillo de foco |

Hay un bloque de reserva estático antes del `@supports` de color relativo, para navegadores que no lo soportan.

**En tema claro la regla se invierte.** El relleno conserva el color exacto que eligió el usuario (sobre blanco no hace falta aclararlo) y lo que cambia es la tinta, que se decide por luminosidad:

```css
--accent-ink: oklch(from var(--color-accent) clamp(0, (0.62 - l) * 1000, 1) 0 h);
```

Multiplicar por mil satura el `clamp` y lo convierte en un escalón: un acento claro (ámbar, gris, menta) recibe tinta negra y uno oscuro (azul, rojo, morado, verde, rosa) tinta blanca. Es la manera de ramificar por luminosidad en CSS puro mientras `contrast-color()` no esté disponible. `--accent-text` mantiene un techo de `l ≤ 0.45` para seguir siendo legible como texto sobre fondo claro.

Los colores de categoría también cambian en claro: el cian y el naranja del tema oscuro dan 2:1 sobre blanco, así que pasan a `#0E7490` y `#C2410C`.

La paleta clara completa vive en el frontmatter con prefijo `light-`. Los valores sin prefijo son los del tema oscuro, que es el de partida. `--accent-default: #FFBF00` (ámbar) es el valor por defecto cuando el usuario no ha elegido tema; es el único sitio donde el acento aparece como literal, porque la pantalla de arranque de `index.html` se pinta antes de que Angular sepa quién ha iniciado sesión.

### Secondary — categoría como dato

`--color-gym: #22D3EE` (cian) y `--color-cali: #FB923C` (naranja). Elevados desde `#00E5FF` / `#FF6B00` para separarlos del acento en los temas ámbar y menta y para pasar AA sobre el fondo. **Son datos, no decoración**: solo aparecen en puntos de categoría, etiquetas de categoría, puntos de día del calendario y nombres de ejercicio coloreados por su categoría. Ningún elemento decorativo puede usarlos.

### Tertiary — semánticos

`--color-positive: #4ADE80` y `--color-negative: #F87171`, exclusivamente para la variación mensual de Progreso y para errores de formulario. Nunca como color de marca.

### Neutral

Cinco planos, no dos. La diferencia entre `chrome` y `surface` es lo que hace que el rail y la consola se lean como cromo de aplicación y no como contenido:

- `--ground #0A0B0D` — fondo de la aplicación
- `--chrome #0D0F13` — rail lateral, tab-bar, cabecera y pie de la hoja (capa neutra más fría, per Operate)
- `--surface #101319` — tarjetas y contenedores de contenido
- `--surface-raised #161A22` — inputs, chips, elementos dentro de una tarjeta
- `--surface-hover #1D222C` — hover y pulsado

Texto: `#F1F3F7` (14,8:1), `#98A0AE` secundario (7,1:1), `#666E7C` apagado (3,6:1 — solo para texto no esencial y de tamaño ≥14 px, nunca para etiquetas de formulario).

Fuera de los planos, un solo lienzo fijo:

- `--avatar-canvas #FFFFFF` — el fondo de todo avatar, **idéntico en los dos temas**. Los SVG del catálogo son dibujos de trazo negro sobre transparente: sobre cualquier plano oscuro el contorno desaparece y solo queda la mancha de color. No es un plano de la interfaz, es el papel del dibujo, y por eso es la única superficie que no se invierte con el tema.

### Named Rules

- **El acento marca estado, no jerarquía.** Un título no es de acento por ser importante. Lo es un chip seleccionado, la ruta activa, el botón que ejecuta la acción de la pantalla, el borrador sin guardar.
- **Una superficie, un plano.** Una tarjeta dentro de una tarjeta está prohibida. Si algo necesita agruparse dentro de una tarjeta, se separa con una regla de 1 px, no con otra caja.
- **El texto secundario sobre superficie teñida se tiñe de ese tono**, nunca se vuelve gris.

## Typography

Una sola familia: **Archivo** (variable, 400–700, con eje de anchura). Es una grotesca industrial con cifras alineadas de caja alta y aguante en tamaños pequeños; cubre título, interfaz, etiqueta y dato sin necesitar una segunda voz. Reemplaza al par Space Grotesk + Hanken Grotesk, que gastaba dos descargas en una distinción que esta aplicación no necesita.

Escala **fija en rem, no fluida** (Operate: el usuario mira a DPI constante y un `clamp()` en un panel estrecho empeora las cosas). Razón ≈1,2.

| Paso | Tamaño | Peso | Tracking | Uso |
|---|---|---|---|---|
| `--t-display` | 28px / 32px ≥900 | 700 | -0.022em | Título de pantalla |
| `--t-title` | 20px | 650 | -0.016em | Título de tarjeta, nombre de rutina |
| `--t-lead` | 17px | 550 | -0.012em | Nombre de ejercicio |
| `--t-body` | 15px | 450 | -0.006em | Cuerpo |
| `--t-sm` | 13px | 450 | 0 | Texto de apoyo, metadatos |
| `--t-label` | 12px | 600 | 0.06em, mayúsculas | Etiquetas de sección y de campo |
| `--t-xs` | 11px | 550 | 0.02em | Contadores, unidades |

### Named Rules

- **`font-variant-numeric: tabular-nums` en todo lo que sea dato**: series, pesos, repeticiones, fechas, contadores, ejes de gráfica. Un número que cambia no puede mover el layout.
- **Sin `clamp()` en tipografía.** La adaptación es estructural.
- **Las etiquetas en mayúsculas nunca bajan de 11 px ni de 0.06em de tracking.**
- **Ningún kicker ni eyebrow sobre un titular.** El titular se sostiene solo.
- **Medida de 65–75ch solo donde hay prosa** (tip motivacional, mensajes de estado vacío, texto de nota). Los datos pueden correr más densos.

## Layout

Tres regímenes, conmutados por estructura y no por escala tipográfica.

**Móvil (`< 900px`) — el gimnasio.**
Una columna con canalones de 16 px. Tab-bar inferior fija de 5 destinos con el botón central de registrar elevado (afordancia probada; se conserva). Sobre ella, cuando existe borrador y no estás en `/registrar`, se acopla la **barra de sesión**: 56 px, muestra fecha, `N ejercicios · M series` y devuelve a `/registrar`. Ambas respetan `env(safe-area-inset-bottom)`.

**Escritorio (`≥ 900px`) — la mesa.**
Rail de navegación izquierdo de 224 px, fijo (68 px, solo iconos, entre 900 y 1099 px), con logo arriba, los cinco destinos, calendario, y el perfil abajo. Sin tab-bar. El contenido se centra en `--content-max: 880px` y crece a `--content-wide: 1040px` en las pantallas con retícula o gráfica.

A partir de 1024 px Registrar despliega la retícula completa: columna de ejercicio, una columna por serie de `168px`, columna de añadir y columna de quitar. Cuando el entreno tiene más series de las que caben, **la hoja se desplaza en horizontal dentro de su propio marco**; la página nunca lo hace.

Composición por pantalla en escritorio (todas apiladas en una columna en móvil):

- **Inicio**: 2 columnas — resumen de semana + días entrenados + CTA a la izquierda; últimos entrenos a la derecha.
- **Registrar**: la hoja completa a lo ancho — cabecera de día, rutina y catálogo; retícula de ejercicios por series; totales y guardar al pie. Dentro de cada casilla el peso va encima de las repeticiones, como se anota en papel.
- **Historial**: banda de filtros arriba y hoja de sesiones debajo, con columnas Día, Categoría, Entreno y Ejercicios.
- **Progreso**: bloques de ejercicio en rejilla de 2 columnas desde 1280 px, gráfica más alta.
- **Rutinas**: la misma hoja rulada, con columnas Rutina, Categoría y Ejercicios.
- **Amigos**: rejilla de tarjetas `auto-fill` con mínimo de 300 px.
- **Formulario de rutina**: nombre + buscador + creación de ejercicio a la izquierda; lista reordenable a la derecha, lo bastante ancha para que las ruedas numéricas quepan en una fila.
- **Calendario**: rejilla del mes a la izquierda, panel de resumen del día a la derecha.
- **Perfil**: identidad a la izquierda, preferencias y cuenta a la derecha.
- **Autenticación**: tarjeta centrada de 400 px sobre el fondo, sin rail ni tab-bar. No es una superficie de marketing y no se comporta como tal.

### Named Rules

- **Escala de espaciado de 4 px.** Nada de valores sueltos.
- **Más aire encima de un encabezado que debajo** (32/12 en secciones, 24/8 en subsecciones).
- **Los overlays escapan de su contenedor**: los desplegables y modales usan `position: fixed` o el overlay de PrimeNG, nunca `absolute` dentro de un ancestro con `overflow`.
- **El foco nunca se pierde en un cambio de régimen.** El rail y la tab-bar navegan a las mismas rutas y comparten estado activo.

## Elevation & Depth

Cuatro niveles. Todas las sombras llevan desplazamiento y desenfoque; un halo de color a desplazamiento cero es decoración y está prohibido.

- `--shadow-1: 0 1px 2px rgba(0,0,0,.5), 0 2px 6px -2px rgba(0,0,0,.4)` — tarjetas apoyadas.
- `--shadow-2: 0 2px 4px rgba(0,0,0,.4), 0 10px 24px -10px rgba(0,0,0,.7)` — desplegables y avisos flotantes.
- `--shadow-3: 0 4px 8px rgba(0,0,0,.5), 0 24px 56px -16px rgba(0,0,0,.8)` — modales y overlays.
- `--scrim` — el velo detrás de modales y overlays. Un solo token por tema: casi negro al 72 % en oscuro, azul pizarra al 32 % en claro, porque un velo negro sobre una interfaz clara se lee como un agujero y no como una capa.
- `--shadow-rail: 1px 0 0 var(--line)` — el cromo se separa con una regla, no con una sombra.

La profundidad principal no es la sombra sino el **plano**: `chrome` < `ground` < `surface` < `surface-raised`. La sombra solo se usa cuando un elemento flota de verdad por encima del plano de la página.

## Shapes

Radios: `6 / 10 / 14 / 18 / 999`. Los elementos pequeños e interactivos (chips, botones de paso, iconos) van en 6–10; las tarjetas en 14; las hojas y modales en 18; solo los chips de filtro y los puntos van en `full`.

Bordes de 1 px. **Está prohibido el borde lateral de color de más de 1 px** que usaba la implementación anterior en tarjetas de sesión, rutina y ejercicio: la categoría se codifica con el punto y la etiqueta de categoría, más un filete lateral de exactamente 1 px del color de la categoría.

Iconografía: SVG dibujado, trazo de 2 px, extremos y uniones redondeados, caja de 24. Un único vocabulario en toda la app. **Ni emoji ni glifos Unicode como iconos**: las `✕` de cerrar de la implementación anterior pasan a ser SVG.

El `exercise-loader` (la figura de palotes que hace banca, curl, sentadilla, dominada, flexión o fondos) es el componente de firma del producto y se conserva íntegro: es un activo dibujado, no un adorno genérico.

## Components

### Buttons

- **Primaria** (`.lw-btn-primary`): relleno `--accent-solid`, texto `--accent-ink`, 48 px de alto, radio 10, peso 600. Hover sube a `--accent-text`; activo baja 1 px; deshabilitado va a `--surface-raised` con texto apagado y sin cursor.
- **Secundaria** (`.lw-btn-secondary`): `--surface-raised`, borde `--line-strong`, texto normal.
- **Fantasma** (`.lw-btn-ghost`): sin fondo, texto secundario, hover a `--surface-hover`.
- **Destructiva** (`.lw-btn-danger`): texto `--color-negative`, borde teñido; nunca relleno rojo sólido.
- **Icono** (`.lw-icon-btn`): 36×36 (40×40 en móvil), radio 8, área táctil mínima de 44 px por `::before`.

Todos los botones declaran default, hover, focus-visible, active, disabled. Los que disparan red declaran además loading con texto propio ("Guardando…", "Entrando…").

### Chips

Filtros de categoría y de modo de fecha. Reposo: `--surface-raised` + texto secundario. Activo: `--accent-soft` + `--accent-text` + borde `--accent-line`. Los chips de categoría en estado activo usan el color de su categoría en lugar del acento, porque ahí el color es dato.

### Cards / Containers

`.lw-card`: `--surface`, borde 1 px `--line`, radio 14, padding 16 (20 en escritorio). Sin sombra por defecto — la separación la da el plano. Variante `.lw-card-interactive` para tarjetas clicables: hover eleva a `--surface-raised` y desplaza 1 px hacia arriba, con `transition` de 160 ms.

**Nunca una tarjeta dentro de otra.** Los grupos internos se separan con `border-top: 1px solid var(--line)`.

### Inputs / Fields

`.lw-input`: 46 px, `--surface-raised`, borde `--line-strong`, radio 10, `caret-color: var(--accent-text)`. Foco: borde `--accent-line` + anillo `0 0 0 3px var(--accent-soft)`. Placeholder a `--text-muted` con contraste ≥4,5:1. Etiquetas siempre visibles sobre el campo, nunca solo placeholder.

`select` e `input[type=date]` se estilan explícitamente (fondo, flecha, `color-scheme: dark`) para que no aparezca el control blanco del sistema.

### Navigation

- **Rail (escritorio)**: `--chrome`, 224 px, `border-right: 1px solid var(--line)`. Enlace activo: fondo `--accent-soft`, texto `--accent-text`, y un filete de 2 px del acento pegado al borde izquierdo del enlace. Registrar es un botón primario dentro del rail, no un enlace más.
- **Tab-bar (móvil)**: `--chrome` con `backdrop-filter`, 5 destinos, botón central elevado relleno de acento. El punto de borrador conserva su sitio, pero ahora la barra de sesión lo explica.
- **Indicador de borrador**: un punto sobre el botón de registrar, en la tab-bar y en el rail, cuando `hasInProgress()` es cierto.

### Signature Component — la hoja

`.sheet` es un único marco con cabecera, cuerpo rulado y pie; no una pila de tarjetas. Las filas se separan con una regla de 1 px y las casillas de serie con un filete vertical, igual que la cuadrícula impresa. Las series que un ejercicio no hace no se dejan en blanco: se rayan en diagonal al 2 % de blanco, para que la retícula siga leyéndose como una tabla y no como un hueco.

La **casilla fantasma** —el valor de esa misma serie el último día, en `--t-xs` y `--text-muted` justo encima de la rueda— es la razón de ser de esta composición. Cuando no hay historial se dibuja un guion en `--line-strong` para no romper la altura de la fila.

En móvil la retícula se pliega: cada ejercicio es una tarjeta, cada serie una línea de rótulo (ordinal y quitar) con las dos ruedas debajo a ancho completo, y la última vez vuelve a resumirse en una sola línea.

### Signature Component — number-wheel

El componente que más se toca en el gimnasio. Rediseñado como instrumento: `−` y `+` de 44×44 con separadores de 1 px, valor central en cifras tabulares de 18 px y peso 600, unidad debajo del valor a 11 px en `--text-muted`. Los botones se atenúan al llegar al límite en lugar de desaparecer. Pulsación: fondo `--surface-hover` en 90 ms. En la variante `compact` (formulario de rutina) baja a 38 px de alto conservando el área táctil por pseudo-elemento.

### States

- **Cargando**: esqueletos (`.lw-skel`, barrido de 1,2 s) para listas y tarjetas; el `exercise-loader` queda reservado para bloqueos de pantalla completa (login, guardado) donde el usuario debe esperar de verdad.
- **Vacío**: `.lw-empty` enseña la interfaz — un icono, una frase de qué falta y la acción que lo resuelve. Nunca "No hay datos".
- **Error**: nombra el problema y la salida ("No se ha podido guardar el entreno. Comprueba tu conexión e inténtalo de nuevo.").

## Do's and Don'ts

### Do:

- Derivar todo lo relacionado con el acento de `--accent-*`, nunca de `--color-accent` en crudo.
- Usar cifras tabulares en cualquier número que pueda cambiar.
- Tematizar las superficies del navegador: selección, cursor de texto, anillo de foco, barras de scroll, `color-scheme`.
- Escribir el estado activo, el hover, el foco, el deshabilitado y el cargando de cada control interactivo antes de darlo por hecho.
- Reservar la animación a los cambios de estado: 150–200 ms. La hoja no se anima al entrar; el usuario llega a ella para escribir, no para verla aparecer.
- Respetar `prefers-reduced-motion: reduce` desactivando translaciones y dejando solo cambios de opacidad.

### Don't:

- Bordes laterales de color de más de 1 px en tarjetas, filas o avisos. **Única excepción**, pedida expresamente: el ejercicio marcado como completado lleva un filete de 2 px del acento en el borde izquierdo del panel, además del tinte de fondo y la insignia «Hecho». Es un estado que el usuario acaba de accionar y tiene que reconocer de un vistazo desde el otro lado del gimnasio.
- Tarjetas anidadas, ni rejillas de tarjetas idénticas de icono + título + texto como estructura de página.
- La plantilla de métrica heroica (número enorme, etiqueta pequeña, tres estadísticas gemelas y acento). Progreso muestra récord, actual y variación como una fila de datos junto a la gráfica, no como tres tarjetas iguales.
- Emoji o glifos Unicode como iconos.
- Texto con degradado, cristal esmerilado decorativo, sombras duras sin desenfoque.
- Ocultar las barras de scroll globalmente. Se estilan finas y tematizadas; en escritorio son información de posición.
- Monoespaciada como disfraz de "técnico". Las cifras tabulares de Archivo ya hacen ese trabajo.
- Modal como primer recurso. Solo se conservan los que protegen una acción destructiva o irreversible.
