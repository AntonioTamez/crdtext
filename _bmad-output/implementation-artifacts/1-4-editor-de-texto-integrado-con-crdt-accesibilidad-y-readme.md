---
baseline_commit: e48dc064f8a3fb89a979600714dc8c8a3eeb8800
---

# Story 1.4: Editor de Texto Integrado con CRDT, Accesibilidad y README

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como usuario,
quiero un editor de texto donde cada pulsación pasa por el motor CRDT y es accesible vía teclado/lector de pantalla,
para escribir texto con la garantía de que las operaciones se rastrean correctamente y el editor es usable por cualquiera.

## Acceptance Criteria

1. **Given** la aplicación está corriendo, **when** abro el editor en un browser, **then** veo un área de texto con la tipografía serif de `DESIGN.md` y puedo escribir.
2. **Given** escribo un carácter en la posición N, **when** se procesa la pulsación, **then** se llama `generateOperation('insert', N)` y el documento se actualiza en el store Zustand.
3. **Given** elimino un carácter, **when** se procesa la eliminación, **then** se llama `generateOperation('delete', N)` y el carácter desaparece.
4. **Given** el editor es un elemento `contenteditable`, **when** inspecciono sus atributos ARIA, **then** tiene `role="textbox"`, `aria-multiline="true"` y `aria-label="Editor de texto colaborativo"` (UX-DR12).
5. **Given** el `README.md`, **when** un revisor técnico lo lee, **then** explica el algoritmo Logoot/LSEQ, las propiedades CvRDT garantizadas, las decisiones de stack y cómo ejecutar los tests.

## Tasks / Subtasks

