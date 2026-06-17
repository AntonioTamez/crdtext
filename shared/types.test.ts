import { describe, it, expect } from 'vitest'
import type { CRDTOperation, WSMessage, ConnectivityState } from './types'

describe('shared types — smoke test (Vitest co-located discovery)', () => {
  it('CRDTOperation accepts a valid insert operation shape', () => {
    const op: CRDTOperation = {
      type: 'insert',
      position: { site: 'site-a', clock: 1, frac: [0.5] },
      char: 'x',
      siteId: 'site-a',
      timestamp: 1,
    }
    expect(op.type).toBe('insert')
  })

  it('WSMessage discriminated union narrows correctly by type', () => {
    const msg: WSMessage = { type: 'join', siteId: 'site-a', name: 'Azul-0001', color: '#2563eb' }
    expect(msg.type === 'join' && msg.name).toBe('Azul-0001')
  })

  it('ConnectivityState only allows the three defined states', () => {
    const states: ConnectivityState[] = ['online', 'offline', 'syncing']
    expect(states).toHaveLength(3)
  })
})
