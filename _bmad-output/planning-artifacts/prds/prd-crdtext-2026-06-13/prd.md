---
title: CRDText — Editor Colaborativo con CRDT
status: final
created: 2026-06-13
updated: 2026-06-13
---

# CRDText — Editor Colaborativo de Texto en Tiempo Real

## Visión

CRDText es un editor de texto colaborativo en tiempo real cuyo motor de sincronización implementa desde cero el algoritmo CRDT Logoot/LSEQ — sin depender de librerías como Y.js o Automerge. El proyecto demuestra dominio real de sistemas distribuidos: relojes vectoriales, consistencia eventual (CvRDT) y diseño de estructuras de datos distribuidas.

**Propósito:** Evidencia técnica concreta para entrevistas de sistema design en empresas FAANG.

> Para desarrolladores que necesitan demostrar profundidad técnica en sistemas distribuidos, CRDText es un proyecto de portafolio que implementa sincronización colaborativa con convergencia garantizada — a diferencia de proyectos que usan CRDT como caja negra, construye el algoritmo desde sus fundamentos matemáticos.

---

## Problema

La mayoría de editores colaborativos delegan la sincronización a librerías de CRDT (Y.js, Automerge) sin exponer sus mecanismos internos. Esto crea una brecha de conocimiento que se evidencia en entrevistas técnicas de sistema design. CRDText cierra esa brecha construyendo el motor desde cero.

---

## Usuarios y Escenario de Uso

**Usuario primario:** Cualquier par de usuarios con acceso al editor web.

**Escenario central:** Dos usuarios abren el mismo documento en navegadores distintos — posiblemente en redes diferentes — editan texto simultáneamente, incluso sin conexión, y el sistema garantiza que ambas versiones convergen al mismo estado final sin pérdida de operaciones.

**Audiencia de portafolio:** Ingenieros senior y entrevistadores técnicos en empresas de tecnología de alto nivel, evaluando profundidad en algoritmos, sistemas distribuidos y diseño de APIs.

---

## Stack Tecnológico

| Capa               | Tecnología                                 |
|--------------------|--------------------------------------------|
| Frontend           | Next.js 15 · TypeScript                   |
| Sincronización     | Node.js · WebSockets                      |
| Broker / Log de operaciones | Redis                           |
| Persistencia offline | IndexedDB · Service Worker              |
| CRDT Engine        | TypeScript puro (sin librerías de CRDT)   |

---

## Features y Requerimientos Funcionales

### F1 — Motor CRDT (Logoot/LSEQ)

El núcleo del sistema, implementado en TypeScript puro sin dependencias externas de CRDT.

**FR-1.1** El engine representa el documento como una secuencia ordenada de posiciones únicas usando identificadores compuestos por `(sitio, reloj_lógico, posición_fraccional)`.

**FR-1.2** Soporta dos operaciones primitivas: `insert(crdt_position, character)` y `delete(crdt_position)`, donde `crdt_position` es el identificador único de Logoot/LSEQ — nunca un índice de array que pueda desplazarse por operaciones concurrentes.

**FR-1.3** Cada operación es conmutativa, asociativa e idempotente — la propiedad CvRDT garantiza convergencia eventual independientemente del orden de llegada.

**FR-1.4** Los identificadores de posición son globalmente únicos entre sitios para evitar colisiones en edición concurrente.

**FR-1.5** El engine soporta N sitios concurrentes por diseño, no solo pares.

**FR-1.6** Expone una API interna limpia: `applyOperation(op)`, `generateOperation(type, index)`, `getDocument() → string`.

---

### F2 — Capa de Presencia

Comunicación en tiempo real y visibilidad de usuarios activos.

**FR-2.1** El servidor mantiene conexiones WebSocket persistentes con todos los clientes activos.

**FR-2.2** Cada operación generada por un cliente se transmite a todos los demás clientes conectados en tiempo real.

**FR-2.3** El sistema asigna automáticamente a cada usuario un nombre y color únicos al conectarse, sin requerir autenticación.

**FR-2.4** El cursor de cada usuario activo es visible para todos los demás en tiempo real, actualizado con cada pulsación de tecla.

**FR-2.5** El servidor implementa heartbeat para detectar y limpiar conexiones inactivas.

**FR-2.6** La arquitectura de broadcast soporta N clientes simultáneos sin cambios estructurales.

---

### F3 — Modo Offline-First

Edición sin conexión con reconciliación automática al reconectar.