- [x] Task 1: Instalar Zustand y crear el store del documento (AC: #2)
  - [x] `npm install zustand` (no está en `package.json` todavía — primera story que lo necesita).
  - [x] Crear `src/lib/store/use-document-store.ts` siguiendo **exactamente** el ejemplo de `architecture.md#Patrones de Estructura` — campos `document: string`, `engineRef: CRDTEngine | null` (empieza en `null`, no se crea en la inicialización del módulo — ver Dev Notes "Por qué `engineRef` empieza en `null`"), `operationLog: CRDTOperation[]`.
  - [x] Usa la sintaxis curried de Zustand v5 para TypeScript: `create<DocumentStore>()((set, get) => ({ ... }))` — **no** `create<DocumentStore>((set, get) => ...)` sin el `()` extra, eso rompe la inferencia de tipos de `set`/`get` (ver Dev Notes).
  - [x] Acciones del store: `initEngine()`, `insertChar(index, char)`, `deleteChar(index)`. Las acciones son el **único** lugar que llama `generateOperation`/`applyOperation` del engine — ver regla arquitectónica obligatoria #1 en Dev Notes.
  - [x] Actualizaciones de `set(...)` siempre inmutables (spread de arrays), nunca `.push()` directo sobre `state.operationLog` (regla obligatoria del architecture.md).
  - [x] Test co-ubicado `src/lib/store/use-document-store.test.ts` (entorno `node`, no necesita DOM): verifica que `insertChar`/`deleteChar` actualizan `document` y agregan una entrada a `operationLog`; verifica idempotencia básica de las acciones del store (insertar luego eliminar el mismo índice deja el documento vacío).

- [x] Task 2: Crear `Editor.tsx` con `contenteditable`, integrado al store (AC: #1, #2, #3)
  - [x] `src/components/Editor.tsx`, `'use client'` (necesita `useState`/`useEffect`/event handlers — ver Dev Notes "Server vs Client Components").
  - [x] Usa el patrón de referencia completo en Dev Notes: captura de carácter vía `onKeyDown` (no `onBeforeInput`/`getTargetRanges` — ver Dev Notes "Por qué no `beforeinput`").
  - [x] El componente **nunca** importa `src/lib/crdt/` directamente — solo llama `insertChar`/`deleteChar` del store (regla arquitectónica obligatoria #1).
  - [x] Llama `initEngine()` del store una vez al montar (`useEffect` con deps `[initEngine]`).
  - [x] Maneja Backspace (borra carácter anterior al caret), Enter (inserta `'\n'`), y cualquier tecla imprimible de un solo carácter. Ignora combinaciones con Ctrl/Cmd (atajos del browser) y no permite índices negativos (guardia antes de llamar `deleteChar` cuando el caret está en 0 — `generateOperation('delete', ...)` lanza `RangeError` en índices inválidos, ver Previous Story Intelligence).

- [x] Task 3: Tipografía del editor según `DESIGN.md` (AC: #1)
  - [x] `src/components/Editor.module.css`: usa las custom properties ya definidas en `globals.css` por Story 1.1 (`--font-editor*`, `--editor-h`, `--editor-v`) — **no** redefinas valores de tipografía/spacing a mano, ya existen como tokens.
  - [x] `white-space: pre-wrap` (preserva los `\n` insertados por Enter), `max-width: 640px`, `margin: 0 auto` (línea de ~75 caracteres, `DESIGN.md#Layout & Spacing`).

- [x] Task 4: Atributos ARIA del editor (AC: #4)
  - [x] `role="textbox"`, `aria-multiline="true"`, `aria-label="Editor de texto colaborativo"` (texto literal exacto del AC — no parafrasees).
  - [x] `contentEditable` + `suppressContentEditableWarning` (React exige esta prop cuando el contenido de un nodo `contentEditable` es gestionado externamente, como aquí vía el store).

- [x] Task 5: Reemplazar el boilerplate de `create-next-app` (AC: #1)
  - [x] `src/app/page.tsx`: elimina el contenido scaffold (imports de `Image`, links a Vercel/Next.js docs) y renderiza `<Editor />`. `page.tsx` se queda como Server Component — no necesita `'use client'`, solo importa el Client Component `Editor` (ver Dev Notes, patrón válido en Next.js App Router).
  - [x] `src/app/page.module.css`: elimina el archivo — queda sin uso tras retirar el scaffold (ya no hay `styles.page`/`styles.main`/etc. referenciados).
  - [x] `src/app/layout.tsx`: elimina el import de `next/font/google` (`Geist`/`Geist_Mono`) — `DESIGN.md` no especifica fuentes de Google Fonts, los 3 roles tipográficos (`editor`/`data`/`ui`) ya están resueltos como font-stacks de sistema en `globals.css` (Story 1.1); no hay nada que `next/font` necesite optimizar aquí. Actualiza `metadata.title` a `"CRDText"` y `lang="es"` en el `<html>` (coherente con el `aria-label` en español del AC#4).

- [x] Task 6: Tests del componente Editor (AC: #2, #3, #4)
  - [x] `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event`.
  - [x] `src/components/Editor.test.tsx` con `// @vitest-environment jsdom` como **primera línea del archivo** (el override por archivo es el mecanismo soportado en Vitest 4 — ver el comentario ya existente en `vitest.config.ts`, escrito en Story 1.1 anticipando exactamente este test).
  - [x] Resetea el store entre tests: `useDocumentStore.setState({ document: '', engineRef: null, operationLog: [] })` en `beforeEach` (el store es un singleton de módulo — sin reset, los tests se contaminan entre sí).
  - [x] Verifica: atributos ARIA presentes y con el texto literal del AC#4; escribir un carácter imprimible actualiza el documento visible y agrega una operación `insert` al store; Backspace elimina el último carácter y agrega una operación `delete`; Backspace en documento vacío no lanza error (guardia del índice).

- [x] Task 7: Reescribir `README.md` (AC: #5)
  - [x] Reemplaza el README scaffold de `create-next-app` completo.
  - [x] Debe explicar: el algoritmo Logoot/LSEQ (identificadores `(site, clock, frac[])`, por qué son posiciones estables y no índices de array), las 3 propiedades CvRDT garantizadas (conmutatividad, idempotencia, convergencia) con referencia a los tests que las demuestran (`src/lib/crdt/crdt-engine.test.ts`, 15 tests), las decisiones de stack (Next.js custom server, Redis, IndexedDB, Zustand, Vitest) y cómo correr el proyecto (`npm run dev`, `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`).
  - [x] Incluye el estado actual del proyecto: Epic 1 (motor CRDT + editor) completo; Epic 2 (colaboración WebSocket), Epic 3 (offline-first) y Epic 4 (visualizador) aún no implementados — evita que un revisor asuma funcionalidad que todavía no existe.
  - [x] Idioma: inglés (audiencia de portafolio es "ingenieros senior y entrevistadores técnicos en empresas de tecnología de alto nivel" — `prd.md#Usuarios y Escenario de Uso` — y el README scaffold original ya estaba en inglés). Los strings literales de la UI (`aria-label`, etc.) se quedan en español tal como los exige el AC — no traduzcas esos.

- [x] Task 8: Verificación final (AC: #1-#5)
  - [x] `npm run lint`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.server.json`, `npm run test`, `npm run build` — todos deben pasar antes de marcar la story `review` (mismo patrón que Stories 1.1-1.3).
  - [x] Verificación manual: `npm run dev`, abrir el editor en el browser, escribir texto, confirmar que aparece con tipografía serif; Backspace borra caracteres; Enter crea una nueva línea; inspeccionar el DOM (devtools) y confirmar los 3 atributos ARIA del AC#4.

## Dev Notes

### Naturaleza de esta story: primer código de UI del proyecto

Stories 1.1-1.3 construyeron el motor CRDT puro (`src/lib/crdt/`) y su suite de tests — cero código de React. Esta story es la **primera vez** que algo en `src/` toca React/Next.js, y la primera vez que se usa Zustand. No hay precedente de componentes en el repo: el patrón de referencia de abajo es la única guía concreta — síguelo, no reinventes la integración store↔engine ni la captura de input.

### Por qué `engineRef` empieza en `null`

`architecture.md#Patrones de Estructura` define el store así, literalmente:

```typescript
// use-document-store.ts — único archivo de store
const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: '',
  engineRef: null,
  operationLog: [],
}))
```

`engineRef` arranca en `null`, no se crea con `createCRDTEngine(...)` en la inicialización del módulo. Razón: el módulo del store se evalúa también en el servidor durante el render de Server Components que importan (transitivamente) el Client Component `Editor` — si `createCRDTEngine(crypto.randomUUID())` corriera en la inicialización del módulo, se crearía una instancia descartable en cada render de servidor además de la del cliente. Inicializar en `null` y crear el engine real desde una acción `initEngine()` llamada en un `useEffect` del lado del cliente evita ese problema sin necesitar `dynamic(() => import(...), { ssr: false })` ni otros workarounds — mantiene el patrón simple.

`siteId`: usa `crypto.randomUUID()` directamente dentro de `initEngine()`. **No** implementes todavía la persistencia en `sessionStorage` ni el envío por WebSocket (`{ type: 'join', siteId, ... }`) — eso es el alcance exacto de Story 2.2 (`epics.md#Story 2.2`). Esta story no tiene servidor WebSocket; un `siteId` nuevo por carga de página es suficiente y correcto para el alcance actual.

### Sintaxis de Zustand v5 con TypeScript (currying obligatorio)

Zustand v5 (`npm view zustand version` → `5.0.14` al momento de esta story) requiere la sintaxis curried para que TypeScript infiera correctamente los tipos de `set`/`get`:

```typescript
// ✅ correcto
export const useDocumentStore = create<DocumentStore>()((set, get) => ({ ... }))

// ❌ incorrecto — compila pero la inferencia de tipos de `set` se rompe
export const useDocumentStore = create<DocumentStore>((set, get) => ({ ... }))
```

Nota el `()` extra después de `<DocumentStore>` — es la forma documentada oficialmente (pmndrs/zustand), no un typo.

### Regla arquitectónica obligatoria (crítica — `architecture.md#Reglas Obligatorias`)

> **NUNCA** importar `src/lib/crdt/` desde un componente React directamente. Si un componente necesita estado del engine, lo accede vía Zustand.

`Editor.tsx` importa **solo** `useDocumentStore` de `@/lib/store/use-document-store`. Todo el código que llama `generateOperation`/`applyOperation` vive dentro de las acciones del store (`insertChar`, `deleteChar`), no en el componente. Esto no es un detalle de estilo — es un límite arquitectónico verificado en stories futuras (Epic 2 conecta `ws-client` al mismo store; si el engine ya está encapsulado correctamente aquí, esa integración no requiere tocar `Editor.tsx`).

También aplica: **NUNCA** mutar un `CRDTOperation` después de crearlo (ya es `Readonly` desde `generateOperation`, no hay riesgo real aquí, pero no lo desestructures y reconstruyas con campos modificados).

### Patrón de referencia — captura de input sin `beforeinput`/`getTargetRanges`

**Por qué no `beforeinput`:** el enfoque "obvio" para un editor `contenteditable` controlado es interceptar el evento `beforeinput` (expone `inputType` e `getTargetRanges()` para saber exactamente qué cambió antes de que el browser mute el DOM). **No uses ese enfoque aquí:** `event.getTargetRanges()` es una API de borrador de Chrome no implementada en jsdom (el entorno de test configurado en `vitest.config.ts`) — un test que dependa de ella fallará o requerirá mocks frágiles. En su lugar, usa el patrón más simple y 100% testable en jsdom de abajo: captura por tecla (`onKeyDown`) + un índice de caret gestionado en un `ref`, sincronizado con la posición real del DOM solo en click/flechas.

```tsx
// src/components/Editor.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useDocumentStore } from '@/lib/store/use-document-store'
import styles from './Editor.module.css'

function getCaretIndex(root: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0
  const range = selection.getRangeAt(0)
  if (root.firstChild && range.startContainer === root.firstChild) {
    return range.startOffset
  }
  return root.textContent?.length ?? 0
}

function setCaretIndex(root: HTMLElement, index: number): void {
  const selection = window.getSelection()
  if (!selection) return
  const textNode = root.firstChild
  const range = document.createRange()
  if (textNode) {
    range.setStart(textNode, Math.min(index, textNode.textContent?.length ?? 0))
  } else {
    range.setStart(root, 0)
  }
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function Editor() {
  const document_ = useDocumentStore((s) => s.document)
  const initEngine = useDocumentStore((s) => s.initEngine)
  const insertChar = useDocumentStore((s) => s.insertChar)
  const deleteChar = useDocumentStore((s) => s.deleteChar)
  const rootRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef(0)

  useEffect(() => {
    initEngine()
  }, [initEngine])

  // El store reemplaza el textContent en cada keystroke, lo que resetea el
  // caret nativo del browser a 0 — hay que restaurarlo después de cada render.
  useEffect(() => {
    if (rootRef.current) setCaretIndex(rootRef.current, caretRef.current)
  }, [document_])

  function syncCaret() {
    if (rootRef.current) caretRef.current = getCaretIndex(rootRef.current)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const index = caretRef.current
      if (index > 0) {
        deleteChar(index - 1)
        caretRef.current = index - 1
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      insertChar(caretRef.current, '\n')
      caretRef.current += 1
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      insertChar(caretRef.current, e.key)
      caretRef.current += 1
    }
    // Flechas/Home/End/click: se deja que el browser mueva el caret nativo;
    // se resincroniza con syncCaret en onKeyUp/onClick.
  }

  return (
    <div
      ref={rootRef}
      className={styles.editor}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Editor de texto colaborativo"
      onKeyDown={handleKeyDown}
      onKeyUp={syncCaret}
      onClick={syncCaret}
    >
      {document_}
    </div>
  )
}
```

Este es un patrón de referencia, no código a copiar literalmente — ajusta nombres a tu criterio. La parte no negociable es la técnica: captura por `onKeyDown` con `caretRef` local, restauración explícita del caret en un `useEffect` keyeado por `document_`, y ningún uso de `beforeinput`/`getTargetRanges`.

**Limitación conocida (aceptable, fuera de alcance de los AC):** seleccionar un rango de texto con el mouse y escribir encima no borra la selección primero — el editor está pensado para el flujo de un solo cursor que describe `EXPERIENCE.md` ("una sola interacción primaria: escribir texto"); `prd.md#Fuera de Alcance` excluye texto enriquecido y no menciona selección múltiple. No lo arregles en esta story.

### Server vs Client Components (Next.js 16 App Router)

`page.tsx` puede quedarse como Server Component e importar `Editor` (Client Component) directamente — un Server Component puede importar y renderizar un Client Component sin convertirse él mismo en Client Component; solo `Editor.tsx` necesita `'use client'` porque es el único archivo con hooks/event handlers. (Confirmado contra `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` de este mismo proyecto — la directiva y el patrón de composición no cambiaron respecto a versiones anteriores de Next.js, pero `AGENTS.md` exige verificar contra los docs locales antes de escribir código Next.js, no asumir desde conocimiento previo.)

### Project Structure Notes

Archivos nuevos:
- `src/lib/store/use-document-store.ts` + `use-document-store.test.ts`
- `src/components/Editor.tsx` + `Editor.module.css` + `Editor.test.tsx`

Archivos modificados:
- `src/app/page.tsx` (boilerplate → `<Editor />`)
- `src/app/layout.tsx` (quita `next/font`, actualiza metadata/lang)
- `package.json` (+`zustand` en dependencies; +`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` en devDependencies)
- `README.md` (reescritura completa)

Archivos eliminados:
- `src/app/page.module.css` (sin uso tras retirar el scaffold)

No toques `public/*.svg` (next.svg, vercel.svg, etc.) — no rompen build/lint si quedan sin referenciar, y tocarlos no es parte de ningún AC de esta story.

Convención de nombres aplicada: componentes React en PascalCase (`Editor.tsx`), store en `use-[nombre]-store.ts` con hook exportado `use[Nombre]Store` (`architecture.md#Convenciones de Nombrado`), tests co-ubicados con el módulo que prueban.

### Testing Standards

- Vitest, entorno por defecto `node` (`vitest.config.ts`). Para `Editor.test.tsx`, primera línea del archivo: `// @vitest-environment jsdom` — mecanismo explícitamente documentado en el comentario de `vitest.config.ts` (escrito en Story 1.1, anticipando este caso exacto: "React component tests (*.test.tsx) need a DOM").
- `use-document-store.test.ts` no necesita jsdom — testea las acciones del store directamente vía `useDocumentStore.getState()`, sin renderizar React.
- Resetea el store en `beforeEach` en ambos archivos de test (es un singleton de módulo compartido entre tests).
- Sigue la convención de naming de tests de Story 1.2/1.3: el nombre del `it(...)` describe el comportamiento verificado, no "test 1" / "debería funcionar".

## Previous Story Intelligence (Story 1.3 / 1.2)

- `generateOperation('insert', index, char)` espera un índice **visible** (0-based, sobre los caracteres no eliminados) — coincide exactamente con lo que necesita un editor `contenteditable`, no requiere conversión.
- `generateOperation('delete', index)` **lanza `RangeError`** si no hay un carácter visible en ese índice (fix de code review de Story 1.2). La guardia de Backspace en índice 0 (Task 2) existe específicamente para no disparar esta excepción.
- `applyOperation(op)` es idempotente y conmutativa — aplicar localmente la propia operación generada (como hace `insertChar`/`deleteChar` en el store) es seguro y consistente con el futuro eco del servidor WebSocket en Epic 2 (cuando el servidor confirme/retransmita la misma operación, volver a aplicarla no hará nada).
- El engine es 100% independiente de framework (`src/lib/crdt/` sin imports de React/Next/browser) — esta story no modifica `crdt-engine.ts`, `position-generator.ts` ni `lamport-clock.ts`. Si algo no funciona como se espera, el bug está casi seguro en el código nuevo de esta story (store/componente), no en el engine ya verificado con 32 tests en Stories 1.2-1.3.
- Patrón de verificación establecido: lint/typecheck (ambos tsconfig)/test/build antes de marcar `review`, igual que Stories 1.1-1.3.

## Git Intelligence Summary

`baseline_commit` de esta story: `e48dc06` (Story 1.3, tests CvRDT — HEAD actual). Mensajes de commit siguen conventional-commit-style en inglés (`feat:`, `fix:`) pese a que la documentación del proyecto (stories, PRD, epics) está en español — sigue esa misma convención para el commit de esta story. Story 1.1 (`b746638`) es el único commit previo que tocó `src/app/` — desde entonces nadie ha modificado `page.tsx`/`layout.tsx`/`globals.css`, siguen siendo el scaffold original de `create-next-app` salvo los tokens de diseño ya agregados a `globals.css`.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — historia origen y acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR1 (tokens ya aplicados en Story 1.1), UX-DR12 (accesibilidad del editor)
- [Source: _bmad-output/planning-artifacts/architecture.md#Arquitectura Frontend] — store Zustand de 3 slices, componente `<Editor />` como contenteditable controlado por el engine
- [Source: _bmad-output/planning-artifacts/architecture.md#Patrones de Estructura] — ejemplo literal del store con `engineRef: null`
- [Source: _bmad-output/planning-artifacts/architecture.md#Reglas Obligatorias para Todos los Agentes] — regla #1 (nunca importar crdt/ desde un componente), regla #2 (operaciones inmutables)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-crdtext-2026-06-14/DESIGN.md#Typography] — tipografía editor: Georgia 16px/1.8
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-crdtext-2026-06-14/DESIGN.md#Layout & Spacing] — padding del editor, max-width 640px
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-crdtext-2026-06-14/EXPERIENCE.md#Accessibility Floor] — atributos ARIA exactos del editor
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-crdtext-2026-06-14/EXPERIENCE.md#Interaction Primitives] — "cada carácter es una operación", sin debounce, sin selección de rangos en MVP
- [Source: _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md#NFR-O.2] — README debe explicar algoritmo, decisiones y propiedades matemáticas
- [Source: _bmad-output/implementation-artifacts/1-3-tests-de-propiedades-cvrdt.md] — intel de Story 1.3, comportamiento actual del engine verificado
- [Source: src/lib/crdt/crdt-engine.ts] — API completa del engine (`generateOperation`, `applyOperation`, `getDocument`), leída en su totalidad para esta story
- [Source: src/app/globals.css] — tokens de diseño ya disponibles como CSS custom properties (Story 1.1)
- [Source: vitest.config.ts] — comentario explícito anticipando el override `// @vitest-environment jsdom` por archivo, mecanismo de Vitest 4
- [Source: node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md] — confirmación del patrón Server Component importando Client Component, verificado contra los docs locales de Next.js 16 instalados en este proyecto (`AGENTS.md` exige esta verificación antes de escribir código Next.js)
- Zustand v5.0.14 (`npm view zustand version`, verificado al crear esta story) — sintaxis curried `create<T>()((set, get) => ...)` obligatoria para inferencia de tipos correcta en TypeScript

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Debug Log References

- `npx vitest run src/lib/store` → 5 passed (store actions: initEngine lazy-init, insertChar, deleteChar)
- `npx vitest run src/components` → 4 passed (Editor: ARIA attributes, typing, Backspace, Backspace-on-empty guard)
- `npx vitest run` (suite completa) → 44 passed (6 archivos)
- `npm run lint` → sin errores
- `npx tsc --noEmit` → sin errores
- `npx tsc --noEmit -p tsconfig.server.json` → sin errores
- `npm run build` → compilación exitosa (Next.js 16.2.9, Turbopack), `/` prerenderizada como contenido estático
- Verificación manual: `npm run dev` + `curl http://localhost:3000` → confirmado en el HTML servido que el editor tiene `role="textbox"`, `aria-multiline="true"`, `aria-label="Editor de texto colaborativo"` (AC4), y que `Editor.module.css` compilado usa `var(--font-editor)` etc. (AC1, tipografía serif de `DESIGN.md`)

### Completion Notes List

- Task 1: store Zustand creado en `src/lib/store/use-document-store.ts` siguiendo el patrón literal de `architecture.md` (`engineRef: null` inicial, sintaxis curried `create<DocumentStore>()((set, get) => ...)`). Acciones `initEngine`/`insertChar`/`deleteChar` son el único punto de contacto con `crdt-engine.ts`. `engineRef` se crea de forma lazy en `initEngine()` (llamado desde el `useEffect` de montaje del Editor) para evitar instanciar el engine durante el render de Server Components — confirmado en la verificación final que `npm run build` prerrenderiza `/` como contenido estático sin errores de hidratación.
- Task 2-4: `Editor.tsx` implementado con el patrón de referencia de los Dev Notes — captura de input vía `onKeyDown` + `caretRef` local (no `beforeinput`/`getTargetRanges`, incompatible con jsdom). Backspace guarda contra índice 0 (evita el `RangeError` documentado de Story 1.2). Enter inserta `'\n'`. El componente solo importa `useDocumentStore`, nunca `src/lib/crdt/` directamente (regla arquitectónica obligatoria). Tipografía y atributos ARIA implementados exactamente como especifica el AC4 (texto literal verificado, no parafraseado).
- Task 5: boilerplate de `create-next-app` retirado — `page.tsx` ahora renderiza `<Editor />` como Server Component importando el Client Component; `page.module.css` eliminado (sin uso); `layout.tsx` sin `next/font/google` (Geist), `metadata.title` = "CRDText", `lang="es"`. Build de producción confirma que no quedó ninguna referencia rota al scaffold retirado.
- Task 6: se agregaron `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` como devDependencies. `Editor.test.tsx` usa `// @vitest-environment jsdom` como primera línea, conforme al mecanismo ya anticipado en el comentario de `vitest.config.ts` desde Story 1.1. **Hallazgo no anticipado en el story file:** el auto-cleanup de React Testing Library entre tests requiere un `afterEach` global, que no existe porque `vitest.config.ts` no tiene `globals: true` configurado — sin `afterEach(cleanup)` explícito, los renders de tests anteriores quedaban en el DOM y `getByRole` fallaba por "multiple elements". Se agregó `afterEach(cleanup)` explícito al inicio de `Editor.test.tsx` (no se tocó `vitest.config.ts`, cambio aislado al archivo de test).
- Task 7: `README.md` reescrito completo en inglés (audiencia FAANG/portafolio técnico), explica el algoritmo Logoot/LSEQ, las 3 propiedades CvRDT con referencia a los 15 tests que las demuestran, decisiones de stack, estructura del proyecto, comandos de desarrollo, y el estado actual por epic (Epic 1 completo; Epics 2-4 pendientes) para que un revisor no asuma funcionalidad que aún no existe.
- Task 8: suite completa verificada en verde — lint, ambos typechecks (app y server), 44 tests (6 archivos), build de producción. Verificación manual confirmó los 3 atributos ARIA y la tipografía serif en el HTML/CSS servidos por el dev server.
- No se modificó `crdt-engine.ts`, `position-generator.ts` ni `lamport-clock.ts` — esta story consumió la API pública del engine (`generateOperation`/`applyOperation`/`getDocument`) sin tocar su implementación, conforme a Previous Story Intelligence.

### File List

- `package.json` (modificado — +`zustand` en dependencies; +`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` en devDependencies)
- `package-lock.json` (modificado — instalación de las dependencias anteriores)
- `src/lib/store/use-document-store.ts` (nuevo)
- `src/lib/store/use-document-store.test.ts` (nuevo)
- `src/components/Editor.tsx` (nuevo)
- `src/components/Editor.module.css` (nuevo)
- `src/components/Editor.test.tsx` (nuevo)
- `src/app/page.tsx` (modificado — boilerplate → `<Editor />`)
- `src/app/page.module.css` (eliminado)
- `src/app/layout.tsx` (modificado — quita `next/font`, actualiza `metadata.title` y `lang`)
- `README.md` (reescritura completa)
