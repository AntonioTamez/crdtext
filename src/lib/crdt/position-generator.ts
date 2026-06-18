export type Position = {
  site: string
  clock: number
  frac: number[]
}

const MIN_GAP = 1e-9

/**
 * Generates a frac array strictly between `before` and `after` (Logoot/LSEQ-style
 * fractional path). Uses a deterministic midpoint at each depth — see Story 1.2
 * Dev Notes for the rationale of trading LSEQ's randomized boundary strategy for
 * a simpler, reproducible one within this project's scope.
 */
export function generateFracBetween(before: number[] | null, after: number[] | null): number[] {
  const b = before ?? []
  const a = after ?? []
  const result: number[] = []
  let depth = 0

  while (true) {
    const lo = b[depth] ?? 0
    const hi = depth < a.length ? a[depth] : 1
    if (hi - lo > MIN_GAP) {
      result.push(lo + (hi - lo) / 2)
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
