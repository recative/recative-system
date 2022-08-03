import * as React from 'react';

export const useRandomId = (prefix = 'r-') => React.useMemo(() => prefix + Math.random().toString(36).substring(2), []);
