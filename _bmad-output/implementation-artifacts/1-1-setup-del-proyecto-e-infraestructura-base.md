---
baseline_commit: 209d6af6176d6b29463734eca034ddf10850ff9f
---

# Story 1.1: Setup del Proyecto e Infraestructura Base (+ tokens de diseño)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

Como desarrollador,
quiero inicializar el proyecto con la estructura correcta, tipos compartidos y el sistema de tokens de diseño,
para que todo el desarrollo futuro tenga una base consistente tanto técnica como visual.

## Acceptance Criteria

1. **Given** que no existe el proyecto, **when** ejecuto `npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"`, **then** el proyecto se crea con App Router, TypeScript, ESLint y directorio `src/`.
2. **Given** que el proyecto existe, **when** creo `shared/types.ts`, **then** exporta los tipos `CRDTOperation`, `WSMessage` (todas las variantes), `ConnectivityState`.
3. **Given** que el proyecto existe, **when** creo `tsconfig.server.json`, **then** tiene `module: NodeNext` y `moduleResolution: NodeNext` apuntando a `server/`.
4. **Given** que el proyecto existe, **when** creo `vitest.config.ts`, **then** Vitest encuentra archivos `*.test.ts` co-ubicados con los módulos fuente.
5. **Given** que `DESIGN.md` define los tokens de color, tipografía y spacing, **when** creo `src/app/globals.css`, **then** todos los tokens (colores light/dark, 3 roles tipográficos, escala de spacing base-4) existen como CSS custom properties, con `prefers-color-scheme` o clase `.dark` controlando el modo.

## Tasks / Subtasks

