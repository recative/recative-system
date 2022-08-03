import { getContext } from '../core/componentContext';

class ContextNotExistsError extends Error {
  name = 'CONTEXT_NOT_EXISTS';

  constructor() {
    super(
      'The context does not exist, make sure you are you calling hooks inside an `add` function or wrap it with `useCallback`.',
    );
  }
}

export const contextGuard = () => {
  const context = getContext();

  if (!context) {
    throw new ContextNotExistsError();
  }

  return context;
};
