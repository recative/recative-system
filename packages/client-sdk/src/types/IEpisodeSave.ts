export interface IEpisodeSave {
  /**
   * @deprecated This is key for legacy implementation, use `order` instead.
   */
  idInOrder: number;
  /**
    * @deprecated This is key for legacy implementation, use `id` instead.
    */
  idInDatabase: string;
  /**
    * @deprecated This is key for legacy implementation, use `id` instead.
    */
  idInActServer?: string;
  title: Record<string, string>;
  hasPermission: boolean;
  unlocked: boolean;
  finished: boolean;
  assetStatus: {
    id: string;
    status: boolean;
  }[];
}
