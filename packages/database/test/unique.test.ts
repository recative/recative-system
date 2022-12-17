import { Database } from '../src';
import { hasOwn } from '../src/utils/hasOwn';

interface ITestRecord {
  username: string;
  name: string;
}

interface ILegsTestRecord {
  name: string;
  legs: number;
}

describe('Constraints', () => {
  it('should retrieve records with by()', () => {
    const database = new Database();
    const collection = database.addCollection<ITestRecord>('users', {
      unique: ['username'],
    });
    collection.insert({
      username: 'joe',
      name: 'Joe',
    });
    collection.insert({
      username: 'jack',
      name: 'Jack',
    });
    expect(collection.by('username', 'joe').name).toEqual('Joe');

    const byUsername = collection.by('username');
    expect(byUsername('jack').name).toEqual('Jack');

    const joe = collection.by('username', 'joe');
    joe.username = 'jack';
    expect(() => {
      collection.update(joe);
    }).toThrow(
      new Error(`Duplicate key for property username: ${joe.username}`)
    );
    joe.username = 'jim';
    collection.update(joe);
    expect(byUsername('jim')).toEqual(joe);
  });

  it('should create a unique index', () => {
    const database = new Database();
    const collection = database.addCollection('moreUsers');
    collection.insert({
      name: 'jack',
    });
    collection.insert({
      name: 'tim',
    });
    collection.ensureUniqueIndex('name');
  });

  it('should not add record with null index', () => {
    const database = new Database();
    const collection = database.addCollection('nullUsers', {
      unique: ['username'],
    });
    collection.insert({
      username: 'joe',
      name: 'Joe',
    });
    collection.insert({
      username: null,
      name: 'Jack',
    });
    expect(
      Object.keys(collection.constraints.unique.username.keyMap).length
    ).toEqual(1);
  });

  it('should not throw an error id multiple nulls are added', () => {
    const database = new Database();
    const collection = database.addCollection('moreNullUsers', {
      unique: ['username'],
    });
    collection.insert({
      username: 'joe',
      name: 'Joe',
    });
    collection.insert({
      username: null,
      name: 'Jack',
    });
    collection.insert({
      username: null,
      name: 'Jake',
    });
    expect(
      Object.keys(collection.constraints.unique.username.keyMap).length
    ).toEqual(1);
  });

  it('coll.clear should affect unique indices correctly', () => {
    const database = new Database();
    const collection = database.addCollection('users', {
      unique: ['username'],
    });

    collection.insert({ username: 'joe', name: 'Joe' });
    collection.insert({ username: 'jack', name: 'Jack' });
    collection.insert({ username: 'jake', name: 'Jake' });
    expect(
      Object.keys(collection.constraints.unique.username.keyMap).length
    ).toEqual(3);
    expect(collection.uniqueNames.length).toEqual(1);
    collection.clear();
    expect(collection.constraints.unique.username).toBe(undefined);
    collection.insert({ username: 'joe', name: 'Joe' });
    collection.insert({ username: 'jack', name: 'Jack' });
    expect(
      Object.keys(collection.constraints.unique.username.keyMap).length
    ).toEqual(2);
    collection.insert({ username: 'jake', name: 'Jake' });
    expect(
      Object.keys(collection.constraints.unique.username.keyMap).length
    ).toEqual(3);
    expect(collection.uniqueNames.length).toEqual(1);

    const database1 = new Database();
    const collection1 = database1.addCollection<ITestRecord>('users', {
      unique: ['username'],
    });

    collection1.insert({ username: 'joe', name: 'Joe' });
    collection1.insert({ username: 'jack', name: 'Jack' });
    collection1.insert({ username: 'jake', name: 'Jake' });
    expect(
      Object.keys(collection1.constraints.unique.username.keyMap).length
    ).toEqual(3);
    expect(collection1.uniqueNames.length).toEqual(1);
    collection1.clear({ removeIndices: true });
    expect(hasOwn(collection1.constraints.unique, 'username')).toEqual(false);
    expect(collection1.uniqueNames.length).toEqual(0);
    collection1.insert({ username: 'joe', name: 'Joe' });
    collection1.insert({ username: 'jack', name: 'Jack' });
    collection1.insert({ username: 'jake', name: 'Jake' });
    expect(hasOwn(collection1.constraints.unique, 'username')).toEqual(false);
    expect(collection1.uniqueNames.length).toEqual(0);
  });

  it('batch removes should update unique constraints', () => {
    const data = [
      { name: 'Svelte', legs: 8 },
      { name: 'Joe', legs: 0 },
      { name: 'Hel', legs: 2 },
    ];

    const db = new Database('test.db');
    const collection = db.addCollection('children', {
      unique: ['name'],
    });

    data.forEach((c) => {
      collection.insert(JSON.parse(JSON.stringify(c)));
    });

    collection.findAndRemove({});

    // reinsert 2 of the 3 original docs
    // implicitly 'expecting' that this will not throw exception on Duplicate key for property name(s)
    collection.insert(JSON.parse(JSON.stringify(data[0])));
    collection.insert(JSON.parse(JSON.stringify(data[1])));

    const keys = Object.keys(collection.constraints.unique.name.keyMap);
    expect(keys.length).toEqual(3);
    keys.sort();
    // seems we don't delete the key but set its value to undefined
    expect(keys[0]).toEqual('Hel');
    expect(
      typeof collection.constraints.unique.name.keyMap.Hel === 'undefined'
    ).toEqual(true);
    // the rest were re-added so they should not only exist but be undefined
    expect(keys[1]).toEqual('Joe');
    expect(
      typeof collection.constraints.unique.name.keyMap.Joe === 'undefined'
    ).toEqual(false);
    expect(keys[2]).toEqual('Svelte');
    expect(
      typeof collection.constraints.unique.name.keyMap.Svelte === 'undefined'
    ).toEqual(false);
  });

  it('chained batch updates should update constraints', () => {
    const documents: ILegsTestRecord[] = [
      { name: 'Svelte', legs: 8 },
      { name: 'Joe', legs: 0 },
      { name: 'Hel', legs: 2 },
    ];

    const database = new Database('test.db');
    const collection = database.addCollection<ILegsTestRecord>('children', {
      unique: ['name'],
    });

    documents.forEach((c) => {
      collection.insert(JSON.parse(JSON.stringify(c)));
    });

    collection.chain().update((obj) => {
      obj.name = `${obj.name}2`;
    });

    // implicitly 'expecting' that this will not throw exception on Duplicate key for property name: Svelte
    documents.forEach((c) => {
      collection.insert(JSON.parse(JSON.stringify(c)));
    });

    const keys = Object.keys(collection.constraints.unique.name.keyMap);
    expect(keys.length).toEqual(6);
    keys.sort();
    expect(keys[0]).toEqual('Hel');
    expect(keys[1]).toEqual('Hel2');
    expect(keys[2]).toEqual('Joe');
    expect(keys[3]).toEqual('Joe2');
    expect(keys[4]).toEqual('Svelte');
    expect(keys[5]).toEqual('Svelte2');
  });

  it('batch updates should update constraints', () => {
    const data: ILegsTestRecord[] = [
      { name: 'Svelte', legs: 8 },
      { name: 'Joe', legs: 0 },
      { name: 'Hel', legs: 2 },
    ];

    const database = new Database('test.db');
    const collection = database.addCollection<ILegsTestRecord>('children', {
      unique: ['name'],
    });

    // batch insert docs
    const documents = collection.insert(
      JSON.parse(JSON.stringify(data)) as ILegsTestRecord[]
    );

    // batch update docs (by passing array to collection.update())
    documents.forEach((obj) => {
      obj.name = `${obj.name}2`;
    });
    collection.update(documents);

    // reinsert originals (implicitly 'expecting' that this will not throw exception on Duplicate key)
    collection.insert(data);

    const keys = Object.keys(collection.constraints.unique.name.keyMap);
    expect(keys.length).toEqual(6);
    keys.sort();
    expect(keys[0]).toEqual('Hel');
    expect(keys[1]).toEqual('Hel2');
    expect(keys[2]).toEqual('Joe');
    expect(keys[3]).toEqual('Joe2');
    expect(keys[4]).toEqual('Svelte');
    expect(keys[5]).toEqual('Svelte2');
  });
  it('should not crash on unsafe strings', () => {
    interface ILocalStorageTestRecord {
      key: string;
      name: string;
    }

    const database = new Database();
    const collection = database.addCollection<ILocalStorageTestRecord>(
      'local_storage',
      {
        unique: ['key'],
      }
    );
    expect(collection.by('key', 'hasOwnProperty')).toBe(undefined);
    collection.insert({ key: 'hasOwnProperty', name: 'hey' });
    expect(collection.by('key', 'hasOwnProperty').name).toBe('hey');
  });
});
