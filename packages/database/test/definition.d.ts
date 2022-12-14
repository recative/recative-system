export interface IPersonTestRecord {
  name: string;
  owner?: string;
  maker?: string | { name: string; count: number };
  count?: number;
  meta?: {};
}

export interface IABTestRecord {
  a: number;
  b?: unknown;
}

export interface IUnknownABTestRecord {
  a: unknown;
  b: unknown;
}

export interface INumericABTestRecord {
  a: number;
  b: number;
  c?: string;
}

export interface IIndexTestRecord {
  customIdx: number;
  originalIdx?: number;
  sequence?: number;
  desc?: string;
}

export interface IFooBarTestRecord {
  foo: string;
  bar?: string;
}

export interface IIdTestRecord {
  id: string;
}

export interface IFilmDirectoryTestRecord {
  name: string;
  directorId: number;
}

export interface IFilmTestRecord {
  title: string;
  filmId: number;
  directorId: number;
}

export interface ITreeTestRecord {
  text: string;
  value: string;
  id: number;
  order: number;
  parents_id: number[];
  level: number;
  open: boolean;
  checked: boolean;
}

export interface IUsernameRecord {
  username: string;
}

export interface INameValueTestRecord {
  name: string;
  val: number;
}

export interface IUserLanguageRecord {
  name: string;
  age?: number;
  lang?: string;
}

export interface IUserAddrRecord {
  first: string;
  last: string;
  addr?: {
    street?: string;
    state?: string;
    zip?: number;
  };
}

interface IIdStrFloatTestRecord {
  testId: number;
  testString: string;
  testFloat: number;
}
