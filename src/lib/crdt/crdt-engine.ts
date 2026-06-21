import type { CRDTOperation } from '../../../shared/types'
import { LamportClock } from './lamport-clock'
import { comparePositions, generateFracBetween, type Position } from './position-generator'

type Node = {
  position: Position
  char: string
  deleted: boolean
}

export type CRDTEngine = {
  applyOperation(op: CRDTOperation): void
  generateOperation(type: 'insert' | 'delete', index: number, char?: string): CRDTOperation
  getDocument(): string
}

function positionKey(p: Position): string {
  return `${p.site}:${p.clock}:${p.frac.join(',')}`
}

export function createCRDTEngine(siteId: string): CRDTEngine {
  const clock = new LamportClock()
  const nodes: Node[] = []
  // Code review fix (2026-06-21): positions deleted before their matching insert
  // has been applied locally (out-of-order network delivery) — recorded here so
  // the insert, once it does arrive, is applied as already-deleted instead of
  // silently resurrecting the character. Required by NFR-C.1(c): offline operations
  // from two sites must converge correctly even when they arrive in reversed order.
  const pendingDeletes = new Set<string>()

  function visibleIndexToNodeIndex(visibleIndex: number): number {
    let seen = 0
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i].deleted) {
        if (seen === visibleIndex) return i
        seen += 1
      }
    }
    return nodes.length
  }

  function neighborFracs(insertAtVisibleIndex: number): { before: number[] | null; after: number[] | null } {
    const nodeIndex = visibleIndexToNodeIndex(insertAtVisibleIndex)
    let beforeNode: Node | undefined
    for (let i = nodeIndex - 1; i >= 0; i--) {
      if (!nodes[i].deleted) {
        beforeNode = nodes[i]
        break
      }
    }
    let afterNode: Node | undefined
    for (let i = nodeIndex; i < nodes.length; i++) {
      if (!nodes[i].deleted) {
        afterNode = nodes[i]
        break
      }
    }
    return {
      before: beforeNode ? beforeNode.position.frac : null,
      after: afterNode ? afterNode.position.frac : null,
    }
  }

  // Code review fix (2026-06-21): nodes is always kept sorted by comparePositions
  // (insertSorted is the only path that adds nodes), so locating an existing
  // position can use the same binary-search lower-bound as insertSorted — O(log n)
  // instead of a full O(n) linear scan — and both functions share this helper to
  // keep the "where does this position belong" logic in one place.
  function lowerBound(position: Position): number {
    let lo = 0
    let hi = nodes.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (comparePositions(nodes[mid].position, position) < 0) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    return lo
  }

  function findNodeIndexByPosition(position: Position): number {
    const index = lowerBound(position)
    if (index < nodes.length && comparePositions(nodes[index].position, position) === 0) return index
    return -1
  }

  function insertSorted(node: Node): void {
    nodes.splice(lowerBound(node.position), 0, node)
  }

  return {
    generateOperation(type, index, char) {
      const timestamp = clock.tick()
      if (type === 'insert') {
        const { before, after } = neighborFracs(index)
        const frac = generateFracBetween(before, after, siteId)
        const position: Position = { site: siteId, clock: timestamp, frac }
        const op: Readonly<CRDTOperation> = {
          type: 'insert',
          position,
          char,
          siteId,
          timestamp,
        }
        return op
      }

      // delete: take the exact position of the visible node currently at `index`.
      // Code review fix (2026-06-21): validate the index instead of dereferencing
      // an out-of-range node — was an unguarded crash on empty documents / stale indices.
      const nodeIndex = visibleIndexToNodeIndex(index)
      const targetNode = nodes[nodeIndex]
      if (!targetNode) {
        throw new RangeError(`generateOperation('delete', ${index}): no visible character at index ${index}`)
      }
      const position: Position = targetNode.position
      const op: Readonly<CRDTOperation> = {
        type: 'delete',
        position,
        siteId,
        timestamp,
      }
      return op
    },

    applyOperation(op) {
      clock.update(op.timestamp)
      const position: Position = op.position

      if (op.type === 'insert') {
        if (findNodeIndexByPosition(position) !== -1) return // idempotent: already applied
        // Code review fix (2026-06-21): if a delete for this exact position already
        // arrived (out-of-order), apply this insert as already-deleted instead of
        // resurrecting the character — required for NFR-C.1(c) convergence.
        const key = positionKey(position)
        const alreadyDeleted = pendingDeletes.has(key)
        if (alreadyDeleted) pendingDeletes.delete(key)
        insertSorted({ position, char: op.char ?? '', deleted: alreadyDeleted })
        return
      }

      // delete
      const existingIndex = findNodeIndexByPosition(position)
      if (existingIndex === -1) {
        // Out-of-order arrival: the insert for this position hasn't landed yet.
        // Record the delete so the insert applies as already-deleted when it arrives.
        pendingDeletes.add(positionKey(position))
        return
      }
      if (nodes[existingIndex].deleted) return // idempotent: already deleted
      nodes[existingIndex].deleted = true
    },

    getDocument() {
      return nodes
        .filter((n) => !n.deleted)
        .map((n) => n.char)
        .join('')
    },
  }
}
