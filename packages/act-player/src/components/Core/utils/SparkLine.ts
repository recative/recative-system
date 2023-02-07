const MARGIN = 10;

const LINE_WIDTH = 4;

export class SparkLine {
  $canvas: HTMLCanvasElement | undefined = undefined;

  context: CanvasRenderingContext2D | undefined = undefined;

  constructor(
    public readonly min: number | null = null,
    public readonly max: number | null = null
  ) {}

  setCanvas = ($canvas = document.createElement('canvas')) => {
    this.$canvas = $canvas;

    this.context = $canvas.getContext('2d')!;

    this.$canvas.style.cssText +=
      'width: 100% !important; height:100% !important';
  };

  syncClear = () => {
    if (!this.$canvas) return;
    if (!this.context) return;

    this.context.clearRect(
      0,
      0,
      this.$canvas.width * window.devicePixelRatio,
      this.$canvas.height * window.devicePixelRatio
    );
  };

  syncCanvasSize = () => {
    if (!this.$canvas) return;
    if (!this.context) return;

    const { width, height } = this.$canvas.getBoundingClientRect();

    const ratio = window.devicePixelRatio;

    const trueWidth = width * ratio;
    const trueHeight = height * ratio;

    if (
      trueWidth !== this.$canvas.width ||
      trueHeight !== this.$canvas.height
    ) {
      this.$canvas.width = trueWidth;
      this.$canvas.height = trueHeight;
    }
  };

  updateData = (rawData: number[]) => {
    if (!this.$canvas) return;
    if (!this.context) return;

    this.syncCanvasSize();

    const min = this.min ?? Math.min(...rawData);
    const max = this.max ?? Math.max(...rawData);
    const c = this.$canvas;

    const data = rawData.map((x) => Math.abs(x - min));

    const scale = max - min;
    const ratioW = ((c.width - MARGIN * 2) * 1) / data.length;
    const ratioH = ((c.height - MARGIN * 2) * 0.8) / scale;

    let x = 0;
    let y = 0;
    const grad = this.context.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#007AC9'); // Initial path color
    grad.addColorStop(1, '#00c972'); // End stroke color

    this.context.strokeStyle = grad;
    this.context.fillStyle = grad;

    this.context.beginPath();
    this.context.lineWidth = LINE_WIDTH;
    let currentHeight = c.height - (data[0] * ratioH + MARGIN);

    for (let index = 0; index < data.length; index += 1) {
      if (index === 0) {
        // First time
        this.context.beginPath();
        this.context.lineWidth = LINE_WIDTH;
        currentHeight = c.height - (data[index] * ratioH + MARGIN);
        this.context.moveTo(MARGIN, currentHeight);
      } else {
        x = index * ratioW + MARGIN;
        y = c.height - (data[index] * ratioH + MARGIN);
        this.context.lineTo(x, y);
      }
    }
    this.context.stroke();
  };
}
