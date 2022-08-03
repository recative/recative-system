import debug from 'debug';

export const log = debug('resource-bridge');

export const logActPoint = log.extend('ap');
export const logServiceWorker = log.extend('sw');
export const logActPointChannel = log.extend('ap-channel');
export const logServiceWorkerChannel = log.extend('sw-channel');
export const logConnector = log.extend('connector');
