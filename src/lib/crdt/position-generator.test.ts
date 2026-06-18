import { describe, it, expect } from 'vitest'
import { generateFracBetween, comparePositions, type Position } from './position-generator'

describe('generateFracBetween', () => {
  it('returns [0.5] when both boundaries are null (empty document)', () => {
    expect(generateFracBetween(null, null)).toEqual([0.5])
  })

  it('returns a value less than `after` when `before` is null (insert at start)', () => {
    const frac = generateFracBetween(null, [0.5])
    expect(frac[0]).toBeLessThan(0.5)
  })

  it('returns a value greater than `before` when `after` is null (insert at end)', () => {
    const frac = generateFracBetween([0.5], null)
    expect(frac[0]).toBeGreaterThan(0.5)
  })

  it('returns the midpoint between two boundaries with room at the top level', () => {
    expect(generateFracBetween([0.3], [0.5])).toEqual([0.4])
  })

  it('descends a level when there is no room at the current depth (near-collision)', () => {
    const before = [0.3]
    const after = [0.3 + 1e-10]
    const frac = generateFracBetween(before, after)
    expect(frac.length).toBeGreaterThan(1)
    // The generated frac must sort strictly between before and after under comparePositions' ordering rule.
    const a: Position = { site: 'x', clock: 0, frac: before }
    const b: Position = { site: 'x', clock: 0, frac }
    const c: Position = { site: 'x', clock: 0, frac: after }
    expect(comparePositions(a, b)).toBe(-1)
    expect(comparePositions(b, c)).toBe(-1)
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