**FR-3.1** El cliente detecta pérdida de conectividad y entra en modo offline automáticamente.

**FR-3.2** Las operaciones generadas offline se almacenan en IndexedDB como buffer de operaciones pendientes.

**FR-3.3** Al reconectar, el cliente envía todas las operaciones pendientes al servidor ordenadas por reloj lógico.

**FR-3.4** El servidor aplica las operaciones recibidas y las retransmite a los demás clientes conectados.

**FR-3.5** El documento converge al mismo estado final en todos los clientes, independientemente del orden de llegada de las operaciones offline.

**FR-3.6** El usuario recibe feedback visual claro del estado de conectividad: `online` / `offline` / `sincronizando`.

**FR-3.7** El service worker gestiona el caché del app shell para que el editor cargue sin conexión, y coordina con IndexedDB el buffer de operaciones pendientes.

---

### F4 — Visualizador de Operaciones

Panel de diagnóstico que expone el proceso de resolución de conflictos en tiempo real.

**FR-4.1** Muestra un log en tiempo real de todas las operaciones aplicadas al documento, con los identificadores internos completos de Logoot/LSEQ: `(site, clock, frac_position)`, tipo de operación y estado del documento resultante.

**FR-4.2** Las operaciones concurrentes (mismo intervalo de tiempo lógico, distintos sitios) se marcan visualmente como tales.

**FR-4.3** El log muestra el estado del documento antes y después de cada operación.

**FR-4.4** El panel se activa y desactiva sin interrumpir la edición.

**FR-4.5** Funciona en modo online y durante la reconciliación offline.

---

## Requerimientos No Funcionales

### Performance

**NFR-P.1** La latencia de sincronización es menor a 1 segundo en condiciones normales (red estable, operaciones simples).

**NFR-P.2** El engine procesa operaciones individuales en menos de 10 ms en el cliente.

**NFR-P.3** El demo se mantiene estable con 2 usuarios simultáneos durante una sesión de 15–30 minutos.

### Corrección

**NFR-C.1** El documento converge al mismo estado en todos los clientes activos en los siguientes escenarios verificables: (a) dos inserts simultáneos en la misma posición, (b) insert y delete concurrentes sobre el mismo carácter, (c) operaciones offline de dos sitios que llegan en orden inverso al reconectar.

**NFR-C.2** Ninguna operación se pierde, incluidas las generadas offline.

**NFR-C.3** Idempotencia garantizada: aplicar la misma operación dos veces no altera el documento.

### Arquitectura

**NFR-A.1** El motor CRDT es independiente del framework de UI y del protocolo de transporte.

**NFR-A.2** El engine incluye tests unitarios que verifican las propiedades CvRDT: convergencia, conmutatividad, idempotencia.

**NFR-A.3** La arquitectura soporta N usuarios simultáneos sin refactoring — el demo usa 2, pero el diseño no asume ese límite.

**NFR-A.4** Redis actúa como broker pub/sub para operaciones entre clientes WebSocket y mantiene un log persistente de operaciones. Un cliente que se conecta tarde reproduce el log completo para reconstruir el estado del documento, sin serializar el árbol CRDT completo en Redis.

### Portafolio

**NFR-O.1** El código del engine está organizado de modo que un entrevistador pueda entender el algoritmo en una revisión de 10 minutos.

**NFR-O.2** El README explica el algoritmo, las decisiones de diseño y las propiedades matemáticas garantizadas.

---

## Métricas de Éxito

### Técnicas

- **Convergencia verificada:** los tests unitarios del engine pasan con cobertura completa de las propiedades CvRDT.
- **Cero pérdida de operaciones:** tras un ciclo offline→online, el documento final es idéntico en todos los clientes.
- **Demo funcional:** dos usuarios editan simultáneamente durante 15 minutos sin inconsistencias visibles.

### Portafolio

- **Entrevistas FAANG:** el proyecto genera al menos una entrevista técnica en una empresa FAANG.
- **Profundidad demostrable:** el entrevistador pregunta sobre relojes vectoriales, orden parcial e idempotencia, y el candidato responde con referencia directa al código.

---

## Fuera de Alcance (MVP)

- Autenticación y cuentas de usuario
- Persistencia de documentos en base de datos entre sesiones
- Formato de texto enriquecido (negrita, cursiva, encabezados, etc.)
- Aplicación móvil o nativa
- Deployment en producción escalable (más allá del demo)
- Más de 2 usuarios en el demo *(la arquitectura soporta N; la presentación usa 2)*

---
