/* eslint-disable max-classes-per-file */
import debug from 'debug';
import { atom } from 'nanostores';
import EventTarget from '@ungap/event-target';

import type { Debugger } from 'debug';

export enum LogLevel {
  Log = 'log',
  Debug = 'debug',
  Info = 'info',
  Error = 'error',
  Warn = 'warn',
}

interface ILogItem {
  level: LogLevel;
  domain: string;
  message: string;
}

const formatMessage = (messages: unknown[]) =>
  messages.map((message) => {
    if (Object.prototype.toString.call(message) === '[object Error]') {
      const EMessage = message as Error;
      return `${EMessage.name}: ${EMessage.message}`;
    }
    if (typeof message === 'object') {
      return JSON.stringify(message, null, 2);
    }
    if (typeof message === 'undefined') {
      return 'undefined';
    }
    if (
      typeof message === 'string' ||
      typeof message === 'number' ||
      typeof message === 'boolean' ||
      typeof message === 'function'
    ) {
      return message.toString();
    }
    return Object.prototype.toString.call(message);
  });

export interface Logger {
  (...messages: unknown[]): void;
  error: (messages: unknown) => void;
  extend: (domain: string, level?: LogLevel) => Logger;
  collectError: <T extends Function>(fn: T) => T;
  domainStr: string;
  domain: string[];
}

export class LogCollector extends EventTarget {
  private debugLogger: Debugger;

  constructor(rootDomain: string, debugLogger?: Debugger) {
    super();

    this.debugLogger = debugLogger || debug(rootDomain);
  }

  store = atom<ILogItem[]>([]);

  Logger = (
    domain: string,
    level: LogLevel = LogLevel.Debug,
    debugLogger = this.debugLogger.extend(domain)
  ) => {
    const logger: Logger = (...messages: unknown[]) => {
      // @ts-ignore: Incorrect typing, maybe
      debugLogger(...messages);

      const formatted = formatMessage(messages);

      this.store.set([
        ...this.store.get(),
        { domain, level, message: formatted.join('\t') },
      ]);
    };

    logger.domain = [domain];
    logger.domainStr = domain;

    logger.extend = (nestedDomain, nestedLevel = level) => {
      const result = this.Logger(
        nestedDomain,
        nestedLevel,
        debugLogger.extend(nestedDomain)
      );

      result.domain = [...logger.domain, nestedDomain];
      result.domainStr = `${logger.domainStr} -> ${nestedDomain}`;

      return result;
    };

    logger.error = (message) => {
      const formatted = formatMessage([message]);

      this.store.set([
        ...this.store.get(),
        { domain, level: LogLevel.Error, message: formatted.join('\t') },
      ]);

      const event = new CustomEvent('error', {
        bubbles: true,
        cancelable: true,
        detail: message,
      });
      this.dispatchEvent(event);

      if (!event.defaultPrevented) {
        throw message;
      }
    };

    logger.collectError = <T extends Function>(fn: T) => {
      const wrappedError = (...args: unknown[]) => {
        let result;
        try {
          result = fn(...args);

          if (result instanceof Promise) {
            return result.catch((error) => {
              logger.error(error);
            });
          }
        } catch (error) {
          logger.error(error);
        }

        return result;
      };

      return wrappedError as unknown as T;
    };

    return logger;
  };
}

const defaultLogger: Logger = (...messages) => {
  console.debug(messages);
};

defaultLogger.extend = () => {
  console.warn('Unable to extend default logger');
  return defaultLogger;
};
defaultLogger.error = (message) => {
  throw message;
};
defaultLogger.collectError = <T extends Function>(fn: T) => fn;
defaultLogger.domainStr = 'default';
defaultLogger.domain = ['default'];

export class WithLogger {
  logger: Logger = defaultLogger;

  protected log = (...message: unknown[]) => {
    this.logger(...message);
  };

  protected error = (message: unknown) => {
    this.logger(message);
  };
}
