---
name: CRDText
description: Editor colaborativo con CRDT — portafolio técnico FAANG
status: final
created: 2026-06-14
updated: 2026-06-14
sources:
  - _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md
  - _bmad-output/planning-artifacts/architecture.md
colors:
  # ── LIGHT MODE ──────────────────────────────────────────────────────────────
  background: '#ffffff'
  surface: '#f8f9fb'
  panel: '#f3f4f6'
  border: '#e5e7eb'
  border-strong: '#d1d5db'
  text-primary: '#111827'
  text-secondary: '#6b7280'
  text-muted: '#9ca3af'
  accent: '#2563eb'
  accent-foreground: '#ffffff'
  accent-subtle: '#eff6ff'
  user-a: '#2563eb'
  user-a-subtle: '#eff6ff'
  user-b: '#7c3aed'
  user-b-subtle: '#f5f3ff'
  status-online: '#059669'
  status-online-subtle: '#ecfdf5'
  status-offline: '#dc2626'
  status-offline-subtle: '#fef2f2'
  status-syncing: '#d97706'
  status-syncing-subtle: '#fffbeb'
  concurrent: '#d97706'
  concurrent-subtle: '#fffbeb'
  # ── DARK MODE ────────────────────────────────────────────────────────────────
  background-dark: '#0f1117'
  surface-dark: '#161b27'
  panel-dark: '#1e2434'
  border-dark: '#2d3448'
  border-strong-dark: '#3d4558'
  text-primary-dark: '#f1f5f9'
  text-secondary-dark: '#94a3b8'
  text-muted-dark: '#475569'
  accent-dark: '#3b82f6'
  accent-foreground-dark: '#ffffff'
  accent-subtle-dark: 'rgba(59,130,246,0.12)'
  user-a-dark: '#60a5fa'
  user-a-subtle-dark: 'rgba(96,165,250,0.12)'
  user-b-dark: '#a78bfa'
  user-b-subtle-dark: 'rgba(167,139,250,0.12)'
  status-online-dark: '#34d399'
  status-online-subtle-dark: 'rgba(52,211,153,0.1)'
  status-offline-dark: '#f87171'
  status-offline-subtle-dark: 'rgba(248,113,113,0.1)'
  status-syncing-dark: '#fbbf24'
  status-syncing-subtle-dark: 'rgba(251,191,36,0.1)'
  concurrent-dark: '#fbbf24'
  concurrent-subtle-dark: 'rgba(251,191,36,0.1)'
typography:
  editor:
    fontFamily: "'Georgia', 'Times New Roman', serif"
    fontSize: '16px'
    lineHeight: '1.8'
    fontWeight: '400'
    color: '{colors.text-primary}'
  data:
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    fontSize: '10px'
    lineHeight: '1.5'
    fontWeight: '400'
    color: '{colors.text-secondary}'
  data-sm:
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
    fontSize: '9px'
    lineHeight: '1.4'
    fontWeight: '700'
    letterSpacing: '0.06em'
  ui:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: '13px'
    lineHeight: '1.5'
    fontWeight: '400'
  ui-sm:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: '11px'
    lineHeight: '1.4'
    fontWeight: '500'
  logo:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: '14px'
    fontWeight: '800'
    letterSpacing: '-0.02em'
rounded:
  xs: '3px'
  sm: '4px'
  md: '6px'
  lg: '8px'
  pill: '9999px'
spacing:
  base: '4px'
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  3xl: '32px'
  editor-h: '40px'
  editor-v: '48px'
  topbar-height: '48px'
components:
  topbar:
    background: '{colors.surface}'
    border-bottom: '1px solid {colors.border}'
    height: '{spacing.topbar-height}'
    padding: '0 {spacing.xl}'
  presence-pill:
    background: '{colors.user-a-subtle}'
    color: '{colors.user-a}'
    padding: '3px 8px'
    radius: '{rounded.pill}'
    fontSize: '{typography.ui-sm.fontSize}'
    fontWeight: '500'
  connectivity-badge:
    padding: '3px 8px'
    radius: '{rounded.xs}'
    border: '1px solid currentColor'
    fontSize: '10px'
    fontWeight: '700'
    letterSpacing: '0.06em'
    textTransform: 'uppercase'
  viz-toggle:
    background: 'transparent'
    border: '1px solid {colors.border}'
    radius: '{rounded.sm}'
    padding: '4px 10px'
    fontSize: '{typography.ui-sm.fontSize}'
    color: '{colors.text-muted}'
  operation-tag:
    padding: '1px 5px'
    radius: '{rounded.xs}'
    fontSize: '9px'
    fontWeight: '700'
    letterSpacing: '0.06em'
    fontFamily: '{typography.data-sm.fontFamily}'
  concurrent-tag:
    background: '{colors.concurrent-subtle}'
    color: '{colors.concurrent}'
    border: '1px solid {colors.concurrent}'
    padding: '1px 5px'
    radius: '{rounded.xs}'
    fontSize: '9px'
    fontWeight: '700'
    letterSpacing: '0.06em'
  cursor-label:
    background: 'currentColor'
    color: '{colors.background}'
    padding: '1px 5px'
    radius: '{rounded.xs} {rounded.xs} {rounded.xs} 0'
    fontSize: '9px'
    fontWeight: '700'
    fontFamily: '-apple-system, sans-serif'
