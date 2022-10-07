import { aeqHelper, gtHelper, ltHelper } from './utils/helpers';

// wrapping in object to expose to default export for potential user override.
// warning: overriding these methods will override behavior for all db instances
// in memory.
// warning: if you use binary indices these comparators should be the same for
// all inserts/updates/removes.

export const gt = gtHelper;
export const lt = ltHelper;
export const aeq = aeqHelper;
