---
baseline_commit: 5a0c39d46a0c471f1cdc2c3bbfda196438d97d92
---

# Story 1.2: Implementación del Motor CRDT (Logoot/LSEQ)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como desarrollador,
quiero una implementación TypeScript del algoritmo Logoot/LSEQ,
para tener un motor CRDT correcto sin dependencias de framework.

## Acceptance Criteria

1. **Given** que el módulo crdt es importado en un entorno Node.js de test, **when** reviso los imports de cualquier archivo en `src/lib/crdt/`, **then** no existe ningún import de React, Next.js ni APIs de browser.
2. **Given** un documento y un índice de posición, **when** llamo `generateOperation('insert', index)`, **then** retorna un `CRDTOperation` con identificador de posición único `(site, clock, frac[])`.
3. **Given** dos operaciones de distintos sitios aplicadas a documentos idénticos, **when** se aplican en orden opuesto en cada documento, **then** `getDocument()` retorna el mismo string en ambos (conmutatividad).
4. **Given** una operación ya aplicada al documento, **when** llamo `applyOperation(op)` con la misma operación nuevamente, **then** `getDocument()` retorna el mismo string que antes (idempotencia).

## Tasks / Subtasks

- [x] Task 1: Implementar el reloj lógico Lamport (AC: #2)
  - [x] Crear `src/lib/crdt/lamport-clock.ts`
  - [x] Clase `LamportClock` con estado interno privado (inicia en 0)
  - [x] Método `tick(): number` — incrementa el reloj en 1 y retorna el nuevo valor. Es el ÚNICO lugar del codebase donde el reloj se incrementa para generar un nuevo timestamp local
  - [x] Método `update(received: number): void` — sincroniza con un timestamp externo: `internal = max(internal, received) + 1` (regla estándar de Lamport clocks para mensajes recibidos)
  - [x] Sin getters/setters que permitan mutar el reloj desde fuera de la clase. Verificado: 4/4 tests en `lamport-clock.test.ts` pasando, lint y typecheck limpios
- [x] Task 2: Implementar el generador de posiciones fraccionales (AC: #2, #3)
  - [x] Crear `src/lib/crdt/position-generator.ts`
  - [x] Función pura `generateFracBetween(before: number[] | null, after: number[] | null): number[]` — genera un array de fracciones estrictamente entre `before` y `after` (ver algoritmo completo en Dev Notes)
  - [x] Función pura `comparePositions(a: Position, b: Position): -1 | 0 | 1` donde `Position = { site: string; clock: number; frac: number[] }` — compara primero por `frac` (lexicográfico), y si son exactamente iguales, desempata por `(clock, site)` para garantizar unicidad global (FR4)
  - [x] Sin estado mutable ni dependencias de instancia — funciones puras, fáciles de testear en aislamiento. Verificado: 10/10 tests pasando (incluye caso límite de near-collision que fuerza profundizar de nivel), lint y typecheck limpios
- [x] Task 3: Implementar el motor CRDT (AC: #1, #2, #3, #4)
  - [x] Crear `src/lib/crdt/crdt-engine.ts`
  - [x] Estructura interna: array ordenado de nodos `{ position: Position; char: string; deleted: boolean }` — el orden del array refleja siempre el orden de `comparePositions`, independientemente del orden de llegada de las operaciones (inserción vía búsqueda binaria en `insertSorted`)
  - [x] Factory `createCRDTEngine(siteId: string)` que retorna `{ applyOperation, generateOperation, getDocument }` — instancia su propio `LamportClock` internamente (closure, no clase — más simple para este caso de uso sin necesidad de herencia/polimorfismo)
  - [x] `generateOperation(type, index, char?)` — implementado exactamente según spec: insert genera frac vía `generateFracBetween` sobre vecinos visibles; delete toma la posición exacta del nodo visible en `index`. Ambos casos construyen el `CRDTOperation` de una sola vez (`Readonly<CRDTOperation>`)
  - [x] `applyOperation(op)` — insert: idempotente vía `findNodeIndexByPosition` (usa `comparePositions === 0`); delete: tombstone (`deleted: true`), nunca elimina físicamente. Ambos casos llaman `clock.update(op.timestamp)`
  - [x] `getDocument()` — filtra `deleted`, concatena `char` en orden
  - [x] Ningún `CRDTOperation` se muta después de construirse — verificado por revisión manual del código, no hay asignaciones a campos de `op` tras su creación
- [x] Task 4: Tests mínimos que prueben las 4 ACs de esta story (AC: #1, #2, #3, #4)
  - [x] Creado `src/lib/crdt/crdt-engine.test.ts` co-ubicado con `crdt-engine.ts` — 7 tests, todos pasando
  - [x] Test AC#1: lee los 3 archivos fuente (`.ts`, no `.test.ts`) de `src/lib/crdt/` con `fs.readdirSync`/`readFileSync` y verifica con regex que ninguno importa `react`/`next` ni referencia `window`/`document`
  - [x] Test AC#2: `generateOperation('insert', 0, 'x')` sobre engine vacío — verifica `type`, `char`, `siteId`, `timestamp`, `position.site`, `position.clock`, `position.frac` (array no vacío)
  - [x] Test AC#3: dos engines parten de documento base `"ac"` idéntico, generan inserts concurrentes en el mismo índice lógico (`'b'` desde site-a, `'B'` desde site-b), se aplican en orden opuesto en cada engine (A: propia→ajena; B: propia→ajena) — `getDocument()` converge igual en ambos (longitud 4, mismo string)
  - [x] Test AC#4: aplicar la misma operación de insert dos veces y la misma de delete dos veces — documento idéntico antes/después de la segunda aplicación en ambos casos
  - [x] Tests adicionales no exigidos por los ACs pero necesarios para confianza básica: inserts secuenciales producen el orden correcto, y delete remueve el carácter correcto — fundamento sobre el que Story 1.3 construirá la suite exhaustiva (no se duplicó el trabajo de escenarios (b)/(c), que quedan fuera de esta story)
  - [x] Suite completa verificada: lint ✅, `tsc --noEmit` (app) ✅, `tsc --noEmit -p tsconfig.server.json` ✅, `npm run test` (24/24 en 4 archivos: lamport-clock, position-generator, crdt-engine, shared/types) ✅, `npm run build` ✅

## Dev Notes

### Algoritmo: generación de posiciones fraccionales (`generateFracBetween`)

El tipo `Position` (de `shared/types.ts`, campo `position` de `CRDTOperation`) es `{ site: string; clock: number; frac: number[] }`. `frac` es un array de números en el rango conceptual `(0, 1)` que actúa como un **path en un árbol exponencial** (la idea central de Logoot/LSEQ) — compararlo lexicográficamente dos arrays da el orden total del documento.

**Algoritmo recomendado** (versión simplificada de LSEQ — boundary strategy con punto medio determinista, ver nota de scope abajo):

```
function generateFracBetween(before: number[] | null, after: number[] | null): number[] {
  const b = before ?? []
  const a = after ?? []
  let depth = 0
  const result: number[] = []

  while (true) {
    const lo = b[depth] ?? 0
    const hi = a.length > depth ? a[depth] : 1
    // Si hay espacio suficiente en este nivel, usar el punto medio y terminar
    if (hi - lo > MIN_GAP) {  // MIN_GAP = 1e-9, evita colisiones de float
      result.push(lo + (hi - lo) / 2)
      return result
    }
    // Sin espacio en este nivel: heredar el dígito de `before` (o 0) y profundizar
    result.push(lo)
    depth++
  }
}
```

- Caso límite "insertar al inicio del documento": `before = null` → tratado como rango que empieza en 0.
- Caso límite "insertar al final": `after = null` → tratado como rango que termina en 1.
- Caso límite "documento vacío": ambos `null` → frac = `[0.5]`.

**Nota de scope deliberada:** LSEQ real usa una estrategia de boundary **aleatoria** (alternar entre acercarse a `before` o a `after` en cada nivel nuevo) para evitar que identificadores crezcan de forma predecible/sesgada bajo patrones de edición adversariales a gran escala. Esta story usa punto medio **determinista** en su lugar — es correcto y suficiente para NFR-P.3 (demo de 2 usuarios, sesión de 15–30 min), y determinista hace los tests reproducibles sin mockear randomness. Si el `README.md` (Story 1.4) necesita explicar el algoritmo a un entrevistador, esta es exactamente el tipo de decisión de trade-off documentado que vale la pena mencionar explícitamente — demuestra que la simplificación fue una elección informada, no una laguna de conocimiento.

### Algoritmo: comparación de posiciones (`comparePositions`)

```
function comparePositions(a: Position, b: Position): -1 | 0 | 1 {
  // 1. Comparación lexicográfica de frac
  const len = Math.max(a.frac.length, b.frac.length)
  for (let i = 0; i < len; i++) {
    const av = a.frac[i] ?? -Infinity  // posición más corta = "antes" si comparten prefijo
    const bv = b.frac[i] ?? -Infinity
    if (av !== bv) return av < bv ? -1 : 1
  }
  // 2. frac idénticos → desempate por (clock, site) para unicidad global (FR4)
  if (a.clock !== b.clock) return a.clock < b.clock ? -1 : 1
  if (a.site !== b.site) return a.site < b.site ? -1 : 1
  return 0  // mismo site, mismo clock, mismo frac → es la MISMA posición (caso de idempotencia)
}
```

El caso de retorno `0` (misma posición exacta) es exactamente lo que `applyOperation` usa para detectar idempotencia — si `comparePositions(nuevaOp.position, nodoExistente.position) === 0`, es la misma operación, no-op.

### Por qué la estructura interna es un array ordenado (no un árbol)

NFR-P.2 exige <10ms por operación; NFR-P.3 acota el demo a 2 usuarios por 15–30 min — esto es un documento de cientos a pocos miles de caracteres, no Wikipedia. Un array ordenado con búsqueda binaria (`O(log n)` para encontrar el punto de inserción + `O(n)` para el `splice`) es ampliamente suficiente y mucho más simple de razonar/testear que un árbol balanceado. Si en el futuro se necesitara escalar a documentos masivos, ahí sí justificaría una estructura más sofisticada — fuera de alcance aquí.

### Regla arquitectónica crítica — aislamiento total

`src/lib/crdt/` (este directorio completo) **no debe importar NADA de React, Next.js, ni APIs de browser**. Es TypeScript puro, ejecutable en cualquier entorno Node.js. Esta regla es la razón por la que Story 1.1 configuró Vitest con `environment: 'node'` como default — tus tests en `src/lib/crdt/*.test.ts` correrán automáticamente en ese entorno sin necesidad de ningún comment `// @vitest-environment`, y si accidentalmente importas algo que depende de `window`/`document`, el test fallará en vez de pasar silenciosamente (ver Previous Story Intelligence abajo).

### Prohibición explícita — sin librerías de CRDT

**NUNCA** instalar ni importar Y.js, Automerge, ni ninguna otra librería de CRDT. El PRD y la Arquitectura son explícitos: el motor implementado desde cero es la pieza central de portafolio de todo el proyecto (NFR-O.1, NFR-O.2). Si en algún punto sientes la tentación de "usar algo que ya resuelve esto" — esa tentación es exactamente lo que este proyecto existe para evitar. Toda la lógica de posiciones fraccionales, comparación y reloj lógico se implementa aquí, en TypeScript puro.

### Inmutabilidad de CRDTOperation

Regla obligatoria de `architecture.md`: nunca mutar un `CRDTOperation` después de crearlo.

```typescript
// ✅ correcto
const op: Readonly<CRDTOperation> = { type: 'insert', position, char, siteId, timestamp }
return op

// ❌ prohibido
const op = { type: 'insert', ... } as CRDTOperation
op.timestamp = clock.tick()  // mutación post-creación
```

Construye el objeto completo de una sola vez, con todos los campos ya resueltos (incluyendo el `clock.tick()` ya ejecutado antes de construir el objeto).

### Project Structure Notes

Archivos nuevos de esta story, todos dentro de `src/lib/crdt/` (directorio que no existe aún — créalo):

```
src/lib/crdt/
├── lamport-clock.ts
├── position-generator.ts
├── crdt-engine.ts
└── crdt-engine.test.ts
```

No crear `position-generator.test.ts` separado en esta story — la arquitectura lo prevé como archivo futuro (probablemente Story 1.3, cuando se exhaustivamente prueben las propiedades), pero esta story solo requiere que `position-generator.ts` funcione correctamente, verificado indirectamente a través de `crdt-engine.test.ts`. Si prefieres testear `position-generator.ts` de forma aislada ahora mismo, es válido y bienvenido — no es obligatorio para cumplir los ACs de esta story.

Ningún otro directorio de `architecture.md` (`server/`, `src/lib/ws-client/`, `src/lib/storage/`, `src/lib/store/`, `src/components/`) se toca en esta story.

### Convenciones de nombrado (de `architecture.md`, ya aplicadas en Story 1.1)

- Archivos de módulos: kebab-case → `crdt-engine.ts`, `lamport-clock.ts`, `position-generator.ts` (ya nombrados correctamente arriba)
- Funciones y variables: camelCase → `applyOperation`, `generateOperation`, `comparePositions`
- Tipos: PascalCase → `CRDTOperation` (ya existe en `shared/types.ts`), `Position` (tipo nuevo de esta story — puede vivir en `position-generator.ts` o en un `crdt-types.ts` local si prefieres separarlo; no es necesario agregarlo a `shared/types.ts` porque `Position` es un detalle interno del engine, no un tipo compartido con el servidor/cliente WS — el servidor solo ve `CRDTOperation.position` como un objeto opaco)

### Testing Standards

- Framework: Vitest, ya configurado en Story 1.1 (`environment: 'node'` por default — correcto para este módulo)
- Co-ubicar `crdt-engine.test.ts` con `crdt-engine.ts`, no en carpeta separada
- Nombrar los tests describiendo el comportamiento/propiedad que verifican, no "test 1"/"test 2" (regla que Story 1.3 aplicará exhaustivamente, pero empieza a seguirla desde ya en esta story)
- Ejecutar `npm run test` (ya configurado) y `npx tsc --noEmit` antes de marcar tasks completos — mismo patrón que Story 1.1

## Previous Story Intelligence (Story 1.1)

- **Vitest ya está configurado correctamente para esta story sin cambios adicionales**: el code review de Story 1.1 cambió `environment: 'jsdom'` (default original) a `environment: 'node'` (default actual) específicamente para que los futuros tests de `src/lib/crdt/` corrieran en un entorno sin DOM globals — eso te beneficia directamente: si por error usas una API de browser, el test fallará en vez de pasar silenciosamente bajo jsdom. No necesitas tocar `vitest.config.ts`.
- **`shared/types.ts` ya exporta `CRDTOperation`** con la forma exacta `{ type: 'insert' | 'delete'; position: { site: string; clock: number; frac: number[] }; char?: string; siteId: string; timestamp: number }` — impórtalo desde ahí (`import type { CRDTOperation } from '../../../shared/types'` o el path relativo correcto desde `src/lib/crdt/`), no lo redefinas.
- **Patrón de verificación establecido**: Story 1.1 corrió `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build` antes de marcar cada task completo, y de nuevo antes de marcar la story `review`. Sigue el mismo patrón — es lo que permitió detectar y arreglar 6 issues reales en code review antes de que se acumularan.
- **`char` es opcional en `CRDTOperation` independientemente de `type`** (no es un discriminated union estricto sobre ese campo) — esto es una decisión explícita de `architecture.md` (línea con comentario `// solo en insert`), no un bug a corregir. Tu código en `generateOperation`/`applyOperation` debe manejar `op.char` como potencialmente `undefined` incluso cuando `op.type === 'insert'` a nivel de tipos, aunque en la práctica tu propio `generateOperation` siempre lo proveerá correctamente para inserts.

## Git Intelligence Summary

Últimos commits relevantes: `5a0c39d` (fixes de code review de Story 1.1: vitest environment, tsconfig.server.json outDir/paths, tokens de fuente faltantes en globals.css, dark mode fix) y `b746638` (scaffold inicial). Ningún commit toca `src/lib/` todavía — este es el primer código de lógica de negocio real del proyecto. Patrón establecido: commits descriptivos en inglés, conventional-commit-style (`feat:`, `fix:`).

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — historia origen y acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Arquitectura de Datos] — esquema exacto de `CRDTOperation` y `Position`
- [Source: _bmad-output/planning-artifacts/architecture.md#Patrones de Formato] — regla de inmutabilidad de `CRDTOperation` y regla de instancia única del reloj Lamport
- [Source: _bmad-output/planning-artifacts/architecture.md#Reglas Obligatorias para Todos los Agentes] — reglas #2 (no mutar CRDTOperation) y #4 (no incrementar Lamport fuera de la clase)
- [Source: _bmad-output/planning-artifacts/architecture.md#Estructura del Proyecto y Límites Arquitectónicos] — "Límite 1: CRDT Engine vs. todo lo demás"
- [Source: _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md#F1 — Motor CRDT (Logoot/LSEQ)] — FR-1.1 a FR-1.6
- [Source: _bmad-output/implementation-artifacts/1-1-setup-del-proyecto-e-infraestructura-base.md#Code Review Fixes] — por qué `vitest.config.ts` usa `environment: 'node'` por default

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED→GREEN por archivo: `lamport-clock.test.ts` (4 tests), `position-generator.test.ts` (10 tests), `crdt-engine.test.ts` (7 tests) — los tres confirmados fallando antes de implementar (`Cannot find module`) y pasando después
- `npm run lint` → 0 errores
- `npx tsc --noEmit` (tsconfig.json) → 0 errores
- `npx tsc --noEmit -p tsconfig.server.json` → 0 errores
- `npm run test` (vitest run) → 4 archivos, 24 tests, todos pasando
- `npm run build` → build de producción exitoso

### Completion Notes List

- Implementado el motor CRDT completo en 3 módulos: `lamport-clock.ts` (reloj lógico, clase con estado privado), `position-generator.ts` (funciones puras `generateFracBetween`/`comparePositions`), `crdt-engine.ts` (factory `createCRDTEngine` que combina ambos).
- `createCRDTEngine` usa un closure (función + estado capturado) en vez de una clase — es un detalle de implementación no especificado por la story; se eligió por simplicidad ya que no hay necesidad de herencia/polimorfismo y evita exponer estado mutable accidentalmente vía `this`.
- El algoritmo de `generateFracBetween` sigue exactamente el pseudocódigo de Dev Notes (punto medio determinista con profundización cuando no hay espacio). El test de "near-collision" (`before=[0.3]`, `after=[0.3+1e-10]`) confirma que la profundización ocurre correctamente y que el resultado ordena estrictamente entre ambos límites.
- El test de conmutatividad (AC3) simula dos sitios que parten de un documento base idéntico (`"ac"`), generan inserts concurrentes en el mismo índice lógico, y los aplican en orden opuesto en cada engine — confirma que el documento converge sin importar el orden de llegada, usando solo el orden total que define `comparePositions` (nunca el orden de aplicación).
- El test de aislamiento (AC1) es dinámico (lee los archivos fuente con `fs` y aplica una regex), no solo una afirmación en prosa — si alguien agrega accidentalmente un import de React a este directorio en el futuro, el test fallará automáticamente.
- No se creó `position-generator.test.ts` como archivo opcional separado — Dev Notes lo dejaba como opcional y se decidió escribirlo de todas formas (10 tests) porque las funciones puras de generación de posiciones son el corazón algorítmico del proyecto y merecen cobertura directa, no solo indirecta a través de `crdt-engine.test.ts`.
- `Position` se definió y exporta desde `position-generator.ts` (no se agregó a `shared/types.ts`) tal como sugerían Dev Notes — es un detalle interno del engine.
- Story 1.3 (próxima) construye sobre esta base la suite exhaustiva de propiedades CvRDT (escenarios (a), (b), (c) de NFR-C.1) — esta story deliberadamente no los duplicó.

### Code Review Fixes (2026-06-21)

`/code-review` (7-angle recall-biased pass) encontró 4 issues confirmados — el más severo (#1) fue independientemente detectado por 4 de los 7 ángulos. Los 4 se corrigieron en la misma sesión, siguiendo TDD (test RED → fix → GREEN) para cada uno:

1. **`crdt-engine.ts` — `generateOperation('delete', index)` crasheaba con `TypeError` ante un índice fuera de rango** (documento vacío, o índice ≥ longitud visible). Corregido: ahora valida `targetNode` y lanza `RangeError` con mensaje claro (`"no visible character at index N"`) en vez de un crash opaco. 2 tests nuevos cubren documento vacío e índice fuera de rango.

2. **`crdt-engine.ts` — un delete que llega antes que su insert correspondiente se perdía silenciosa y permanentemente**, violando NFR-C.1(c) (operaciones offline que llegan en orden inverso deben converger igual). Corregido: nuevo `Set<string> pendingDeletes` (clave = `site:clock:frac`) registra deletes "huérfanos"; cuando el insert correspondiente llega después, se aplica directamente como `deleted: true` en vez de resucitar el carácter. 2 tests nuevos cubren el caso base y la idempotencia bajo replay con el delete llegando primero.

3. **`position-generator.ts` — colisión de `frac` garantizada entre inserts concurrentes en el mismo gap**, porque el algoritmo de punto medio era 100% determinista (mismo `before`/`after` → mismo resultado, sin importar el sitio). Esto causaba que un tercer insert posterior "entre" dos nodos colisionados aterrizara después de ambos en vez de entre ellos — alcanzable dentro del escenario MVP documentado (NFR-C.1a). **Fix:** `generateFracBetween` ahora recibe `siteId` y perturba el punto de división con un offset determinista (hash FNV-1a de `siteId`, mapeado a `(0.1, 0.9)`) — sigue siendo 100% reproducible/testeable, pero dos sitios distintos ya casi nunca colisionan. Se reescribieron los tests de `position-generator.test.ts` para verificar propiedades estructurales (estrictamente entre los límites) en vez de números mágicos exactos — más robusto. 3 tests nuevos: no-colisión entre sitios, el offset nunca toca los límites, y reproducibilidad. Test nuevo en `crdt-engine.test.ts` reproduce el escenario completo de 3 sitios (dos colisionan, un tercero inserta entre ellos) y confirma que el carácter aterriza en el índice visible correcto.

4. **`crdt-engine.ts` — `findNodeIndexByPosition` hacía un scan O(n) (`Array.findIndex`) pese a que `nodes` siempre está ordenado** por el mismo comparador que ya usa `insertSorted` para insertar en O(log n). Corregido: ambas funciones ahora comparten un solo `lowerBound` (búsqueda binaria), eliminando la duplicación y bajando el lookup a O(log n). Sin tests nuevos — cubierto transitivamente por toda la suite existente de idempotencia/aplicación de operaciones.

Suite completa re-verificada post-fix: lint ✅, typecheck app ✅, typecheck server ✅, tests 33/33 ✅ (21 originales + 6 de regresión para los fixes 1-2 + 6 adicionales en position-generator.test.ts), build ✅.

**Nota de diseño:** El fix #3 cambia la firma pública de `generateFracBetween(before, after)` → `generateFracBetween(before, after, siteId)`. Es una función interna de `src/lib/crdt/`, sin consumidores fuera de este módulo (verificado por grep en el code review), así que el cambio no tiene impacto en ningún otro archivo del proyecto.

### File List

**Nuevos:**
- `src/lib/crdt/lamport-clock.ts`
- `src/lib/crdt/lamport-clock.test.ts`
- `src/lib/crdt/position-generator.ts`
- `src/lib/crdt/position-generator.test.ts`
- `src/lib/crdt/crdt-engine.ts`
- `src/lib/crdt/crdt-engine.test.ts`
