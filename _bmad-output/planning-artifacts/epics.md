---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-06-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# CRDText - Epic Breakdown

## Overview

Este documento provee el desglose completo de epics y stories para CRDText, descomponiendo los requerimientos del PRD y la Arquitectura en stories implementables.

## Requirements Inventory

### Functional Requirements

FR1: El engine representa el documento como una secuencia ordenada de posiciones únicas usando identificadores compuestos por (sitio, reloj_lógico, posición_fraccional).
FR2: Soporta dos operaciones primitivas: insert(crdt_position, character) y delete(crdt_position), donde crdt_position es el identificador único de Logoot/LSEQ — nunca un índice de array.
FR3: Cada operación es conmutativa, asociativa e idempotente — la propiedad CvRDT garantiza convergencia eventual independientemente del orden de llegada.
FR4: Los identificadores de posición son globalmente únicos entre sitios para evitar colisiones en edición concurrente.
FR5: El engine soporta N sitios concurrentes por diseño, no solo pares.
FR6: Expone API interna limpia: applyOperation(op), generateOperation(type, index), getDocument() → string.
FR7: El servidor mantiene conexiones WebSocket persistentes con todos los clientes activos.
FR8: Cada operación generada por un cliente se transmite a todos los demás clientes conectados en tiempo real.
FR9: El sistema asigna automáticamente nombre y color únicos a cada usuario al conectarse, sin requerir autenticación.
FR10: El cursor de cada usuario activo es visible para todos en tiempo real, actualizado con cada pulsación de tecla.
FR11: El servidor implementa heartbeat para detectar y limpiar conexiones inactivas.
FR12: La arquitectura de broadcast soporta N clientes simultáneos sin cambios estructurales.
FR13: El cliente detecta pérdida de conectividad y entra en modo offline automáticamente.
FR14: Las operaciones generadas offline se almacenan en IndexedDB como buffer de operaciones pendientes.
FR15: Al reconectar, el cliente envía todas las operaciones pendientes al servidor ordenadas por reloj lógico.
FR16: El servidor aplica las operaciones recibidas y las retransmite a los demás clientes conectados.
FR17: El documento converge al mismo estado final en todos los clientes, independientemente del orden de llegada de operaciones offline.
FR18: El usuario recibe feedback visual del estado de conectividad: online / offline / sincronizando.
FR19: El service worker gestiona el caché del app shell para que el editor cargue sin conexión.
FR20: El visualizador muestra un log en tiempo real con identificadores internos Logoot/LSEQ: (site, clock, frac_position), tipo de operación y estado resultante.
FR21: Las operaciones concurrentes (mismo intervalo de tiempo lógico, distintos sitios) se marcan visualmente como tales.
FR22: El log muestra el estado del documento antes y después de cada operación.
FR23: El panel del visualizador se activa y desactiva sin interrumpir la edición.
FR24: El visualizador funciona en modo online y durante la reconciliación offline.

### NonFunctional Requirements

NFR1: Latencia de sincronización < 1 segundo en condiciones normales (red estable, operaciones simples).
NFR2: El engine procesa operaciones individuales en < 10 ms en el cliente.
NFR3: El demo se mantiene estable con 2 usuarios simultáneos durante una sesión de 15–30 minutos.
NFR4: El documento converge en los siguientes escenarios verificables: (a) dos inserts simultáneos en la misma posición, (b) insert y delete concurrentes sobre el mismo carácter, (c) operaciones offline de dos sitios que llegan en orden inverso al reconectar.
NFR5: Ninguna operación se pierde, incluidas las generadas offline.
NFR6: Idempotencia garantizada — aplicar la misma operación dos veces no altera el documento.
NFR7: El motor CRDT es independiente del framework de UI y del protocolo de transporte.
NFR8: El engine incluye tests unitarios que verifican propiedades CvRDT: convergencia, conmutatividad, idempotencia.
NFR9: La arquitectura soporta N usuarios simultáneos sin refactoring.
NFR10: Redis actúa como broker pub/sub y mantiene log persistente de operaciones; clientes tardíos reproducen el log para reconstruir el estado.
NFR11: El código del engine está organizado de modo que un entrevistador pueda entender el algoritmo en 10 minutos.
NFR12: El README explica el algoritmo, las decisiones de diseño y las propiedades matemáticas garantizadas.

### Additional Requirements

