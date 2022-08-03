import * as React from 'react';

import type { ReadableAtom } from 'nanostores';

export const useBugFreeStore = <T>(x: ReadableAtom<T>) => {
  const [value, setValue] = React.useState<T>(x.get());

  React.useEffect(() => {
    const unsubscribe = x.subscribe(setValue);
    return () => unsubscribe();
  }, [x]);

  return value;
};
