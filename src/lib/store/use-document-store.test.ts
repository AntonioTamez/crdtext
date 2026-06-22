import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentStore } from './use-document-store'

function resetStore() {
  useDocumentStore.setState({ document: '', engineRef: null, operationLog: [] })
}

describe('useDocumentStore — initEngine', () => {
  beforeEach(resetStore)

  it('lazily creates the engine on first call and is a no-op on subsequent calls', () => {
    expect(useDocumentStore.getState().engineRef).toBeNull()
    useDocumentStore.getState().initEngine()
    const engine = useDocumentStore.getState().engineRef
    expect(engine).not.toBeNull()

    useDocumentStore.getState().initEngine()
    expect(useDocumentStore.getState().engineRef).toBe(engine) // same instance, not replaced
  })
})

describe('useDocumentStore — insertChar (AC2)', () => {
  beforeEach(resetStore)

  it('calling insertChar updates the document and appends an insert operation to the log', () => {
    useDocumentStore.getState().initEngine()
    useDocumentStore.getState().insertChar(0, 'h')
    useDocumentStore.getState().insertChar(1, 'i')

    expect(useDocumentStore.getState().document).toBe('hi')
    const log = useDocumentStore.getState().operationLog
    expect(log).toHaveLength(2)
    expect(log[0].type).toBe('insert')
    expect(log[0].char).toBe('h')
    expect(log[1].char).toBe('i')
  })

  it('is a no-op when the engine has not been initialized yet', () => {
    useDocumentStore.getState().insertChar(0, 'x')
    expect(useDocumentStore.getState().document).toBe('')
    expect(useDocumentStore.getState().operationLog).toHaveLength(0)
  })
})

describe('useDocumentStore — deleteChar (AC3)', () => {
  beforeEach(resetStore)

  it('deleting the only character empties the document and appends a delete operation to the log', () => {
    useDocumentStore.getState().initEngine()
    useDocumentStore.getState().insertChar(0, 'x')
    useDocumentStore.getState().deleteChar(0)

    expect(useDocumentStore.getState().document).toBe('')
    const log = useDocumentStore.getState().operationLog
    expect(log).toHaveLength(2)
    expect(log[1].type).toBe('delete')
  })

  it('is a no-op when the engine has not been initialized yet', () => {
    useDocumentStore.getState().deleteChar(0)
    expect(useDocumentStore.getState().operationLog).toHaveLength(0)
  })
})
