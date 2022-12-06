import { registerPlugin } from '@capacitor/core';

import type { AnalysisPlugin } from './definitions';

const Analysis = registerPlugin<AnalysisPlugin>('Analysis');

export * from './definitions';
export { Analysis };


