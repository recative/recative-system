import {
  RectXywh,
  FinderInput,
  reportResult,
  CallbackResult,
  FlippingOption,
  findBestPacking,
} from './index';

const reportSuccessful = () => CallbackResult.CONTINUE_PACKING;
const reportUnsuccessful = () => CallbackResult.ABORT_PACKING;

const runtimeFlippingMode = FlippingOption.ENABLED;
const maxSide = 1000;
const discardStep = -4;

const rectangles = [
  new RectXywh(0, 0, 20, 40),
  new RectXywh(0, 0, 120, 40),
  new RectXywh(0, 0, 85, 59),
  new RectXywh(0, 0, 199, 380),
  new RectXywh(0, 0, 85, 875),
];

export const main = () => {
  const findBestPackingResult = findBestPacking(
    rectangles,
    new FinderInput(
      maxSide,
      discardStep,
      reportSuccessful,
      reportUnsuccessful,
      runtimeFlippingMode,
    ),
  );

  reportResult(rectangles, findBestPackingResult);
};

main();
