import { FIXED_TIMESTEP_MS } from './constants';

export type TickFn = (deltaSeconds: number) => void;

export class GameLoop {
  private accumulator = 0;
  private lastTimestamp = 0;
  private readonly maxFrameMs = 250;

  frame(timestamp: number, tick: TickFn) {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return;
    }

    const frameMs = Math.min(timestamp - this.lastTimestamp, this.maxFrameMs);
    this.lastTimestamp = timestamp;
    this.accumulator += frameMs;

    while (this.accumulator >= FIXED_TIMESTEP_MS) {
      tick(FIXED_TIMESTEP_MS / 1000);
      this.accumulator -= FIXED_TIMESTEP_MS;
    }
  }

  reset() {
    this.accumulator = 0;
    this.lastTimestamp = 0;
  }
}
