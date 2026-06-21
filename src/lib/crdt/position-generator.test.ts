import { describe, it, expect } from 'vitest'
import { generateFracBetween, comparePositions, type Position } from './position-generator'

describe('generateFracBetween', () => {
  it('returns a single-element frac strictly between (0, 1) when both boundaries are null (empty document)', () => {
    const frac = generateFracBetween(null, null, 'site-a')
    expect(frac).toHaveLength(1)
    expect(frac[0]).toBeGreaterThan(0)
    expect(frac[0]).toBeLessThan(1)
  })

  it('returns a value less than `after` when `before` is null (insert at start)', () => {
    const frac = generateFracBetween(null, [0.5], 'site-a')
    expect(frac[0]).toBeLessThan(0.5)
  })

  it('returns a value greater than `before` when `after` is null (insert at end)', () => {
    const frac = generateFracBetween([0.5], null, 'site-a')
    expect(frac[0]).toBeGreaterThan(0.5)
  })

  it('returns a value strictly between two boundaries with room at the top level', () => {
    const frac = generateFracBetween([0.3], [0.5], 'site-a')
    expect(frac).toHaveLength(1)
    expect(frac[0]).toBeGreaterThan(0.3)
    expect(frac[0]).toBeLessThan(0.5)
  })

  it('descends a level when there is no room at the current depth (near-collision)', () => {
    const before = [0.3]
    const after = [0.3 + 1e-10]
    const frac = generateFracBetween(before, after, 'site-a')
    expect(frac.length).toBeGreaterThan(1)
    // The generated frac must sort strictly between before and after under comparePositions' ordering rule.
    const a: Position = { site: 'x', clock: 0, frac: before }
    const b: Position = { site: 'x', clock: 0, frac }
    const c: Position = { site: 'x', clock: 0, frac: after }
    expect(comparePositions(a, b)).toBe(-1)
    expect(comparePositions(b, c)).toBe(-1)
  })

  it('is deterministic and reproducible: same (before, after, siteId) always yields the same frac', () => {
    const frac1 = generateFracBetween([0.3], [0.5], 'site-a')
    const frac2 = generateFracBetween([0.3], [0.5], 'site-a')
    expect(frac1).toEqual(frac2)
  })

  it('different sites generate different fracs for the same (before, after) gap — prevents position collisions', () => {
    // Code review fix (2026-06-21): the original deterministic-midpoint algorithm always
    // produced the exact same frac for the same (before, after) pair regardless of which
    // site called it, guaranteeing a collision whenever two sites concurrently inserted at
    // the same gap. Perturbing the split point by a per-site offset keeps generation fully
    // deterministic/reproducible while ensuring two different sites essentially never land
    // on the same fractional position.
    const fracA = generateFracBetween([0.3], [0.5], 'site-a')
    const fracB = generateFracBetween([0.3], [0.5], 'site-b')
    expect(fracA).not.toEqual(fracB)
  })

  it('the per-site offset stays strictly inside the (lo, hi) gap, never touching either boundary', () => {
    // A wide spread of site ids must never produce a frac equal to lo or hi — otherwise the
    // generated position could collide with an existing boundary node instead of sitting
    // strictly between them.
    const lo = 0.2
    const hi = 0.8
    for (const site of ['a', 'b', 'site-x', 'site-y', 'a-very-long-site-identifier-uuid-like-string']) {
      const frac = generateFracBetween([lo], [hi], site)
      expect(frac[0]).toBeGreaterThan(lo)
      expect(frac[0]).toBeLessThan(hi)
    }
  })
})

describe('comparePositions', () => {
  it('orders by frac lexicographically when fracs differ', () => {
    const a: Position = { site: 's1', clock: 1, frac: [0.3] }
    const b: Position = { site: 's1', clock: 1, frac: [0.5] }
    expect(comparePositions(a, b)).toBe(-1)
    expect(comparePositions(b, a)).toBe(1)
  })

  it('treats a shorter frac as "before" a longer frac sharing the same prefix', () => {
    const a: Position = { site: 's1', clock: 1, frac: [0.3] }
    const b: Position = { site: 's1', clock: 1, frac: [0.3, 0.5] }
    expect(comparePositions(a, b)).toBe(-1)
  })

  it('breaks ties on identical frac by clock when fracs are equal', () => {
    const a: Position = { site: 's1', clock: 1, frac: [0.5] }
    const b: Position = { site: 's1', clock: 2, frac: [0.5] }
    expect(comparePositions(a, b)).toBe(-1)
  })

  it('breaks ties on identical frac+clock by site', () => {
    const a: Position = { site: 'site-a', clock: 1, frac: [0.5] }
    const b: Position = { site: 'site-b', clock: 1, frac: [0.5] }
    expect(comparePositions(a, b)).toBe(-1)
  })

  it('returns 0 for fully identical positions (same site, clock, and frac)', () => {
    const a: Position = { site: 's1', clock: 1, frac: [0.5] }
    const b: Position = { site: 's1', clock: 1, frac: [0.5] }
    expect(comparePositions(a, b)).toBe(0)
  })
})