- [x] Task 1: Inicializar proyecto Next.js (AC: #1)
  - [x] Ejecutar `npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"` en la raíz del repo
  - [x] Verificar que el resultado incluye App Router (`src/app/`), TypeScript (`tsconfig.json`), ESLint configurado, y `src/` como directorio raíz de código
  - [x] **Nota de versión:** `@latest` instaló Next.js 16.2.9 (estable desde octubre 2025) — confirmado: `next.config.ts` no especifica bundler, por lo que Turbopack es el default implícito tanto en dev como en build, sin flags adicionales
- [x] Task 2: Crear tipos compartidos cliente-servidor (AC: #2)
  - [x] Crear `shared/types.ts` en la raíz del proyecto (fuera de `src/`)
  - [x] Definir y exportar `CRDTOperation`: `{ type: 'insert' | 'delete'; position: { site: string; clock: number; frac: number[] }; char?: string; siteId: string; timestamp: number }`
  - [x] Definir y exportar `WSMessage` como union discriminada con las 5 variantes: `join`, `operation`, `cursor`, `sync`, `ack` (ver Dev Notes para el esquema exacto)
  - [x] Definir y exportar `ConnectivityState`: `'online' | 'offline' | 'syncing'`
  - [x] Verificado con `npx tsc --noEmit` — `shared/types.ts` compila sin errores y queda incluido automáticamente por el glob `**/*.ts` de `tsconfig.json`
- [x] Task 3: Configurar TypeScript para el servidor custom (AC: #3)
  - [x] Crear `tsconfig.server.json` en la raíz, separado de `tsconfig.json`
  - [x] Configurar `module: "NodeNext"` y `moduleResolution: "NodeNext"`
  - [x] Apuntar la compilación a la carpeta `server/` (que se creará en Story 2.1 — este archivo solo deja la configuración lista); incluye también `shared/**/*.ts` para que el servidor importe los tipos compartidos. Verificado con `npx tsc --noEmit -p tsconfig.server.json` sin errores
- [x] Task 4: Configurar Vitest (AC: #4)
  - [x] Instalar Vitest 4.1.9 (+ `@vitejs/plugin-react` y `jsdom` como devDependencies, anticipando tests de componentes en epics futuros)
  - [x] Crear `vitest.config.ts` en la raíz — `environment: 'jsdom'`, alias `@` resuelto a `src/`
  - [x] Configurar el test runner para descubrir archivos `*.test.ts`/`*.test.tsx` co-ubicados con sus módulos fuente en `src/`, `shared/`, `server/` (no en una carpeta `__tests__/` separada)
  - [x] Verificado: smoke test `shared/types.test.ts` (3 assertions) descubierto y ejecutado exitosamente con `npx vitest run`
  - [x] Agregados scripts `test` y `test:watch` a `package.json`
- [x] Task 5: Implementar tokens de diseño en `globals.css` (AC: #5)
  - [x] Editado `src/app/globals.css`
  - [x] Traducido el frontmatter `colors` de `DESIGN.md` a CSS custom properties en `:root` — los 22 tokens de light mode
  - [x] Dark mode: estrategia elegida = `@media (prefers-color-scheme: dark)` (consistente con el patrón ya generado por `create-next-app`; `DESIGN.md` no forzaba una estrategia). Los 22 tokens dark sobrescriben dentro del media query, incluyendo `color-scheme: dark`
  - [x] Traducida `typography` completa: `--font-editor`/`--font-data`/`--font-data-sm`/`--font-ui`/`--font-ui-sm`/`--font-logo` con sus `size`/`line-height`/`weight`/`letter-spacing` asociados
  - [x] Traducida `spacing` completa (escala base-4 + `editor-h`/`editor-v`/`topbar-height`)
  - [x] Traducido `rounded` completo (`--radius-xs` a `--radius-pill`)
  - [x] Verificado con `npm run build` — compila exitosamente con Turbopack, sin errores de CSS ni TypeScript. `page.module.css` (boilerplate de `create-next-app`, a reemplazar en Story 1.4) declara sus propios tokens locales escopados a `.page` y no colisiona con los tokens globales

## Dev Notes

**Esta es la primera story del proyecto — no existe código previo. Todos los archivos son NUEVOS.**

### Estructura de directorios objetivo (de `architecture.md`)

```
crdtext/
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── tsconfig.server.json          # Esta story
├── vitest.config.ts              # Esta story
├── railway.toml                  # Story 2.4
├── .env.local
├── .env.example
├── .gitignore
│
├── shared/
│   └── types.ts                  # Esta story
│
├── server/                       # Story 2.1 — NO crear aún, solo dejar tsconfig.server.json listo
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # generado por create-next-app, se edita en Story 3.4 (service worker)
│   │   ├── page.tsx              # generado por create-next-app, se edita en Story 1.4
│   │   └── globals.css           # Esta story — tokens de diseño
│   │
│   ├── components/                # vacío en esta story, se llena desde Story 1.4 en adelante
│   │
│   └── lib/
│       ├── crdt/                  # Story 1.2
│       ├── ws-client/             # Story 2.2
│       ├── storage/                # Story 3.2
│       └── store/                  # Story 4.1
│
└── public/
```

**Solo crea lo que esta story necesita**: el scaffold de `create-next-app`, `shared/types.ts`, `tsconfig.server.json`, `vitest.config.ts`, y los tokens en `globals.css`. NO crear `server/`, `src/lib/crdt/`, ni ningún componente — eso es de stories futuras.

### Esquema completo de `WSMessage` (de `architecture.md`, sección "Protocolo WebSocket")

```typescript
type WSMessage =
  | { type: 'join';      siteId: string; name: string; color: string }
  | { type: 'operation'; op: CRDTOperation }
  | { type: 'cursor';    siteId: string; index: number }
  | { type: 'sync';      operations: CRDTOperation[] }  // servidor → cliente tardío
  | { type: 'ack';       timestamp: number }             // servidor confirma persistencia
```

### Convenciones de nombrado obligatorias (de `architecture.md`)

- Componentes React: PascalCase → `OperationVisualizer.tsx`
- Archivos de módulos/utilidades: kebab-case → `crdt-engine.ts`, `lamport-clock.ts`
- Funciones y variables: camelCase → `applyOperation`, `siteId`
- Tipos e interfaces: PascalCase → `CRDTOperation`, `WSMessage`
- Constantes: SCREAMING_SNAKE_CASE → `MAX_CLOCK_VALUE`

### Regla arquitectónica crítica para tener en mente desde ahora

`src/lib/crdt/` (Story 1.2) no debe importar NADA de React, Next.js, ni APIs de browser — es TypeScript puro. No aplica a esta story directamente, pero la estructura de carpetas que se deja lista debe respetar este límite (no mezclar `lib/crdt/` con componentes).

### Tokens de diseño completos (de `DESIGN.md` frontmatter — fuente de verdad, no inventar valores)

**Colores light mode:** `background:#ffffff` `surface:#f8f9fb` `panel:#f3f4f6` `border:#e5e7eb` `border-strong:#d1d5db` `text-primary:#111827` `text-secondary:#6b7280` `text-muted:#9ca3af` `accent:#2563eb` `accent-foreground:#ffffff` `accent-subtle:#eff6ff` `user-a:#2563eb` `user-a-subtle:#eff6ff` `user-b:#7c3aed` `user-b-subtle:#f5f3ff` `status-online:#059669` `status-online-subtle:#ecfdf5` `status-offline:#dc2626` `status-offline-subtle:#fef2f2` `status-syncing:#d97706` `status-syncing-subtle:#fffbeb` `concurrent:#d97706` `concurrent-subtle:#fffbeb`

**Colores dark mode** (mismos roles semánticos, sufijo `-dark` en el documento fuente): `background:#0f1117` `surface:#161b27` `panel:#1e2434` `border:#2d3448` `border-strong:#3d4558` `text-primary:#f1f5f9` `text-secondary:#94a3b8` `text-muted:#475569` `accent:#3b82f6` `accent-foreground:#ffffff` `accent-subtle:rgba(59,130,246,0.12)` `user-a:#60a5fa` `user-a-subtle:rgba(96,165,250,0.12)` `user-b:#a78bfa` `user-b-subtle:rgba(167,139,250,0.12)` `status-online:#34d399` `status-online-subtle:rgba(52,211,153,0.1)` `status-offline:#f87171` `status-offline-subtle:rgba(248,113,113,0.1)` `status-syncing:#fbbf24` `status-syncing-subtle:rgba(251,191,36,0.1)` `concurrent:#fbbf24` `concurrent-subtle:rgba(251,191,36,0.1)`

**Tipografía:**
- `editor`: `'Georgia', 'Times New Roman', serif` — 16px / line-height 1.8 / weight 400 (área de escritura del editor — Story 1.4)
- `data`: `'SF Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace` — 10px / 1.5 / 400 (operation log)
- `data-sm`: mismo stack monospace — 9px / 1.4 / weight 700 / letter-spacing 0.06em (tags, badges)
- `ui`: `-apple-system, 'Segoe UI', system-ui, sans-serif` — 13px / 1.5 / 400 (chrome general)
- `ui-sm`: mismo stack sans — 11px / 1.4 / weight 500
- `logo`: sans — 14px / weight 800 / letter-spacing -0.02em

**Spacing (base 4px):** `xs:4px` `sm:8px` `md:12px` `lg:16px` `xl:20px` `2xl:24px` `3xl:32px` `editor-h:40px` `editor-v:48px` `topbar-height:48px`

**Rounded:** `xs:3px` `sm:4px` `md:6px` `lg:8px` `pill:9999px`

### Standards de Testing

- Framework: Vitest (latest estable: 4.1.x al momento de esta story — verificar versión exacta en `npm view vitest version` al instalar)
- Tests co-ubicados con el módulo que prueban (`crdt-engine.test.ts` junto a `crdt-engine.ts`), nunca en carpeta `__tests__/` separada
- Esta story no escribe tests de lógica de negocio (no hay lógica aún) — solo configura el runner. La primera suite de tests real llega en Story 1.3.

### Project Structure Notes

- Alineado 1:1 con el árbol de `architecture.md` — sin variaciones detectadas.
- `shared/types.ts` vive en la raíz del repo, FUERA de `src/` — es intencional, porque tanto `server/` (Story 2.1) como `src/` lo importan, y ninguno debe ser dueño del otro.
- `tsconfig.server.json` se crea en esta story pero `server/` (el código que compila) no existe hasta Story 2.1 — es normal que el tsconfig "apunte a la nada" temporalmente.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — historia origen y acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Evaluación de Starter Template] — comando exacto de inicialización
- [Source: _bmad-output/planning-artifacts/architecture.md#Arquitectura de Datos] — esquema de `CRDTOperation`
- [Source: _bmad-output/planning-artifacts/architecture.md#Protocolo WebSocket] — esquema de `WSMessage`
- [Source: _bmad-output/planning-artifacts/architecture.md#Estructura del Proyecto y Límites Arquitectónicos] — árbol de directorios completo
- [Source: _bmad-output/planning-artifacts/architecture.md#Convenciones de Nombrado] — reglas de naming
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-crdtext-2026-06-14/DESIGN.md frontmatter] — tokens de color, tipografía, spacing, rounded (UX-DR1)
- [Source: _bmad-output/planning-artifacts/prds/prd-crdtext-2026-06-13/prd.md#Stack Tecnológico] — stack de alto nivel

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `npm run lint` → 0 errores
- `npx tsc --noEmit` (tsconfig.json) → 0 errores
- `npx tsc --noEmit -p tsconfig.server.json` → 0 errores
- `npm run test` (vitest run) → 1 archivo, 3 tests, todos pasando
- `npm run build` → build de producción exitoso con Turbopack

### Completion Notes List

- `npx create-next-app@latest` rechaza directorios no vacíos (no solo con conflictos de nombre). El repo ya tenía `_bmad/`, `_bmad-output/`, `docs/`, `proyecto.md`. Solución: se generó el scaffold en un directorio temporal aislado (`%TEMP%/crdtext-scaffold`), se copiaron todos los archivos generados (excepto `node_modules/` y `.next/`) a la raíz del repo, y se corrió `npm install` ahí para regenerar `node_modules` limpiamente. Sin pérdida de archivos existentes — verificado antes y después.
- `package.json` `name` se corrigió de `crdtext-scaffold` (heredado del nombre del directorio temporal) a `crdtext`.
- Se desactivó Tailwind explícitamente (`--no-tailwind`) porque es el default de `create-next-app@latest` en Next.js 16, pero `DESIGN.md`/DL-UX-009 especifican CSS custom properties puras sin framework de utilidades.
- Next.js resolvió a 16.2.9 (estable desde octubre 2025). Turbopack confirmado como bundler tanto en `dev` como en `build` sin configuración adicional (`next.config.ts` no tiene override de bundler).
- Vitest resolvió a 4.1.9. Se instalaron también `@vitejs/plugin-react` y `jsdom` como devDependencies — no estrictamente requeridos por el AC de esta story, pero necesarios para los tests de componentes React de epics futuros (Story 1.4 en adelante); configurarlos ahora evita reabrir `vitest.config.ts` repetidamente.
- `globals.css` reemplaza los tokens genéricos del boilerplate (`--background`, `--foreground`) por el sistema completo de 22 tokens de color (×2 modos) + tipografía + spacing + rounded de `DESIGN.md`. Estrategia de dark mode: `prefers-color-scheme` (no clase `.dark`), consistente con el patrón que ya traía el scaffold de Next.js.
- `src/app/page.tsx` y `src/app/page.module.css` (homepage boilerplate de `create-next-app`) se dejaron sin modificar — sus tokens locales están escopados a `.page` y no colisionan con los tokens globales. Se reemplazan en Story 1.4.
- No se creó `server/` ni `src/lib/crdt/` — fuera de alcance de esta story (Stories 1.2 y 2.1 respectivamente). `tsconfig.server.json` queda configurado pero "apunta a la nada" hasta Story 2.1, tal como anticipado en Dev Notes.

### Code Review Fixes (2026-06-17)

`/code-review` (7-angle recall-biased pass) encontró 6 issues confirmados; los 6 se corrigieron en la misma sesión:

1. **`vitest.config.ts`** — `environment: 'jsdom'` global aplicaba DOM globals a los futuros tests de `src/lib/crdt/` (que `architecture.md` exige framework-free) y de `server/` (Node-only), anulando la señal de aislamiento. Cambiado a `environment: 'node'` por defecto; futuros tests de componentes React usarán el comment `// @vitest-environment jsdom` por archivo (Vitest 4 removió `environmentMatchGlobs`, que fue el primer intento de fix y falló el typecheck — corregido al enfoque soportado).
2. **`tsconfig.server.json`** — `rootDir: "."` + `outDir: "dist/server"` habría emitido `dist/server/server/index.js` (doble anidado) una vez exista `server/`. Cambiado `outDir` a `"dist"` para que el mirroring produzca `dist/server/index.js` y `dist/shared/types.js` correctamente.
3. **`tsconfig.server.json`** — `paths: {"@/*": ["./src/*"]}` era config muerta (`src` está en `exclude`) y contradecía la regla de arquitectura de que `server/` nunca importa de `src/`. Eliminado, con comentario explicando por qué.
4. **`tsconfig.server.json` vs `tsconfig.json`** — divergencia real entre `moduleResolution: "bundler"` (root, Next.js) y `"NodeNext"` (server) no se puede unificar (Next.js exige bundler; un proceso Node real exige NodeNext) — se agregó un comentario explícito advirtiendo que las importaciones relativas bajo `server/`/`shared/` necesitarán extensión `.js` explícita, ya que el editor (que usa el tsconfig root) no lo marcará como error.
5. **`src/app/globals.css`** — faltaban `--font-data-sm`, `--font-ui-sm`, `--font-logo` (solo existían sus companions de size/line-height/weight) pese a que `DESIGN.md` especifica `fontFamily` para esos 3 roles. Agregados.
6. **`src/app/page.module.css`** — el override de dark mode ponía `--background` y `--foreground` ambos en `#000`, colapsando el límite visual `.page`/`.main`. Cambiado a `#0a0a0a`/`#141414` (boilerplate de todas formas reemplazado en Story 1.4, pero no debía quedar roto mientras tanto).

Suite completa re-verificada post-fix: lint ✅, typecheck app ✅, typecheck server ✅, tests 3/3 ✅ (ahora en 0ms de setup de entorno vs 1.77s antes), build ✅.

### File List

**Nuevos:**
- `.gitignore`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md` (boilerplate de Next.js, se reescribe en Story 1.4 por AC explícito)
- `eslint.config.mjs`
- `next.config.ts`
- `next-env.d.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.server.json`
- `vitest.config.ts`
- `shared/types.ts`
- `shared/types.test.ts`
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx` (boilerplate, sin modificar)
- `src/app/page.module.css` (boilerplate, sin modificar)
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (boilerplate de `create-next-app`)
