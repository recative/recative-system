import { hasOwn } from '../src/utils/hasOwn';
import { Collection, Database, ICollectionDocument } from '../src';

import { IABTestRecord, IPersonTestRecord } from './definition';

const AB_DATA = [
  { a: 3, b: 3 },
  { a: 6, b: 7 },
  { a: 1, b: 2 },
  { a: 7, b: 8 },
  { a: 5, b: 4 },
];

describe('collection', () => {
  it('Collection rename works', () => {
    const database = new Database('test.db');
    database.addCollection('coll1');

    let collection = database.getCollection<IPersonTestRecord>('coll1');
    expect(collection?.name).toEqual('coll1');

    database.renameCollection('coll1', 'coll2');
    collection = database.getCollection('coll1');
    expect(collection).toBeNull();
    collection = database.getCollection('coll2');
    expect(collection?.name).toEqual('coll2');
  });

  it('works', () => {
    class SubclassedCollection<T extends object> extends Collection<T> {
      extendedMethod() {
        this.name.toUpperCase();
      }
    }

    const collection = new SubclassedCollection('users', {});

    expect(collection != null).toBe(true);
    expect('users'.toUpperCase()).toEqual(collection.extendedMethod());
    collection.insert({
      name: 'joe',
    });
    expect(collection.data.length).toEqual(1);
  });

  it('findAndUpdate works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll');
    collection.insert(AB_DATA);

    collection.findAndUpdate({ a: 6 }, (document) => {
      document.b =
        document.b && typeof document.b === 'number' ? document.b + 1 : 1;
    });

    const result = collection.chain().find({ a: 6 }).simpleSort('b').data();
    expect(result.length).toEqual(2);
    expect(result[0].b).toEqual(5);
    expect(result[1].b).toEqual(8);
  });

  it('findAndRemove works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll');
    collection.insert(AB_DATA);

    collection.findAndRemove({ a: 6 });

    expect(collection.data.length).toEqual(3);

    const document = collection.chain().find().simpleSort('b').data();
    expect(document.length).toEqual(3);
    expect(document[0].b).toEqual(2);
    expect(document[1].b).toEqual(3);
    expect(document[2].b).toEqual(8);
  });

  it('removeWhere works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll');
    collection.insert(AB_DATA);

    collection.removeWhere((obj) => {
      return obj.a === 6;
    });

    expect(collection.data.length).toEqual(3);

    const document = collection.chain().find().simpleSort('b').data();
    expect(document.length).toEqual(3);
    expect(document[0].b).toEqual(2);
    expect(document[1].b).toEqual(3);
    expect(document[2].b).toEqual(8);
  });

  it('removeBatch works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll');
    collection.insert(AB_DATA);

    // remove by sending array of docs to remove()
    let document = collection.find({ a: 6 });
    expect(document.length).toEqual(2);

    collection.remove(document);
    expect(collection.data.length).toEqual(3);

    document = collection.chain().find().simpleSort('b').data();
    expect(document.length).toEqual(3);
    expect(document[0].b).toEqual(2);
    expect(document[1].b).toEqual(3);
    expect(document[2].b).toEqual(8);

    // now repeat but send $loki id array to remove()
    collection.clear();
    collection.insert(AB_DATA);
    document = collection.find({ a: 6 });
    expect(document.length).toEqual(2);
    collection.remove(document);
    document = collection.chain().find().simpleSort('b').data();
    expect(document.length).toEqual(3);
    expect(document[0].b).toEqual(2);
    expect(document[1].b).toEqual(3);
    expect(document[2].b).toEqual(8);
  });

  it('updateWhere works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll');
    collection.insert(AB_DATA);

    // guess we need to return object for this to work
    collection.updateWhere(
      (x) => {
        return x.a === 6;
      },
      (x) => {
        x.b = typeof x.b === 'number' ? x.b + 1 : 1;
        return x;
      }
    );

    const document = collection.chain().find({ a: 6 }).simpleSort('b').data();
    expect(document.length).toEqual(2);
    expect(document[0].b).toEqual(5);
    expect(document[1].b).toEqual(8);
  });

  // coll.mode(property) should return single value of property which occurs most in collection
  // if more than one value 'ties' it will just pick one
  it('mode works', () => {
    const database = new Database('test.db');
    const collection = database.addCollection('testcoll');
    collection.insert(AB_DATA);

    // seems mode returns string so loose equality
    const result = collection.mode('a') === 6;

    expect(result).toEqual(true);
  });

  it('single inserts emit with meta when async listeners false', () => {
    const database = new Database('test.db');
    const collection = database.addCollection('testcoll');

    // listen for insert events to validate objects
    collection.addEventListener('insert', ((
      event: CustomEvent<IABTestRecord & ICollectionDocument>
    ) => {
      expect(hasOwn(event, 'a')).toEqual(true);
      expect([3, 6, 1, 7, 5].indexOf(event.detail.a)).toBeGreaterThan(-1);

      switch (event.detail.a) {
        case 3:
          expect(event.detail.b).toEqual(3);
          break;
        case 6:
          expect(event.detail.b).toEqual(7);
          break;
        case 1:
          expect(event.detail.b).toEqual(2);
          break;
        case 7:
          expect(event.detail.b).toEqual(8);
          break;
        case 5:
          expect(event.detail.b).toEqual(4);
          break;
        default:
      }

      expect(hasOwn(event.detail, '$loki')).toEqual(true);
      expect(hasOwn(event.detail, 'meta')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'revision')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'created')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'version')).toEqual(true);
      expect(event.detail.meta.revision).toEqual(0);
      expect(event.detail.meta.version).toEqual(0);
      expect(event.detail.meta.created).toBeGreaterThan(0);
    }) as unknown as EventListenerOrEventListenerObject);

    collection.insert(AB_DATA);
  });

  it('single inserts (with clone) emit meta and return instances correctly', () => {
    const database = new Database('test.db');
    const collection = database.addCollection<IABTestRecord>('testcoll', {
      clone: true,
    });

    // listen for insert events to validate objects
    collection.addEventListener('insert', ((
      event: CustomEvent<IABTestRecord & ICollectionDocument>
    ) => {
      expect(hasOwn(event.detail, 'a')).toEqual(true);
      expect([3, 6, 1, 7, 5].indexOf(event.detail.a)).toBeGreaterThan(-1);

      switch (event.detail.a) {
        case 3:
          expect(event.detail.b).toEqual(3);
          break;
        case 6:
          expect(event.detail.b).toEqual(7);
          break;
        case 1:
          expect(event.detail.b).toEqual(2);
          break;
        case 7:
          expect(event.detail.b).toEqual(8);
          break;
        case 5:
          expect(event.detail.b).toEqual(4);
          break;
        default:
      }

      expect(hasOwn(event.detail, '$loki')).toEqual(true);
      expect(hasOwn(event.detail, 'meta')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'revision')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'created')).toEqual(true);
      expect(hasOwn(event.detail.meta, 'version')).toEqual(true);
      expect(event.detail.meta.revision).toEqual(0);
      expect(event.detail.meta.version).toEqual(0);
      expect(event.detail.meta.created).toBeGreaterThan(0);
    }) as unknown as EventListenerOrEventListenerObject);

    const document = collection.insert(AB_DATA)[0];

    // verify that the objects returned from an insert are clones by tampering with values
    document.b = 9;
    const result = collection.findOne({ a: 3 });
    expect(result?.b).toEqual(3);
  });

  it('batch inserts emit with meta', () => {
    const database = new Database('test.db');
    const collection = database.addCollection('testcoll');

    // listen for insert events to validate objects
    collection.addEventListener('insert', ((
      event: CustomEvent<(IABTestRecord & ICollectionDocument)[]>
    ) => {
      expect(Array.isArray(event)).toEqual(true);
      expect(event.detail.length).toEqual(5);

      for (let i = 0; i < 5; i += 1) {
        expect(event.detail[i].b).toEqual(AB_DATA[i]);
        expect(hasOwn(event.detail[i], 'meta')).toEqual(true);
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'revision')).toEqual(
          true
        );
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'created')).toEqual(
          true
        );
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'version')).toEqual(
          true
        );
        expect(event.detail[i].meta.revision).toEqual(0);
        expect(event.detail[i].meta.version).toEqual(0);
        expect(event.detail[i].meta.created).toBeGreaterThan(0);
      }
    }) as unknown as EventListenerOrEventListenerObject);

    collection.insert(AB_DATA);
  });

  it('batch inserts emit with meta and return clones', () => {
    const db = new Database('test.db');
    const collection = db.addCollection<IABTestRecord>('testcoll', {
      clone: true,
    });

    // listen for insert events to validate objects
    collection.addEventListener('insert', ((
      event: CustomEvent<(IABTestRecord & ICollectionDocument)[]>
    ) => {
      expect(Array.isArray(event)).toEqual(true);
      expect(event.detail.length).toEqual(5);

      for (let i = 0; i < 5; i += 1) {
        expect(event.detail[i].b).toEqual(AB_DATA[i]);
        expect(hasOwn(event.detail[i], 'meta')).toEqual(true);
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'revision')).toEqual(
          true
        );
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'created')).toEqual(
          true
        );
        expect(hasOwn(event.detail[i].meta.hasOwnProperty, 'version')).toEqual(
          true
        );
        expect(event.detail[i].meta.revision).toEqual(0);
        expect(event.detail[i].meta.version).toEqual(0);
        expect(event.detail[i].meta.created).toBeGreaterThan(0);
      }
    }) as unknown as EventListenerOrEventListenerObject);

    const newDocument = { a: 3, b: 3 };
    const insertedDocument = collection.insert([
      newDocument,
      { a: 6, b: 7 },
      { a: 1, b: 2 },
      { a: 7, b: 8 },
      { a: 5, b: 4 },
    ]);

    expect(Array.isArray(insertedDocument)).toEqual(true);

    // tamper original (after insert)
    newDocument.b = 99;
    // returned values should have been clones of original
    expect(insertedDocument[0].b).toEqual(3);

    // internal data references should have benn clones of original
    const existedDocument = collection.findOne({ a: 3 });
    expect(existedDocument?.b).toEqual(3);
  });
});
