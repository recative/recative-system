import type { Operator, QueryEntry } from './Operations';

export type IQuery<Document> = Partial<{
  [Key in keyof Document]:
    | Partial<{
        [Op in Operator]: QueryEntry<Document[Key]>[Op];
      }>
    | Document[Key];
}>;

export type JoinKeyFunction<T> = (x: T) => keyof T | number;

export interface IDefaultEqJoinR0<T> {
  left: T;
  right: T;
}