- Starter: `npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"`
- Custom WebSocket server con librería `ws` en `server/index.ts` que envuelve Next.js
- Redis como broker pub/sub (channel: `doc:broadcast`) + log de operaciones (key: `doc:operations` lista, `doc:sites` hash)
- `tsconfig.server.json` con `module: NodeNext` y `moduleResolution: NodeNext` para compilar `server/`
- Variable de entorno: `REDIS_URL` (provisionada por Railway)
- Deploy en Railway con `railway.toml`
- Tipos compartidos en `shared/types.ts` (CRDTOperation, WSMessage, ConnectivityState)
- Zustand store en `src/lib/store/use-document-store.ts` con slices: document, engineRef, operationLog
- Service Worker en `public/sw.js` registrado desde `src/app/layout.tsx`
- Tests con Vitest; co-ubicados con los módulos que prueban

### UX Design Requirements

N/A — no existe documento de UX Design para este proyecto.

### FR Coverage Map

FR1: Epic 1 — Árbol Logoot/LSEQ con identificadores (sitio, reloj_lógico, posición_fraccional)
FR2: Epic 1 — insert/delete con crdt_position único
FR3: Epic 1 — Propiedades CvRDT (conmutatividad, idempotencia) + tests
FR4: Epic 1 — Unicidad global de identificadores entre sitios
FR5: Epic 1 — Soporte N sitios concurrentes por diseño
FR6: Epic 1 — API: applyOperation, generateOperation, getDocument
FR7: Epic 2 — WebSocket connections persistentes
FR8: Epic 2 — Broadcast de operaciones en tiempo real
FR9: Epic 2 — Identidad automática (nombre + color) sin autenticación
FR10: Epic 2 — Cursores en tiempo real por pulsación de tecla
FR11: Epic 2 — Heartbeat para detectar conexiones inactivas
FR12: Epic 2 — Arquitectura broadcast N clientes sin cambios estructurales
FR13: Epic 3 — Detección automática de modo offline
FR14: Epic 3 — Buffer de operaciones en IndexedDB
FR15: Epic 3 — Envío ordenado por reloj lógico al reconectar
FR16: Epic 3 — Servidor aplica y retransmite operaciones offline
FR17: Epic 3 — Convergencia garantizada independientemente del orden de llegada
FR18: Epic 3 — Feedback visual: online / offline / sincronizando
FR19: Epic 3 — Service worker + caché del app shell
FR20: Epic 4 — Log en tiempo real con IDs internos Logoot/LSEQ
FR21: Epic 4 — Marcado visual de operaciones concurrentes
FR22: Epic 4 — Estado del documento antes y después de cada operación
FR23: Epic 4 — Panel toggleable sin interrumpir la edición
FR24: Epic 4 — Funciona en modo online y durante reconciliación offline

## Epic List

### Epic 1: Motor CRDT y Editor Base
El usuario puede abrir el editor, escribir texto y verificar que el motor CRDT implementa correctamente las propiedades de convergencia eventual con tests que lo demuestran.
**FRs cubiertos:** FR1, FR2, FR3, FR4, FR5, FR6
**NFRs cubiertos:** NFR2, NFR4(a+b), NFR6, NFR7, NFR8, NFR11, NFR12

### Epic 2: Colaboración en Tiempo Real
Dos usuarios pueden editar el mismo documento simultáneamente en navegadores distintos, ver los cambios del otro en tiempo real, con nombre/color asignados automáticamente y cursores visibles.
**FRs cubiertos:** FR7, FR8, FR9, FR10, FR11, FR12
**NFRs cubiertos:** NFR1, NFR3, NFR9, NFR10

### Epic 3: Modo Offline-First
El usuario puede editar sin conexión y al reconectar el documento converge automáticamente al mismo estado en todos los clientes, sin pérdida de operaciones.
**FRs cubiertos:** FR13, FR14, FR15, FR16, FR17, FR18, FR19
**NFRs cubiertos:** NFR4(c), NFR5

### Epic 4: Visualizador de Operaciones
El usuario puede activar un panel que muestra en tiempo real cómo el algoritmo CRDT resuelve conflictos, con los identificadores internos del árbol Logoot/LSEQ visibles.
**FRs cubiertos:** FR20, FR21, FR22, FR23, FR24
**NFRs cubiertos:** NFR11 (refuerzo)

---

## Epic 1: Motor CRDT y Editor Base

El usuario puede abrir el editor, escribir texto y verificar que el motor CRDT implementa correctamente las propiedades de convergencia eventual con tests que lo demuestran.

