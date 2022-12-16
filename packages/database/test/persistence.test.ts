/* eslint-disable class-methods-use-this */
import { hasOwn } from '../src/utils/hasOwn';
import { MemoryAdapter } from '../src/adapter/memory';
import { PartitioningAdapter } from '../src/adapter/partitioning';
import { Collection, Database, SerializationMethod } from '../src';

import {
  IABTestRecord,
  INameValueTestRecord,
  IPersonTestRecord,
  IUsernameRecord,
} from './definition';
import { PersistenceAdapterMode } from '../src/adapter/typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalDatabase: Database<any>;
declare const users: Collection<IUsernameRecord>;

describe('testing unique index serialization', () => {
  beforeEach(() => {
    globalThis.database = new Database();
    globalThis.users = globalDatabase.addCollection<IUsernameRecord>('users');
    users.insert([
      {
        username: 'joe',
      },
      {
        username: 'jack',
      },
      {
        username: 'john',
      },
      {
        username: 'jim',
      },
    ]);
    users.ensureUniqueIndex('username');
  });

  it('should have a unique index', () => {
    const ser = globalDatabase.serialize();
    const reloaded = new Database();

    reloaded.loadJSON(ser);

    expect(users.data.length).toEqual(4);

    const joe = users.by('username', 'joe');
    expect(joe).toBeDefined();
    expect(joe.username).toEqual('joe');
    expect(users.constraints.unique.username).toBeDefined();

    expect(reloaded.options.serializationMethod).toBe('normal');
    expect(reloaded.options.destructureDelimiter).toBe('$<\n');
  });
});

describe('testing disable meta serialization', () => {
  beforeEach(() => {
    globalThis.database = new Database();
    globalThis.users = globalDatabase.addCollection('users', {
      disableMeta: true,
    });
  });

  it('should have meta disabled', () => {
    const ser = globalDatabase.serialize();
    const reloaded = new Database();
    reloaded.loadJSON(ser);
    expect(users.disableMeta).toEqual(true);
  });
});

