export class RectWh {
  constructor(public w: number = 0, public h: number = 0) {}

  flip(): RectWh {
    [this.w, this.h] = [this.h, this.w];
    return this;
  }

  maxSide(): number {
    return this.h > this.w ? this.h : this.w;
  }

  minSide(): number {
    return this.h < this.w ? this.h : this.w;
  }

  area(): number { return this.w * this.h; }

  perimeter(): number { return 2 * this.w + 2 * this.h; }

  pathologicalMult(): number {
    return (this.maxSide() / this.minSide()) * this.area();
  }

  expandWith<R extends Rect>(r: R) {
    this.w = Math.max(this.w, r.x + r.w);
    this.h = Math.max(this.h, r.y + r.h);
  }

  clone() {
    return new RectWh(this.w, this.h);
  }

  getWh() {
    return this;
  }
}

export class RectXywh {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public w: number = 0,
    public h: number = 0,
  ) {}

  area(): number { return this.w * this.h; }

  perimeter(): number { return 2 * this.w + 2 * this.h; }

  getWh() {
    return new RectWh(this.w, this.h);
  }

  clone() {
    return new RectXywh(this.x, this.y, this.w, this.h);
  }
}

export class RectXywhf {
  public w: number;

  public h: number;

  constructor(
    public x: number = 0,
    public y: number = 0,
    w: number = 0,
    h: number = 0,
    public flipped: boolean = false,
  ) {
    this.w = flipped ? h : w;
    this.h = flipped ? w : h;
  }

  area(): number { return this.w * this.h; }

  perimeter(): number { return 2 * this.w + 2 * this.h; }

  getWh() {
    return new RectWh(this.w, this.h);
  }
}

export type SpaceRect = RectXywh;
export type Rect = RectXywh | RectXywhf;
