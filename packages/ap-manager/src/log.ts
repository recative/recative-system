import debug from 'debug';

export const log = debug('ap-manager');

export const logHost = log.extend('host');
export const logClient = log.extend('ap');
