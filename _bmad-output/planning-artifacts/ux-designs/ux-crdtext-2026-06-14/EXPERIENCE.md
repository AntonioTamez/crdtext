---
name: CRDText
status: final
created: 2026-06-14
updated: 2026-06-14
assumptions_confirmed: true
sources:
  - _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
---

# CRDText — Experience Spine

## Foundation

Single-surface web application. Next.js con TypeScript, sin sistema de componentes externo — todos los componentes son propios. `DESIGN.md` es la referencia de identidad visual; este documento es el comportamiento.

CRDText tiene una única pantalla funcional: el editor colaborativo. No hay routing, no hay múltiples vistas, no hay estado de login. La URL es el punto de entrada; dos usuarios abriendo la misma URL comparten el mismo documento.

La arquitectura es single-document por demo: un documento, N sitios. El diseño no asume "2 usuarios" — asume N, aunque la demo se presenta con 2.

## Information Architecture

| Superficie | Alcance | Propósito |
|-----------|---------|-----------|
| Editor | Siempre visible | Área de escritura principal con overlays de cursor |
| Topbar | Siempre visible | Identidad de usuarios activos, estado de conectividad, toggle del panel |
| Operation Visualizer Panel | Toggleable (oculto por defecto) | Log en tiempo real de operaciones CRDT con identificadores internos |
| Connectivity Badge | En topbar, siempre visible | Estado de la conexión WebSocket: online / offline / sincronizando |

No hay navegación. No hay pantalla de bienvenida. No hay pantalla de "room llena". El editor se carga directamente y el usuario escribe.

El panel de operaciones es la única superficie que el usuario puede mostrar u ocultar. Su estado es local (no persiste entre sesiones).

## Voice and Tone

Microcopy. La estética de voz vive en `DESIGN.md`.

El sistema habla poco. CRDText no explica lo que hace — lo muestra. Los únicos textos de sistema son: estado de conectividad, nombre asignado automáticamente, y etiquetas del operation log.

| Haz | No hagas |
|-----|----------|
| "online" / "offline" / "sincronizando" | "¡Conectado!" / "Sin conexión a internet" |
| "INSERT · site:A · λ=7" | "El usuario A insertó un carácter" |
| "CONCURRENT" | "Conflicto detectado" |
| "3 ops pendientes" | "Tienes 3 cambios sin guardar" |
| Nombre automático: "Azul-7342" o similar | "Usuario anónimo" / "Invitado" |
| Placeholder del editor: vacío | "Escribe algo..." |

Los nombres de usuario son generados automáticamente con el patrón `{Color}-{número de 4 dígitos}` — distinguibles, no memorables. El objetivo es identificación técnica, no identidad personal.

## Component Patterns

Behavioral. Especificaciones visuales en `DESIGN.md.Components`.

### Topbar

Permanente. Nunca scrollea. Contiene de izquierda a derecha:
1. Logo "CRDText"
2. Nombre del documento (invariante: "sin título" en MVP — no editable)
3. [spacer flex]
4. Presence pills (una por usuario activo, en orden de conexión)
5. Connectivity badge
6. Viz-toggle button

La topbar no colapsa. En viewports < 768px [ASSUMPTION] las presence pills reducen a solo el dot de color sin el nombre.

### Presence Pills

- Aparece una pill al recibir `{ type: 'join', siteId, name, color }` del servidor.
- Desaparece con fade de 200ms al recibir la limpieza de heartbeat (≤30s después de desconexión).
- El usuario local (Site A) siempre es la primera pill. Las pills de otros usuarios se ordenan por tiempo de conexión.
- Si hay N > 4 usuarios [ASSUMPTION], mostrar las primeras 3 pills y un "+N más" al final.

### Connectivity Badge

Un único badge en la topbar. Transiciones de estado son inmediatas (sin animación de entrada) — el cambio de estado debe percibirse como instantáneo, no como una animación decorativa.

| Estado | Texto | Subtexto cuando aplica |
|--------|-------|------------------------|
| online | `online` | — |
| offline | `offline` | `· N ops` si hay pendientes |
| sincronizando | `sincronizando` | `· N ops` mientras envía |

El estado "sincronizando" dura lo que tarda el servidor en procesar el batch. No hay spinner — el texto alcanza.

### Editor Area

El área de edición es un `<textarea>` o `contenteditable` [ASSUMPTION: contenteditable para poder overlay de cursores] que ocupa todo el espacio izquierdo minus el panel. Padding: 48px horizontal, 40px vertical. Ancho máximo de línea: 640px centrado.

El usuario escribe texto plano. No hay barra de formato, no hay markdown preview, no hay atajos de formato. Un editor sin ornamentos porque el algoritmo es el protagonista.

