---
baseline_commit: 209d6af6176d6b29463734eca034ddf10850ff9f
---

# Story 1.1: Setup del Proyecto e Infraestructura Base (+ tokens de diseño)

Status: in-progress

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

- [ ] Task 1: Inicializar proyecto Next.js (AC: #1)
  - [ ] Ejecutar `npx create-next-app@latest crdtext --typescript --eslint --app --src-dir --import-alias "@/*"` en la raíz del repo
  - [ ] Verificar que el resultado incluye App Router (`src/app/`), TypeScript (`tsconfig.json`), ESLint configurado, y `src/` como directorio raíz de código
  - [ ] **Nota de versión:** `@latest` instalará Next.js 16.x (estable desde octubre 2025) — confirmar que el proyecto generado usa Turbopack como bundler por defecto, no solo en dev (cambio de comportamiento respecto a versiones anteriores de Next.js)
- [ ] Task 2: Crear tipos compartidos cliente-servidor (AC: #2)
  - [ ] Crear `shared/types.ts` en la raíz del proyecto (fuera de `src/`)
  - [ ] Definir y exportar `CRDTOperation`: `{ type: 'insert' | 'delete'; position: { site: string; clock: number; frac: number[] }; char?: string; siteId: string; timestamp: number }`
  - [ ] Definir y exportar `WSMessage` como union discriminada con las 5 variantes: `join`, `operation`, `cursor`, `sync`, `ack` (ver Dev Notes para el esquema exacto)
  - [ ] Definir y exportar `ConnectivityState`: `'online' | 'offline' | 'syncing'`
- [ ] Task 3: Configurar TypeScript para el servidor custom (AC: #3)
  - [ ] Crear `tsconfig.server.json` en la raíz, separado de `tsconfig.json`
  - [ ] Configurar `module: "NodeNext"` y `moduleResolution: "NodeNext"`
  - [ ] Apuntar la compilación a la carpeta `server/` (que se creará en Story 2.1 — este archivo solo deja la configuración lista)
- [ ] Task 4: Configurar Vitest (AC: #4)
  - [ ] Instalar Vitest (versión estable actual: 4.1.x)
  - [ ] Crear `vitest.config.ts` en la raíz
  - [ ] Configurar el test runner para descubrir archivos `*.test.ts` co-ubicados con sus módulos fuente (no en una carpeta `__tests__/` separada)
- [ ] Task 5: Implementar tokens de diseño en `globals.css` (AC: #5)
  - [ ] Crear/editar `src/app/globals.css`
  - [ ] Traducir el frontmatter `colors` de `DESIGN.md` a CSS custom properties — light mode como valores base (`--background`, `--surface`, `--panel`, `--border`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-foreground`, `--accent-subtle`, `--user-a`, `--user-a-subtle`, `--user-b`, `--user-b-subtle`, `--status-online`, `--status-online-subtle`, `--status-offline`, `--status-offline-subtle`, `--status-syncing`, `--status-syncing-subtle`, `--concurrent`, `--concurrent-subtle`)
  - [ ] Dark mode: usar `@media (prefers-color-scheme: dark)` o clase `.dark` en `<html>` (decidir y documentar cuál; `DESIGN.md` no fuerza una estrategia) sobrescribiendo cada variable con su valor `-dark` correspondiente
  - [ ] Traducir `typography` (`editor`, `data`, `data-sm`, `ui`, `ui-sm`, `logo`) a custom properties de fuente: `--font-editor`, `--font-data`, `--font-ui`, con sus `font-size`/`line-height`/`font-weight` asociados
  - [ ] Traducir `spacing` (escala base-4: `xs` 4px a `3xl` 32px, más `editor-h`, `editor-v`, `topbar-height`) a custom properties: `--space-xs` ... `--space-3xl`
  - [ ] Traducir `rounded` (`xs` 3px, `sm` 4px, `md` 6px, `lg` 8px, `pill` 9999px) a custom properties: `--radius-xs` ... `--radius-pill`

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

_(a completar por el dev agent)_

### Debug Log References

### Completion Notes List

### File List
