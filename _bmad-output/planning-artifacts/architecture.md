---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md
workflowType: 'architecture'
project_name: 'crdtext'
user_name: 'Antonio'
date: '2026-06-13'
---

# Architecture Decision Document

_Este documento se construye colaborativamente a través de descubrimiento paso a paso. Las secciones se agregan a medida que tomamos cada decisión arquitectónica juntos._

## Análisis de Contexto del Proyecto

### Resumen de Requerimientos

**Requerimientos Funcionales (24 total):**

- F1 Motor CRDT (FR-1.1–1.6): árbol Logoot/LSEQ en TypeScript puro, operaciones insert/delete con identificadores únicos, propiedades CvRDT, API desacoplada.
- F2 Capa de Presencia (FR-2.1–2.6): WebSockets persistentes, broadcast a N clientes, identidad automática (nombre + color), cursores en tiempo real, heartbeat.
- F3 Offline-First (FR-3.1–3.7): detección de conectividad, buffer en IndexedDB, reconexión ordenada por reloj lógico, convergencia garantizada, service worker para app shell.
- F4 Visualizador de Operaciones (FR-4.1–4.5): log en tiempo real con identificadores internos Logoot/LSEQ, marcado visual de operaciones concurrentes, estado antes/después de cada operación.

**Requerimientos No Funcionales críticos:**

- Latencia de sincronización < 1 segundo (NFR-P.1)
- Engine procesa operaciones < 10 ms (NFR-P.2)
- Motor CRDT independiente de UI y transporte (NFR-A.1)
- Redis como pub/sub + log de operaciones — sin serializar el árbol completo (NFR-A.4)
- Tests que verifican convergencia en 3 escenarios concretos (NFR-C.1)

**Escala y Complejidad:**

- Dominio primario: full-stack, sistemas distribuidos en tiempo real
- Nivel de complejidad: medio-alto (complejidad algorítmica, no de escala)
- Componentes arquitectónicos estimados: 6 (CRDT Engine, WebSocket Server, Redis Adapter, IndexedDB Adapter, Service Worker, Conflict Visualizer)

### Restricciones Técnicas y Dependencias

- Stack fijo: Next.js 15, TypeScript, Node.js, Redis, IndexedDB, Service Worker
- Sin librerías externas de CRDT — el engine es la pieza de portafolio
- Sin autenticación, sin persistencia entre sesiones, sin texto enriquecido

### Preocupaciones Transversales

1. **Reloj lógico (Lamport)** — usado en engine, Redis log, IndexedDB y visualizador. Debe existir un único módulo de reloj compartido por todo el sistema.
2. **Serialización de operaciones** — las operaciones CRDT se transmiten por WebSocket, se persisten en Redis e IndexedDB. Un esquema de serialización compartido evita transformaciones intermedias.
3. **Identidad de sitio** — el site ID se usa en el engine, la capa de presencia y el visualizador. Se genera una vez por sesión y debe fluir sin transformación.
4. **Reconstrucción de estado** — tanto clientes nuevos (desde Redis log) como clientes reconectando (desde IndexedDB) replayan operaciones para reconstruir el árbol CRDT. La lógica de replay debe ser la misma función del engine en ambos casos.

---

## Evaluación de Starter Template

### Dominio Tecnológico Principal

Full-stack con sistemas distribuidos en tiempo real.

### Starter Seleccionado: create-next-app con Custom Server

**Rationale:** El custom server con la librería `ws` mantiene el código del servidor WebSocket explícito y visible — no mágico. Un solo proceso Node.js envuelve Next.js y expone el servidor WebSocket, lo que simplifica el deploy del demo y hace que la arquitectura sea legible para un entrevistador.

**Comando de inicialización:**

```bash
npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"
```

**Estructura de proyecto:**

```
crdtext/
├── src/
│   ├── app/              # Next.js App Router (UI)
│   ├── components/       # Componentes React
│   └── lib/
│       └── crdt/         # CRDT Engine — TypeScript puro, sin dependencias de framework
├── server/               # Custom WebSocket server (ws library)
│   └── index.ts
├── shared/               # Tipos compartidos cliente-servidor
│   └── types.ts
└── public/
    └── sw.js             # Service Worker
```

**Decisiones arquitectónicas del starter:**

