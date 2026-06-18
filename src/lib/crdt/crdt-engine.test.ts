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
