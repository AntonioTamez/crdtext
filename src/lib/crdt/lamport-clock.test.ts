import { describe, it, expect } from 'vitest'
import { LamportClock } from './lamport-clock'

describe('LamportClock', () => {
  it('starts at 0 and tick() returns 1 on first call', () => {
    const clock = new LamportClock()
    expect(clock.tick()).toBe(1)
  })

  it('tick() increments by 1 on each call', () => {
    const clock = new LamportClock()
    clock.tick()
    clock.tick()
    expect(clock.tick()).toBe(3)
  })

  it('update() advances internal clock to max(internal, received) + 1', () => {
    const clock = new LamportClock()
    clock.tick() // internal = 1
    clock.update(5) // internal = max(1, 5) + 1 = 6
    expect(clock.tick()).toBe(7)
  })

  it('update() with a received value lower than internal still advances by 1', () => {
    const clock = new LamportClock()
    clock.tick() // internal = 1
    clock.tick() // internal = 2
    clock.update(0) // internal = max(2, 0) + 1 = 3
    expect(clock.tick()).toBe(4)
  })
})
