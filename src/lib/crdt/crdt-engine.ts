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

export function createCRDTEngine(siteId: string): CRDTEngine {
  const clock = new LamportClock()
  const nodes: Node[] = []

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

  function findNodeIndexByPosition(position: Position): number {
    return nodes.findIndex((n) => comparePositions(n.position, position) === 0)
  }

  function insertSorted(node: Node): void {
    let lo = 0
    let hi = nodes.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (comparePositions(nodes[mid].position, node.position) < 0) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    nodes.splice(lo, 0, node)
  }

  return {
    generateOperation(type, index, char) {
      const timestamp = clock.tick()
      if (type === 'insert') {
        const { before, after } = neighborFracs(index)
        const frac = generateFracBetween(before, after)
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

      // delete: take the exact position of the visible node currently at `index`
      const nodeIndex = visibleIndexToNodeIndex(index)
      const targetNode = nodes[nodeIndex]
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
        insertSorted({ position, char: op.char ?? '', deleted: false })
        return
      }

      // delete
      const existingIndex = findNodeIndexByPosition(position)
      if (existingIndex === -1) return // nothing to delete (out-of-order arrival or already gone)
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