describe('testing destructured serialization/deserialization', () => {
  it('verify default (D) destructuring works as expected', () => {
    const database1 = new Database('test.db', {
      serializationMethod: SerializationMethod.Destructured,
    });
    const collection1 = database1.addCollection('testCollection');
    collection1.insert({
      name: 'test1',
      val: 100,
    });
    collection1.insert({
      name: 'test2',
      val: 101,
    });
    collection1.insert({
      name: 'test3',
      val: 102,
    });

    const collection2 = database1.addCollection('another');
    collection2.insert({
      a: 1,
      b: 2,
    });

    const destructuredJson = database1.serialize();

    const database2 = new Database('test.db', {
      serializationMethod: SerializationMethod.Destructured,
    });
    database2.loadJSON(destructuredJson);

    expect(database2.options.serializationMethod).toEqual('destructured');
    expect(database2.collections.length).toEqual(2);
    expect(database2.collections[0].data.length).toEqual(3);
    expect(database2.collections[0].data[0].val).toEqual(
      database1.collections[0].data[0].val
    );
    expect(database2.collections[1].data.length).toEqual(1);
    expect(database2.collections[1].data[0].a).toEqual(
      database1.collections[1].data[0].a
    );
  });

  // Destructuring Formats :
  // D: one big Delimited string { partitioned: false, delimited : true }
  // DA: Delimited Array of strings [0] db [1] collection [n] collection { partitioned: true, delimited: true }
  // NDA: Non-Delimited Array : one iterable array with empty string collection partitions { partitioned: false, delimited: false }
  // NDAA: Non-Delimited Array with subArrays. db at [0] and collection sub-arrays at [n] { partitioned: true, delimited : false }

  it('verify custom destructuring works as expected', () => {
    const database = new Database('test.db');
    const collection = database.addCollection('testCollection');
    collection.insert({
      name: 'test1',
      val: 100,
    });
    collection.insert({
      name: 'test2',
      val: 101,
    });
    collection.insert({
      name: 'test3',
      val: 102,
    });

    const coll2 = database.addCollection('another');
    coll2.insert({
      a: 1,
      b: 2,
    });

    [
      {},
      { partitioned: false, delimited: true },
      { partitioned: true, delimited: true },
      { partitioned: false, delimited: false },
      { partitioned: true, delimited: false },
    ].forEach((options) => {
      // do custom destructuring
      const destructed = database.serializeDestructured(options);

      // reinflate from custom destructuring
      const internalDatabase = new Database('test.db');
      const reInflateDatabase = internalDatabase.deserializeDestructured(
        destructed,
        options
      );

      internalDatabase.loadJSONObject(reInflateDatabase);

      // assert expectations on reinflated database
      expect(internalDatabase.collections.length).toEqual(2);
      expect(internalDatabase.collections[0].data.length).toEqual(3);
      expect(internalDatabase.collections[0].data[0].val).toEqual(
        database.collections[0].data[0].val
      );
      expect(internalDatabase.collections[0].data[0].$loki).toEqual(
        database.collections[0].data[0].$loki
      );
      expect(internalDatabase.collections[0].data[2].$loki).toEqual(
        database.collections[0].data[2].$loki
      );
      expect(internalDatabase.collections[1].data.length).toEqual(1);
      expect(internalDatabase.collections[1].data[0].a).toEqual(
        database.collections[1].data[0].a
      );
    });
  });

  it('verify individual partitioning works correctly', () => {
    const database1 = new Database('test.db');
    const collection1 =
      database1.addCollection<INameValueTestRecord>('testCollection');
    collection1.insert({
      name: 'test1',
      val: 100,
    });
    collection1.insert({
      name: 'test2',
      val: 101,
    });
    collection1.insert({
      name: 'test3',
      val: 102,
    });

    const collection2 = database1.addCollection('another');
    collection2.insert({
      a: 1,
      b: 2,
    });

    // Verify db alone works correctly using NDAA format
    let result = database1.serializeDestructured({
      partitioned: true,
      delimited: false,
      partition: -1, // indicates to get serialized db container only
    }) as string;

    const database2 = new Database('test');
    database2.loadJSON(result);

    expect(database2.collections.length).toEqual(2);
    expect(database2.collections[0].data.length).toEqual(0);
    expect(database2.collections[1].data.length).toEqual(0);
    expect(database2.collections[0].name).toEqual(
      database1.collections[0].name
    );
    expect(database2.collections[1].name).toEqual(
      database1.collections[1].name
    );

    // Verify collection alone works correctly using NDAA format
    result = database1.serializeDestructured({
      partitioned: true,
      delimited: false,
      partition: 0, // collection [0] only
    }) as string;

    // we don't need to test all components of reassembling whole database
    // so we will just call helper function to deserialize just collection data
    let data = database1.deserializeCollection<INameValueTestRecord>(result, {
      partitioned: true,
      delimited: false,
    });

    expect(data.length).toEqual(database1.collections[0].data.length);
    expect(data[0].val).toEqual(database1.collections[0].data[0].val);
    expect(data[1].val).toEqual(database1.collections[0].data[1].val);
    expect(data[2].val).toEqual(database1.collections[0].data[2].val);
    expect(data[0].$loki).toEqual(database1.collections[0].data[0].$loki);
    expect(data[1].$loki).toEqual(database1.collections[0].data[1].$loki);
    expect(data[2].$loki).toEqual(database1.collections[0].data[2].$loki);

    // Verify collection alone works correctly using DA format (the other partitioned format)
    result = database1.serializeDestructured({
      partitioned: true,
      delimited: true,
      partition: 0, // collection [0] only
    }) as string;

    // now reinflate from that interim DA format
    data = database1.deserializeCollection(result, {
      partitioned: true,
      delimited: true,
    });

    expect(data.length).toEqual(database1.collections[0].data.length);
    expect(data[0].val).toEqual(database1.collections[0].data[0].val);
    expect(data[1].val).toEqual(database1.collections[0].data[1].val);
    expect(data[2].val).toEqual(database1.collections[0].data[2].val);
    expect(data[0].$loki).toEqual(database1.collections[0].data[0].$loki);
    expect(data[1].$loki).toEqual(database1.collections[0].data[1].$loki);
    expect(data[2].$loki).toEqual(database1.collections[0].data[2].$loki);
  });
});

