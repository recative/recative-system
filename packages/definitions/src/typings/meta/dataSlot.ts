export interface IDataSlot {
  readonly id: string;
  type: string;
  slug: string;
  notes: string;
  public: boolean;
  multipleRecord: boolean;
  createTime: number;
  updateTime: number;
}
