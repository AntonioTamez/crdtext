import { create } from 'zustand'
import type { CRDTOperation } from '../../../shared/types'
import { createCRDTEngine, type CRDTEngine } from '@/lib/crdt/crdt-engine'

type DocumentStore = {
  document: string
  engineRef: CRDTEngine | null
  operationLog: CRDTOperation[]
  initEngine: () => void
  insertChar: (index: number, char: string) => void
  deleteChar: (index: number) => void
}

export const useDocumentStore = create<DocumentStore>()((set, get) => ({
  document: '',
  engineRef: null,
  operationLog: [],

  initEngine: () => {
    if (get().engineRef) return
    set({ engineRef: createCRDTEngine(crypto.randomUUID()) })
  },

  insertChar: (index, char) => {
    const engine = get().engineRef
    if (!engine) return
    const op = engine.generateOperation('insert', index, char)
    engine.applyOperation(op)
    set((state) => ({ document: engine.getDocument(), operationLog: [...state.operationLog, op] }))
  },

  deleteChar: (index) => {
    const engine = get().engineRef
    if (!engine) return
    const op = engine.generateOperation('delete', index)
    engine.applyOperation(op)
    set((state) => ({ document: engine.getDocument(), operationLog: [...state.operationLog, op] }))
  },
}))
