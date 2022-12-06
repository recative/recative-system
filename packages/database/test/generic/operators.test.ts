import { Database } from '../../src';
import { Operators } from '../../src/Operations';
import {
  ITreeTestRecord,
  IPersonTestRecord,
  IUnknownABTestRecord,
} from './definition';

/*
 * The following data represents a tree that should look like this:
 *
  ├A
  ├B
  └───┐
      ├C
  ├D
  └───┐
      ├E
      ├F
  ├G
  └───┐
      ├H
      ├I
      └───┐
          ├J
          ├K
      ├L
      ├M
  ├N
  └───┐
      ├O
      ├P
      └───┐
          ├Q
          └───┐
              ├R
              └───┐
                  ├S
              ├T
          ├U
      ├V
  ├W
  ├X
  └───┐
      ├Y
      ├Z
*
*/

const TEST_DATA = [
  {
    text: 'A',
    value: 'a',
    id: 1,
    order: 1,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'B',
    value: 'b',
    id: 2,
    order: 2,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'C',
    value: 'c',
    id: 3,
    order: 3,
    parents_id: [2],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'D',
    value: 'd',
    id: 4,
    order: 4,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'E',
    value: 'e',
    id: 5,
    order: 5,
    parents_id: [4],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'F',
    value: 'f',
    id: 6,
    order: 6,
    parents_id: [4],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'G',
    value: 'g',
    id: 7,
    order: 7,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'H',
    value: 'h',
    id: 8,
    order: 8,
    parents_id: [7],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'I',
    value: 'i',
    id: 9,
    order: 9,
    parents_id: [7],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'J',
    value: 'j',
    id: 10,
    order: 10,
    parents_id: [7, 9],
    level: 2,
    open: true,
    checked: false,
  },
  {
    text: 'K',
    value: 'k',
    id: 11,
    order: 11,
    parents_id: [7, 9],
    level: 2,
    open: true,
    checked: false,
  },
  {
    text: 'L',
    value: 'l',
    id: 12,
    order: 12,
    parents_id: [7],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'M',
    value: 'm',
    id: 13,
    order: 13,
    parents_id: [7],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'N',
    value: 'n',
    id: 14,
    order: 14,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'O',
    value: 'o',
    id: 15,
    order: 15,
    parents_id: [14],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'P',
    value: 'p',
    id: 16,
    order: 16,
    parents_id: [14],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'Q',
    value: 'q',
    id: 17,
    order: 17,
    parents_id: [14, 16],
    level: 2,
    open: true,
    checked: false,
  },
  {
    text: 'R',
    value: 'r',
    id: 18,
    order: 18,
    parents_id: [14, 16, 17],
    level: 3,
    open: true,
    checked: false,
  },
  {
    text: 'S',
    value: 's',
    id: 19,
    order: 19,
    parents_id: [14, 16, 17, 18],
    level: 4,
    open: true,
    checked: false,
  },
  {
    text: 'T',
    value: 't',
    id: 20,
    order: 20,
    parents_id: [14, 16, 17],
    level: 3,
    open: true,
    checked: false,
  },
  {
    text: 'U',
    value: 'u',
    id: 21,
    order: 21,
    parents_id: [14, 16],
    level: 2,
    open: true,
    checked: false,
  },
  {
    text: 'V',
    value: 'v',
    id: 22,
    order: 22,
    parents_id: [14],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'W',
    value: 'w',
    id: 23,
    order: 23,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'X',
    value: 'x',
    id: 24,
    order: 24,
    parents_id: [],
    level: 0,
    open: true,
    checked: false,
  },
  {
    text: 'Y',
    value: 'y',
    id: 25,
    order: 25,
    parents_id: [24],
    level: 1,
    open: true,
    checked: false,
  },
  {
    text: 'Z',
    value: 'z',
    id: 26,
    order: 26,
    parents_id: [24],
    level: 1,
    open: true,
    checked: false,
  },
];

describe('Testing operators', () => {
  it('$size works', () => {
    const db = new Database('testOps');
    const tree = db.addCollection<ITreeTestRecord>('tree');
    tree.insert(TEST_DATA);

    const documents = tree.chain().find({
      parents_id: { $size: 4 },
    });
    expect(documents.data().length).toEqual(1);
    expect(documents.data()[0].value).toEqual('s');
  });
});

