Proyecto 1 — CRDText: Collaborative Rich Text con CRDT desde cero

Repositorio: github.com/tu-usuario/crdtext

Stack: Next.js 15 · TypeScript · Node.js (WebSocket) · Redis · IndexedDB

¿Qué es?

Un editor de texto colaborativo en tiempo real (tipo Google Docs) donde el motor de sincronización está implementado desde cero usando el algoritmo CRDT Logoot/LSEQ — sin usar Y.js ni Automerge. Dos usuarios pueden editar simultáneamente offline y sincronizarse sin conflictos al reconectarse.

¿Por qué llama la atención?

La mayoría de devs usa librerías de CRDT como caja negra. Implementarlo desde cero demuestra que entiendes relojes vectoriales, invariantes de convergencia eventual (CvRDT), y cómo diseñar estructuras de datos distribuidas. Es exactamente el tipo de problema que aparece en entrevistas de sistema design en Google y Meta.

Componentes clave a construir


CRDT Engine en TypeScript puro: árbol de posiciones únicas con identificadores de sitio y reloj lógico.
Presence layer: cursores de múltiples usuarios con WebSockets y heartbeat.
Offline-first: IndexedDB como buffer de operaciones + merge automático al reconectar.
Conflict visualizer: panel que muestra en tiempo real cómo se resuelven los conflictos (gran diferenciador visual para el portfolio).


Señales técnicas que demuestra


Algoritmos y estructuras de datos avanzadas
Sistemas distribuidos (relojes vectoriales, consistencia eventual)
Diseño de APIs de WebSocket a escala
Frontend avanzado con IndexedDB y service workers