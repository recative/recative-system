import debug from 'debug';

const log = debug('ap');

export const logBingAppToPlayerEvent = log.extend('bind-player');
export const logHostFunctionsHooks = log.extend('host-functions');
export const logResourceBridgeFunctionsHooks = log.extend('host-functions');
export const logProtocol = log.extend('protocol');