describe('Individual operator tests', () => {
  it('$ne op works as expected', () => {
    expect(Operators.$ne(15, 20)).toEqual(true);

    expect(Operators.$ne(15, 15.0)).toEqual(false);

    expect(Operators.$ne(0, '0')).toEqual(true);

    expect(Operators.$ne(NaN, NaN)).toEqual(false);

    expect(Operators.$ne('en', NaN)).toEqual(true);

    expect(Operators.$ne(0, NaN)).toEqual(true);
  });

  it('misc eq ops works as expected', () => {
    expect(Operators.$aeq(1, 11)).toEqual(false);
    expect(Operators.$aeq(1, '1')).toEqual(true);
    expect(Operators.$aeq(undefined, null)).toEqual(true);

    const dt1 = new Date();
    const dt2 = new Date();
    dt2.setTime(dt1.getTime());
    const dt3 = new Date();
    dt3.setTime(dt1.getTime() - 10000);

    expect(Operators.$dteq(dt1, dt2)).toEqual(true);
    expect(Operators.$dteq(dt1, dt3)).toEqual(false);
  });

  it('$type op works as expected', () => {
    expect(Operators.$type('test', 'string')).toEqual(true);
    expect(Operators.$type(4, 'number')).toEqual(true);
    expect(Operators.$type({ a: 1 }, 'object')).toEqual(true);
    expect(Operators.$type(new Date(), 'date')).toEqual(true);
    expect(Operators.$type([1, 2], 'array')).toEqual(true);

    expect(Operators.$type('test', 'number')).toEqual(false);
    expect(Operators.$type(4, 'string')).toEqual(false);
    expect(Operators.$type({ a: 1 }, 'date')).toEqual(false);
    expect(Operators.$type(new Date(), 'object')).toEqual(false);
    expect(Operators.$type([1, 2], 'number')).toEqual(false);
  });

  it('$in op works as expected', () => {
    expect(Operators.$in(4, [1, 2, 3, 4])).toEqual(true);
    expect(Operators.$in(7, [1, 2, 3, 4])).toEqual(false);
    expect(Operators.$in('el', 'hello')).toEqual(true);
    expect(Operators.$in('le', 'hello')).toEqual(false);
  });

  it('$between op works as expected', () => {
    expect(Operators.$between(75, [5, 100])).toEqual(true);
    expect(Operators.$between(75, [75, 100])).toEqual(true);
    expect(Operators.$between(75, [5, 75])).toEqual(true);
    expect(Operators.$between(75, [5, 74])).toEqual(false);
    expect(Operators.$between(75, [76, 100])).toEqual(false);
    expect(Operators.$between(null, [5, 100])).toEqual(false);
  });

  it('$between find works as expected', () => {
    // test un-indexed code path
    let database = new Database('db');
    let collection = database.addCollection<IPersonTestRecord>('coll');
    collection.insert({ name: 'mjolnir', count: 73 });
    collection.insert({ name: 'gungnir', count: 5 });
    collection.insert({ name: 'tyrfing', count: 15 });
    collection.insert({ name: 'draupnir', count: 132 });

    // simple inner between
    let results = collection
      .chain()
      .find({ count: { $between: [10, 80] } })
      .simpleSort('count')
      .data();
    expect(results.length).toEqual(2);
    expect(results[0].count).toEqual(15);
    expect(results[1].count).toEqual(73);

    // range exceeds bounds
    results = collection.find({ count: { $between: [100, 200] } });
    expect(results.length).toEqual(1);
    expect(results[0].count).toEqual(132);

    // no matches in range
    expect(collection.find({ count: { $between: [133, 200] } }).length).toEqual(
      0
    );
    expect(collection.find({ count: { $between: [1, 4] } }).length).toEqual(0);

    // multiple low and high bounds
    database = new Database('db');
    collection = database.addCollection('coll');
    collection.insert({ name: 'first', count: 5 });
    collection.insert({ name: 'mjolnir', count: 15 });
    collection.insert({ name: 'gungnir', count: 15 });
    collection.insert({ name: 'tyrfing', count: 75 });
    collection.insert({ name: 'draupnir', count: 75 });
    collection.insert({ name: 'last', count: 100 });

    results = collection
      .chain()
      .find({ count: { $between: [15, 75] } })
      .simpleSort('count')
      .data();
    expect(results.length).toEqual(4);
    expect(results[0].count).toEqual(15);
    expect(results[1].count).toEqual(15);
    expect(results[2].count).toEqual(75);
    expect(results[3].count).toEqual(75);

    expect(collection.find({ count: { $between: [-1, 4] } }).length).toEqual(0);
    expect(collection.find({ count: { $between: [-1, 5] } }).length).toEqual(1);
    expect(collection.find({ count: { $between: [-1, 6] } }).length).toEqual(1);
    expect(collection.find({ count: { $between: [99, 140] } }).length).toEqual(
      1
    );
    expect(collection.find({ count: { $between: [100, 140] } }).length).toEqual(
      1
    );
    expect(collection.find({ count: { $between: [101, 140] } }).length).toEqual(
      0
    );
    expect(collection.find({ count: { $between: [12, 76] } }).length).toEqual(
      4
    );
    expect(collection.find({ count: { $between: [20, 60] } }).length).toEqual(
      0
    );

    // now test -indexed- code path
    collection.ensureIndex('count');

    results = collection
      .chain()
      .find({ count: { $between: [15, 75] } })
      .simpleSort('count')
      .data();
    expect(results.length).toEqual(4);
    expect(results[0].count).toEqual(15);
    expect(results[1].count).toEqual(15);
    expect(results[2].count).toEqual(75);
    expect(results[3].count).toEqual(75);

    expect(collection.find({ count: { $between: [-1, 4] } }).length).toEqual(0);
    expect(collection.find({ count: { $between: [-1, 5] } }).length).toEqual(1);
    expect(collection.find({ count: { $between: [-1, 6] } }).length).toEqual(1);
    expect(collection.find({ count: { $between: [99, 140] } }).length).toEqual(
      1
    );
    expect(collection.find({ count: { $between: [100, 140] } }).length).toEqual(
      1
    );
    expect(collection.find({ count: { $between: [101, 140] } }).length).toEqual(
      0
    );
    expect(collection.find({ count: { $between: [12, 76] } }).length).toEqual(
      4
    );
    expect(collection.find({ count: { $between: [20, 60] } }).length).toEqual(
      0
    );
  });

  it('indexed $in find works as expected', () => {
    // test un-indexed code path
    const database = new Database('db');
    const collection = database.addCollection<IPersonTestRecord>('coll', {
      indices: ['count'],
    });
    collection.insert({ name: 'mjolnir', count: 73 });
    collection.insert({ name: 'gungnir', count: 5 });
    collection.insert({ name: 'tyrfing', count: 15 });
    collection.insert({ name: 'draupnir', count: 132 });

    const results = collection
      .chain()
      .find({ count: { $in: [15, 73] } })
      .simpleSort('count')
      .data();
    expect(results.length).toEqual(2);
    expect(results[0].count).toEqual(15);
    expect(results[1].count).toEqual(73);
  });

  it('nested indexed $in find works as expected', () => {
    interface INestedPersonTestRecord extends IPersonTestRecord {
      nested: { count: number };
    }

    const database = new Database('db');
    const collection = database.addCollection<INestedPersonTestRecord>('coll', {
      indices: ['nested.count'],
    });
    collection.insert({ name: 'mjolnir', nested: { count: 73 } });
    collection.insert({ name: 'gungnir', nested: { count: 5 } });
    collection.insert({ name: 'tyrfing', nested: { count: 15 } });
    collection.insert({ name: 'draupnir', nested: { count: 132 } });

    const results = collection
      .chain()
      .find({ 'nested.count': { $in: [15, 73] } })
      .simpleSort('nested.count')
      .data();

    expect(results.length).toEqual(2);
    expect(results[0].nested.count).toEqual(15);
    expect(results[1].nested.count).toEqual(73);
  });

  it('ops work with mixed datatypes', () => {
    const database = new Database('db');
    const collection = database.addCollection<IUnknownABTestRecord>('coll');

    collection.insert({ a: null, b: 5 });
    collection.insert({ a: 'asdf', b: 5 });
    collection.insert({ a: '11', b: 5 });
    collection.insert({ a: 2, b: 5 });
    collection.insert({ a: '1', b: 5 });
    collection.insert({ a: '4', b: 5 });
    collection.insert({ a: 7.2, b: 5 });
    collection.insert({ a: '5', b: 5 });
    collection.insert({ a: 4, b: 5 });
    collection.insert({ a: '18.1', b: 5 });

    expect(collection.findOne({ a: 'asdf' })?.a).toEqual('asdf');
    // default equality is strict, otherwise use $aeq
    expect(collection.find({ a: 4 }).length).toEqual(1);
    expect(collection.find({ a: '4' }).length).toEqual(1);
    // default range ops (lt, lte, gt, gte, between) are loose
    expect(collection.find({ a: { $between: [4, 12] } }).length).toEqual(5); // "4", 4, "5", 7.2, "11"
    expect(collection.find({ a: { $gte: '7.2' } }).length).toEqual(4); // 7.2, "11", "18.1", "asdf" (strings after numbers)
    expect(
      collection
        .chain()
        .find({ a: { $gte: '7.2' } })
        .find({ a: { $finite: true } })
        .data().length
    ).toEqual(3); // 7.2, "11", "18.1"
    expect(collection.find({ a: { $gt: '7.2' } }).length).toEqual(3); // "11", "18.1", "asdf"
    expect(collection.find({ a: { $lte: '7.2' } }).length).toEqual(7); // 7.2, "5", "4", 4, 2, 1, null

    // expect same behavior when binary index is applied to property being queried
    collection.ensureIndex('a');

    expect(collection.findOne({ a: 'asdf' })?.a).toEqual('asdf');
    // default equality is strict, otherwise use $aeq
    expect(collection.find({ a: 4 }).length).toEqual(1);
    expect(collection.find({ a: '4' }).length).toEqual(1);
    // default range ops (lt, lte, gt, gte, between) are loose
    expect(collection.find({ a: { $between: [4, 12] } }).length).toEqual(5); // "4", 4, "5", 7.2, "11"
    expect(collection.find({ a: { $gte: '7.2' } }).length).toEqual(4); // 7.2, "11", "18.1", "asdf" (strings after numbers)
    expect(
      collection
        .chain()
        .find({ a: { $gte: '7.2' } })
        .find({ a: { $finite: true } })
        .data().length
    ).toEqual(3); // 7.2, "11", "18.1"
    expect(collection.find({ a: { $gt: '7.2' } }).length).toEqual(3); // "11", "18.1", "asdf"
    expect(collection.find({ a: { $lte: '7.2' } }).length).toEqual(7); // 7.2, "5", "4", 4, 2, 1, null
  });

  it('js range ops work as expected', () => {
    const db = new Database('db');
    const coll = db.addCollection('coll');

    coll.insert({ a: null, b: 5 });
    coll.insert({ a: '11', b: 5 });
    coll.insert({ a: 2, b: 5 });
    coll.insert({ a: '1', b: 5 });
    coll.insert({ a: '4', b: 5 });
    coll.insert({ a: 7.2, b: 5 });
    coll.insert({ a: '5', b: 5 });
    coll.insert({ a: 4, b: 5 });
    coll.insert({ a: '18.1', b: 5 });

    expect(coll.find({ a: { $jgt: 5 } }).length).toEqual(3);
    expect(coll.find({ a: { $jgte: 5 } }).length).toEqual(4);
    expect(coll.find({ a: { $jlt: 7.2 } }).length).toEqual(6);
    expect(coll.find({ a: { $jlte: 7.2 } }).length).toEqual(7);
    expect(coll.find({ a: { $jbetween: [3.2, 7.8] } }).length).toEqual(4);
  });

  it('$regex ops work as expected', () => {
    const db = new Database('db');
    const coll = db.addCollection('coll');

    coll.insert({ name: 'mjolnir', count: 73 });
    coll.insert({ name: 'gungnir', count: 5 });
    coll.insert({ name: 'tyrfing', count: 15 });
    coll.insert({ name: 'draupnir', count: 132 });

    expect(coll.find({ name: { $regex: 'nir' } }).length).toEqual(3);
    expect(coll.find({ name: { $not: { $regex: 'nir' } } }).length).toEqual(1);

    expect(coll.find({ name: { $regex: 'NIR' } }).length).toEqual(0);
    expect(coll.find({ name: { $regex: ['NIR', 'i'] } }).length).toEqual(3);
    expect(
      coll.find({ name: { $not: { $regex: ['NIR', 'i'] } } }).length
    ).toEqual(1);

    expect(coll.find({ name: { $regex: /NIR/i } }).length).toEqual(3);
    expect(coll.find({ name: { $not: { $regex: /NIR/i } } }).length).toEqual(1);
  });

  it('query nested documents', () => {
    const database = new Database('db');
    const collection = database.addCollection('coll');

    collection.insert({ a: null, b: 5, c: { a: 1 } });
    collection.insert({ a: '11', b: 5, c: { a: 1 } });
    collection.insert({ a: 2, b: 5, c: { a: 1 } });
    collection.insert({ a: '1', b: 5, c: { b: 1 } });
    collection.insert({ a: '4', b: 5, c: { b: 1 } });
    collection.insert({ a: 7.2, b: 5 });
    collection.insert({ a: '5', b: 5 });
    collection.insert({ a: 4, b: 5 });
    collection.insert({ a: '18.1', b: 5 });

    expect(collection.find({ 'c.a': { $eq: 1 } }).length).toEqual(3);
    expect(collection.find({ 'c.a': { $eq: undefined } }).length).toEqual(6);
    expect(collection.find({ c: { $eq: undefined } }).length).toEqual(4);
  });

  it('query nested documents with nullable object', () => {
    const database = new Database('db');
    const collection = database.addCollection('coll');

    collection.insert({ a: null, b: 5, c: { a: 1 } });
    collection.insert({ a: '11', b: 5, c: { a: 1 } });
    collection.insert({ a: '11', b: 5, c: null });

    expect(collection.find({ 'c.a': { $eq: 1 } }).length).toEqual(2);
  });

  it('$exists ops work as expected', () => {
    const database = new Database('db');
    const collection = database.addCollection('coll');

    collection.insert({ a: null, b: 5, c: { a: 1 } });
    collection.insert({ a: '11', b: 5, c: { a: 1 } });
    collection.insert({ a: 2, b: 5, c: { a: 1 } });
    collection.insert({ a: '1', b: 5, c: { b: 1 } });
    collection.insert({ a: '4', b: 5, c: { b: 1 } });
    collection.insert({ a: 7.2, b: 5 });
    collection.insert({ a: '5', b: 5 });
    collection.insert({ a: 4, b: 5 });
    collection.insert({ a: '18.1', b: 5 });

    expect(collection.find({ 'c.a': { $exists: true } }).length).toEqual(3);
    expect(collection.find({ 'c.a': { $exists: false } }).length).toEqual(6);
    expect(collection.find({ 'c.a.b': { $exists: true } }).length).toEqual(0);
    expect(collection.find({ 'c.a.b': { $exists: false } }).length).toEqual(9);
    expect(collection.find({ c: { $exists: true } }).length).toEqual(5);
    expect(collection.find({ c: { $exists: false } }).length).toEqual(4);
  });

  it('$elemMatch op works as expected', () => {
    const database = new Database('db');
    const collection = database.addCollection('coll');
    collection.insert({
      entries: [
        { name: 'foo', count: 1 },
        {
          name: 'bar',
          count: 2,
          nested: [{ foo: { bar: [0, 1] }, baz: true }],
        },
      ],
    });
    collection.insert({
      entries: [
        { name: 'baz', count: 2 },
        {
          name: 'bar',
          count: 3,
          nested: [{ foo: { bar: [1, 2] }, baz: false }],
        },
      ],
    });

    expect(
      collection.find({
        entries: { $elemMatch: { name: 'bar' } },
      }).length
    ).toBe(2);

    expect(
      collection.find({
        entries: { $elemMatch: { name: 'bar', count: 2 } },
      }).length
    ).toBe(1);

    expect(
      collection.find({
        entries: {
          $elemMatch: { name: { $eq: 'bar' }, count: { $between: [2, 3] } },
        },
      }).length
    ).toBe(2);

    expect(
      collection.find({
        entries: { $elemMatch: { name: 'bar' } },
        'entries.count': 1,
      }).length
    ).toBe(1);

    expect(
      collection.find({
        'entries.nested': {
          $elemMatch: { 'foo.bar': { $contains: 1 } },
        },
      }).length
    ).toBe(2);

    expect(
      collection.find({
        'entries.nested': {
          $elemMatch: { 'foo.bar': { $contains: 1 }, baz: false },
        },
      }).length
    ).toBe(1);
  });

  it('$$op column comparisons work', () => {
    const database = new Database('db');
    const collection = database.addCollection('coll');

    collection.insert({ a: null, b: 5 });
    collection.insert({ a: '5', b: 5 });
    collection.insert({ a: 5, b: 5 });
    collection.insert({ a: 6, b: 5 });
    collection.insert({ a: 3, b: 5 });
    collection.insert({ a: 3, b: 'number' });

    // standard case
    expect(collection.find({ a: { $$eq: 'b' } }).length).toEqual(1);
    expect(collection.find({ a: { $$aeq: 'b' } }).length).toEqual(2);
    expect(collection.find({ a: { $$ne: 'b' } }).length).toEqual(5);
    expect(collection.find({ a: { $$gt: 'b' } }).length).toEqual(1);
    expect(collection.find({ a: { $$gte: 'b' } }).length).toEqual(3);

    // function variant
    expect(
      collection.find({
        a: {
          $$gt: (record) => {
            return record.b - 1;
          },
        },
      }).length
    ).toEqual(4);

    // comparison on filtered rows
    expect(
      collection.find({ b: { $gt: 0 }, a: { $$aeq: 'b' } }).length
    ).toEqual(2);

    // type
    expect(collection.find({ a: { $$type: 'b' } }).length).toEqual(1);
    expect(collection.find({ a: { $type: { $$eq: 'b' } } }).length).toEqual(1);

    // $not, $and, $or
    expect(collection.find({ a: { $not: { $$type: 'b' } } }).length).toEqual(5);
    expect(
      collection.find({ a: { $and: [{ $type: 'number' }, { $$gte: 'b' }] } })
        .length
    ).toEqual(2);
    expect(
      collection.find({ a: { $or: [{ $eq: null }, { $$gt: 'b' }] } }).length
    ).toEqual(2);

    // $len
    collection.insert({ text1: 'bla', len: 10 });
    collection.insert({ text1: 'abcdef', len: 6 });
    collection.insert({ text1: 'abcdef', len: 3 });
    expect(
      collection.find({ text1: { $len: { $$eq: 'len' } } }).length
    ).toEqual(1);

    // $size
    collection.insert({ array1: [1, 2, 3], size: 2 });
    collection.insert({ array1: [1, 2], size: 1 });
    collection.insert({ array1: [1, 2], size: 3 });
    collection.insert({ array1: [1, 2, 3, 4], size: 5 });
    expect(
      collection.find({ array1: { $size: { $$eq: 'size' } } }).length
    ).toEqual(0);
    expect(
      collection.find({ array1: { $size: { $$lt: 'size' } } }).length
    ).toEqual(2);

    // $elemMatch
    collection.insert({ els: [{ a: 1, b: 2 }] });
    collection.insert({
      els: [
        { a: 1, b: 2 },
        { a: 2, b: 2 },
      ],
    });
    expect(
      collection.find({ els: { $elemMatch: { a: { $$eq: 'b' } } } }).length
    ).toEqual(1);

    // $elemMatch - dot scan
    collection.insert({ els2: [{ a: { val: 1 }, b: 2 }] });
    collection.insert({
      els2: [
        { a: { val: 1 }, b: 2 },
        { a: { val: 2 }, b: 2 },
      ],
    });
    expect(
      collection.find({ els2: { $elemMatch: { 'a.val': { $$eq: 'b' } } } })
        .length
    ).toEqual(1);

    // dot notation
    collection.insert({ c: { val: 5 }, b: 5 });
    collection.insert({ c: { val: 6 }, b: 5 });
    collection.insert({ c: { val: 7 }, b: 6 });
    expect(collection.find({ 'c.val': { $$gt: 'b' } }).length).toEqual(2);

    // dot notation - on filtered rows
    expect(
      collection.find({ b: { $gt: 0 }, 'c.val': { $$gt: 'b' } }).length
    ).toEqual(2);
  });
});