### Story 1.1: Setup del Proyecto e Infraestructura Base

Como desarrollador,
quiero inicializar el proyecto con la estructura correcta y tipos compartidos,
para que todo el desarrollo futuro tenga una base consistente.

**Acceptance Criteria:**

**Given** que no existe el proyecto
**When** ejecuto `npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"`
**Then** el proyecto se crea con App Router, TypeScript, ESLint y directorio src/

**Given** que el proyecto existe
**When** creo `shared/types.ts`
**Then** exporta los tipos: `CRDTOperation`, `WSMessage` (todas las variantes), `ConnectivityState`

**Given** que el proyecto existe
**When** creo `tsconfig.server.json`
**Then** tiene `module: NodeNext` y `moduleResolution: NodeNext` apuntando a `server/`

**Given** que el proyecto existe
**When** creo `vitest.config.ts`
**Then** Vitest encuentra archivos `*.test.ts` co-ubicados con los módulos fuente

### Story 1.2: Implementación del Motor CRDT (Logoot/LSEQ)

Como desarrollador,
quiero una implementación TypeScript del algoritmo Logoot/LSEQ,
para tener un motor CRDT correcto sin dependencias de framework.

**Acceptance Criteria:**

**Given** que el módulo crdt es importado en un entorno Node.js de test
**When** reviso los imports de cualquier archivo en `src/lib/crdt/`
**Then** no existe ningún import de React, Next.js ni APIs de browser

**Given** un documento y un índice de posición
**When** llamo `generateOperation('insert', index)`
**Then** retorna un `CRDTOperation` con identificador de posición único `(site, clock, frac[])`

**Given** dos operaciones de distintos sitios aplicadas a documentos idénticos
**When** se aplican en orden opuesto en cada documento
**Then** `getDocument()` retorna el mismo string en ambos (conmutatividad)

**Given** una operación ya aplicada al documento
**When** llamo `applyOperation(op)` con la misma operación nuevamente
**Then** `getDocument()` retorna el mismo string que antes (idempotencia)

### Story 1.3: Tests de Propiedades CvRDT

Como desarrollador y revisor técnico,
quiero tests Vitest que verifiquen explícitamente las propiedades matemáticas del motor CRDT,
para que la corrección sea demostrable como evidencia técnica de portafolio.

**Acceptance Criteria:**

**Given** el archivo `crdt-engine.test.ts` co-ubicado con `crdt-engine.ts`
**When** ejecuto `vitest run`
**Then** todos los tests pasan con 0 fallos

**Given** el escenario (a): dos inserts simultáneos en la misma posición desde sitio A y sitio B
**When** las operaciones se aplican en ambos órdenes (A→B y B→A)
**Then** el documento resultante es idéntico en ambos casos

**Given** el escenario (b): insert de sitio A y delete de sitio B sobre el mismo carácter
**When** se aplican en ambos órdenes
**Then** el documento resultante es idéntico en ambos casos

**Given** cualquier test del suite
**When** se lee su descripción
**Then** nombra la propiedad CvRDT que verifica (no "test 1", "test 2")

### Story 1.4: Editor de Texto Integrado con CRDT y README

Como usuario,
quiero un editor de texto donde cada pulsación pasa por el motor CRDT,
para escribir texto con la garantía de que las operaciones se rastrean correctamente.

**Acceptance Criteria:**

**Given** la aplicación está corriendo
**When** abro el editor en un browser
**Then** veo un área de texto y puedo escribir

**Given** escribo un carácter en la posición N
**When** se procesa la pulsación
**Then** se llama `generateOperation('insert', N)` y el documento se actualiza en el store Zustand

**Given** elimino un carácter
**When** se procesa la eliminación
**Then** se llama `generateOperation('delete', N)` y el carácter desaparece

**Given** el `README.md`
**When** un revisor técnico lo lee
**Then** explica el algoritmo Logoot/LSEQ, las propiedades CvRDT garantizadas, las decisiones de stack y cómo ejecutar los tests

---

## Epic 2: Colaboración en Tiempo Real

Dos usuarios pueden editar el mismo documento simultáneamente en navegadores distintos, ver los cambios del otro en tiempo real, con nombre/color asignados automáticamente y cursores visibles.

### Story 2.1: Servidor WebSocket con Broadcast y Redis

