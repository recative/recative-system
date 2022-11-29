import { Database, ICollectionChange } from '../../src';

import { IPersonTestRecord } from './definition';

describe('changesApi', () => {
  it('Does what it says on the tin', () => {
    const database = new Database();
    const options = {
      asyncListeners: false,
      disableChangesApi: false,
    };
    const usersCollection = database.addCollection<IPersonTestRecord>(
      'users',
      options
    );
    const testCollection = database.addCollection('test', options);
    const test2Collection = database.addCollection('test2', options);

    const user = usersCollection.insert({
      name: 'joe',
    });
    user.name = 'jack';
    usersCollection.update(user);
    testCollection.insert({
      name: 'test',
    });
    test2Collection.insert({
      name: 'test2',
    });

    const userChanges = database.generateChangesNotification(['users']);

    expect(userChanges.length).toEqual(2);
    expect(database.serializeChanges(['users'])).toEqual(
      JSON.stringify(userChanges)
    );

    const someChanges = database.generateChangesNotification([
      'users',
      'test2',
    ]);

    expect(someChanges.length).toEqual(3);
    const allChanges = database.generateChangesNotification();

    expect(allChanges.length).toEqual(4);
    usersCollection.setChangesApi(false);
    expect(usersCollection.disableChangesApi).toEqual(true);

    user.name = 'john';
    usersCollection.update(user);
    const newChanges = database.generateChangesNotification(['users']);

    expect(newChanges.length).toEqual(2);
    database.clearChanges();

    expect(usersCollection.getChanges().length).toEqual(0);

    user.name = 'jim';
    usersCollection.update(user);
    usersCollection.flushChanges();

    expect(usersCollection.getChanges().length).toEqual(0);
  });

  it('works with delta mode', () => {
    const database = new Database();
    const options = {
      asyncListeners: false,
      disableChangesApi: false,
      disableDeltaChangesApi: false,
    };
    const items = database.addCollection<IPersonTestRecord>('items', options);

    // Add some documents to the collection
    items.insert({
      name: 'mjolnir',
      owner: 'thor',
      maker: { name: 'dwarves', count: 1 },
    });
    items.insert({
      name: 'gungnir',
      owner: 'odin',
      maker: { name: 'elves', count: 1 },
    });
    items.insert({
      name: 'tyrfing',
      owner: 'Svafrlami',
      maker: { name: 'dwarves', count: 1 },
    });
    items.insert({
      name: 'draupnir',
      owner: 'odin',
      maker: { name: 'elves', count: 1 },
    });

    // Find and update an existing document
    const user = items.findOne({ name: 'tyrfing' });
    if (!user) {
      throw new TypeError(`User not found`);
    }

    user.owner = 'arngrim';
    items.update(user);
    if (!user.maker || typeof user.maker === 'string') {
      throw new TypeError(`Incorrect type of the maker field`);
    }

    user.maker.count = 4;
    items.update(user);

    const changes: ICollectionChange<IPersonTestRecord>[] = JSON.parse(
      database.serializeChanges(['items'])
    );

    expect(changes.length).toEqual(6);

    const firstUpdate = changes[4];
    expect(firstUpdate.operation).toEqual('U');
    expect(firstUpdate.object.owner).toEqual('arngrim');
    expect(firstUpdate.object.name).toBeUndefined();

    const secondUpdate = changes[5];
    expect(secondUpdate.operation).toEqual('U');
    expect(secondUpdate.object.owner).toBeUndefined();
    expect(secondUpdate.object.maker).toEqual({ count: 4 });
  });

  it('batch operations work with delta mode', () => {
    const db = new Database();
    const options = {
      asyncListeners: false,
      disableChangesApi: false,
      disableDeltaChangesApi: false,
    };
    const items = db.addCollection<IPersonTestRecord>('items', options);

    // Add some documents to the collection
    items.insert([
      { name: 'mjolnir', owner: 'thor', maker: 'dwarves', count: 0 },
      { name: 'gungnir', owner: 'odin', maker: 'elves', count: 0 },
      { name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves', count: 0 },
      { name: 'draupnir', owner: 'odin', maker: 'elves', count: 0 },
    ]);

    items.chain().update((document) => {
      document.count = document.count ? document.count + 1 : 1;
    });

    const changes: ICollectionChange<IPersonTestRecord>[] = JSON.parse(
      db.serializeChanges(['items'])
    );

    expect(changes.length).toEqual(8);

    expect(changes[0].name).toEqual('items');
    expect(changes[0].operation).toEqual('I');
    expect(changes[1].name).toEqual('items');
    expect(changes[1].operation).toEqual('I');
    expect(changes[2].name).toEqual('items');
    expect(changes[2].operation).toEqual('I');
    expect(changes[3].name).toEqual('items');
    expect(changes[3].operation).toEqual('I');

    expect(changes[4].name).toEqual('items');
    expect(changes[4].operation).toEqual('U');
    expect(changes[4].object.count).toEqual(1);
    expect(changes[5].name).toEqual('items');
    expect(changes[5].operation).toEqual('U');
    expect(changes[5].object.count).toEqual(1);
    expect(changes[6].name).toEqual('items');
    expect(changes[6].operation).toEqual('U');
    expect(changes[6].object.count).toEqual(1);
    expect(changes[7].name).toEqual('items');
    expect(changes[7].operation).toEqual('U');
    expect(changes[7].object.count).toEqual(1);

    const keys = Object.keys(changes[7].object);
    keys.sort();
    expect(keys[0]).toEqual('$loki');
    expect(keys[1]).toEqual('count');
    expect(keys[2]).toEqual('meta');
  });
});