El cursor del usuario local (Site A) es nativo del browser — no se reemplaza. Los cursores de otros usuarios son overlays absolutos posicionados sobre el contenido.

### Cursor Overlays

Los cursores remotos se dibujan como overlays sobre el `contenteditable`. Posicionamiento basado en el índice de carácter del documento → coordenadas DOM via `Range` API.

- La línea de cursor es `2px` de ancho, color del usuario, `height: 1em`.
- El cursor-label aparece siempre (no solo on hover) para maximizar la legibilidad durante la demo.
- Si dos cursores están en la misma posición (improbable pero posible), el label del cursor con mayor `siteId` lexicográfico se desplaza 16px a la derecha.
- Al mover el cursor local, el mensaje `{ type: 'cursor', siteId, index }` se envía con debounce de 50ms.

### Operation Visualizer Panel

Sidebar derecha de 360px. Aparece al hacer click en "Visualizador" en la topbar; desaparece al hacer click en "Ocultar". La transición de apertura/cierre es una animación suave de 300ms ease-in-out sobre el ancho de la columna derecha del grid (0px → 360px al abrir, 360px → 0px al cerrar). El contenido del panel hace fade-in con 50ms de delay para no aparecer antes de que el panel esté parcialmente abierto. El editor absorbe el espacio ganado/perdido mediante la misma transición del grid — no hay salto de layout.

El panel tiene:
- Header fijo con título "Operation Log" y contador.
- Lista con scroll independiente. La lista crece hacia abajo; las operaciones nuevas se agregan al final y el panel hace auto-scroll al fondo.
- Si hay más de N operaciones [ASSUMPTION: 200] el panel virtualiza el scroll.

Cada entrada del log:
```
[operation-tag] [site:A · λ=7]                    [CONCURRENT]
pos [0.3, 0.6, 0.9] · char 's'
− "resolver."
+ "resolverán."
```

- El auto-scroll se desactiva si el usuario scrollea manualmente hacia arriba. Se reactiva al hacer scroll hasta el fondo.
- Las entradas de operaciones offline (replay al reconectar) se muestran igual que las online — sin marcador especial.

## State Patterns

| Estado | Superficie | Tratamiento |
|--------|-----------|-------------|
| Conectando (initial) | Badge + editor | Badge: "conectando" (ámbar); editor habilitado localmente antes de establecer WebSocket |
| Online | Badge | `online` verde |
| Offline — detectado | Badge | `offline · N ops` rojo; editor sigue respondiendo; operaciones van a IndexedDB |
| Offline — reconectando | Badge | `sincronizando · N ops` ámbar mientras envía pendientes |
| Online post-sync | Badge | Transición a `online` verde; `pending_operations` de IndexedDB vacío |
| Otro usuario se conecta | Topbar | Pill aparece fade-in 200ms |
| Otro usuario se desconecta | Topbar + editor | Pill desaparece fade-out 200ms; cursor overlay desaparece |
| Operación concurrente | Panel | Tag `CONCURRENT` ámbar en la entrada del log |
| App shell cargada sin conexión | Editor | La UI carga desde service worker cache; badge: `offline` desde el inicio |

No hay estados de error con modales. No hay confirmaciones. No hay mensajes de "algo salió mal". Si el WebSocket no se puede establecer, el badge muestra `offline` y el sistema entra en modo local — sin notificación adicional.

## Interaction Primitives

CRDText tiene una sola interacción primaria: escribir texto. Todo lo demás es observación.

**Escritura:** el usuario escribe en el editor. Cada keydown dispara `generateOperation('insert', index)` o `generateOperation('delete', index)`. No hay debounce en la generación de operaciones — cada carácter es una operación.

**Toggle del panel:** un click. Sin atajos de teclado en MVP [ASSUMPTION].

**Scroll del log:** nativo del browser. Auto-scroll al fondo cuando el panel está abierto y llegan nuevas operaciones.

**Cursor remoto:** solo lectura. El usuario no puede interactuar con los cursores de otros.

No hay: arrastrar, seleccionar rangos con interacción especial, menús contextuales, shortcuts de teclado custom, modales, tooltips on hover, configuración de usuario.

## Accessibility Floor

Behavioral. Contraste visual en `DESIGN.md`.

