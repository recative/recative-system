import { Collection, Database } from '../../src';
import { Operators } from '../../src/Operations';
import {
  IABTestRecord,
  INumericABTestRecord,
  IPersonTestRecord,
} from './definition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalDatabase: Database<any>;
declare const users: Collection<IPersonTestRecord>;

const AB_TEST_DATA = [
  { a: 4, b: 2 },
  { a: 7, b: 1 },
  { a: 3, b: 4 },
  { a: 9, b: 5 },
];

const NUMERIC_AB_TEST_RECORD = [
  { a: 1, b: 9, c: 'first' },
  { a: 5, b: 7, c: 'second' },
  { a: 2, b: 9, c: 'third' },
];

describe('sorting and indexing', () => {
  beforeEach(() => {
    globalThis.globalDatabase = new Database('sortingIndexingTest');
    globalThis.users = globalDatabase.addCollection('items');

    users.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
    users.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    users.insert({ name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' });
    users.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });
  });

  describe('resultset simpleSort', () => {
    it('works', () => {
      const collection =
        globalDatabase.addCollection<IABTestRecord>('simpleSort');

      collection.insert(AB_TEST_DATA);

      const data = collection.chain().simpleSort('a').data();
      expect(data[0].a).toBe(3);
      expect(data[1].a).toBe(4);
      expect(data[2].a).toBe(7);
      expect(data[3].a).toBe(9);
    });
  });

  describe('resultset simpleSort descending', () => {
    it('works', () => {
      const rss = globalDatabase.addCollection<IABTestRecord>('simpleSort');

      rss.insert(AB_TEST_DATA);

      const data = rss.chain().simpleSort('a', true).data();
      expect(data[0].a).toBe(9);
      expect(data[1].a).toBe(7);
      expect(data[2].a).toBe(4);
      expect(data[3].a).toBe(3);

      // test when indexed
      const collection = globalDatabase.addCollection<IABTestRecord>(
        'simpleSort2',
        {
          indices: ['a'],
        }
      );

      collection.insert(AB_TEST_DATA);

      const data2 = collection.chain().simpleSort('a', true).data();
      expect(data2[0].a).toBe(9);
      expect(data2[1].a).toBe(7);
      expect(data2[2].a).toBe(4);
      expect(data2[3].a).toBe(3);
    });
  });

  describe('resultset simpleSort on nested properties', () => {
    it('works', () => {
      interface IFoolAbTestRecord {
        foo: IABTestRecord;
      }

      const rss = globalDatabase.addCollection<IFoolAbTestRecord>('simpleSort');

      rss.insert({ foo: { a: 4, b: 2 } });
      rss.insert({ foo: { a: 7, b: 1 } });
      rss.insert({ foo: { a: 3, b: 4 } });
      rss.insert({ foo: { a: 9, b: 5 } });

      const results = rss.chain().simpleSort('foo.a').data();
      expect(results[0].foo.a).toBe(3);
      expect(results[1].foo.a).toBe(4);
      expect(results[2].foo.a).toBe(7);
      expect(results[3].foo.a).toBe(9);
    });
  });

  describe('resultset simpleSort with dates', () => {
    it('works', () => {
      const now = new Date().getTime();
      const dt1 = new Date(now - 1000);
      const dt2 = new Date(now + 5000);
      const dt3 = new Date(2000, 6, 1);
      const dt4 = new Date(now + 2000);
      const dt5 = new Date(now - 3000);

      const rss = globalDatabase.addCollection<IABTestRecord>('simpleSort');

      rss.insert({ a: 1, b: dt1 });
      rss.insert({ a: 2, b: dt2 });
      rss.insert({ a: 3, b: dt3 });
      rss.insert({ a: 4, b: dt4 });
      rss.insert({ a: 5, b: dt5 });

      const results = rss.chain().simpleSort('b').data();
      expect(results[0].a).toBe(3);
      expect(results[1].a).toBe(5);
      expect(results[2].a).toBe(1);
      expect(results[3].a).toBe(4);
      expect(results[4].a).toBe(2);
    });
  });

  describe('resultset sort works correctly', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<INumericABTestRecord>('coll');

      collection.insert(NUMERIC_AB_TEST_RECORD);

      const sortFunction = (
        left: INumericABTestRecord,
        right: INumericABTestRecord
      ) => {
        if (left.a === right.a) return 0;
        if (left.a > right.a) return 1;
        return -1;
      };

      const result = collection.chain().sort(sortFunction).data();
      expect(result.length).toEqual(3);
      expect(result[0].a).toEqual(1);
      expect(result[1].a).toEqual(2);
      expect(result[2].a).toEqual(5);
    });
  });

  describe('resultset compoundSort works correctly', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<INumericABTestRecord>('coll');

      collection.insert(NUMERIC_AB_TEST_RECORD);

      const data = collection.chain().compoundSort(['b', 'c']).data();
      expect(data.length).toEqual(3);
      expect(data[0].a).toEqual(5);
      expect(data[1].a).toEqual(1);
      expect(data[2].a).toEqual(2);

      const data2 = collection
        .chain()
        .compoundSort(['b', ['c', true]])
        .data();
      expect(data2.length).toEqual(3);
      expect(data2[0].a).toEqual(5);
      expect(data2[1].a).toEqual(2);
      expect(data2[2].a).toEqual(1);
    });
  });

  describe('resultset compoundSort on nested properties works correctly', () => {
    it('works', () => {
      interface ITestRecord {
        a: number;
        z: {
          y: {
            b: number;
            c: string;
          };
        };
      }

      const database = new Database('test.db');
      const collection = database.addCollection<ITestRecord>('coll');

      collection.insert([
        { a: 1, z: { y: { b: 9, c: 'first' } } },
        { a: 5, z: { y: { b: 7, c: 'second' } } },
        { a: 2, z: { y: { b: 9, c: 'third' } } },
      ]);

      const sortedData = collection
        .chain()
        .compoundSort(['z.y.b', 'z.y.c'])
        .data();
      expect(sortedData.length).toEqual(3);
      expect(sortedData[0].a).toEqual(5);
      expect(sortedData[1].a).toEqual(1);
      expect(sortedData[2].a).toEqual(2);

      const sortedData2 = collection
        .chain()
        .compoundSort(['z.y.b', ['z.y.c', true]])
        .data();
      expect(sortedData2.length).toEqual(3);
      expect(sortedData2[0].a).toEqual(5);
      expect(sortedData2[1].a).toEqual(2);
      expect(sortedData2[2].a).toEqual(1);
    });
  });

  describe('collection indexing', () => {
    it('mixed types sort as expected', () => {
      interface ITestRecord {
        a?: unknown;
        b: 5;
      }

      const database = new Database('database');
      const collection = database.addCollection<ITestRecord>('coll');
      collection.insert({ a: undefined, b: 5 });
      collection.insert({ b: 5 });
      collection.insert({ a: null, b: 5 });
      collection.insert({ a: 7, b: 5 });
      collection.insert({ a: '7', b: 5 });
      collection.insert({ a: 7.0, b: 5 });
      collection.insert({ a: '11', b: 5 });
      collection.insert({ a: '4', b: 5 });
      collection.insert({ a: new Date(), b: 5 });
      collection.insert({ a: { ack: 'object' }, b: 5 });
      collection.insert({ a: 7.5, b: 5 });
      collection.insert({ a: NaN, b: 5 });
      collection.insert({ a: [8, 1, 15], b: 5 });
      collection.insert({ a: 'asdf', b: 5 });

      // make sure un-indexed sort is as expected

      const result = collection.chain().simpleSort('a').data();
      const indexValues = result.map((x) => x.a);

      expect(indexValues.length).toEqual(14);

      // undefined, null, or NaN
      expect(!Number.isNaN(indexValues[0])).toEqual(true);
      expect(indexValues[1] == null).toEqual(true);
      expect(indexValues[2] == null).toEqual(true);
      expect(indexValues[3] == null).toEqual(true);

      expect(indexValues[4] === '4').toEqual(true);
      expect(indexValues[5] === '7' || indexValues[5] === 7).toEqual(true);
      expect(indexValues[6] === '7' || indexValues[5] === 7).toEqual(true);
      expect(indexValues[7] === '7' || indexValues[5] === 7).toEqual(true);
      expect(indexValues[8] === 7.5).toEqual(true);
      expect(indexValues[9] === '11').toEqual(true);
      expect(indexValues[10] instanceof Date).toEqual(true);
      expect(Array.isArray(indexValues[11])).toEqual(true);
      expect(typeof indexValues[12] === 'object').toEqual(true);
      expect(indexValues[13] === 'asdf').toEqual(true);

      // now make sure binary index uses same range
      collection.ensureIndex('a');

      const indexValues2 = collection.binaryIndices.a.values.map(
        (x) => collection.data[x].a
      );

      expect(indexValues.length).toEqual(14);

      // undefined, null, or NaN
      expect(!Number.isNaN(indexValues2[0])).toEqual(true);
      expect(indexValues2[1] == null).toEqual(true);
      expect(indexValues2[2] == null).toEqual(true);
      expect(indexValues2[3] == null).toEqual(true);

      expect(indexValues2[4] === '4').toEqual(true);
      expect(indexValues2[5] === '7' || indexValues2[5] === 7).toEqual(true);
      expect(indexValues2[6] === '7' || indexValues2[5] === 7).toEqual(true);
      expect(indexValues2[7] === '7' || indexValues2[5] === 7).toEqual(true);
      expect(indexValues2[8] === 7.5).toEqual(true);
      expect(indexValues2[9] === '11').toEqual(true);
      expect(indexValues2[10] instanceof Date).toEqual(true);
      expect(Array.isArray(indexValues2[11])).toEqual(true);
      expect(typeof indexValues2[12] === 'object').toEqual(true);
      expect(indexValues2[13] === 'asdf').toEqual(true);
    });

    it('works', () => {
      interface IABTestRecord {
        a: number;
        b: Date;
      }

      const now = new Date().getTime();
      const dt1 = new Date(now - 1000);
      const dt2 = new Date(now + 5000);
      const dt3 = new Date(2000, 6, 1);
      const dt4 = new Date(now + 2000);
      const dt5 = new Date(now - 3000);

      const collection = globalDatabase.addCollection<IABTestRecord>(
        'collectionWithIndex',
        {
          indices: ['b'],
        }
      );

      collection.insert({ a: 1, b: dt1 });
      collection.insert({ a: 2, b: dt2 });
      collection.insert({ a: 3, b: dt3 });
      collection.insert({ a: 4, b: dt4 });
      collection.insert({ a: 5, b: dt5 });

      // force index build while simultaneously testing date equality test
      const data = collection.find({ b: { $aeq: dt2 } });
      expect(data[0].a).toBe(2);

      // NOTE :
      // Binary Index imposes loose equality checks to construct its order
      // Strict equality checks would need to be extra filtering phase

      const sdt = new Date(now + 5000);

      // after refactoring binary indices to be loose equality/ranges everywhere,
      // this unit test passed, meaning the dteq op is not needed if binary index exists

      // results = collection.find({'b': sdt});
      // expect(results.length).toBe(0);

      // now try with new $dteq operator
      const data2 = collection.find({ b: { $dteq: sdt } });
      expect(data2.length).toBe(1);
      expect(data2[0].a).toBe(2);

      // now verify indices
      // they are array of 'positions' so both array index and value are zero based
      expect(collection.binaryIndices.b.values[0]).toBe(2);
      expect(collection.binaryIndices.b.values[1]).toBe(4);
      expect(collection.binaryIndices.b.values[2]).toBe(0);
      expect(collection.binaryIndices.b.values[3]).toBe(3);
      expect(collection.binaryIndices.b.values[4]).toBe(1);
    });
  });

  describe('simpleSort index intersect works correctly', () => {
    it('works', () => {
      const database = new Database('rss.db');
      const collection = database.addCollection<INumericABTestRecord>(
        'simpleSort',
        {
          indices: ['a'],
        }
      );

      collection.insert({ a: 4, b: 1 });
      collection.insert({ a: 7, b: 1 });
      collection.insert({ a: 3, b: 1 });
      collection.insert({ a: 9, b: 5 });
      collection.insert({ a: 14, b: 1 });
      collection.insert({ a: 17, b: 1 });
      collection.insert({ a: 13, b: 1 });
      collection.insert({ a: 19, b: 5 });

      // test explicit force index intercept simpleSort code path
      const results = collection
        .chain()
        .find({ b: 1 })
        .simpleSort('a', { forceIndexIntersect: true })
        .data();

      expect(results.length).toBe(6);
      for (let i = 0; i < results.length - 1; i += 1) {
        expect(Operators.$lte(results[i].a, results[i + 1].a));
      }

      // test explicit disable index intercept simpleSort code path
      const results2 = collection
        .chain()
        .find({ b: 1 })
        .simpleSort('a', { disableIndexIntersect: true })
        .data();
      expect(results2.length).toBe(6);
      for (let i = 0; i < results2.length - 1; i += 1) {
        expect(Operators.$lte(results2[i].a, results2[i + 1].a));
      }

      // test 'smart' simpleSort
      const results3 = collection.chain().find({ b: 1 }).simpleSort('a').data();
      expect(results3.length).toBe(6);
      for (let i = 0; i < results3.length - 1; i += 1) {
        expect(Operators.$lte(results3[i].a, results3[i + 1].a));
      }
    });
  });

  describe('simpleSort using javascript sorting works correctly', () => {
    it('works', () => {
      const database = new Database('rss.db');
      const collection =
        database.addCollection<INumericABTestRecord>('simpleSort');

      collection.insert({ a: 4, b: 1 });
      collection.insert({ a: 7, b: 1 });
      collection.insert({ a: 3, b: 1 });
      collection.insert({ a: 9, b: 5 });
      collection.insert({ a: 14, b: 1 });
      collection.insert({ a: 17, b: 1 });
      collection.insert({ a: 13, b: 1 });
      collection.insert({ a: 19, b: 5 });

      // test explicit force index intercept simpleSort code path
      const results = collection
        .chain()
        .find({ b: 1 })
        .simpleSort('a', { useJavascriptSorting: true })
        .data();

      expect(results.length).toBe(6);
      for (let i = 0; i < results.length - 1; i += 1) {
        expect(Operators.$lte(results[i].a, results[i + 1].a));
      }
    });
  });
});