describe('testing adapter functionality', () => {
  it('verify basic memory adapter functionality works', (done) => {
    const memAdapter = new MemoryAdapter();
    const database1 = new Database('test.db', { adapter: memAdapter });

    const collection1 =
      database1.addCollection<INameValueTestRecord>('testCollection');
    collection1.insert({ name: 'test1', val: 100 });
    collection1.insert({ name: 'test2', val: 101 });
    collection1.insert({ name: 'test3', val: 102 });

    const collection2 = database1.addCollection<IABTestRecord>('another');
    collection2.insert({ a: 1, b: 2 });

    database1.saveDatabase().then(() => {
      expect(hasOwn(memAdapter.hashStore, 'test.db')).toEqual(true);
      expect(memAdapter.hashStore['test.db'].saveCount).toEqual(1);

      // although we are mostly using callbacks, memory adapter is essentially synchronous with callbacks

      const database2 = new Database('test.db', { adapter: memAdapter });
      database2.loadDatabase({}).then(() => {
        expect(database2.collections.length).toEqual(2);
        expect(
          database2
            .getCollection<INameValueTestRecord>('testCollection')
            ?.findOne({ name: 'test2' })?.val
        ).toEqual(101);
        expect(database2.collections[0].data.length).toEqual(3);
        expect(database2.collections[1].data.length).toEqual(1);

        done();
      });
    });
  });

  it('verify deleteDatabase works', (done) => {
    const memAdapter = new MemoryAdapter();
    const database = new Database('test.db', { adapter: memAdapter });

    const collection = database.addCollection('testCollection');
    collection.insert({ name: 'test1', val: 100 });
    collection.insert({ name: 'test2', val: 101 });
    collection.insert({ name: 'test3', val: 102 });

    database.saveDatabase().then(() => {
      expect(hasOwn(memAdapter.hashStore, 'test.db')).toEqual(true);
      expect(memAdapter.hashStore['test.db'].saveCount).toEqual(1);

      database.deleteDatabase().then(() => {
        expect(hasOwn(memAdapter.hashStore, 'test.db')).toEqual(false);
        done();
      });
    });
  });

  it('verify partitioning adapter works', (done) => {
    const mem = new MemoryAdapter();
    const adapter = new PartitioningAdapter(mem);

    const database = new Database('sandbox.db', { adapter });

    // Add a collection to the database
    const items = database.addCollection('items');
    items.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
    items.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    items.insert({ name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
    items.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

    const collection = globalDatabase.addCollection<IABTestRecord>('another');
    const document = collection.insert({ a: 1, b: 2 });

    // make sure maxId was restored correctly over partitioned save/load cycle
    const itemMaxId = items.maxId;

    // for purposes of our memory adapter it is pretty much synchronous
    globalDatabase.saveDatabase().then(() => {
      // should have partitioned the data
      expect(Object.keys(mem.hashStore).length).toEqual(3);
      expect(hasOwn(mem.hashStore, 'sandbox.db')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.0')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.1')).toEqual(true);
      // all partitions should have been saved once each
      expect(mem.hashStore['sandbox.db'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.0'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.1'].saveCount).toEqual(1);

      // so let's go ahead and update one of our collections to make it dirty
      document.b = 3;
      collection.update(document);

      // and save again to ensure last save is different on for db container and that one collection
      globalDatabase.saveDatabase().then(() => {
        // db container always gets saved since we currently have no 'dirty' flag on it to check
        expect(mem.hashStore['sandbox.db'].saveCount).toEqual(2);
        // we didn't change this
        expect(mem.hashStore['sandbox.database.0'].saveCount).toEqual(1);
        // we updated this collection so it should have been saved again
        expect(mem.hashStore['sandbox.database.1'].saveCount).toEqual(2);

        // ok now lets load from it
        const database2 = new Database('sandbox.db', { adapter });
        database2.loadDatabase({}).then(() => {
          expect(database2.getCollection('items')?.maxId).toEqual(itemMaxId);
          expect(database2.collections.length).toEqual(2);
          expect(database2.collections[0].data.length).toEqual(4);
          expect(database2.collections[1].data.length).toEqual(1);
          expect(
            database2
              .getCollection<IPersonTestRecord>('items')
              ?.findOne({ name: 'gungnir' })?.owner
          ).toEqual('odin');
          expect(
            database2.getCollection<IABTestRecord>('another')?.findOne({ a: 1 })
              ?.b
          ).toEqual(3);

          done();
        });
      });
    });
  });

  it('verify partitioning adapter with paging mode enabled works', (done) => {
    const mem = new MemoryAdapter();

    // we will use an exceptionally low page size (64bytes) to test with small dataset.
    // every object will serialize to over 64bytes so that is not a hard limit but when
    // we exceed that we will stop adding to page (so for this test 1 doc per page)
    const adapter = new PartitioningAdapter(mem, {
      paging: true,
      pageSize: 64,
    });

    const database = new Database('sandbox.db', { adapter });

    // Add a collection to the database
    const items = database.addCollection<IPersonTestRecord>('items');
    items.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
    items.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    const tyr = items.insert({
      name: 'tyrfing',
      owner: 'Svafrlami',
      maker: 'dwarves',
    });
    items.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

    const collection = globalDatabase.addCollection<IABTestRecord>('another');
    const document = collection.insert({ a: 1, b: 2 });

    // for purposes of our memory adapter it is pretty much synchronous
    globalDatabase.saveDatabase().then(() => {
      // should have partitioned the data
      expect(Object.keys(mem.hashStore).length).toEqual(6);
      expect(hasOwn(mem.hashStore, 'sandbox.db')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.0.0')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.0.1')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.0.2')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.0.3')).toEqual(true);
      expect(hasOwn(mem.hashStore, 'sandbox.database.1.0')).toEqual(true);
      // all partitions should have been saved once each
      expect(mem.hashStore['sandbox.db'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.0.0'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.0.1'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.0.2'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.0.3'].saveCount).toEqual(1);
      expect(mem.hashStore['sandbox.database.1.0'].saveCount).toEqual(1);

      // so let's go ahead and update one of our collections to make it dirty
      document.b = 3;
      collection.update(document);

      // and save again to ensure `lastSave` is different on for db container and that one collection
      globalDatabase.saveDatabase().then(() => {
        // db container always gets saved since we currently have no 'dirty' flag on it to check
        expect(mem.hashStore['sandbox.db'].saveCount).toEqual(2);
        // we didn't change this
        expect(mem.hashStore['sandbox.database.0.0'].saveCount).toEqual(1);
        expect(mem.hashStore['sandbox.database.0.1'].saveCount).toEqual(1);
        expect(mem.hashStore['sandbox.database.0.2'].saveCount).toEqual(1);
        expect(mem.hashStore['sandbox.database.0.3'].saveCount).toEqual(1);
        // we updated this collection so it should have been saved again
        expect(mem.hashStore['sandbox.database.1.0'].saveCount).toEqual(2);

        // now update a multi page items collection and verify all pages were saved
        tyr.maker = 'elves';
        items.update(tyr);
        globalDatabase.saveDatabase();
        expect(mem.hashStore['sandbox.db'].saveCount).toEqual(3);
        expect(mem.hashStore['sandbox.database.0.0'].saveCount).toEqual(2);
        expect(mem.hashStore['sandbox.database.0.1'].saveCount).toEqual(2);
        expect(mem.hashStore['sandbox.database.0.2'].saveCount).toEqual(2);
        expect(mem.hashStore['sandbox.database.0.3'].saveCount).toEqual(2);
        expect(mem.hashStore['sandbox.database.1.0'].saveCount).toEqual(2);

        // ok now lets load from it
        const database2 = new Database('sandbox.db', { adapter });
        database2.loadDatabase();

        expect(database2.collections.length).toEqual(2);
        expect(database2.collections[0].data.length).toEqual(4);
        expect(database2.collections[1].data.length).toEqual(1);
        expect(
          database2
            .getCollection<IPersonTestRecord>('items')
            ?.findOne({ name: 'tyrfing' })?.maker
        ).toEqual('elves');
        expect(
          database2.getCollection<IABTestRecord>('another')?.findOne({ a: 1 })
            ?.b
        ).toEqual(3);

        // verify empty collection saves with paging
        globalDatabase.addCollection('extraCollection');
        globalDatabase.saveDatabase().then(() => {
          expect(mem.hashStore['sandbox.db'].saveCount).toEqual(4);
          expect(mem.hashStore['sandbox.database.0.0'].saveCount).toEqual(2);
          expect(mem.hashStore['sandbox.database.0.1'].saveCount).toEqual(2);
          expect(mem.hashStore['sandbox.database.0.2'].saveCount).toEqual(2);
          expect(mem.hashStore['sandbox.database.0.3'].saveCount).toEqual(2);
          expect(mem.hashStore['sandbox.database.1.0'].saveCount).toEqual(2);
          expect(mem.hashStore['sandbox.database.2.0'].saveCount).toEqual(1);

          // now verify loading empty collection works with paging code path
          const database3 = new Database('sandbox.db', { adapter });
          database3.loadDatabase();

          expect(database3.collections.length).toEqual(3);
          expect(database3.collections[0].data.length).toEqual(4);
          expect(database3.collections[1].data.length).toEqual(1);
          expect(database3.collections[2].data.length).toEqual(0);

          done();
        });
      });
    });
  });

  it('verify reference adapters get db reference which is copy and serializable-safe', (done) => {
    // Current functionality with regards to reference mode adapters:
    // Since we don't use serializeReplacer on reference mode adapters, we make
    // lightweight clone, cloning only db container and collection containers (object refs are same).

    class MyFakeReferenceAdapter {
      mode = PersistenceAdapterMode.Reference;

      loadDatabase = async (databaseName: string) => {
        expect(typeof databaseName).toEqual('string');

        const result = new Database('new db');
        const n1 = result.addCollection('n1');
        const n2 = result.addCollection('n2');
        n1.insert({ a: 9, b: 8 });
        n2.insert({ a: 7, b: 6 });

        return Promise.resolve(result);
      };

      saveDatabase = async (
        databaseName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        databaseReference: Database<any>
      ) => {
        expect(typeof databaseName).toEqual('string');
        expect(databaseReference.constructor.name).toEqual('Loki');

        expect(databaseReference.persistenceAdapter).toEqual(null);
        expect(databaseReference.collections.length).toEqual(2);
        expect(
          databaseReference
            .getCollection<IABTestRecord>('c1')
            ?.findOne({ a: 1 })?.b
        ).toEqual(2);
        // these changes should not affect original database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (databaseReference as any).fileName = 'somethingElse';
        databaseReference.collections[0].name = 'see1';
        // (accidentally?) updating a document should...
        databaseReference.collections[0].findOne({ a: 1 }).b = 3;
      };

      deleteDatabase = async () => {};
    }

    const adapter = new MyFakeReferenceAdapter();
    const database = new Database('rma test', { adapter });
    const c1 = globalDatabase.addCollection('c1');
    const c2 = globalDatabase.addCollection('c2');
    c1.insert({ a: 1, b: 2 });
    c2.insert({ a: 3, b: 4 });

    database.saveDatabase().then(() => {
      expect(!!globalDatabase.persistenceAdapter).toEqual(true);
      expect(globalDatabase.fileName).toEqual('rma test');
      expect(globalDatabase.collections[0].name).toEqual('c1');
      expect(
        globalDatabase.getCollection<IABTestRecord>('c1')?.findOne({ a: 1 })?.b
      ).toEqual(3);
    });

    const db2 = new Database('other name', { adapter });
    db2.loadDatabase({}).then(() => {
      expect(db2.collections.length).toEqual(2);
      expect(db2.collections[0].name).toEqual('n1');
      expect(db2.collections[1].name).toEqual('n2');
      expect(
        db2.getCollection<IABTestRecord>('n1')?.findOne({ a: 9 })?.b
      ).toEqual(8);

      done();
    });
  });
});