- Lenguaje: TypeScript en todo el stack (frontend, server, engine)
- Routing: App Router (Next.js latest)
- Linting: ESLint
- Build: Turbopack (desarrollo), webpack (producción)
- Organización: src/ directory con import alias @/*

**Decisiones NO cubiertas por el starter (resueltas en pasos siguientes):**

- Estructura interna del CRDT Engine
- Protocolo WebSocket y esquema de mensajes
- Esquema de Redis (pub/sub + log de operaciones)
- Configuración del Service Worker
- Testing framework para propiedades CvRDT

**Nota de deploy:** El custom server requiere un entorno Node.js persistente. Opciones recomendadas para el demo: Railway, Render o Fly.io. No compatible con Vercel (serverless).

---

## Decisiones Arquitectónicas Centrales

### Análisis de Prioridad

**Decisiones críticas (bloquean implementación):**
- Formato de serialización de operaciones CRDT
- Protocolo de mensajes WebSocket
- Generación de identidad de sitio y reloj lógico

**Decisiones importantes (dan forma a la arquitectura):**
- State management: Zustand
- Testing framework: Vitest
- Deploy: Railway

**Decisiones diferidas (post-MVP):**
- Monitoreo y logging en producción
- CI/CD pipeline

---

### Arquitectura de Datos

**Esquema de operación CRDT** (esquema único compartido entre WebSocket, Redis e IndexedDB):

```typescript
type CRDTOperation = {
  type: 'insert' | 'delete'
  position: { site: string; clock: number; frac: number[] }
  char?: string       // solo en insert
  siteId: string      // quién generó la operación
  timestamp: number   // reloj Lamport del emisor
}
```

**Redis — estructura del log de operaciones:**
- Key: `doc:operations` → Lista ordenada de operaciones serializadas (JSON)
- Key: `doc:sites` → Hash de siteId → `{ name, color }` de usuarios activos
- Pub/Sub channel: `doc:broadcast` → operaciones en tiempo real

**IndexedDB — stores:**
- `pending_operations` → buffer de ops generadas offline, ordenadas por timestamp
- `operation_log` → copia local del log para reconstrucción de estado sin conexión

**Identidad de sitio y reloj lógico:**
- `siteId`: UUID v4 generado en el cliente al conectar, persistido en sessionStorage
- Reloj Lamport: inicia en 0, incrementa en cada operación generada; actualiza a `max(local, received) + 1` al recibir operaciones

---

### Protocolo WebSocket

**Tipos de mensajes:**

```typescript
type WSMessage =
  | { type: 'join';      siteId: string; name: string; color: string }
  | { type: 'operation'; op: CRDTOperation }
  | { type: 'cursor';    siteId: string; index: number }
  | { type: 'sync';      operations: CRDTOperation[] }  // servidor → cliente tardío
  | { type: 'ack';       timestamp: number }             // servidor confirma persistencia
```

**Flujo de conexión:**
1. Cliente conecta → genera siteId, envía `join`
2. Servidor responde con `sync` (log completo desde Redis)
3. Cliente aplica log al engine CRDT → estado reconstruido
4. Cliente listo para edición

---

### Arquitectura Frontend

**State management: Zustand**

Store único con tres slices:
- `documentSlice` — string del documento actual (salida del engine)
- `engineSlice` — referencia al árbol CRDT (ref externa, no serializable)
- `operationLogSlice` — array de operaciones para el Visualizador

Rationale: el Visualizador de Operaciones accede al log desde fuera del árbol del editor — Zustand evita prop drilling sin overhead.

**Componentes principales:**
- `<Editor />` — elemento `contenteditable` controlado por el engine CRDT (no `textarea`: los cursores remotos de `<CursorLayer />` se posicionan vía Range API sobre el DOM interno del editor, algo que un `textarea` nativo no expone)
- `<CursorLayer />` — overlay con cursores de otros usuarios, posicionado vía Range API sobre `<Editor />`
- `<OperationVisualizer />` — panel toggleable con el log en tiempo real; lista virtualizada con `@tanstack/react-virtual` cuando el log supera 200 entradas (UX-DR10), evitando degradación de rendimiento en sesiones largas de demo
- `<ConnectivityBadge />` — indicador `online` / `offline` / `sincronizando`

**Dependencia adicional:** `@tanstack/react-virtual` — headless, ~6kb, usado exclusivamente por `<OperationVisualizer />`.

---

### Testing

**Framework: Vitest**

Tests unitarios del engine CRDT verifican las tres propiedades CvRDT:
- Conmutatividad: `apply(A, apply(B, doc)) === apply(B, apply(A, doc))`
- Idempotencia: `apply(A, apply(A, doc)) === apply(A, doc)`
- Convergencia: escenarios (a), (b), (c) definidos en NFR-C.1

Tests de integración: flujo WebSocket completo con cliente simulado.

---

### Infraestructura y Deploy

**Platform: Railway**
- Deploy desde GitHub (push-to-deploy)
- Soporte nativo Node.js — compatible con custom server
- Free tier suficiente para el demo
- Redis como add-on provisionado por Railway (`REDIS_URL` como variable de entorno)

**Implicaciones en cascada:**
- Requiere `railway.toml` o `Dockerfile` con comando de inicio del custom server
- Variable de entorno: `REDIS_URL` (provisionada por Railway)

---

## Patrones de Implementación y Reglas de Consistencia

### Puntos de Conflicto Identificados

6 áreas donde distintos agentes pueden tomar decisiones incompatibles si no están especificadas.

---

### Convenciones de Nombrado

**Código TypeScript:**
- Componentes React: PascalCase → `<OperationVisualizer />`
- Archivos de componentes: PascalCase → `OperationVisualizer.tsx`
- Archivos de módulos/utilidades: kebab-case → `crdt-engine.ts`, `lamport-clock.ts`
- Funciones y variables: camelCase → `applyOperation`, `siteId`
- Tipos e interfaces: PascalCase → `CRDTOperation`, `WSMessage`
- Constantes: SCREAMING_SNAKE_CASE → `MAX_CLOCK_VALUE`

**Zustand stores:**
- Archivos de store: `use-[nombre]-store.ts` → `use-document-store.ts`
- Hooks exportados: `use[Nombre]Store` → `useDocumentStore`
- Slices: sufijo `Slice` → `documentSlice`, `engineSlice`, `operationLogSlice`

**Tests:**
- Co-ubicados con el módulo que prueban: `crdt-engine.test.ts` junto a `crdt-engine.ts`
- Nombre del test: describe el comportamiento → `"insert conmuta con delete concurrente"`

---

### Patrones de Estructura

**Regla de aislamiento del CRDT Engine (crítica):**
`src/lib/crdt/` no importa NADA de React, Next.js, ni APIs de browser. Es TypeScript puro. Si un agente necesita estado del engine en un componente, lo accede vía Zustand — nunca importa el engine directamente en un componente.

```
src/lib/crdt/
├── crdt-engine.ts        # árbol Logoot/LSEQ
├── lamport-clock.ts      # reloj lógico (módulo independiente)
├── position-generator.ts # generación de posiciones fraccionarias
└── crdt-engine.test.ts   # tests CvRDT co-ubicados
```

**Zustand — un store, tres slices:**
```typescript
// use-document-store.ts — único archivo de store
const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: '',
  engineRef: null,
  operationLog: [],
}))
```

---

### Patrones de Formato

**Operaciones CRDT — inmutables tras creación:**
```typescript
// ✅ correcto
const op: Readonly<CRDTOperation> = { type: 'insert', ... }

// ❌ prohibido
op.timestamp = newValue
```

**WebSocket — un solo punto de entrada de mensajes:**
```typescript
// ✅ correcto — en el WebSocket client service
function handleMessage(msg: WSMessage) {
  switch (msg.type) { ... }
}

// ❌ prohibido — en un componente React
ws.onmessage = (e) => { ... }
```

**Reloj Lamport — una sola instancia:**
```typescript
// ✅ correcto
clock.tick()           // genera nuevo timestamp
clock.update(received) // sincroniza con timestamp externo

// ❌ prohibido
let myTimestamp = localTimestamp + 1
```

---

### Patrones de Comunicación

**Estados de conectividad — enum único:**
```typescript
type ConnectivityState = 'online' | 'offline' | 'syncing'
```

**Actualizaciones de Zustand — siempre inmutables:**
```typescript
// ✅ correcto
set((state) => ({ operationLog: [...state.operationLog, newOp] }))

// ❌ prohibido
state.operationLog.push(newOp)
```

---

### Patrones de Proceso

**Error handling en WebSocket:**
- Reconexión automática con exponential backoff: 1s → 2s → 4s → 8s (máx)
- Estado cambia a `offline` inmediatamente al detectar desconexión
- Operaciones offline se acumulan en IndexedDB sin interrumpir la UX

**Loading states:**
- No existe "loading global" — solo `syncing` durante reconexión
- El editor permanece editable en modo `offline` (offline-first por diseño)

---

### Reglas Obligatorias para Todos los Agentes

1. **NUNCA** importar `src/lib/crdt/` desde un componente React directamente
2. **NUNCA** mutar un `CRDTOperation` después de crearlo
3. **NUNCA** escuchar WebSocket desde un componente — usar el servicio cliente
4. **NUNCA** incrementar el reloj Lamport fuera de la clase `LamportClock`
5. **SIEMPRE** usar el tipo `WSMessage` discriminado al parsear mensajes WebSocket
6. **SIEMPRE** serializar operaciones con `JSON.stringify` antes de persistir en Redis/IndexedDB

---

## Estructura del Proyecto y Límites Arquitectónicos

### Árbol de Directorios Completo

```
crdtext/
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── tsconfig.server.json          # config TS separada para compilar server/
├── vitest.config.ts
├── railway.toml                  # configuración de deploy
├── .env.local
├── .env.example                  # REDIS_URL=...
├── .gitignore
│
├── shared/                       # Tipos compartidos cliente-servidor
│   └── types.ts                  # CRDTOperation, WSMessage, ConnectivityState
│
├── server/                       # F2 — Custom WebSocket server (Node.js + ws)
│   ├── index.ts                  # Entry point: envuelve Next.js + expone WS
│   ├── ws-handler.ts             # handleMessage por tipo: join, operation, cursor
│   └── redis-adapter.ts          # pub/sub + RPUSH al log de operaciones
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Página principal: monta Editor + OperationVisualizer
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── Editor.tsx            # F1+F2 — contenteditable controlado por engine CRDT
│   │   ├── CursorLayer.tsx       # F2 — overlay de cursores de otros usuarios
│   │   ├── OperationVisualizer.tsx # F4 — panel toggleable con log de ops
│   │   └── ConnectivityBadge.tsx # F3 — indicador online/offline/syncing
│   │
│   └── lib/
│       ├── crdt/                 # F1 — Motor CRDT (TypeScript puro, sin deps de framework)
│       │   ├── crdt-engine.ts
│       │   ├── position-generator.ts
│       │   ├── lamport-clock.ts
│       │   ├── crdt-engine.test.ts
│       │   └── position-generator.test.ts
│       │
│       ├── ws-client/            # F2 — Cliente WebSocket
│       │   ├── ws-client.ts      # conexión, reconexión con exponential backoff
│       │   └── message-handler.ts # handleMessage(msg: WSMessage) — único punto de entrada
│       │
│       ├── storage/              # F3 — Persistencia offline
│       │   ├── indexeddb.ts      # stores: pending_operations, operation_log
│       │   └── indexeddb.test.ts
│       │
│       └── store/                # Zustand
│           └── use-document-store.ts
│
└── public/
    └── sw.js                     # F3 — Service Worker (caché del app shell)
```

### Mapeo de Requerimientos a Estructura

| Feature | Archivos principales |
|---|---|
| F1 Motor CRDT | `src/lib/crdt/crdt-engine.ts`, `lamport-clock.ts`, `position-generator.ts` |
| F2 Presencia | `server/ws-handler.ts`, `server/redis-adapter.ts`, `src/lib/ws-client/`, `src/components/CursorLayer.tsx` |
| F3 Offline-first | `src/lib/storage/indexeddb.ts`, `public/sw.js`, `src/lib/ws-client/ws-client.ts` |
| F4 Visualizador | `src/components/OperationVisualizer.tsx`, `src/lib/store/use-document-store.ts` |

### Límites Arquitectónicos

**Límite 1 — CRDT Engine vs. todo lo demás:**
`src/lib/crdt/` es una isla. Solo exporta funciones puras y tipos. Nada fuera de este directorio modifica el árbol CRDT directamente.

**Límite 2 — WebSocket server vs. cliente:**
`server/` y `src/lib/ws-client/` se comunican exclusivamente a través del protocolo `WSMessage` definido en `shared/types.ts`. Ningún tipo de `server/` se importa en `src/` y viceversa.

**Límite 3 — Zustand vs. componentes:**
Los componentes acceden al estado solo a través de `useDocumentStore`. Ningún componente importa `src/lib/crdt/` o `src/lib/ws-client/` directamente.

### Flujo de Datos

**Edición local (online):**
```
Usuario teclea
  → Editor.tsx llama generateOperation() en crdt-engine
  → useDocumentStore actualiza document + operationLog
  → ws-client.ts envía { type: 'operation', op } al servidor
  → server/ws-handler.ts almacena en Redis + broadcast a otros clientes
  → Otros clientes: message-handler.ts → applyOperation() → Zustand → re-render
```

**Reconexión offline→online:**
```
Service Worker detecta reconexión
  → ws-client.ts abre nueva conexión WebSocket
  → Servidor responde con { type: 'sync', operations: [...] }
  → Cliente aplica log completo al engine (replay)
  → IndexedDB pending_operations se envían en orden de reloj Lamport
  → Estado converge
```

### Puntos de Integración Externa

- **Redis:** `server/redis-adapter.ts` — único archivo que habla con Redis
- **IndexedDB:** `src/lib/storage/indexeddb.ts` — único archivo que accede a IndexedDB
- **Service Worker:** `public/sw.js` — se registra desde `src/app/layout.tsx`
- **Railway:** `railway.toml` define el comando de inicio (`node server/index.ts`)

---

## Resultados de Validación de Arquitectura

### Validación de Coherencia ✅

**Compatibilidad de decisiones:**
- Next.js latest + TypeScript + App Router + ESLint + Turbopack ✅
- Node.js custom server + ws library — compatible con Railway (non-serverless) ✅
- Redis pub/sub + log de operaciones — compatible con ioredis/redis npm ✅
- IndexedDB + Service Worker — APIs de browser, sin conflictos ✅
- Zustand + React ✅
- Vitest + TypeScript + Next.js ✅

**Nota de implementación:** `tsconfig.server.json` debe configurar `module: NodeNext` y `moduleResolution: NodeNext` para compilar `server/` correctamente en Node.js.

### Validación de Cobertura de Requerimientos ✅

**Requerimientos Funcionales: 24/24 cubiertos**

| Feature | FRs | Cobertura |
|---|---|---|
| F1 Motor CRDT | FR-1.1–1.6 | `src/lib/crdt/` ✅ |
| F2 Presencia | FR-2.1–2.6 | `server/` + `ws-client/` + `CursorLayer.tsx` ✅ |
| F3 Offline-first | FR-3.1–3.7 | `storage/` + `public/sw.js` + `ws-client.ts` ✅ |
| F4 Visualizador | FR-4.1–4.5 | `OperationVisualizer.tsx` + `operationLogSlice` ✅ |

**Requerimientos No Funcionales: 12/12 cubiertos**
- Performance (P.1–P.3): Redis local + WS directo + engine puro ✅
- Corrección (C.1–C.3): CvRDT + tests Vitest ✅
- Arquitectura (A.1–A.4): límites definidos + Railway + Redis ✅
- Portafolio (O.1–O.2): estructura legible + README ✅

### Análisis de Brechas

**Gaps menores (no bloquean implementación):**

- **FR-4.3** — `operationLogSlice` necesita guardar snapshot del doc antes de cada operación. Resolución: agregar `docBefore: string` al tipo de entrada del log.
- **FR-4.2** — Detección de operaciones concurrentes requiere comparar timestamps en `message-handler.ts`.

**No hay gaps críticos.**

### Checklist de Completitud

**Análisis de Requerimientos**
- [x] Contexto del proyecto analizado en profundidad
- [x] Escala y complejidad evaluadas
- [x] Restricciones técnicas identificadas
- [x] Preocupaciones transversales mapeadas

**Decisiones Arquitectónicas**
- [x] Decisiones críticas documentadas con tipos concretos
- [x] Stack tecnológico completamente especificado
- [x] Patrones de integración definidos
- [x] Consideraciones de performance contempladas

**Patrones de Implementación**
- [x] Convenciones de nombrado establecidas
- [x] Patrones de estructura definidos
- [x] Patrones de comunicación especificados
- [x] Patrones de proceso documentados

**Estructura del Proyecto**
- [x] Árbol de directorios completo definido
- [x] Límites de componentes establecidos
- [x] Puntos de integración mapeados
- [x] Requerimientos mapeados a estructura

### Evaluación de Preparación

**Estado general: LISTO PARA IMPLEMENTACIÓN**

**Nivel de confianza:** Alto

**Fortalezas clave:**
- CRDT Engine aislado en TypeScript puro — garantiza portabilidad y testabilidad independiente del framework
- Esquema de tipos compartido en `shared/types.ts` — previene desincronización entre cliente y servidor
- 6 invariantes obligatorios — reglas claras y verificables para agentes de IA

**Áreas para mejora futura (post-MVP):**
- CI/CD pipeline en Railway
- Monitoreo de latencia WebSocket
- Tests E2E con Playwright

### Handoff a Implementación

**Primera historia de implementación:**
```bash
npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"
```

**Orden de implementación recomendado:**
1. Setup del proyecto + `shared/types.ts`
2. `src/lib/crdt/` — Motor CRDT con tests CvRDT
3. `server/` — WebSocket server + Redis adapter
4. `src/lib/ws-client/` + `src/lib/store/`
5. Componentes React: `Editor.tsx`, `CursorLayer.tsx`, `ConnectivityBadge.tsx`
6. `src/lib/storage/indexeddb.ts` + `public/sw.js`
7. `src/components/OperationVisualizer.tsx`
