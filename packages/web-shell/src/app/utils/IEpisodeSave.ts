export interface IEpisodeSave {
  id: string;
  order: number;
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
  idInActServer: string;
  title: Record<string, string>;
  assetStatus: {
    id: string;
    status: boolean;
  }[];
}
