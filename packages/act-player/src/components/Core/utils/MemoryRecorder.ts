export class FpsRecorder {
  readonly memoryBuffer = new Array<[number, number]>(200);

  private bufferPosition = 0;

  public lastMemory = 0;

  constructor() {
    for (let i = 0; i < this.memoryBuffer.length; i += 1) {
      this.memoryBuffer[i] = [0 | 0, 0 | 0];
    }
  }

  tick = (used: number, total: number) => {
    this.memoryBuffer[this.bufferPosition][0] = used;
    this.memoryBuffer[this.bufferPosition][1] = total;

    this.bufferPosition = (this.bufferPosition + 1) % this.memoryBuffer.length;
  };
}
