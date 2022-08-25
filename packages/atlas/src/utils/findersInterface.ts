import { RectWh } from './rectStructs';
import { FlippingOption } from './emptySpaces';
import { findBestPackingImpl } from './bestBinFinder';

import { CallbackResult } from '../constants/CallbackResult';

import type { OutputRectType } from './emptySpaces';

type StatusHandler = (x: OutputRectType) => CallbackResult;

export class FinderInput {
  constructor(
    public readonly maxBinSide: number,
    public readonly discardStep: number,
    public readonly handleSuccessfulInsertion: StatusHandler,
    public readonly handleUnsuccessfulInsertion: StatusHandler,
    public readonly flippingMode: FlippingOption,
  ) {}
}

/**
 * @param subjects The list of subjects to pack
 * @param input The input to use for packing
 */
export function findBestPackingDontSort(
  subjects: Array<OutputRectType>,
  input: FinderInput,
  allowFlip: boolean,
): RectWh {
  const order = subjects;
  return findBestPackingImpl(
    (callback: (subjects: Array<OutputRectType>) => void) => {
      callback(order);
    },
    input,
    allowFlip,
  );
}

type Comparator = (r1: OutputRectType, r2: OutputRectType) => 1 | -1 | 0;

const defaultComparators: Comparator[] = [
  (a: OutputRectType, b: OutputRectType) => {
    if (a.area() > b.area()) return -1;
    if (a.area() < b.area()) return 1;
    return 0;
  },
  (a: OutputRectType, b: OutputRectType) => {
    if (a.perimeter() > b.perimeter()) return -1;
    if (a.perimeter() < b.perimeter()) return 1;
    return 0;
  },
  (a: OutputRectType, b: OutputRectType) => {
    if (Math.max(a.w, a.h) > Math.max(b.w, b.h)) return -1;
    if (Math.max(a.w, a.h) < Math.max(b.w, b.h)) return 1;
    return 0;
  },
  (a: OutputRectType, b: OutputRectType) => {
    if (a.w > b.w) return -1;
    if (a.w < b.w) return 1;
    return 0;
  },
  (a: OutputRectType, b: OutputRectType) => {
    if (a.h > b.h) return -1;
    if (a.h < b.h) return 1;
    return 0;
  },
  (a: OutputRectType, b: OutputRectType) => {
    if (a.getWh().pathologicalMult() > b.getWh().pathologicalMult()) return -1;
    if (a.getWh().pathologicalMult() < b.getWh().pathologicalMult()) return 1;
    return 0;
  },
];

/**
 * Find the best packing of a set of rectangles, given a set of rectangles and a set of packing
 * criteria.
 * @param subjects The rectangles to pack.
 * @param input The input data for the algorithm.
 * @param comparators The comparators to use.
 * @returns The best packing of the given rectangles.
 */
export function findBestPacking(
  subjects: Array<OutputRectType>,
  input: FinderInput,
  allowFlip = true,
  ...comparators: Comparator[]
): RectWh {
  const trueComparators = comparators.length ? comparators : defaultComparators;
  const countOrders = trueComparators.length;
  const orders: OutputRectType[][] = new Array<OutputRectType[]>(countOrders);

  // `order[0]` will always exist since this overload requires at least one comparator.
  const initialPointers: Array<OutputRectType> = [] as OutputRectType[];

  for (let i = 0; i < subjects.length; i += 1) {
    const s = subjects[i];

    if (s.area() > 0) {
      initialPointers.push(s);
    }
  }

  for (let i = 0; i < countOrders; i += 1) {
    orders[i] = [...initialPointers].sort(trueComparators[i]);
  }

  return findBestPackingImpl(
    (callback: (order: Array<OutputRectType>) => void) => {
      for (let i = 0; i < orders.length; i += 1) {
        callback(orders[i]);
      }
    },
    input,
    allowFlip,
  );
}
