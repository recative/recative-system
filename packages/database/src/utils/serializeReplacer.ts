/**
 * serializeReplacer - used to prevent certain properties from being serialized
 */

export const serializeReplacer = (key: string, value: unknown) => {
  switch (key) {
    case 'autosaveHandle':
    case 'persistenceAdapter':
    case 'constraints':
    case 'ttl':
      return null;
    case 'throttledSavePending':
    case 'throttledCallbacks':
    case '$unobserved':
      return undefined;
    case 'lokiConsoleWrapper':
      return null;
    default:
      return value;
  }
};
