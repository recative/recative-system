export interface IWorkspaceConfiguration {
  mediaWorkspacePath: string;
  codeRepositoryPath?: string;
  mediaPath: string;
  dbPath: string;
  buildPath: string;
  assetsPath: string;
  readonly: boolean;
}
