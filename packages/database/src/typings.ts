import { DotNotation, DotNotationValue } from '@recative/lens';
import type { Operator, QueryEntry } from './Operations';

export type IQuery<Document> = Partial<{
  [Key in DotNotation<Document>]:
    | Partial<{
        [Op in Operator]: QueryEntry<DotNotationValue<Document, Key>>[Op];
      }>
    | DotNotationValue<Document, Key>;
}>;

export type JoinKeyFunction<T> = (x: T) => keyof T | number;

export interface IDefaultEqJoinR0<T> {
  left: T;
  right: T;
}

export interface AnyRecord {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
