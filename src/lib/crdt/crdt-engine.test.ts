import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCRDTEngine } from './crdt-engine'

const crdtDir = dirname(fileURLToPath(import.meta.url))

describe('src/lib/crdt/ isolation (AC1)', () => {
  it('no file in this directory imports React, Next.js, or browser globals', () => {
    const forbidden = /from\s+['"](react|next)(\/|['"])|(\bwindow\b|\bdocument\b)(?!.*\/\/)/
    const files = readdirSync(crdtDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const content = readFileSync(join(crdtDir, file), 'utf-8')
      expect(forbidden.test(content), `${file} must not import React/Next.js or use browser globals`).toBe(false)
    }
  })
})

describe('createCRDTEngine — generateOperation (AC2)', () => {
  it('generateOperation("insert", 0) on an empty document returns a complete, unique CRDTOperation', () => {
    const engine = createCRDTEngine('site-a')
    const op = engine.generateOperation('insert', 0, 'x')
    expect(op.type).toBe('insert')
    expect(op.char).toBe('x')
    expect(op.siteId).toBe('site-a')
    expect(typeof op.timestamp).toBe('number')
    expect(op.position.site).toBe('site-a')
    expect(typeof op.position.clock).toBe('number')
    expect(Array.isArray(op.position.frac)).toBe(true)
    expect(op.position.frac.length).toBeGreaterThan(0)
  })

  it('sequential inserts produce the document in the order typed', () => {
    const engine = createCRDTEngine('site-a')
    const opH = engine.generateOperation('insert', 0, 'h')
    engine.applyOperation(opH)
    const opI = engine.generateOperation('insert', 1, 'i')
    engine.applyOperation(opI)
    expect(engine.getDocument()).toBe('hi')
  })

  it('delete removes the character at the given visible index', () => {
    const engine = createCRDTEngine('site-a')
    engine.applyOperation(engine.generateOperation('insert', 0, 'h'))
    engine.applyOperation(engine.generateOperation('insert', 1, 'i'))
    const delOp = engine.generateOperation('delete', 0)
    engine.applyOperation(delOp)
    expect(engine.getDocument()).toBe('i')
  })
})

describe('createCRDTEngine — commutativity (AC3)', () => {
  it('applying two concurrent inserts in opposite order converges to the same document', () => {
    const engineA = createCRDTEngine('site-a')
    const engineB = createCRDTEngine('site-b')

    // Both start from the same base document: "ac"
    const base1 = engineA.generateOperation('insert', 0, 'a')
    engineA.applyOperation(base1)
    engineB.applyOperation(base1)
    const base2 = engineA.generateOperation('insert', 1, 'c')
    engineA.applyOperation(base2)
    engineB.applyOperation(base2)
    expect(engineA.getDocument()).toBe('ac')
    expect(engineB.getDocument()).toBe('ac')

    // Concurrent inserts: both sites insert at index 1 (between 'a' and 'c') independently.
    const opFromA = engineA.generateOperation('insert', 1, 'b')
    const opFromB = engineB.generateOperation('insert', 1, 'B')

    // Engine A applies its own op first, then B's (arrival order: A, B)
    engineA.applyOperation(opFromA)
    engineA.applyOperation(opFromB)

    // Engine B applies B's own op first, then A's (arrival order: B, A — reversed)
    engineB.applyOperation(opFromB)
    engineB.applyOperation(opFromA)

    expect(engineA.getDocument()).toBe(engineB.getDocument())
    expect(engineA.getDocument()).toHaveLength(4)
  })
})

describe('Commutativity — N-way concurrent inserts (NFR4 escenario a, exhaustivo)', () => {
  it('three concurrent inserts at the same gap converge identically across all 6 application orders (commutativity)', () => {
    const engines = [createCRDTEngine('site-a'), createCRDTEngine('site-b'), createCRDTEngine('site-c')]
    const base = engines[0].generateOperation('insert', 0, 'a')
    engines.forEach((e) => e.applyOperation(base))
    const after = engines[0].generateOperation('insert', 1, 'z')
    engines.forEach((e) => e.applyOperation(after))

    // All three sites concurrently insert at the same gap (index 1), independently —
    // each op is generated before any of the three is applied anywhere, so none of
    // them is causally aware of the others.
    const ops = engines.map((e, i) => e.generateOperation('insert', 1, 'XYZ'[i]))

    // Apply all three operations, in `applicationOrder`, on a fresh replica engine
    // representing one specific network delivery order.
    function buildConverged(applicationOrder: number[]) {
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
    expect(new Set(results).size).toBe(1) // all 6 delivery orders produce the exact same document
    expect(results[0]).toHaveLength(5)
  })
})

describe('createCRDTEngine — idempotency (AC4)', () => {
  it('applying the same operation twice does not change the document', () => {
    const engine = createCRDTEngine('site-a')
    const op = engine.generateOperation('insert', 0, 'x')
    engine.applyOperation(op)
    const afterFirst = engine.getDocument()
    engine.applyOperation(op)
    const afterSecond = engine.getDocument()
    expect(afterSecond).toBe(afterFirst)
    expect(afterSecond).toBe('x')
  })

  it('applying the same delete operation twice does not change the document', () => {
    const engine = createCRDTEngine('site-a')
    const insertOp = engine.generateOperation('insert', 0, 'x')
    engine.applyOperation(insertOp)
    const delOp = engine.generateOperation('delete', 0)
    engine.applyOperation(delOp)
    const afterFirst = engine.getDocument()
    engine.applyOperation(delOp)
    const afterSecond = engine.getDocument()
    expect(afterSecond).toBe(afterFirst)
    expect(afterSecond).toBe('')
  })
})

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

describe('createCRDTEngine — code review fixes (2026-06-21)', () => {
  it('generateOperation("delete", index) throws a clear RangeError instead of crashing when the document is empty', () => {
    const engine = createCRDTEngine('site-a')
    expect(() => engine.generateOperation('delete', 0)).toThrow(RangeError)
  })

  it('generateOperation("delete", index) throws a clear RangeError when index is beyond the visible length', () => {
    const engine = createCRDTEngine('site-a')
    engine.applyOperation(engine.generateOperation('insert', 0, 'x'))
    expect(() => engine.generateOperation('delete', 1)).toThrow(RangeError)
    expect(() => engine.generateOperation('delete', 99)).toThrow(/no visible character at index 99/)
  })

  it('a delete that arrives before its matching insert is not lost — the insert is applied as already-deleted', () => {
    const engineA = createCRDTEngine('site-a')
    const engineB = createCRDTEngine('site-b')

    const insertOp = engineA.generateOperation('insert', 0, 'x')
    engineA.applyOperation(insertOp)
    const deleteOp = engineA.generateOperation('delete', 0)
    engineA.applyOperation(deleteOp)
    expect(engineA.getDocument()).toBe('')

    // engineB receives the delete BEFORE the insert (out-of-order network delivery)
    engineB.applyOperation(deleteOp)
    expect(engineB.getDocument()).toBe('') // nothing visible yet — insert hasn't arrived
    engineB.applyOperation(insertOp)
    expect(engineB.getDocument()).toBe('') // insert arrives, but must respect the earlier delete — NOT 'x'
  })

  it('idempotency holds even when the delete arrives before the insert and the whole sequence is replayed', () => {
    const source = createCRDTEngine('site-a')
    const insertOp = source.generateOperation('insert', 0, 'x')
    source.applyOperation(insertOp)
    const deleteOp = source.generateOperation('delete', 0)

    const replica = createCRDTEngine('site-b')
    replica.applyOperation(deleteOp) // out-of-order: delete arrives first
    replica.applyOperation(insertOp)
    const afterFirstRound = replica.getDocument()

    // re-apply both operations again, in the same order, as a naive replay/retry would
    replica.applyOperation(deleteOp)
    replica.applyOperation(insertOp)
    expect(replica.getDocument()).toBe(afterFirstRound)
    expect(replica.getDocument()).toBe('')
  })

  it('two sites concurrently inserting at the same gap produce distinct, non-colliding positions', () => {
    const engineA = createCRDTEngine('site-a')
    const engineB = createCRDTEngine('site-b')

    const base1 = engineA.generateOperation('insert', 0, 'a')
    engineA.applyOperation(base1)
    engineB.applyOperation(base1)
    const base2 = engineA.generateOperation('insert', 1, 'c')
    engineA.applyOperation(base2)
    engineB.applyOperation(base2)

    const opFromA = engineA.generateOperation('insert', 1, 'b')
    const opFromB = engineB.generateOperation('insert', 1, 'B')

    expect(opFromA.position.frac).not.toEqual(opFromB.position.frac)
  })

  it('a third concurrent insert lands correctly between two siblings inserted at the same gap', () => {
    const engineA = createCRDTEngine('site-a')
    const engineB = createCRDTEngine('site-b')
    const engineC = createCRDTEngine('site-c')

    const base1 = engineA.generateOperation('insert', 0, 'a')
    ;[engineA, engineB, engineC].forEach((e) => e.applyOperation(base1))
    const base2 = engineA.generateOperation('insert', 1, 'c')
    ;[engineA, engineB, engineC].forEach((e) => e.applyOperation(base2))

    // A and B concurrently insert at the same gap (index 1, between 'a' and 'c')
    const opFromA = engineA.generateOperation('insert', 1, 'b')
    const opFromB = engineB.generateOperation('insert', 1, 'B')
    ;[engineA, engineB, engineC].forEach((e) => {
      e.applyOperation(opFromA)
      e.applyOperation(opFromB)
    })
    // All three engines now see the same 4-character document, e.g. "aBbc" or "abBc"
    const converged = engineA.getDocument()
    expect(engineB.getDocument()).toBe(converged)
    expect(engineC.getDocument()).toBe(converged)
    expect(converged).toHaveLength(4)

    // engineC now inserts a 5th character at the visible gap between A's and B's siblings (index 2)
    const opFromC = engineC.generateOperation('insert', 2, 'X')
    ;[engineA, engineB, engineC].forEach((e) => e.applyOperation(opFromC))

    const final = engineA.getDocument()
    expect(engineB.getDocument()).toBe(final)
    expect(engineC.getDocument()).toBe(final)
    expect(final).toHaveLength(5)
    expect(final).toContain('X')
    // The inserted 'X' must actually land at the visible index it was generated for (index 2),
    // not collapse to the end of the document — this is the regression this test guards against.
    expect(final.indexOf('X')).toBe(2)
  })
})
