import {
  RectWh,
  RectXywh,
  RectXywhf,
} from './rectStructs';
import {
  StaticEmptySpaces,
  DefaultEmptySpaces,
} from './emptySpaceAllocators';
import {
  CreatedSplits,
  insertAndSplit,
} from './insertAndSplit';

export enum FlippingOption {
  DISABLED,
  ENABLED,
}

export type OutputRectType = RectXywhf | RectXywh | RectWh;

export class EmptySpaces {
  currentAabb = new RectWh();

  spaces: StaticEmptySpaces = new DefaultEmptySpaces();

  flippingMode = FlippingOption.ENABLED;

  static makeOutputRect(
    x: number,
    y: number,
    w: number,
    h: number,
    flipped?: boolean,
  ): RectXywh | RectXywhf {
    if (typeof flipped === 'undefined') {
      return new RectXywh(x, y, w, h);
    }

    return new RectXywhf(x, y, w, h, flipped);
  }

  constructor(r: RectWh, private allowFlip: boolean) {
    this.reset(r);
  }

  reset(r: RectWh) {
    this.currentAabb = new RectWh();
    this.spaces.reset();
    this.spaces.add(new RectXywh(0, 0, r.w, r.h));
  }

  insert<F extends (x: RectXywh) => void>(
    imageRectangle: RectWh,
    reportCandidateEmptySpace?: F): OutputRectType | null {
    for (let i = this.spaces.getCount() - 1; i >= 0; i -= 1) {
      const candidateSpace = this.spaces.get(i);

      reportCandidateEmptySpace?.(candidateSpace);

      const acceptResult = (
        splits: CreatedSplits,
        flippingNecessary = false,
      ) => {
        this.spaces.remove(i);

        for (let s = 0; s < splits.count; s += 1) {
          if (!this.spaces.add(splits.spaces[s])) {
            return null;
          }
        }

        if (this.allowFlip) {
          const result = EmptySpaces.makeOutputRect(
            candidateSpace.x,
            candidateSpace.y,
            imageRectangle.w,
            imageRectangle.h,
            flippingNecessary,
          );

          this.currentAabb.expandWith(result);
          return result;
        }
        const result = EmptySpaces.makeOutputRect(
          candidateSpace.x,
          candidateSpace.y,
          imageRectangle.w,
          imageRectangle.h,
        );

        this.currentAabb.expandWith(result);
        return result;
      };

      const tryToInsert = (img: RectWh) => insertAndSplit(img, candidateSpace);

      if (!this.allowFlip) {
        const normal = tryToInsert(imageRectangle);
        if (normal) {
          // console.log('>1');
          return acceptResult(normal, false);
        }
      } else if (this.flippingMode === FlippingOption.ENABLED) {
        const normal = tryToInsert(imageRectangle);
        const flipped = tryToInsert(new RectWh(imageRectangle.w, imageRectangle.h).flip());

        // If both were successful,
        // prefer the one that generated less remainder spaces.

        if (normal.toBoolean() && flipped.toBoolean()) {
          if (flipped.betterThan(normal)) {
            // Accept the flipped result if it produces less or "better" spaces.

            // console.log('>2');
            return acceptResult(flipped, true);
          }

          // console.log('>3');
          return acceptResult(normal, false);
        }

        if (normal.toBoolean()) {
          // console.log('>4');
          return acceptResult(normal, false);
        }

        if (flipped.toBoolean()) {
          // console.log('>5');
          return acceptResult(flipped, true);
        }

        // console.log('>7');
      } else {
        const normal = tryToInsert(imageRectangle);

        if (normal.toBoolean()) {
          // console.log('>6');
          return acceptResult(normal, false);
        }
      }
    }

    return null;
  }
}
