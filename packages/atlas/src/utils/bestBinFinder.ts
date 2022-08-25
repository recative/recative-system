import { RectWh } from './rectStructs';
import { EmptySpaces } from './emptySpaces';

import type { FinderInput } from './findersInterface';
import type { OutputRectType } from './emptySpaces';

import { CallbackResult } from '../constants/CallbackResult';

export enum BinDimension {
  BOTH,
  WIDTH,
  HEIGHT,
}

// This function will do a binary search on viable bin sizes,
// starting from the biggest one: starting_bin.

// The search stops when the bin was successfully inserted into,
// AND the bin size to be tried next differs in size from the last
// viable one by *less* then discard_step.

// If we could not insert all input rectangles into a bin even as
// big as the starting_bin - the search fails.
// In this case, we return the amount of space (total_area_type)
// inserted in total.

// If we've found a viable bin that is smaller or equal to
// starting_bin, the search succeeds.
// In this case, we return the viable bin (rect_wh).

export function bestPackingForOrderingImpl(
  root: EmptySpaces,
  ordering: OutputRectType[],
  startingBin: RectWh,
  discardStep: number,
  triedDimension: BinDimension,
): RectWh | number {
  let localDiscardStep = discardStep;

  const candidateBin = startingBin.clone();
  let triesBeforeDiscarding = 0;

  if (localDiscardStep <= 0) {
    triesBeforeDiscarding = -localDiscardStep;
    localDiscardStep = 1;
  }

  let startingStep = 0;

  if (triedDimension === BinDimension.BOTH) {
    candidateBin.w /= 2;
    candidateBin.h /= 2;
  } else if (triedDimension === BinDimension.WIDTH) {
    candidateBin.w /= 2;
  } else {
    candidateBin.h /= 2;
  }
  startingStep = Math.floor(candidateBin.w / 2);

  for (
    let step = startingStep;
    ;
    step = Math.max(1, Math.floor(step / 2))
  ) {
    root.reset(candidateBin);

    let allInserted: boolean | undefined;
    let totalInsertedArea = 0;

    for (let i = 0; i < ordering.length; i += 1) {
      const rect = ordering[i];
      const rectWh = rect.getWh();
      const insertResult = root.insert(rectWh);

      if (insertResult) {
        totalInsertedArea += rect.area();
      } else {
        allInserted = false;
        break;
      }
    }

    if (allInserted !== false) {
      allInserted = true;
    }

    if (allInserted) {
      // Attempt was successful. Try with a smaller bin.
      if (step <= localDiscardStep) {
        if (triesBeforeDiscarding > 0) {
          triesBeforeDiscarding -= 1;
        } else {
          return candidateBin;
        }
      }

      if (triedDimension === BinDimension.BOTH) {
        candidateBin.w -= step;
        candidateBin.h -= step;
      } else if (triedDimension === BinDimension.WIDTH) {
        candidateBin.w -= step;
      } else {
        candidateBin.h -= step;
      }

      root.reset(candidateBin);

    // Attempt ended with failure. Try with a bigger bin.
    } else if (triedDimension === BinDimension.BOTH) {
      candidateBin.w += step;
      candidateBin.h += step;

      if (candidateBin.area() > startingBin.area()) {
        return totalInsertedArea;
      }
    } else if (triedDimension === BinDimension.WIDTH) {
      candidateBin.w += step;

      if (candidateBin.w > startingBin.w) {
        return totalInsertedArea;
      }
    } else {
      candidateBin.h += step;

      if (candidateBin.h > startingBin.h) {
        return totalInsertedArea;
      }
    }
  }
}

export function bestPackingForOrdering(
  root: EmptySpaces,
  ordering: OutputRectType[],
  startingBin: RectWh,
  discardStep: number,
) {
  const tryPack = (
    localTriedDimension: BinDimension,
    localStartingBin: RectWh,
  ) => bestPackingForOrderingImpl(
    root,
    ordering,
    localStartingBin,
    discardStep,
    localTriedDimension,
  );

  const bestResult = tryPack(BinDimension.BOTH, startingBin);
  const failed = typeof bestResult === 'number';
  if (failed) {
    return bestResult;
  }

  let bestBin: RectWh = bestResult;
  const trial = (localTriedDimension: BinDimension) => {
    if (typeof bestBin === 'number') {
      throw new Error('bestBin should not be a number');
    }

    const localTrial = tryPack(localTriedDimension, bestBin);
    const better = localTrial;
    if (typeof better !== 'number') {
      bestBin = better;
    }
  };

  trial(BinDimension.WIDTH);
  trial(BinDimension.HEIGHT);
  return bestBin;
}

export function findBestPackingImpl(
  forEachOrder: (it: (currentOrder: OutputRectType[]) => void) => void,
  input: FinderInput,
  allowFlip: boolean,
): RectWh {
  const maxBin = new RectWh(input.maxBinSide, input.maxBinSide);

  let bestOrder = null as OutputRectType[] | null;

  let bestTotalInserted = -1;
  let bestBin = maxBin.clone();
  /*
     *  The root node is re-used on the TLS.
     *  It is always reset before any packing attempt.
     */
  const root = new EmptySpaces(new RectWh(), !!allowFlip);
  root.flippingMode = input.flippingMode;

  forEachOrder(
    (currentOrder) => {
      const packing = bestPackingForOrdering(
        root,
        currentOrder,
        maxBin,
        input.discardStep,
      );

      const totalInserted = typeof packing === 'number' ? packing : 0;
      const resultBin = typeof packing !== 'number' ? packing : null;

      if (totalInserted) {
        // Track which function inserts the most area in total,
        // just in case that all orders will fail to fit into the largest allowed bin.
        if (bestOrder === null) {
          if (totalInserted > bestTotalInserted) {
            bestOrder = currentOrder;
            bestTotalInserted = totalInserted;
          }
        }
      } else if (resultBin) {
        /* Save the function if it performed the best. */
        if (resultBin.area() <= bestBin.area()) {
          bestOrder = currentOrder;
          bestBin = resultBin;
        }
      }
    },
  );

  if (bestOrder === null) {
    throw new Error('Best order should never be null!');
  }

  root.reset(bestBin);

  for (let i = 0; i < bestOrder.length; i += 1) {
    const rect = bestOrder[i];
    const ret = root.insert(rect.getWh());
    if (ret) {
      if ('x' in rect && 'x' in ret) {
        rect.x = ret.x;
        rect.y = ret.y;
        rect.w = ret.w;
        rect.h = ret.h;
      }

      if (CallbackResult.ABORT_PACKING === input.handleSuccessfulInsertion(rect)) {
        break;
      }
    } else if (CallbackResult.ABORT_PACKING === input.handleUnsuccessfulInsertion(rect)) {
      break;
    }
  }

  return root.currentAabb;
}
