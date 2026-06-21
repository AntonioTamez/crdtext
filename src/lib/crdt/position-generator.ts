export type Position = {
  site: string
  clock: number
  frac: number[]
}

const MIN_GAP = 1e-9

/**
 * Deterministic, reproducible per-site offset in (0.1, 0.9) — NOT randomness.
 * Code review fix (2026-06-21): the original algorithm always split a gap at its
 * exact midpoint regardless of which site was generating the position, so two
 * sites concurrently inserting into the same (before, after) gap were guaranteed
 * to compute the byte-identical frac, silently colliding (a later insert "between"
 * those two collided siblings would sort after both instead of between them).
 * Perturbing the split point by a stable hash of siteId keeps results fully
 * deterministic/testable while making cross-site collisions effectively impossible.
 * The (0.1, 0.9) range keeps the result away from either boundary, leaving room
 * for further subdivision on both sides.
 */
function siteOffset(siteId: string): number {
  let hash = 2166136261 // FNV-1a 32-bit offset basis
  for (let i = 0; i < siteId.length; i++) {
    hash ^= siteId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const normalized = (hash >>> 0) / 0xffffffff // [0, 1]
  return 0.1 + normalized * 0.8 // (0.1, 0.9)
}

/**
 * Generates a frac array strictly between `before` and `after` (Logoot/LSEQ-style
 * fractional path). Uses a deterministic, site-perturbed split point at each depth
 * — see Story 1.2 Dev Notes for the rationale of trading LSEQ's randomized boundary
 * strategy for a simpler, still-collision-resistant one within this project's scope.
 */
export function generateFracBetween(before: number[] | null, after: number[] | null, siteId: string): number[] {
  const b = before ?? []
  const a = after ?? []
  const result: number[] = []
  let depth = 0
  const offset = siteOffset(siteId)

  while (true) {
    const lo = b[depth] ?? 0
    const hi = depth < a.length ? a[depth] : 1
    if (hi - lo > MIN_GAP) {
      result.push(lo + (hi - lo) * offset)
      return result
    }
    result.push(lo)
    depth += 1
  }
}

/**
 * Total order over positions: lexicographic comparison of `frac`, with
 * (clock, site) as a tiebreaker when fracs are identical — guarantees global
 * uniqueness (FR4) and gives applyOperation a way to detect "this is the exact
 * same operation" (comparePositions === 0) for idempotency.
 */
export function comparePositions(a: Position, b: Position): -1 | 0 | 1 {
  const len = Math.max(a.frac.length, b.frac.length)
  for (let i = 0; i < len; i++) {
    const av = a.frac[i] ?? -Infinity
    const bv = b.frac[i] ?? -Infinity
    if (av !== bv) return av < bv ? -1 : 1
  }
  if (a.clock !== b.clock) return a.clock < b.clock ? -1 : 1
  if (a.site !== b.site) return a.site < b.site ? -1 : 1
  return 0
}
