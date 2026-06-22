# CRDText

CRDText is a real-time collaborative text editor whose synchronization engine implements the **Logoot/LSEQ CRDT algorithm from scratch** — no Y.js, no Automerge, no black-box CRDT library. The point of the project is to demonstrate, in code and in tests, the distributed-systems fundamentals that those libraries usually hide: position-based identifiers, Lamport clocks, and the CvRDT properties that guarantee eventual consistency.

## The algorithm

Most collaborative editors model a document as an array and represent edits as `(index, char)` pairs. That breaks under concurrency: if site A inserts at index 5 while site B deletes at index 3, A's index is now wrong by the time it's applied elsewhere — someone has to transform it (Operational Transformation), which requires a server to mediate order.

CRDText avoids that entirely by never addressing a character by its index. Every character is a node carrying a **globally unique, totally ordered position identifier**:

```typescript
type Position = {
  site: string    // which client created this character
  clock: number   // Lamport timestamp at creation
  frac: number[]  // fractional path between its neighbors, Logoot/LSEQ-style
}
```

`frac` is what makes inserts commutative: to insert a character between two existing ones, the engine computes a fraction strictly between their `frac` values (see `generateFracBetween` in `src/lib/crdt/position-generator.ts`). That position is permanent — concurrent edits elsewhere never shift it, because nothing is ever addressed by "the 5th character," only by its own identifier. Deletes are tombstones (`deleted: true` on the node), not array splices, so a delete can never invalidate a concurrent insert's position.

Two sites generating a position in the same gap at the same time is the one real collision risk; `generateFracBetween` resolves it by perturbing the split point with a deterministic, per-site hash (`siteOffset` in `position-generator.ts`), so concurrent inserts in the same gap land at different fractions without coordination.

## Guaranteed properties (CvRDT)

The engine is a **Convergent Replicated Data Type**: every operation is commutative, idempotent, and the whole system converges regardless of delivery order. These aren't just claims — `src/lib/crdt/crdt-engine.test.ts` (15 tests) demonstrates each one directly:

- **Commutativity** — applying two operations in either order produces the same document. Verified both pairwise and exhaustively: 3 concurrent inserts at the same gap, applied in all 6 possible orders, converge to one identical document.
- **Idempotency** — applying the same operation twice never changes the document beyond the first application. Verified for inserts, deletes, and full out-of-order replays.
- **Convergence** — verified under the two concurrency scenarios that actually stress the design: (a) N inserts at the same position from different sites, and (b) a concurrent insert next to a character that another site deletes at the same time — proving the insert survives because positions, not indices, anchor it.

A third convergence scenario — operations buffered offline by two sites arriving in reversed order on reconnect — is in scope for Epic 3 (offline-first), not yet implemented; see Project status below.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript | App Router server/client component split keeps the CRDT-touching code isolated to a single client island (`Editor.tsx`) |
| State | Zustand | Single store, no prop drilling, trivial to extend for the operation-log visualizer (Epic 4) |
| CRDT Engine | Pure TypeScript, zero dependencies | `src/lib/crdt/` imports nothing from React/Next/the browser — it's portable and independently testable |
| Sync transport (planned, Epic 2) | Node.js custom server + `ws` | Explicit, readable WebSocket handling instead of a managed/serverless abstraction |
| Operation log (planned, Epic 2) | Redis pub/sub + list | Broadcast channel + persistent operation log; late-joining clients replay the log instead of receiving a serialized tree |
| Offline buffer (planned, Epic 3) | IndexedDB + Service Worker | Operations generated offline are queued locally and flushed on reconnect |
| Tests | Vitest | Fast, native TS/ESM, environment-per-file override (`// @vitest-environment jsdom`) used for the one component test suite that needs a DOM |

## Project structure

```
crdtext/
├── shared/types.ts            # CRDTOperation, WSMessage, ConnectivityState — shared client/server schema
├── src/
│   ├── app/                   # Next.js App Router (layout, page)
│   ├── components/
│   │   └── Editor.tsx         # contenteditable, controlled by the CRDT engine via the Zustand store
│   └── lib/
│       ├── crdt/               # the engine — framework-free, see "The algorithm" above
│       │   ├── crdt-engine.ts
│       │   ├── lamport-clock.ts
│       │   ├── position-generator.ts
│       │   └── *.test.ts
│       └── store/
│           └── use-document-store.ts  # Zustand: document, engineRef, operationLog
└── server/                    # custom WebSocket server (Epic 2, not yet implemented)
```

`src/lib/crdt/` is the piece worth reading first — it's organized so the whole algorithm is followable in about 10 minutes: `lamport-clock.ts` (logical time), `position-generator.ts` (fractional positions + the collision-avoidance hash), `crdt-engine.ts` (the node list + insert/delete/apply API).

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run test          # Vitest — run once
npm run test:watch    # Vitest — watch mode
npm run lint           # ESLint
npx tsc --noEmit       # typecheck the app
npm run build           # production build
```

## Project status

- ✅ **Epic 1 — CRDT engine & base editor**: the Logoot/LSEQ engine, its CvRDT property tests, and a working `contenteditable` editor wired to the engine through Zustand. This is what's in the repo today.
- ⏳ **Epic 2 — Real-time collaboration**: WebSocket server, Redis-backed broadcast, automatic identity/presence, remote cursors. Not yet implemented.
- ⏳ **Epic 3 — Offline-first**: connectivity detection, IndexedDB operation buffering, reconnect/convergence, service worker app-shell caching. Not yet implemented.
- ⏳ **Epic 4 — Operation visualizer**: a live panel showing the Logoot/LSEQ identifiers and conflict resolution as it happens. Not yet implemented.

## Out of scope (by design)

No authentication, no document persistence between sessions, no rich text. The point of this project is the CRDT engine and the collaborative sync model, not a full editor product.
