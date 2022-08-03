export class WorkspaceNotReadyError extends Error {
  name = 'WorkspaceNotInitializedError';

  constructor() {
    super('Workspace was not initialized.');
  }
}

export class CodeRepositoryPathNotSetError extends Error {
  name = 'CodeRepositoryPathNotSetError';

  constructor() {
    super('The code repository path is not set.');
  }
}

export class TaskLockedError extends Error {
  name = 'TaskLockedError';

  constructor() {
    super('Previous task is working in progress, unable to start a new one.');
  }
}

export class WorkspaceLockedError extends Error {
  name = 'WorkspaceLockedError';

  constructor() {
    super('Workspace is locked, unable perform I/O operation.');
  }
}
