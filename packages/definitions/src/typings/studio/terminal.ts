export type StepName = string;

export enum TerminalStepStatus {
  Working = 'working',
  Success = 'success',
  Failed = 'failed',
  Idle = 'idle',
}

export enum TerminalMessageLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface ITerminalMessage {
  level: TerminalMessageLevel;
  message: string | [string, string];
}

export interface ITerminal {
  steps: Record<StepName, TerminalStepStatus>;
  messages: ITerminalMessage[];
}
