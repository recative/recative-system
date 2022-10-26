import * as React from 'react';

import type { ReadableAtom } from 'nanostores';

export const useLazyStore = <T>(x: ReadableAtom<T>) => {
  const [value, setValue] = React.useState<T>(x.get());
  const delayedValueRef = React.useRef<T | null>(null);

  const handleValueChange = React.useCallback((nextValue: T) => {
    delayedValueRef.current = nextValue;
  }, []);

  React.useEffect(() => {
    const unsubscribe = x.subscribe(handleValueChange);
    return () => unsubscribe();
  }, [handleValueChange, x]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (delayedValueRef.current) {
      setValue(delayedValueRef.current);
      delayedValueRef.current = null;
    }
  });

  return value;
};
