import { SpaceRect, RectWh, RectXywh } from './rectStructs';

const DEFAULT_RECT = new RectXywh();

export class CreatedSplits {
  public count: number;

  public spaces: [SpaceRect, SpaceRect];

  constructor(
    arg0: SpaceRect = DEFAULT_RECT,
    arg1: SpaceRect = DEFAULT_RECT,
  ) {
    this.spaces = [arg0, arg1];
    this.count = Number(arg0 !== DEFAULT_RECT) + Number(arg1 !== DEFAULT_RECT);
  }

  static failed() {
    const result = new CreatedSplits();
    result.count = -1;
    return result;
  }

  static none() {
    return new CreatedSplits();
  }

  betterThan(b: CreatedSplits) {
    return this.count < b.count;
  }

  toBoolean() {
    return this.count !== -1;
  }
}

export const insertAndSplit = (
  im: RectWh, /* Image rectangle */
  sp: SpaceRect, /* Space rectangle */
): CreatedSplits => {
  const freeW = sp.w - im.w;
  const freeH = sp.h - im.h;

  if (freeW < 0 || freeH < 0) {
    // Image is bigger than the candidate empty space.
    // We'll need to look further.

    return CreatedSplits.failed();
  }

  if (freeW === 0 && freeH === 0) {
    // If the image dimensions equal the dimensions of the
    // candidate empty space (image fits exactly),
    // we will just delete the space and create no splits.
    return CreatedSplits.none();
  }

  // If the image fits into the candidate empty space,
  // but exactly one of the image dimensions equals
  // the respective dimension of the candidate empty space
  // (e.g. image = 20x40, candidate space = 30x40)
  // we delete the space and create a single split. In this case a 10x40 space.
  if (freeW > 0 && freeH === 0) {
    const r = sp.clone();
    r.x += im.w;
    r.w -= im.w;
    return new CreatedSplits(r);
  }

  if (freeW === 0 && freeH > 0) {
    const r = sp.clone();
    r.y += im.h;
    r.h -= im.h;
    return new CreatedSplits(r);
  }

  // Every other option has been exhausted,
  // so at this point the image must be *strictly* smaller than the empty space,
  // that is, it is smaller in both width and height.

  // Thus, freeW and freeH must be positive.

  // Decide which way to split.

  // Instead of having two normally-sized spaces,
  // it is better - though I have no proof of that - to have a one tiny space and a one huge space.
  // This creates better opportunity for insertion of future rectangles.

  // This is why, if we had more of width remaining than we had of height,
  // we split along the vertical axis,
  // and if we had more of height remaining than we had of width,
  // we split along the horizontal axis.
  if (freeW > freeH) {
    const biggerSplit = new RectXywh(
      sp.x + im.w,
      sp.y,
      freeW,
      sp.h,
    );

    const lesserSplit = new RectXywh(
      sp.x,
      sp.y + im.h,
      im.w,
      freeH,
    );

    return new CreatedSplits(biggerSplit, lesserSplit);
  }

  const biggerSplit = new RectXywh(
    sp.x,
    sp.y + im.h,
    sp.w,
    freeH,
  );

  const lesserSplit = new RectXywh(
    sp.x + im.w,
    sp.y,
    freeW,
    im.h,
  );

  return new CreatedSplits(biggerSplit, lesserSplit);
};
