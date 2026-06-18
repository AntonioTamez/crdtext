export class LamportClock {
  private value = 0

  tick(): number {
    this.value += 1
    return this.value
  }

  update(received: number): void {
    this.value = Math.max(this.value, received) + 1
  }
}
