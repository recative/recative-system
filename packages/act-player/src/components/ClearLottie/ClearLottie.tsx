import * as React from 'react';
import Lottie from 'lottie-react';

import { ErrorBoundary } from 'react-error-boundary';
import type {
  LottieComponentProps,
  LottieRefCurrentProps,
} from 'lottie-react';

export const Fallback = () => <div />;

export const ClearLottie: React.FC<LottieComponentProps> = ({
  lottieRef,
  ...props
}) => {
  const fixerRef = React.useRef<LottieRefCurrentProps | null>(null);
  const mergedRef = React.useMemo(
    () => ({
      get current() {
        return fixerRef.current;
      },
      set current(x: LottieRefCurrentProps | null) {
        fixerRef.current = x;
        if (lottieRef?.current === undefined) return;
        if (typeof lottieRef === 'function') {
          (lottieRef as unknown as (x: LottieRefCurrentProps | null) => void)(x);
          return;
        }
        if (typeof lottieRef === 'object' && lottieRef.current !== null) {
          lottieRef.current = x;
        }
      },
    }),
    [lottieRef],
  );

  React.useEffect(() => {
    return () => {
      fixerRef.current?.destroy();
    };
  }, []);

  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <Lottie lottieRef={mergedRef} {...props} />
    </ErrorBoundary>
  );
};