- WCAG 2.2 AA para el editor y los componentes de estado. El operation log (texto 9-10px) queda fuera del AA estricto por tamaño [ASSUMPTION aceptable para herramienta técnica de portafolio — documentar como known limitation].
- El `contenteditable` debe tener `role="textbox"`, `aria-multiline="true"`, y `aria-label="Editor de texto colaborativo"`.
- El connectivity badge tiene `role="status"` y `aria-live="polite"` — los cambios de estado se anuncian sin interrumpir.
- Los cursores remotos son overlays decorativos: `aria-hidden="true"`. Los lectores de pantalla no necesitan leer las posiciones de cursor de otros usuarios.
- El panel del visualizador cuando se muestra tiene `aria-live="off"` — no se anuncia cada nueva operación (sería inutilizable con lector de pantalla activo).
- Tab order: topbar (logo → pills → badge → viz-toggle) → editor. El panel del visualizador no está en el tab order (es de solo lectura).

## Key Flows

### Flow 1 — Primera apertura (Antonio, ingeniero, abre CRDText en una tab)

1. Antonio abre `crdtext.railway.app` en Chrome.
2. La app shell carga desde cache (si ya visitó) o desde la red. La topbar aparece: logo, badge `conectando` en ámbar.
3. El WebSocket se establece. Badge cambia a `online` verde. Aparece su presence pill: "Azul-7342".
4. El editor está vacío y enfocado. Placeholder: ninguno — el cursor nativo parpadea en posición 0.
5. Antonio empieza a escribir: "Los sistemas distribuidos son inherentemente no deterministas."
6. **Climax:** Cada carácter produce una `CRDTOperation` con identificador único. Si Antonio abre el panel, ve cada operación listada con sus coordenadas Logoot/LSEQ. El texto en el editor y los datos en el panel son la misma realidad desde dos ángulos — uno legible, uno técnico.

### Flow 2 — Colaboración en tiempo real (Antonio + entrevistador, misma URL, dos browsers)

1. Antonio comparte la URL durante la entrevista. El entrevistador la abre.
2. En el browser del entrevistador: aparece su pill "Verde-8821" en la topbar. En el browser de Antonio: aparece "Verde-8821" también.
3. El entrevistador empieza a editar la misma línea que Antonio.
4. Ambos ven el cursor del otro moverse en tiempo real. El cursor del entrevistador aparece en violeta con el label "Verde-8821".
5. Ambos insertan un carácter en la misma posición simultáneamente.
6. **Climax:** El operation log muestra dos entradas consecutivas con `λ=N` idéntico y tag `CONCURRENT`. El documento converge al mismo texto en ambos browsers sin perder ninguna letra. Antonio señala el panel: "Aquí el algoritmo detectó las dos operaciones concurrentes y las resolvió con el orden de las coordenadas fraccionales — el resultado es determinista sin coordinación de servidores."

### Flow 3 — Edición offline y reconciliación (Antonio, pierde WiFi, lo recupera)

1. Antonio está escribiendo. La conexión de red cae.
2. Badge cambia a `offline · 0 ops`. El editor sigue respondiendo sin interrupción.
3. Antonio escribe tres párrafos más. Badge: `offline · 47 ops`.
4. Mientras, el entrevistador (online) editó el documento desde su browser.
5. Antonio recupera WiFi.
6. Badge: `sincronizando · 47 ops`. Las 47 operaciones salen del buffer IndexedDB hacia el servidor.
7. El servidor las aplica y hace broadcast al entrevistador. El documento del entrevistador incorpora los cambios de Antonio.
8. El browser de Antonio recibe las operaciones que se hicieron mientras estaba offline y las aplica.
9. **Climax:** Badge: `online`. Ambos browsers muestran el mismo texto. No se perdió una letra. Si el panel está abierto, las 47 operaciones offline aparecen en el log. Antonio: "Esto es event sourcing — el log de Redis es la fuente de verdad. Al reconectar, replayo el log y reconstruyo el estado sin serializar el árbol CRDT en ningún momento."

### Flow 4 — Demo técnica del visualizador (Antonio, demo a un panel de entrevistadores)

1. Antonio tiene CRDText abierto con el panel de operaciones visible desde el inicio.
2. El entrevistador técnico mira la pantalla dividida: editor a la izquierda, operation log a la derecha.
3. Antonio escribe "convergencia" mientras el entrevistador escribe "CRDT" en la misma posición.
4. El log muestra las dos entradas con `CONCURRENT`. El texto converge en ambos browsers.
5. **Climax:** El entrevistador pregunta: "¿Cómo resuelve el conflicto?" Antonio señala las dos entradas: "El orden lo determina la posición fraccional. Site A insertó en [0.6, 0.8] y Site B en [0.6, 0.9] — como 0.8 < 0.9, Site A queda primero. Esto es idempotente: si estas operaciones llegan en orden inverso en cualquier otro cliente, el resultado es el mismo." El entrevistador asiente. La entrevista técnica está ganada.