Como desarrollador,
quiero un servidor WebSocket custom que transmita operaciones a los clientes conectados y las persista en Redis,
para que la colaboración en tiempo real sea posible.

**Acceptance Criteria:**

**Given** el servidor está iniciado con `node server/index.ts`
**When** un cliente se conecta
**Then** el servidor envía `{ type: 'sync', operations: [...] }` con el log completo desde Redis

**Given** un cliente envía `{ type: 'operation', op: CRDTOperation }`
**When** el servidor lo procesa
**Then** almacena la op en Redis (`RPUSH doc:operations`) y publica en el canal `doc:broadcast`

**Given** dos clientes A y B conectados
**When** el cliente A envía una operación
**Then** el cliente B la recibe en menos de 1 segundo

**Given** el servidor está corriendo
**When** un cliente se desconecta sin enviar frame de cierre
**Then** el heartbeat lo detecta en ≤30 segundos y lo elimina del set activo

### Story 2.2: Cliente WebSocket con Integración al Motor CRDT

Como usuario,
quiero que mis ediciones se envíen al servidor y las ediciones remotas se apliquen automáticamente,
para que los cambios aparezcan en tiempo real.

**Acceptance Criteria:**

**Given** el editor está abierto
**When** se establece la conexión WebSocket
**Then** el cliente envía `{ type: 'join', siteId, name, color }` al servidor

**Given** ocurre una edición local
**When** `generateOperation` es llamado
**Then** `ws-client.ts` envía `{ type: 'operation', op }` al servidor

**Given** el servidor hace broadcast de una operación de otro cliente
**When** `message-handler.ts` recibe `{ type: 'operation', op }`
**Then** `applyOperation(op)` es llamado en el engine y el documento se actualiza en el editor

**Given** se recibe `{ type: 'sync', operations }`
**When** el cliente lo procesa
**Then** cada operación del array se aplica secuencialmente y el documento queda reconstruido

### Story 2.3: Identidad Automática de Usuarios y Cursores

Como usuario,
quiero ver el cursor y nombre del otro usuario mientras edito,
para saber dónde está en el documento.

**Acceptance Criteria:**

**Given** un usuario se conecta al editor
**When** se establece la conexión
**Then** se le asigna automáticamente un nombre único y un color distinto, guardados en Redis `doc:sites`

**Given** dos usuarios están conectados
**When** el usuario A mueve su cursor
**Then** el usuario B ve un indicador de cursor del color de A en esa posición del documento

**Given** un usuario se desconecta
**When** el heartbeat limpia la conexión
**Then** su cursor desaparece de la vista de todos los demás clientes en ≤30 segundos

### Story 2.4: Deploy del Demo en Railway

Como desarrollador,
quiero el demo desplegado en Railway con Redis,
para que sea accesible online como pieza de portafolio.

**Acceptance Criteria:**

**Given** `railway.toml` está configurado con el comando de inicio
**When** Railway detecta un push a main
**Then** construye e inicia la app con `node server/index.ts`

**Given** Railway provisiona el add-on Redis
**When** el servidor inicia
**Then** lee `REDIS_URL` del entorno y se conecta exitosamente

**Given** la URL desplegada
**When** dos browsers la abren simultáneamente
**Then** ambos pueden editar colaborativamente con todas las funciones de Stories 2.1–2.3

---

## Epic 3: Modo Offline-First

El usuario puede editar sin conexión y al reconectar el documento converge automáticamente al mismo estado en todos los clientes, sin pérdida de operaciones.

### Story 3.1: Detección de Conectividad y Feedback Visual

Como usuario,
quiero saber inmediatamente cuando pierdo conexión,
para entender por qué los cambios pueden no estar sincronizando.

**Acceptance Criteria:**

**Given** el editor está abierto y conectado
**When** la conexión de red cae
**Then** `ConnectivityBadge` muestra "offline" en menos de 1 segundo

**Given** el editor está en modo offline
**When** escribo texto
**Then** el editor permanece responsivo y puedo continuar editando sin errores

**Given** se está reconectando
**When** ocurre el handshake WebSocket
**Then** `ConnectivityBadge` muestra "sincronizando"

**Given** la reconexión completa y el sync termina
**When** todas las operaciones pendientes son enviadas
**Then** `ConnectivityBadge` muestra "online"

### Story 3.2: Buffer de Operaciones Offline con IndexedDB

Como usuario,
quiero que mis ediciones offline se guarden localmente,
para que no se pierdan al reconectar.