describe('testing changesAPI', () => {
  it('verify pending changes persist across save/load cycle', (done) => {
    const adapter = new MemoryAdapter();
    const database = new Database('sandbox.db', { adapter });

    // Add a collection to the database
    const collection = database.addCollection<IPersonTestRecord>('items', {
      disableChangesApi: false,
    });

    // Add some documents to the collection
    collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
    collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    collection.insert({
      name: 'tyrfing',
      owner: 'Svafrlami',
      maker: 'dwarves',
    });
    collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

    // Find and update an existing document
    const tyrfing = collection.findOne({ name: 'tyrfing' });

    if (!tyrfing) {
      throw new TypeError(`Inserted document not found`);
    }

    tyrfing.owner = 'arngrim';
    collection.update(tyrfing);

    // memory adapter is synchronous so i will not bother with callbacks
    globalDatabase.saveDatabase().then(() => {
      const database2 = new Database('sandbox.db', { adapter });
      database2.loadDatabase({});

      const result = JSON.parse(database2.serializeChanges());
      expect(result.length).toEqual(5);

      expect(result[0].name).toEqual('items');
      expect(result[0].operation).toEqual('I');
      expect(result[0].obj.name).toEqual('mjolnir');

      expect(result[4].name).toEqual('items');
      expect(result[4].operation).toEqual('U');
      expect(result[4].obj.name).toEqual('tyrfing');

      done();
    });
  });
});

describe('verify serialize replacer', () => {
  it('verify verbose console is replaced', () => {
    const database = new Database('test.db', { verbose: true });

    database.addCollection('test').insert({ a: 1, b: 2 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((database.collections[0] as any).consoleWrapper === null).toEqual(
      false
    );

    // serialized string/object should have nulled out that property
    const result = database.serialize();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedDatabase = JSON.parse(result) as Database<any>;

    expect(result.length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((database.collections[0] as any).consoleWrapper === null).toEqual(
      false
    );

    // now let's make sure that reloaded database collections
    // with 'verbose' option set get the console reattached.
    const database2 = new Database('test.db', { verbose: true });
    database2.loadJSONObject(parsedDatabase);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((database2.collections[0] as any).consoleWrapper === null).toEqual(
      false
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (database.collections[0] as any).consoleWrapper.log).toEqual(
      'function'
    );
  });
});
