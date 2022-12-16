import { hasOwn } from '../src/utils/hasOwn';
import { Database, ICollectionDocument } from '../src';

import {
  IABTestRecord,
  IIndexTestRecord,
  IPersonTestRecord,
} from './definition';

declare const testRecords: IPersonTestRecord[];

describe('Binary indices', () => {
  beforeEach(() => {
    globalThis.testRecords = [
      { name: 'mjolnir', owner: 'thor', maker: 'dwarves' },
      { name: 'gungnir', owner: 'odin', maker: 'elves' },
      { name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' },
      { name: 'draupnir', owner: 'odin', maker: 'elves' },
    ];
  });

  describe('If `collection.clear` affects binary indices correctly', () => {
    it('works', () => {
      const db = new Database('idxtest');
      const t2 = JSON.parse(JSON.stringify(testRecords));

      const items = db.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);
      expect(items.binaryIndices.name.values.length).toBe(4);
      items.clear();
      expect(hasOwn(items.binaryIndices, 'name')).toEqual(true);
      expect(items.binaryIndices.name.values.length).toBe(0);
      items.insert(t2);
      expect(items.binaryIndices.name.values.length).toBe(4);
      items.clear({ removeIndices: true });
      expect(hasOwn(items.binaryIndices, 'name')).toEqual(false);
    });
  });

  describe('Binary index loosly but reliably works across datatypes', () => {
    it('works', () => {
      const db = new Database('ugly.db');

      // Add a collection to the database
      const dirtydata = db.addCollection<IABTestRecord>('dirtydata', {
        indices: ['b'],
      });

      // Add some documents to the collection
      dirtydata.insert({ a: 0 });
      const b4 = { a: 1, b: 4 };
      dirtydata.insert(b4);
      dirtydata.insert({ a: 2, b: undefined });
      dirtydata.insert({ a: 3, b: 3.14 });
      dirtydata.insert({ a: 4, b: new Date() });
      dirtydata.insert({ a: 5, b: false });
      dirtydata.insert({ a: 6, b: true });
      dirtydata.insert({ a: 7, b: null });
      dirtydata.insert({ a: 8, b: '0' });
      dirtydata.insert({ a: 9, b: 0 });
      dirtydata.insert({ a: 10, b: 3 });
      dirtydata.insert({ a: 11, b: '3' });
      dirtydata.insert({ a: 12, b: '4' });
    });
  });

  describe('Index maintained across inserts', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const documents = database.addCollection<IPersonTestRecord>('users', {
        indices: ['name'],
      });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      const binaryIndex1 = documents.binaryIndices.name;
      expect(binaryIndex1.values.length).toBe(4);
      expect(binaryIndex1.values[0]).toBe(3);
      expect(binaryIndex1.values[1]).toBe(1);
      expect(binaryIndex1.values[2]).toBe(0);
      expect(binaryIndex1.values[3]).toBe(2);

      documents.insert({
        name: 'gjallarhorn',
        owner: 'heimdallr',
        maker: 'Gjöll',
      });

      // force index build
      documents.find({ name: 'mjolnir' });

      // reaquire values array
      const binaryIndex2 = documents.binaryIndices.name;

      expect(binaryIndex2.values[0]).toBe(3);
      expect(binaryIndex2.values[1]).toBe(4);
      expect(binaryIndex2.values[2]).toBe(1);
      expect(binaryIndex2.values[3]).toBe(0);
      expect(binaryIndex2.values[4]).toBe(2);
    });
  });

  describe('Index maintained across removes', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const items = database.addCollection('users', { indices: ['name'] });
      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir' });

      const binaryIndex1 = items.binaryIndices.name;
      expect(binaryIndex1.values.length).toBe(4);
      expect(binaryIndex1.values[0]).toBe(3);
      expect(binaryIndex1.values[1]).toBe(1);
      expect(binaryIndex1.values[2]).toBe(0);
      expect(binaryIndex1.values[3]).toBe(2);

      const tyrfing = items.findOne({ name: 'tyrfing' });
      items.remove(tyrfing);

      // force index build
      items.find({ name: 'mjolnir' });

      // reaquire values array
      const binaryIndex2 = items.binaryIndices.name;

      // values are data array positions which should be collapsed, decrementing
      // all index positions after the deleted
      expect(binaryIndex2.values[0]).toBe(2);
      expect(binaryIndex2.values[1]).toBe(1);
      expect(binaryIndex2.values[2]).toBe(0);
    });
  });

  describe('Index maintained across batch removes', () => {
    it('works', () => {
      const database = new Database('batch-removes');
      const documents = database.addCollection<IABTestRecord>('items', {
        indices: ['b'],
      });

      for (let index = 0; index < 100; index += 1) {
        const a = Math.floor(Math.random() * 1000);
        const b = Math.floor(Math.random() * 1000);
        documents.insert({ a, b });
      }

      const result = documents.find({ a: { $between: [300, 700] } });

      documents.findAndRemove({ a: { $between: [300, 700] } });

      expect(documents.checkIndex('b')).toEqual(true);

      expect(documents.find().length).toEqual(100 - result.length);
    });
  });

  describe('Index maintained across updates', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const documents = database.addCollection<IPersonTestRecord>('users', {
        indices: ['name'],
      });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      const binaryIndex1 = documents.binaryIndices.name;
      expect(binaryIndex1.values.length).toBe(4);
      expect(binaryIndex1.values[0]).toBe(3);
      expect(binaryIndex1.values[1]).toBe(1);
      expect(binaryIndex1.values[2]).toBe(0);
      expect(binaryIndex1.values[3]).toBe(2);

      const document = documents.findOne({ name: 'tyrfing' });

      if (!document) {
        throw new TypeError('Inserted document not found');
      }
      document.name = 'etyrfing';
      documents.update(document);

      // force index build
      documents.find({ name: 'mjolnir' });

      // reaquire values array
      const binaryIndex2 = documents.binaryIndices.name;

      expect(binaryIndex2.values[0]).toBe(3);
      expect(binaryIndex2.values[1]).toBe(2);
      expect(binaryIndex2.values[2]).toBe(1);
      expect(binaryIndex2.values[3]).toBe(0);
    });
  });

  describe('Positional lookup using get works', () => {
    it('works', () => {
      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here

      // let's base this off of our 'remove' test so data is more meaningful

      const database = new Database('idxtest');
      const documents = database.addCollection<IPersonTestRecord>('users', {
        indices: ['name'],
      });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      let document: (IPersonTestRecord & ICollectionDocument) | null;
      let dataPosition:
        | [IPersonTestRecord & ICollectionDocument, number]
        | null;

      document = documents.findOne({ name: 'tyrfing' });
      documents.remove(document);

      document = documents.findOne({ name: 'draupnir' });
      if (!document) {
        throw new TypeError('Inserted document not found');
      }
      dataPosition = documents.get(document.$loki, true);
      if (!dataPosition) {
        throw new TypeError('Data position not found');
      }
      expect(dataPosition[1]).toBe(2);

      document = documents.findOne({ name: 'gungnir' });
      if (!document) {
        throw new TypeError('Inserted document not found');
      }
      dataPosition = documents.get(document.$loki, true);
      if (!dataPosition) {
        throw new TypeError('Data position not found');
      }
      expect(dataPosition[1]).toBe(1);

      document = documents.findOne({ name: 'mjolnir' });
      if (!document) {
        throw new TypeError('Inserted document not found');
      }
      dataPosition = documents.get(document.$loki, true);
      if (!dataPosition) {
        throw new TypeError('Data position not found');
      }
      expect(dataPosition[1]).toBe(0);
    });
  });

  describe('Positional index lookup using getBinaryIndexPosition works', () => {
    it('works', () => {
      // Since our indexes contain -not loki id values- but coll.data[] positions
      // we shall verify our getBinaryIndexPosition method's ability to look up an
      // index value based on data array position function (obtained via get)

      const database = new Database('idxtest');
      const documents = database.addCollection('users', { indices: ['name'] });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      // tyrfing should be in coll.data[2] since it was third added item and we have not deleted yet
      const position1 = documents.getBinaryIndexPosition(2, 'name');
      // yet in our index it should be fourth (array index 3) since sorted alphabetically
      expect(position1).toBe(3);

      // now remove draupnir
      const document = documents.findOne({ name: 'draupnir' });
      documents.remove(document);

      // force index build
      documents.find({ name: 'mjolnir' });

      // tyrfing should be in coll.data[2] since it was third added item and we have not deleted yet
      const position2 = documents.getBinaryIndexPosition(2, 'name');
      // yet in our index it should be now be third (array index 2)
      expect(position2).toBe(2);
    });
  });

  describe('If `calculateRangeStart` works for inserts', () => {
    it('works', () => {
      // calculateRangeStart is helper function for adaptive inserts/updates
      // we will use it to find position within index where (new) nonexistent value should be inserted into index

      const database = new Database('idxtest');
      const documents = database.addCollection<IPersonTestRecord>('users', {
        indices: ['name'],
      });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      const position1 = documents.calculateRangeStart<'name', boolean>(
        'name',
        'fff',
        true
      );
      expect(position1).toBe(1);

      const position2 = documents.calculateRangeStart<'name', boolean>(
        'name',
        'zzz',
        true
      );
      expect(position2).toBe(4);

      const position3 = documents.calculateRangeStart<'name', boolean>(
        'name',
        'aaa',
        true
      );
      expect(position3).toBe(0);

      const position4 = documents.calculateRangeStart<'name', boolean>(
        'name',
        'gungnir',
        true
      );
      expect(position4).toBe(1);
    });
  });

  describe('If `adaptiveBinaryIndexInsert` works', () => {
    it('works', () => {
      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here
      // let's base this off of our 'remove' test so data is more meaningful

      const database = new Database('idxtest');
      const documents = database.addCollection('users', {
        adaptiveBinaryIndices: false,
        indices: ['name'],
      });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      // we know this will go in coll.data[4] as fifth document
      documents.insert({
        name: 'fff',
      });

      documents.adaptiveBinaryIndexInsert(4, 'name');

      expect(documents.binaryIndices.name.values[0]).toBe(3); // draupnir at index position 0 and data[] position 3 (same as old)
      expect(documents.binaryIndices.name.values[1]).toBe(4); // fff at index position 1 and data[] position 4 (now)
      expect(documents.binaryIndices.name.values[2]).toBe(1); // gungnir at index position 2 (now) and data[] position 1
      expect(documents.binaryIndices.name.values[3]).toBe(0); // mjolnir at index position 3 (now) and data[] position 0
      expect(documents.binaryIndices.name.values[4]).toBe(2); // tyrfing at index position 4 (now) and data[] position 2
    });
  });

  describe('If `adaptiveBinaryIndexUpdate` works', () => {
    it('works', () => {
      const db = new Database('idxtest');
      const items = db.addCollection('users', {
        adaptiveBinaryIndices: false, // we are doing utility function testing
        indices: ['name'],
      });

      items.insert(testRecords);

      // force index build
      items.find({ name: 'mjolnir' });

      expect(items.binaryIndices.name.values[0]).toBe(3);
      expect(items.binaryIndices.name.values[1]).toBe(1);
      expect(items.binaryIndices.name.values[2]).toBe(0);
      expect(items.binaryIndices.name.values[3]).toBe(2);

      // for this test, just update gungnir directly in collection.data
      items.data[1].name = 'ygungnir';

      // renegotiate index position of 2nd data element (ygungnir) within name index
      items.adaptiveBinaryIndexUpdate(1, 'name');

      expect(items.binaryIndices.name.values[0]).toBe(3);
      expect(items.binaryIndices.name.values[1]).toBe(0);
      expect(items.binaryIndices.name.values[2]).toBe(2);
      expect(items.binaryIndices.name.values[3]).toBe(1);
    });
  });

  describe('adaptiveBinaryIndex batch updates work', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const documents = database.addCollection<IABTestRecord>('items', {
        adaptiveBinaryIndices: true,
        indices: ['b'],
      });

      // init 4 docs with bool 'b' all false
      const newDocuments = [
        { a: 8000, b: false },
        { a: 6000, b: false },
        { a: 4000, b: false },
        { a: 2000, b: false },
      ];

      documents.insert(newDocuments);

      // update two docs to have 'b' true
      let results = documents.find({ a: { $in: [8000, 6000] } });
      results.forEach((obj) => {
        obj.b = true;
      });
      documents.update(results);

      // should be 2 of each
      expect(documents.find({ b: true }).length).toEqual(2);
      expect(documents.find({ b: false }).length).toEqual(2);

      // reset all bool 'b' props to false
      results = documents.find({ b: true });
      results.forEach((obj) => {
        obj.b = false;
      });
      documents.update(results);

      // should be no true and 4 false
      expect(documents.find({ b: true }).length).toEqual(0);
      expect(documents.find({ b: false }).length).toEqual(4);

      // update different 2 to be true
      results = documents.find({ a: { $in: [8000, 2000] } });
      results.forEach((obj) => {
        obj.b = true;
      });
      documents.update(results);

      // should be 2 true and 2 false
      expect(documents.find({ b: true }).length).toEqual(2);
      expect(documents.find({ b: false }).length).toEqual(2);
    });
  });

  describe('adaptiveBinaryIndexRemove works', () => {
    it('works', () => {
      // Since we use coll.get's ability to do a positional lookup of a loki id during adaptive indexing we will test it here

      // let's base this off of our 'remove' test so data is more meaningful

      const database = new Database('idxtest');
      const documents = database.addCollection('users', { indices: ['name'] });
      documents.insert(testRecords);

      // force index build
      documents.find({ name: 'mjolnir' });

      // at this point lets break convention and use internal method directly, without calling higher level remove() to remove
      // from both data[] and index[].  We are not even removing from data we are just testing adaptiveBinaryIndexRemove as if we did/will.

      // lets 'remove' gungnir (which is in data array position 1) from our 'name' index
      documents.adaptiveBinaryIndexRemove(1, 'name');

      // should only be three index array elements now (ordered by name)
      expect(documents.binaryIndices.name.values[0]).toBe(2); // draupnir at index position 0 and data[] position 2 (now)
      expect(documents.binaryIndices.name.values[1]).toBe(0); // mjolnir at index position 1 and data[] position 0
      expect(documents.binaryIndices.name.values[2]).toBe(1); // tyrfing at index position 2 and data[] position 1 (now)
    });
  });

  describe('If `adaptiveBinaryIndex` high level operability test', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const collection = database.addCollection<IIndexTestRecord>('users', {
        adaptiveBinaryIndices: true,
        indices: ['customIdx'],
      });

      let result;

      // add 1000 records
      for (let i = 0; i < 1000; i += 1) {
        collection.insert({
          customIdx: i,
          originalIdx: i,
          desc: `inserted doc with customIdx of ${i}`,
        });
      }

      // update 1000 records causing index to move first in ordered list to last, one at a time
      // when finding each document we are also verifying it gave us back the correct document
      for (let i = 0; i < 1000; i += 1) {
        result = collection.findOne({ customIdx: i });
        expect(result).not.toEqual(null);
        expect(result.customIdx).toBe(i);
        result.customIdx += 1000;
        collection.update(result);
      }

      // find each document again (by its new customIdx), verify it is who we thought it was, then remove it
      for (let i = 0; i < 1000; i += 1) {
        result = collection.findOne({ customIdx: i + 1000 });
        expect(result).not.toEqual(null);
        expect(result.customIdx).toBe(i + 1000);
        collection.remove(result);
      }

      // all documents should be gone
      expect(collection.count()).toBe(0);

      // with empty collection , insert some records
      collection.insert({ customIdx: 100 });
      collection.insert({ customIdx: 200 });
      collection.insert({ customIdx: 300 });
      collection.insert({ customIdx: 400 });
      collection.insert({ customIdx: 500 });

      // intersperse more records before and after previous each element
      collection.insert({ customIdx: 7 });
      collection.insert({ customIdx: 123 });
      collection.insert({ customIdx: 234 });
      collection.insert({ customIdx: 345 });
      collection.insert({ customIdx: 567 });

      // verify some sampling returns correct objects
      expect(collection.findOne({ customIdx: 300 })?.customIdx).toBe(300);
      expect(collection.findOne({ customIdx: 234 })?.customIdx).toBe(234);
      expect(collection.findOne({ customIdx: 7 })?.customIdx).toBe(7);
      expect(collection.findOne({ customIdx: 567 })?.customIdx).toBe(567);

      // remove 4 records at constious positions, forcing indices to be inserted and removed
      collection.remove(collection.findOne({ customIdx: 567 }));
      collection.remove(collection.findOne({ customIdx: 234 }));
      collection.remove(collection.findOne({ customIdx: 7 }));
      collection.remove(collection.findOne({ customIdx: 300 }));

      // verify find() returns correct document or null for all previously added customIdx's
      expect(collection.findOne({ customIdx: 100 })?.customIdx).toBe(100);
      expect(collection.findOne({ customIdx: 200 })?.customIdx).toBe(200);
      expect(collection.findOne({ customIdx: 300 })).toBe(null);
      expect(collection.findOne({ customIdx: 400 })?.customIdx).toBe(400);
      expect(collection.findOne({ customIdx: 500 })?.customIdx).toBe(500);
      expect(collection.findOne({ customIdx: 7 })).toBe(null);
      expect(collection.findOne({ customIdx: 123 })?.customIdx).toBe(123);
      expect(collection.findOne({ customIdx: 234 })).toBe(null);
      expect(collection.findOne({ customIdx: 345 })?.customIdx).toBe(345);
      expect(collection.findOne({ customIdx: 567 })).toBe(null);
    });
  });

  describe('If `adaptiveBinaryIndex` high level random stress test', () => {
    it('works', () => {
      const database = new Database('idxtest');
      const collection = database.addCollection<IIndexTestRecord>('users', {
        adaptiveBinaryIndices: true,
        indices: ['customIdx'],
      });

      const minValue = 1;
      const maxVaule = 1000;

      const idVector: number[] = [];

      // add 1000 records
      for (let i = 0; i < 1000; i += 1) {
        const currentIndex = Math.floor(
          Math.random() * (maxVaule - minValue) + minValue
        );

        collection.insert({
          customIdx: currentIndex,
          sequence: i,
          desc: `inserted doc with sequence of ${i}`,
        });

        idVector.push(currentIndex);
      }

      // update 1000 records causing index to move first in ordered list to last, one at a time
      // when finding each document we are also verifying it gave us back the correct document
      for (let i = 0; i < 1000; i += 1) {
        const currentIndex = idVector.pop();
        const document = collection.findOne({ customIdx: currentIndex });
        expect(document).not.toEqual(null);
        expect(document?.customIdx).toBe(currentIndex);
      }
    });
  });

  describe('If `adaptiveBinaryIndex` collection serializes correctly', () => {
    it('works', () => {
      let database = new Database('idxtest');
      let collection = database.addCollection<IIndexTestRecord>('users', {
        adaptiveBinaryIndices: true,
        indices: ['customIdx'],
      });

      collection.insert({ customIdx: 1 });

      let jsonString = database.serialize();
      let newDatabase = new Database('idxtest');

      newDatabase.loadJSON(jsonString);

      expect(newDatabase.getCollection('users')?.adaptiveBinaryIndices).toBe(
        true
      );

      // repeat without option set
      database = new Database('idxtest');
      collection = database.addCollection('users', {
        adaptiveBinaryIndices: false,
        indices: ['customIdx'],
      });
      collection.insert({ customIdx: 1 });

      jsonString = database.serialize();
      newDatabase = new Database('idxtest');
      newDatabase.loadJSON(jsonString);

      expect(newDatabase.getCollection('users')?.adaptiveBinaryIndices).toBe(
        false
      );
    });
  });

  describe('If `checkIndex` works', () => {
    it('works', () => {
      const database = new Database('bitest.db');
      const collection = database.addCollection('bitest', { indices: ['a'] });
      collection.insert([{ a: 9 }, { a: 3 }, { a: 7 }, { a: 0 }, { a: 1 }]);

      // verify our initial order is valid
      expect(collection.checkIndex('a')).toBe(true);

      // now force index corruption by tampering with it
      collection.binaryIndices.a.values.reverse();

      // verify out index is now invalid
      expect(collection.checkIndex('a')).toBe(false);

      // also verify our test of all indices reports false
      const result = collection.checkAllIndexes();
      expect(result.length).toBe(1);
      expect(result[0]).toBe('a');

      // let's just make sure that random sampling doesn't throw error
      collection.checkIndex('a', {
        randomSampling: true,
        randomSamplingFactor: 0.5,
      });

      // now have checkindex repair the index
      // also expect it to report that it was invalid before fixing
      expect(collection.checkIndex('a', { repair: true })).toBe(false);

      // now expect it to report that the index is valid
      expect(collection.checkIndex('a')).toBe(true);

      // now leave index ordering valid but remove the last value (from index)
      collection.binaryIndices.a.values.pop();

      // expect checkIndex to report index to be invalid
      expect(collection.checkIndex('a')).toBe(false);

      // now have checkindex repair the index
      // also expect it to report that it was invalid before fixing
      expect(collection.checkIndex('a', { repair: true })).toBe(false);

      // now expect it to report that the index is valid
      expect(collection.checkIndex('a')).toBe(true);

      // verify the check all indexes function returns empty array
      expect(collection.checkAllIndexes().length).toBe(0);
    });
  });
});
