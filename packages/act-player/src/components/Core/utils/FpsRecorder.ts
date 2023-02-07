export class FpsRecorder {
  readonly ΔtBuffer = new Array<number>(200).fill(0);

  private bufferPosition = 0;

  public lastΔt = 0;

  private lastT = 0;

  private running = false;

  get averageΔt() {
    let total = 0;
    for (let i = 0; i < this.ΔtBuffer.length; i += 1) {
      total += this.ΔtBuffer[i];
    }
    return total / this.ΔtBuffer.length;
  }

  tick = () => {
    const timestamp = performance.now();
    if (this.lastT !== 0) {
      this.lastΔt = timestamp - this.lastT;
      this.ΔtBuffer[this.bufferPosition] = this.lastΔt;
      this.bufferPosition = (this.bufferPosition + 1) % this.ΔtBuffer.length;
    }

    this.lastT = timestamp;
    if (this.running && typeof window !== 'undefined') {
      window.requestAnimationFrame(this.tick);
    }
  };

  start = () => {
    this.running = true;
    window.requestAnimationFrame(this.tick);
  };

  stop = () => {
    this.running = false;
  };
}