---

## Brand & Style

CRDText es una herramienta técnica de portafolio — su audiencia primaria son ingenieros senior y entrevistadores en empresas FAANG. El diseño no intenta parecer un producto de consumo ni una startup genérica: comunica intención técnica deliberada, rigor de ingeniería y profundidad intelectual.

La expresión de marca se construye sobre una tensión productiva: **serif en el contenido, monospace en los datos**. El editor de texto usa tipografía serif — el mismo sistema que los papers técnicos y la documentación seria — porque eso es lo que CRDText realmente es: un paper de CRDT hecho aplicación. Los identificadores internos del algoritmo (site, clock, frac_position) usan fuente monospace porque son código, no prosa.

Dos modos de color son ciudadanos de primera clase desde el inicio, no una feature tardía. El tono no cambia entre modos — solo los valores de los tokens.

El logo "CRD**Text**" lleva el sufijo "Text" en el color de acento para separar el nombre del algoritmo del dominio del producto. Sin iconos, sin gradientes, sin ilustraciones decorativas.

## Colors

La paleta tiene tres capas de significado:

**Acento de marca (`accent`)** — Azul técnico (#2563eb / #3b82f6). Aparece en el logo ("Text"), en links activos, y en el cursor del usuario local (Site A). No se usa decorativamente. No se usa en más de un rol por pantalla.

**Colores de usuarios** — Cada sitio CRDT tiene un color propio que se mantiene consistente en todos los elementos de presencia: cursor, etiqueta de cursor, pill en la topbar, y entradas del operation log asociadas a ese sitio.
- Site A (usuario local): `{colors.user-a}` — azul (mismo que el acento de marca; el usuario local "es" la marca).
- Site B (remoto): `{colors.user-b}` — violeta. Si hay N usuarios, extender la paleta hacia índigo, verde esmeralda, y ámbar — nunca rojo (reservado para status de error) ni amarillo (reservado para concurrent).

**Colores de estado de conectividad** — Semáforo sin ambigüedad:
- Online: `{colors.status-online}` — verde. Nunca usar para otra cosa.
- Offline: `{colors.status-offline}` — rojo. Indica pérdida de servicio, no error de usuario.
- Sincronizando: `{colors.status-syncing}` — ámbar/naranja. Estado transitorio; nunca estático.

**Marcador de concurrencia** — `{colors.concurrent}` ámbar. Aparece exclusivamente en el tag "CONCURRENT" del operation log. Su rareza es su significado: cuando aparece, el algoritmo resolvió un conflicto real — eso es precisamente lo que CRDText demuestra.

Evitar: gradientes, sombras de color, más de un acento de marca, uso de rojo para estados que no sean offline o error.

## Typography

Tres roles tipográficos, sin mezclas dentro de un mismo contexto:

**Editor** (`{typography.editor}`) — Georgia 16px / 1.8. El área donde el usuario escribe. Serif porque el editor de texto es el producto legible, no la interfaz. El espacio interlineal amplio (1.8) es intencional: el texto con cursores de múltiples usuarios necesita respirar para que los overlays no colapsen con el contenido.

**Data** (`{typography.data}`) — Monospace 10px. Operation log identifiers, coordenadas de posición Logoot/LSEQ (`[0.3, 0.6, 0.9]`), relojes Lamport, site IDs. Nunca usar una fuente proporcional para datos de algoritmo — la lectura columnar es parte del contrato.

**Data-SM** (`{typography.data-sm}`) — Monospace 9px bold, tracking amplio. Tags de operación (INSERT, DELETE), etiquetas de estado (CONCURRENT), y el badge de conectividad. El bold y el tracking compensan el tamaño pequeño y garantizan lectura a distancia de pantalla.

**UI** (`{typography.ui}` / `{typography.ui-sm}`) — System sans-serif. Todo el chrome: topbar, labels, botones, placeholders. Nunca usar en el contenido del editor.

**Logo** — Sans-serif 14px, black weight. Tratamiento especial: "CRD" en `{colors.text-primary}`, "Text" en `{colors.accent}`.

## Layout & Spacing

Escala basada en múltiplos de 4px. Sin excepciones.

Layout de la aplicación: grid de dos columnas bajo una topbar permanente.
- Topbar: 48px de alto, anchura completa, fija.
- Editor: columna izquierda, ocupa todo el espacio disponible.
- Operation Visualizer: columna derecha, 360px fija cuando visible, oculta cuando el panel está colapsado.

El editor tiene padding interior generoso (`{spacing.editor-h}` horizontal, `{spacing.editor-v}` vertical) para crear la sensación de un área de escritura seria, no de un textarea de formulario. Ancho máximo del contenido dentro del editor: 640px — la línea de texto no debe cruzar los 75 caracteres para ser cómoda de leer.

El operation log usa padding compacto (10px 16px por entrada) — los datos técnicos densos requieren más filas visibles que espacio por fila.

## Elevation & Depth

Sin sombras decorativas. La jerarquía visual se comunica mediante bordes y diferencias de color de fondo:
- Topbar sobre editor: borde inferior (`1px solid {colors.border}`).
- Editor sobre panel: borde derecho en la división.
- Entradas del log al hover: cambio de background a `{colors.surface}`.
- Sin modales de confirmación en operaciones normales.
- La única excepción: el cursor-label flota sobre el texto del editor con `position: absolute` — no necesita sombra porque contrasta directamente contra el fondo del editor.

## Shapes

Consistentemente rectangular con esquinas ligeramente redondeadas. El sistema comunica "herramienta", no "app de consumo".

- Tags de operación (INSERT/DELETE/CONCURRENT): `{rounded.xs}` (3px) — casi cuadrados, como badges de terminal.
- Pills de presencia de usuario: `{rounded.pill}` — las únicas formas píldora del sistema, porque los usuarios son entidades, no acciones.
- Badge de conectividad: `{rounded.xs}` (3px) — rectangular con borde, como un status indicator de producción.
- Botón del visualizador: `{rounded.sm}` (4px).
- Cursor-label (tooltip de cursor): `{rounded.xs}` con esquina inferior izquierda cuadrada — el "pico" implícito apunta al cursor.
- Sin bordes redondeados grandes (> 8px) excepto en el frame del browser durante la demo.

## Components

### Topbar

Siempre visible. Contiene: logo, nombre del documento, presence pills (uno por usuario conectado), connectivity badge, y viz-toggle button. El nombre del documento es editable inline al hacer click (FR-2.3 implica identidad automática, no nombre de documento — el nombre queda como feature futura implícita; por ahora: "sin título" invariante).

### Presence Pill

Una pill por usuario conectado. Color de fondo y texto tomado del color del sitio (`user-a`, `user-b`). Dot indicador de 5×5px del mismo color. El texto es el nombre asignado automáticamente. Al desconectarse un usuario, la pill desaparece con transición suave (fade out 200ms).

### Connectivity Badge

Un único badge. Tres estados visuales: online (verde), offline (rojo), sincronizando (ámbar). Texto en uppercase bold monospace. Background sutil del color del estado para reforzar la señal sin depender solo del color. El estado "sincronizando" puede mostrar un contador de operaciones pendientes: "sincronizando · 3".

### Cursor Overlay

Línea vertical de 2px del color del usuario (`user-a` o `user-b`). Altura igual a la del line-height del editor. Cursor-label posicionado absolute sobre el cursor: background del color del usuario, texto del nombre en blanco, `{rounded.xs}` con esquina inferior izquierda cuadrada. El cursor del usuario local (Site A) pulsa lentamente (animation blink 1s).

### Operation Visualizer Panel

Sidebar derecha. Header con título "Operation Log" y contador de operaciones (`N ops`). Lista de entradas con scroll independiente. Cada entrada:
- Línea 1: [operation-tag] [site:ID · λ=N] [concurrent-tag si aplica]
- Línea 2: identifiers en monospace: `pos [x, y, z] · char 'c'`
- Línea 3: diff before/after en monospace

### Operation Tag

INSERT: background `{colors.user-a-subtle}`, texto `{colors.user-a}` — azul. DELETE: background rojo sutil, texto rojo. La asociación INSERT=azul no es literal: en el operation log, las inserts de Site B aparecerán también azules si las inserts de Site A son azules — la distinción real es el `site:ID` en la línea 1. [ASSUMPTION: usar azul para INSERT y rojo para DELETE independientemente del site, ya que el site se identifica explícitamente en el texto.]

### Viz Toggle Button

Un botón simple en la topbar. Texto: "Visualizador" cuando el panel está oculto; "Ocultar" cuando está visible. Sin iconos — el texto es la acción.

## Do's and Don'ts

| Haz | No hagas |
|-----|----------|
| Serif en el contenido del editor | Serif en chrome, labels o datos técnicos |
| Monospace para todos los identificadores Logoot/LSEQ | Sans-serif o serif para coordenadas de posición |
| Ámbar exclusivamente para operaciones CONCURRENT | Ámbar en cualquier otro contexto |
| Pill shapes solo para presence — todo lo demás rectangular | Pill shapes en badges de estado o tags de operación |
| El color del usuario A = el acento de marca | Colores de usuario independientes del acento de marca |
| Semáforo claro: verde/rojo/ámbar para conectividad | Verde para cosas que no sean "conectado" |
| Padding generoso en el editor (40px+ H, 48px+ V) | Área de edición apretada contra los bordes |
| Diferencias de background para jerarquía (no sombras) | Shadow-boxes decorativas |
| Dark mode con los mismos tokens semánticos, valores distintos | Dark mode como "versión invertida" del light mode |
