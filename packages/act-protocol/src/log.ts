import debug from 'debug';

export const log = debug('protocol');

export const logHost = log.extend('host');
export const logClient = log.extend('client');
export const logConnector = log.extend('connector');
