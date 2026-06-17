export type CRDTOperation = {
  type: 'insert' | 'delete'
  position: { site: string; clock: number; frac: number[] }
  char?: string
  siteId: string
  timestamp: number
}

export type WSMessage =
  | { type: 'join'; siteId: string; name: string; color: string }
  | { type: 'operation'; op: CRDTOperation }
  | { type: 'cursor'; siteId: string; index: number }
  | { type: 'sync'; operations: CRDTOperation[] }
  | { type: 'ack'; timestamp: number }

export type ConnectivityState = 'online' | 'offline' | 'syncing'
