import { Database } from '../src';
import { PersistenceAdapterMode } from '../src/adapter/typings';
import { IFooBarTestRecord } from './definition';

const FOOBAR_DATA = [{ foo: '1' }, { foo: '2' }, { foo: '3' }];

const emptyIncrementalAdapter = {
  mode: PersistenceAdapterMode.Incremental,
  loadDatabase: () => Promise.resolve('{}'),
  saveDatabase: () => Promise.resolve(undefined),
  deleteDatabase: () => Promise.resolve(undefined),
};

describe('dirtyIds', () => {
  it('doesnt do anything unless using incremental adapters', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IFooBarTestRecord>('coll');

    const [, document2, document3] = collection.insert(FOOBAR_DATA);
    document2.bar = 'true';
    collection.update(document2);
    collection.remove(document3);

    expect(Reflect.get(collection, 'dirtyIds')).toEqual([]);
  });
  it('Database and db are incremental if adapter is incremental', () => {
    const database = new Database('test.db', {
      adapter: emptyIncrementalAdapter,
    });
    const collection = database.addCollection('coll');

    expect(database.isIncremental).toBe(true);
    expect(collection.isIncremental).toBe(true);
  });
  it('tracks inserts', () => {
    const database = new Database('test.db', {
      adapter: emptyIncrementalAdapter,
    });
    const collection = database.addCollection('coll');

    const document1 = collection.insert({ foo: '1' });

    expect(Reflect.get(collection, 'dirtyIds')).toEqual([document1.$loki]);
  });
  it('tracks updates', () => {
    const database = new Database('test.db', {
      adapter: emptyIncrementalAdapter,
    });
    const collection = database.addCollection<IFooBarTestRecord>('coll');

    const document1 = collection.insert({ foo: '1' });
    document1.bar = 'true';
    collection.update(document1);

    expect(Reflect.get(collection, 'dirtyIds')).toEqual([
      document1.$loki,
      document1.$loki,
    ]);
  });
  it('tracks deletes', () => {
    const database = new Database('test.db', {
      adapter: emptyIncrementalAdapter,
    });
    const collection = database.addCollection('coll');

    const document = collection.insert({ foo: '1' });
    const id = document.$loki;
    collection.remove(document);

    expect(Reflect.get(collection, 'dirtyIds')).toEqual([id, id]);
  });
  it('tracks many changes', () => {
    const database = new Database('test.db', {
      adapter: emptyIncrementalAdapter,
    });
    const collection = database.addCollection<IFooBarTestRecord>('coll');

    const [document1, document2, document3] = collection.insert(FOOBAR_DATA);
    const doc3id = document3.$loki;
    document2.bar = 'true';
    collection.update(document2);
    collection.remove(document3);

    expect(Reflect.get(collection, 'dirtyIds')).toEqual([
      document1.$loki,
      document2.$loki,
      doc3id,
      document2.$loki,
      doc3id,
    ]);
  });
});
