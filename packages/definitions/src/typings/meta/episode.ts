export interface IEpisode {
  readonly id: string;
  label: Record<string, string>;
  order: number;
  largeCoverResourceId?: string;
  createTime: number;
  updateTime: number;
}
