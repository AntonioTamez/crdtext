---
baseline_commit: 0861755a3ff87ba77500c9caa4dbb2a82ac0b4e7
---

# Story 1.3: Tests de Propiedades CvRDT

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como desarrollador y revisor técnico,
quiero tests Vitest que verifiquen explícitamente las propiedades matemáticas del motor CRDT,
para que la corrección sea demostrable como evidencia técnica de portafolio.

## Acceptance Criteria

1. **Given** el archivo `crdt-engine.test.ts` co-ubicado con `crdt-engine.ts`, **when** ejecuto `vitest run`, **then** todos los tests pasan con 0 fallos.
2. **Given** el escenario (a): dos inserts simultáneos en la misma posición desde sitio A y sitio B, **when** las operaciones se aplican en ambos órdenes (A→B y B→A), **then** el documento resultante es idéntico en ambos casos.
3. **Given** el escenario (b): insert de sitio A y delete de sitio B sobre el mismo carácter, **when** se aplican en ambos órdenes, **then** el documento resultante es idéntico en ambos casos.
4. **Given** cualquier test del suite, **when** se lee su descripción, **then** nombra la propiedad CvRDT que verifica (no "test 1", "test 2").

## Tasks / Subtasks

- [x] Task 1: Suite exhaustiva de conmutatividad — escenario (a) (AC: #2, #4)
  - [x] El test mínimo de conmutatividad ya existe en `crdt-engine.test.ts` (`describe('createCRDTEngine — commutativity (AC3)')`, de Story 1.2) — **no lo dupliques**, pero verifica que sigue siendo válido como prueba literal del escenario (a): 2 sitios, mismo índice lógico, aplicado en ambos órdenes, converge.
  - [x] Agrega un test que vaya MÁS ALLÁ del caso mínimo (2 sitios/2 órdenes): 3 sitios insertando concurrentemente en el mismo gap, aplicados en las 6 permutaciones de orden posibles (3! = 6), verificando que las 6 réplicas convergen al mismo documento. Esto demuestra conmutatividad de forma genuinamente exhaustiva, no solo pairwise.
  - [x] Nombra el test explícitamente con la palabra "commutativity" o "conmutatividad" en la descripción — no "test exhaustivo" ni similar vago.
- [x] Task 2: Suite de convergencia — escenario (b): insert + delete concurrentes sobre el mismo carácter (AC: #3, #4)
  - [x] **Esto es código nuevo, no existe todavía.** Story 1.2 explícitamente excluyó este escenario de su alcance.
  - [x] Implementa el escenario exacto (ver Dev Notes para el patrón completo): dos engines parten de un documento base ya convergido que contiene un carácter `X`. Concurrentemente (sin que ninguno sepa de la operación del otro todavía): el sitio A inserta un carácter nuevo adyacente a `X`; el sitio B elimina `X`. Aplica ambas operaciones en los dos órdenes posibles (A→B y B→A) en dos engines separados y verifica que el documento converge: `X` desaparece, el carácter nuevo de A permanece, en ambos órdenes.
  - [x] Este test demuestra una propiedad central de los CRDTs basados en posición: el delete de `X` no afecta la posición del insert de A, porque las posiciones son identificadores estables `(site, clock, frac)`, nunca índices de array — el insert "sobrevive" la eliminación del carácter vecino sin reajustarse.
  - [x] Nombra el test explícitamente como verificación de convergencia bajo insert+delete concurrentes — no lo confundas con (ni dupliques) el test ya existente de Story 1.2 "a delete that arrives before its matching insert is not lost", que prueba algo distinto (ver Dev Notes, sección "Diferencia crítica").
- [x] Task 3: Auditoría de idempotencia (AC: #4)
  - [x] Revisa los tests de idempotencia ya existentes (`describe('createCRDTEngine — idempotency (AC4)')` de Story 1.2, más el test de replay en `code review fixes` que ya cubre idempotencia bajo delete-antes-que-insert). Confirma que están completos: insert repetido, delete repetido, y replay completo de una secuencia out-of-order.
  - [x] Si el nuevo escenario (b) del Task 2 revela un caso de idempotencia no cubierto (ej. re-aplicar el par insert+delete concurrente completo dos veces), agrégalo. Si no hay gap real, no agregues un test artificial solo por completar la lista — evita relleno.
- [x] Task 4: Auditoría de nombres de tests (AC: #4)
  - [x] Recorre **todos** los `it(...)` existentes en `crdt-engine.test.ts` (los de Story 1.2 originales y los de code review fixes) y confirma que cada nombre describe la propiedad o comportamiento verificado de forma autoexplicativa — el estándar no es literal "debe decir la palabra exacta de la propiedad CvRDT", sino que un lector no necesite abrir el cuerpo del test para entender qué garantiza.
  - [x] Esta tarea es **solo de renombrado** — cero cambios de lógica. Si encuentras un nombre genuinamente vago, renómbralo. Si los nombres existentes ya son autoexplicativos (la mayoría lo son — fueron escritos siguiendo esta misma regla en Story 1.2), no hay nada que cambiar.
- [x] Task 5: Verificación final de suite completa (AC: #1)
  - [x] `npx vitest run src/lib/crdt` → 0 fallos
  - [x] Suite completa del proyecto: `npm run lint`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.server.json`, `npm run test`, `npm run build` — todos deben pasar antes de marcar la story como `review`.

## Dev Notes

### Naturaleza de esta story: solo tests, sin nuevo código de producción

A diferencia de Story 1.2, esta story **no agrega funcionalidad nueva al engine**. El motor CRDT (`crdt-engine.ts`, `position-generator.ts`, `lamport-clock.ts`) ya está completo y correcto tras los fixes de code review de Story 1.2. El objetivo es **demostrar y documentar matemáticamente**, vía tests, las propiedades que el motor ya garantiza. **Excepción:** si al escribir el test del escenario (b) (Task 2) descubres un bug real en el engine (no debería haberlo — el diseño basado en posiciones estables ya lo soporta correctamente — pero si lo encuentras), corrígelo. La regla general del proceso de desarrollo aplica: la story debe dejar el sistema funcionando correctamente de punta a punta, no solo satisfacer el texto literal de los ACs.

### Patrón completo para el escenario (b) — insert + delete concurrentes sobre el mismo carácter

La redacción de epics.md ("insert de sitio A y delete de sitio B sobre el mismo carácter") es escueta; aquí está el patrón concreto a implementar, con el razonamiento de por qué es la interpretación correcta:

```typescript
describe('Convergence — concurrent insert near X and delete of X (NFR4 escenario b)', () => {
  it('the document converges identically regardless of which concurrent operation is applied first', () => {
    const engineA = createCRDTEngine('site-a')
    const engineB = createCRDTEngine('site-b')

    // Both engines converge on a shared baseline document containing 'X'.
    const baseOp = engineA.generateOperation('insert', 0, 'X')
    engineA.applyOperation(baseOp)
    engineB.applyOperation(baseOp)
    expect(engineA.getDocument()).toBe('X')
    expect(engineB.getDocument()).toBe('X')

    // Concurrently, WITHOUT either site knowing about the other's operation yet:
    // site A inserts a new character adjacent to 'X' ...
    const insertOp = engineA.generateOperation('insert', 1, 'y') // -> "Xy"
    // ... and site B deletes 'X' itself.
    const deleteOp = engineB.generateOperation('delete', 0) // targets the 'X' node

    // Apply both operations in opposite orders on each engine.
    engineA.applyOperation(insertOp)
    engineA.applyOperation(deleteOp)

    engineB.applyOperation(deleteOp)
    engineB.applyOperation(insertOp)

    expect(engineA.getDocument()).toBe(engineB.getDocument())
    expect(engineA.getDocument()).toBe('y') // 'X' is gone, 'y' survived — position-based, not index-based
  })
})
```

**Por qué `insertOp` se genera ANTES de aplicar `deleteOp` en cada engine:** esto es lo que hace la operación genuinamente *concurrente* — `engineA.generateOperation('insert', 1, 'y')` se llama cuando `engineA` todavía no sabe nada del delete de B (no se ha aplicado `deleteOp` en `engineA` en ese punto). Si generaras `insertOp` después de aplicar `deleteOp`, ya no sería concurrente, sería causal (A reaccionando a un documento que ya no tiene `X`), y el test no demostraría lo que el AC pide.

### Diferencia crítica con el test ya existente de Story 1.2

El test de code review fixes `'a delete that arrives before its matching insert is not lost'` (en el bloque `describe('createCRDTEngine — code review fixes (2026-06-21)')`) prueba algo **relacionado pero distinto**:
- Ese test: el MISMO par insert/delete (un sitio inserta y **luego elimina su propio carácter**) llega a un tercer sitio en orden de red invertido (delete antes que el insert que lo originó). Es un problema de **entrega fuera de orden de operaciones causalmente relacionadas**.
- El escenario (b) de esta story: **dos operaciones genuinamente concurrentes de dos sitios distintos** — un insert nuevo (no relacionado causalmente con el delete) y un delete de un carácter preexistente. Es un problema de **conmutatividad bajo concurrencia real**, no de orden de entrega de una causalidad ya establecida.

No confundas ni dupliques estos dos tests — cubren propiedades distintas y ambos son necesarios.

### Convención de naming establecida en Story 1.2 (síguela)

Los `describe` existentes ya siguen el patrón `'createCRDTEngine — <propiedad/aspecto> (AC#)'` y los nombres de `it(...)` son oraciones completas que describen el comportamiento verificado, ej.:
- ✅ `'applying two concurrent inserts in opposite order converges to the same document'`
- ✅ `'applying the same operation twice does not change the document'`
- ❌ `'test 1'`, `'should work'`, `'edge case'`

Para los `describe` nuevos de esta story, usa el mismo patrón pero nombrando la propiedad CvRDT explícitamente, ej. `'Commutativity — N-way concurrent inserts (NFR4 escenario a, exhaustivo)'` o `'Convergence — concurrent insert near X and delete of X (NFR4 escenario b)'`.

### Patrón para la suite exhaustiva de 3 sitios / 6 permutaciones (Task 1)

```typescript
it('three concurrent inserts at the same gap converge identically across all 6 application orders (commutativity)', () => {
  function buildConverged(applicationOrder: number[]) {
    const engines = [createCRDTEngine('site-a'), createCRDTEngine('site-b'), createCRDTEngine('site-c')]
    const base = engines[0].generateOperation('insert', 0, 'a')
    engines.forEach((e) => e.applyOperation(base))
    const after = engines[0].generateOperation('insert', 1, 'z')
    engines.forEach((e) => e.applyOperation(after))

    // All three sites concurrently insert at the same gap (index 1), independently.
    const ops = engines.map((e) => e.generateOperation('insert', 1, 'XYZ'[engines.indexOf(e)]))

    // Apply all three operations, in `applicationOrder`, on a fresh fourth engine
    // representing one specific delivery order.
    const replica = createCRDTEngine('site-replica')
    replica.applyOperation(base)
    replica.applyOperation(after)
    for (const i of applicationOrder) replica.applyOperation(ops[i])
    return replica.getDocument()
  }

  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ]
  const results = permutations.map(buildConverged)
  expect(new Set(results).size).toBe(1) // all 6 orders produce the exact same document
  expect(results[0]).toHaveLength(5)
})
```

Esto es solo un patrón de referencia — ajusta nombres de variables/estructura a tu criterio, pero la idea central (generar las 3 operaciones concurrentes ANTES de aplicar ninguna, luego aplicarlas en las 6 permutaciones de orden, y verificar que todas producen el mismo resultado) es lo que demuestra conmutatividad exhaustiva.

### Regla arquitectónica (recordatorio de Story 1.2, sigue aplicando)

`src/lib/crdt/` no importa nada de React/Next.js/APIs de browser. Esta story solo agrega tests a `crdt-engine.test.ts`, que ya vive en este directorio y ya respeta la regla — no hay riesgo de violarla con tests nuevos en el mismo archivo, pero si agregas algún helper, mantenlo igualmente framework-free.

### Testing Standards

- Framework: Vitest, `environment: 'node'` (ya configurado, sin cambios)
- Todos los tests nuevos van en `src/lib/crdt/crdt-engine.test.ts` (archivo ya existente, no crear uno nuevo) — la AC#1 lo nombra explícitamente como el archivo objetivo
- Ejecutar `npm run lint`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.server.json`, `npm run test`, `npm run build` antes de marcar la story `review` — mismo patrón que Stories 1.1 y 1.2

## Previous Story Intelligence (Story 1.2)

- **El engine ya soporta correctamente el escenario (b) sin cambios** — las posiciones son identificadores estables `(site, clock, frac)`, no índices de array; un delete no reindexar nada, solo marca `deleted: true` en el nodo correspondiente. El test de Task 2 debería pasar en verde contra el código actual sin necesitar tocar `crdt-engine.ts`. Si no pasa, hay un bug real que corregir (ver Dev Notes arriba).
- **`generateOperation('delete', index)` ahora lanza `RangeError`** si el índice está fuera de rango (fix de code review de Story 1.2) — al escribir los tests de escenario (b), asegúrate de usar índices válidos en cada llamada (el patrón de Dev Notes ya lo hace correctamente).
- **`pendingDeletes` (Set interno)** ya maneja el caso de un delete que llega antes que su insert causal — no es lo mismo que el escenario (b) de esta story (ver "Diferencia crítica" en Dev Notes), pero comparten la misma estructura de datos subyacente; no necesitas tocarla.
- **`generateFracBetween` ahora requiere `siteId` como tercer parámetro** (fix de code review) y perturba el punto de división por sitio para evitar colisiones — si por alguna razón llamas a `generateFracBetween` directamente en un test (no debería ser necesario, ya que `crdt-engine.test.ts` solo usa la API pública del engine), recuerda el nuevo parámetro.
- **`crdt-engine.test.ts` ya tiene 13 tests** organizados en 4 `describe` blocks: aislamiento (AC1), `generateOperation` (AC2), `commutativity` (AC3 — escenario a mínimo, no lo dupliques), `idempotency` (AC4), y `code review fixes`. Esta story agrega `describe` blocks nuevos, no reemplaza los existentes.
- **Patrón de verificación establecido en Stories 1.1 y 1.2**: correr lint/typecheck/test/build antes de marcar cada task, y de nuevo antes de pasar a `review`. Story 1.2 detectó y corrigió 4 bugs reales en code review (incluyendo uno relacionado con colisión de posiciones bajo concurrencia) — la disciplina de TDD (RED→GREEN) y verificación exhaustiva pagó dividendos directos.

## Git Intelligence Summary

Commits relevantes: `0861755` (fixes de code review de Story 1.2 — el commit HEAD actual, usado como `baseline_commit` de esta story), `4e96e7d` (implementación original del motor CRDT). El patrón de mensajes de commit sigue siendo conventional-commit-style en inglés (`feat:`, `fix:`). Ningún commit ha tocado `crdt-engine.test.ts` fuera de los dos commits de Story 1.2 — esta será la primera vez que se extiende ese archivo en una story dedicada a testing.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — historia origen y acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — NFR2, NFR4(a+b), NFR6, NFR7, NFR8, NFR11, NFR12 (cobertura de Epic 1)
- [Source: _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md#FR-1.3] — "conmutativa, asociativa e idempotente"
- [Source: _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md#NFR-C.1] — los 3 escenarios verificables, incluyendo (c) que pertenece a Epic 3/Story 3.3, no a esta story
- [Source: _bmad-output/implementation-artifacts/1-2-implementacion-del-motor-crdt-logoot-lseq.md#Code Review Fixes] — los 4 fixes que cambiaron el comportamiento del engine desde la implementación original (RangeError en delete, pendingDeletes, siteId en generateFracBetween, lowerBound)
- [Source: src/lib/crdt/crdt-engine.ts] — implementación actual completa, leída en su totalidad para esta story
- [Source: src/lib/crdt/crdt-engine.test.ts] — suite de tests actual (13 tests), base sobre la que esta story construye

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Debug Log References

- `npx vitest run src/lib/crdt/crdt-engine.test.ts` → 14 passed (tras Task 1), luego 15 passed (tras Task 2)
- `npx vitest run src/lib/crdt` → 32 passed (los 3 archivos del directorio)
- `npm run lint` → sin errores
- `npx tsc --noEmit` → sin errores
- `npx tsc --noEmit -p tsconfig.server.json` → sin errores
- `npm run test` → 35 passed (suite completa del proyecto, 4 archivos)
- `npm run build` → compilación exitosa (Next.js 16.2.9, Turbopack)

### Completion Notes List

- Task 1: el test mínimo de conmutatividad de Story 1.2 (`describe('createCRDTEngine — commutativity (AC3)')`) se verificó vigente sin modificarlo. Se agregó `describe('Commutativity — N-way concurrent inserts (NFR4 escenario a, exhaustivo)')` con un test de 3 sitios insertando concurrentemente en el mismo gap, aplicado en las 6 permutaciones de orden posibles, verificando convergencia exhaustiva. Pasó en verde sin tocar `crdt-engine.ts`.
- Task 2: se agregó `describe('Convergence — concurrent insert near X and delete of X (NFR4 escenario b)')`, código de test nuevo (no existía antes). Confirma que, como predecía Previous Story Intelligence, el engine ya soporta correctamente este escenario sin cambios — las posiciones estables `(site, clock, frac)` hacen que el insert de A sobreviva el delete de X sin reajuste. No se encontró ningún bug; no se modificó `crdt-engine.ts`.
- Task 3: se auditaron los tests de idempotencia existentes (repetición de insert, repetición de delete, replay completo out-of-order con `pendingDeletes`). El nuevo escenario (b) no involucra `pendingDeletes` (el delete apunta a un nodo ya existente, no a uno que llega fuera de orden), por lo que no reveló ningún gap real de idempotencia. No se agregó ningún test artificial, conforme a la guía de Dev Notes de evitar relleno.
- Task 4: se revisaron los 15 `it(...)` del archivo (los de Story 1.2 originales, los de code review fixes, y los 2 nuevos de esta story). Todos los nombres ya son oraciones autoexplicativas que describen el comportamiento verificado sin necesidad de leer el cuerpo del test. No se renombró ninguno.
- Task 5: suite completa verificada en verde — `crdt-engine.test.ts` quedó con 15 tests (13 previos + 2 nuevos), el directorio `src/lib/crdt` con 32, y el proyecto completo con 35. Lint, ambos typechecks (app y server) y build de producción pasaron sin errores.
- Esta story fue exclusivamente de tests; no se modificó ningún archivo de producción (`crdt-engine.ts`, `position-generator.ts`, `lamport-clock.ts` quedaron intactos), conforme a lo anticipado en Dev Notes.
- Code review (`/code-review` high effort, 7 ángulos): se descartó como REFUTADO el hallazgo dominante de varios finders (que el test de conmutatividad exhaustiva "no prueba convergencia real de 3 sitios") — el test sigue verbatim el patrón de referencia autorizado en Dev Notes, la propiedad de conmutatividad reclamada queda demostrada correctamente vía un único merge target aplicando las 6 permutaciones, y la convergencia por intercambio mutuo en vivo ya está cubierta por tests preexistentes del archivo (AC3 y "third concurrent insert"). Se aplicó el único hallazgo CONFIRMED accionable de bajo riesgo: `buildConverged` reconstruía el fixture completo (3 engines, base, after, ops) en cada una de sus 6 invocaciones pese a no depender de `applicationOrder`; se elevó esa construcción fuera de la función, dejando solo la creación del replica y el loop de aplicación dependiente del orden dentro de ella. Cambio sin efecto en comportamiento — 15/15 tests siguen en verde. Los otros 2 hallazgos (duplicación de patrón bootstrap preexistente en el archivo desde Story 1.2, y relojes Lamport en lockstep entre los 3 sitios concurrentes) se dejaron sin tocar por ser de severidad baja y/o estar fuera del alcance de esta story (tocarían tests ya revisados de Story 1.2).

### File List

- `src/lib/crdt/crdt-engine.test.ts` (modificado — 2 describe blocks nuevos agregados: conmutatividad exhaustiva 3-sitios/6-permutaciones, y convergencia insert+delete concurrentes)
