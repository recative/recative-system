export interface IEpisodeSave {
  idInOrder: number;
  idInDatabase: string;
  idInActServer: string;
  title: Record<string, string>;
  hasPermission: boolean;
  unlocked: boolean;
  finished: boolean;
  assetStatus: {
    id: string;
    status: boolean;
  }[];
}