**Acceptance Criteria:**

**Given** estoy en modo offline
**When** escribo texto generando CRDTOperations
**Then** cada `CRDTOperation` se escribe en IndexedDB store `pending_operations`

**Given** el store `pending_operations` de IndexedDB
**When** inspecciono tras escribir 5 caracteres offline
**Then** contiene 5 entradas ordenadas por timestamp Lamport

**Given** cierro y reabro el browser mientras offline
**When** el editor carga
**Then** las operaciones pendientes siguen en IndexedDB y el documento refleja mis ediciones offline

### Story 3.3: Reconexión y Convergencia Offline→Online

Como usuario,
quiero que mis ediciones offline se fusionen automáticamente con los cambios de otros usuarios,
para que el documento converja sin perder trabajo de nadie.

**Acceptance Criteria:**

**Given** tengo operaciones pendientes en IndexedDB
**When** el WebSocket se reconecta
**Then** `ws-client.ts` envía todas las operaciones al servidor en orden de timestamp Lamport

**Given** el servidor recibe operaciones offline del cliente A y operaciones del cliente B hechas durante la desconexión
**When** las procesa
**Then** almacena todas en Redis y hace broadcast a todos los clientes

**Given** todos los clientes reciben todas las operaciones
**When** cada cliente las aplica
**Then** `getDocument()` retorna el mismo string en todos los clientes (escenario c de NFR4)

**Given** todas las operaciones pendientes fueron enviadas y procesadas
**When** el sync completa
**Then** el store `pending_operations` de IndexedDB queda vacío

### Story 3.4: Service Worker y Caché del App Shell

Como usuario,
quiero que el editor cargue incluso sin internet,
para poder empezar a editar sin importar la conectividad.

**Acceptance Criteria:**

**Given** el service worker está registrado en `layout.tsx`
**When** el usuario visita la app por primera vez
**Then** el service worker cachea el app shell (HTML, JS, CSS)

**Given** el app shell está cacheado
**When** el usuario abre el editor sin conexión a internet
**Then** la UI del editor carga completamente en menos de 3 segundos

**Given** el service worker está activo
**When** una solicitud de red para un asset cacheado falla
**Then** el service worker sirve la versión cacheada transparentemente

---

## Epic 4: Visualizador de Operaciones

El usuario puede activar un panel que muestra en tiempo real cómo el algoritmo CRDT resuelve conflictos, con los identificadores internos del árbol Logoot/LSEQ visibles.

### Story 4.1: Log de Operaciones en el Store con Snapshots

Como desarrollador y revisor técnico,
quiero que el store Zustand registre cada operación con el estado del documento antes y después,
para que el visualizador tenga datos completos para mostrar.

**Acceptance Criteria:**

**Given** una `CRDTOperation` es aplicada via `applyOperation`
**When** el store se actualiza
**Then** `operationLogSlice` agrega una entrada con: `{ op, docBefore: string, docAfter: string, isConcurrent: boolean }`

**Given** dos operaciones con timestamps Lamport solapados de distintos sitios
**When** ambas son aplicadas
**Then** ambas entradas tienen `isConcurrent: true` en el log

**Given** el editor está en modo offline y operaciones se aplican desde replay de IndexedDB
**When** el store se actualiza
**Then** el log captura estas operaciones también

### Story 4.2: Panel Visualizador de Operaciones

Como usuario,
quiero activar un panel que muestra el log de operaciones con identificadores internos CRDT,
para que yo o un revisor técnico pueda observar cómo el algoritmo resuelve conflictos.

**Acceptance Criteria:**

**Given** el editor está abierto
**When** hago click en "Mostrar Visualizador"
**Then** el panel `OperationVisualizer` aparece sin interrumpir la edición

**Given** el panel está abierto
**When** se aplica una operación
**Then** aparece una nueva entrada mostrando: site ID, reloj Lamport, posición fraccional, tipo de operación, `docBefore`, `docAfter`

**Given** dos operaciones concurrentes existen en el log
**When** miro el panel
**Then** están marcadas visualmente con badge "CONCURRENTE" o color diferente

**Given** el panel está abierto durante reconciliación offline→online
**When** las operaciones pendientes se replayan
**Then** cada operación aparece en el log en tiempo real conforme se aplica

**Given** el panel está abierto
**When** hago click en "Ocultar Visualizador"
**Then** el panel desaparece y el editor continúa funcionando normalmente
