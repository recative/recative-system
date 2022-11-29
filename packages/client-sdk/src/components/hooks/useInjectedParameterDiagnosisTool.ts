import * as React from 'react';
import debug from 'debug';

const log = debug('client:injector:diagnosis');

const logGroup = debug('client:injector:diagnosis');
// eslint-disable-next-line no-console
logGroup.log = console.groupCollapsed.bind(console);
// eslint-disable-next-line no-console
const endLogGroup = console.groupEnd;

const getDiffIcon = (a: unknown, b: unknown) => {
  return a === b ? '⭕️' : '❗️';
};

interface IDiffReport {
  icon: string;
  equal: boolean;
  diff: string[];
  oldValue: unknown;
  newValue: unknown;
}

const EMPTY_OBJ = {};

const extractKeys = (a: unknown, b: unknown) => {
  const internalA = (a || EMPTY_OBJ) as Record<string, unknown>;
  const internalB = (b || EMPTY_OBJ) as Record<string, unknown>;

  return [...new Set(
    [
      ...Object.keys(internalA),
      ...Object.keys(internalB),
    ],
  ).values()];
};

const listDiffKeys = (a: unknown, b: unknown) => {
  const result: string[] = [];

  const internalA = (a || EMPTY_OBJ) as Record<string, unknown>;
  const internalB = (b || EMPTY_OBJ) as Record<string, unknown>;

  const keys = extractKeys(internalA, internalB);

  keys.forEach((x) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (internalA[x] !== internalB[x]) {
      result.push(x);
    }
  });

  return result;
};

const reportDiff = (a: unknown, b: unknown) => {
  const reports: [string, IDiffReport][] = [];

  const internalA = (a || EMPTY_OBJ) as Record<string, unknown>;
  const internalB = (b || EMPTY_OBJ) as Record<string, unknown>;

  const keys = extractKeys(internalA, internalB);

  keys.forEach((k) => {
    if (internalA[k] === internalB[k]) {
      return;
    }

    reports.push(
      [
        k,
        {
          icon: getDiffIcon(internalA, internalB),
          equal: true,
          diff: listDiffKeys(internalA[k], internalA[k]),
          oldValue: internalA[k],
          newValue: internalB[k],
        },
      ],
    );
  });

  if (reports.length) {
    reports.forEach(([key, diffReport]) => {
      logGroup(key);
      log('Changed Keys', diffReport.diff);
      log('Old value', diffReport.oldValue);
      log('New value', diffReport.newValue);

      if (
        diffReport.diff.length
        && diffReport.newValue
        && diffReport.oldValue
        && typeof diffReport.newValue === 'object'
        && typeof diffReport.oldValue === 'object'
      ) {
        logGroup('Further more');
        reportDiff(diffReport.oldValue, diffReport.newValue);
        endLogGroup();
      }

      endLogGroup();
    });
  }
};

const INITIAL_DIFF_STATE = {
  icon: '❓',
  equal: true,
  diff: [],
  oldValue: undefined,
  newValue: undefined,
};

const useDiffAnalysis = (x: Record<string, unknown>, title: string) => {
  const oldValuesRef = React.useRef<Record<string, unknown>>({});
  const report = React.useRef<IDiffReport>(INITIAL_DIFF_STATE);

  React.useEffect(() => {
    const oldValues = oldValuesRef.current;
    oldValuesRef.current = x;

    logGroup(title);
    reportDiff(oldValues, x);
    endLogGroup();
  }, [title, x]);

  return report.current;
};

export const useInjectedParameterDiagnosisTool = (
  episodeId: unknown,
  episodeDetail: unknown,
  playerPropsHookProps: unknown,
  injectToSdk: unknown,
  injectToPlayer: unknown,
  injectToContainer: unknown,
) => {
  const inputProps = React.useMemo(() => ({
    episodeId,
    episodeDetail,
    playerPropsHookProps,
    injectToSdk,
    injectToPlayer,
    injectToContainer,
  }), [
    episodeDetail,
    episodeId,
    injectToContainer,
    injectToPlayer,
    injectToSdk,
    playerPropsHookProps,
  ]);

  useDiffAnalysis(inputProps, 'Injected parameter change(s) detected');
};
