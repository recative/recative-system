import {
  Collection,
  CollectionDocumentInsertEventName,
  Database,
  DatabaseCloseEventName,
  ensureDocumentType,
  ICollectionDocument,
} from '../../src';
import { MemoryAdapter } from '../../src/adapter/memory';
import { hasOwn } from '../../src/utils/hasOwn';
import {
  IABTestRecord,
  IIdStrFloatTestRecord,
  INumericABTestRecord,
  IPersonTestRecord,
  IUserAddrRecord,
  IUserLanguageRecord,
} from './definition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalDatabase: Database<any>;
declare const globalCollection: Collection<IUserLanguageRecord>;
declare const globalDocument: IUserLanguageRecord & ICollectionDocument;

describe('database', () => {
  const compareDocument = (a: ICollectionDocument, b: ICollectionDocument) => {
    if (a.$loki < b.$loki) return -1;
    if (a.$loki > b.$loki) return 1;

    return 0;
  };

  beforeEach(() => {
    globalThis.globalDatabase = new Database('test.json');
    globalThis.globalCollection = globalDatabase.addCollection('user');

    globalCollection.insert({
      name: 'dave',
      age: 25,
      lang: 'English',
    });

    globalCollection.insert({
      name: 'joe',
      age: 39,
      lang: 'Italian',
    });

    globalThis.globalDocument = globalCollection.insert({
      name: 'jonas',
      age: 30,
      lang: 'Swedish',
    });
  });

  describe('core methods', () => {
    it('works', () => {
      const database = new Database('regexTests');
      const collection = database.addCollection<IUserLanguageRecord>('user');
      collection.insert({
        name: 'abcd',
        age: 25,
        lang: 'English',
      });

      collection.insert({
        name: 'AbCd',
        age: 39,
        lang: 'Italian',
      });

      collection.insert({
        name: 'acdb',
        age: 30,
        lang: 'Swedish',
      });

      collection.insert({
        name: 'aBcD',
        age: 30,
        lang: 'Swedish',
      });

      // findOne()
      const document0 = collection.findOne({
        name: 'jonas',
      });
      expect(document0?.name).toEqual('jonas');

      // find()
      const document1 = collection.find({
        age: {
          $gt: 29,
        },
      });
      expect(document1.length).toEqual(2);

      // $regex test with raw regex
      expect(
        collection.find({
          name: {
            $regex: /o/,
          },
        }).length
      ).toEqual(2);

      // case insensitive regex with array of ["pattern", "options"]
      expect(
        collection.find({
          name: {
            $regex: ['abcd', 'i'],
          },
        }).length
      ).toEqual(3);

      // regex with single encoded string pattern (no options)
      expect(
        collection.find({
          name: {
            $regex: 'cd',
          },
        }).length
      ).toEqual(2);

      // $contains
      expect(
        collection.find({
          name: {
            $contains: 'jo',
          },
        }).length
      ).toEqual(2);

      // $contains using array element
      expect(
        collection.find({
          name: {
            $contains: ['jo'],
          },
        }).length
      ).toEqual(2);

      // $contains any with one value
      expect(
        collection.find({
          name: {
            $containsAny: 'nas',
          },
        }).length
      ).toEqual(1);

      // $contains any with multiple values
      expect(
        collection.find({
          name: {
            $containsAny: ['nas', 'dave'],
          },
        }).length
      ).toEqual(2);

      // insert() : try inserting existing document (should fail), try adding doc with legacy id column
      const insertedDocument = collection.findOne({
        name: 'dave',
      });

      if (!insertedDocument) {
        throw new TypeError(`Inserted document not found`);
      }

      expect(() => {
        collection.insert(insertedDocument);
      }).toThrow();

      // our collections are not strongly typed so lets invent some object that has its 'own' id column
      // ^ TYPESCRIPT REFACTOR: SHIT.

      const documentToBeAdded0 = {
        id: 999,
        name: 'test',
        first: 'aaa',
        last: 'bbb',
        city: 'pasadena',
        state: 'ca',
      };

      expect(() => {
        collection.insert(documentToBeAdded0);
      }).not.toThrow();

      // remove object so later queries access valid properties on all objects
      // the object itself should have been modified
      collection.remove(ensureDocumentType(documentToBeAdded0));

      // update()
      const documentToBeAdded1 = {
        id: 998,
        name: 'test',
        first: 'aaa',
        last: 'bbb',
        city: 'pasadena',
        state: 'ca',
      };

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection.update(documentToBeAdded1 as any);
      }).toThrow();

      // remove() - add some bogus object to remove
      const dataCount = collection.data.length;

      const documentToBeAdded2 = {
        name: 'test',
        first: 'aaa',
        last: 'bbb',
        city: 'pasadena',
        state: 'ca',
      };

      collection.insert(documentToBeAdded2);

      expect(dataCount + 1).toEqual(collection.data.length);
      collection.remove(ensureDocumentType(documentToBeAdded2));
      expect(dataCount).toEqual(collection.data.length);
    });
  });

  describe('meta validation', () => {
    it('meta set on returned objects', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<INumericABTestRecord>('tc');
      const now = new Date().getTime();

      // verify single insert return objs have meta set properly
      const insertedDocument = collection.insert({ a: 1, b: 2 });
      expect(() => ensureDocumentType(insertedDocument)).not.toThrow();
      expect(insertedDocument.meta.created).not.toBeLessThan(now);

      // verify batch insert return objs have meta set properly
      const insertedDocuments = collection.insert([
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ]);
      expect(Array.isArray(insertedDocuments));
      insertedDocuments.forEach((x) => {
        expect(() => ensureDocumentType(x)).not.toThrow();
        expect(x.meta.created).not.toBeLessThan(now);
      });
    });

    it('meta set on events', (done) => {
      const database = new Database('test.db');
      const collection = database.addCollection('tc');
      const now = new Date().getTime();

      collection.on(
        CollectionDocumentInsertEventName,
        ({ detail: { documents } }) => {
          documents.forEach((x) => {
            expect(() => ensureDocumentType(x)).not.toThrow();
            expect(x.meta.created).not.toBeLessThan(now);
          });
          done();
        }
      );

      // verify single inserts emit with obj which has meta set properly
      collection.insert({ a: 1, b: 2 });

      // verify batch inserts emit with objs which have meta set properly
      collection.insert([
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ]);
    });

    it('meta not set on returned objects', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<IABTestRecord>('tc', {
        disableMeta: true,
      });

      // verify single insert return objs do not have meta set
      const insertedDocument = collection.insert({ a: 1, b: 2 });
      expect(() => ensureDocumentType(insertedDocument)).not.toThrow();

      // verify batch insert return objs do not have meta set
      const insertedDocuments = collection.insert([
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ]);
      expect(Array.isArray(insertedDocuments));
      insertedDocuments.forEach((x) =>
        expect(() => ensureDocumentType(x)).not.toThrow()
      );
    });
  });

  describe('dot notation', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<IUserAddrRecord>('collection');

      collection.insert({
        first: 'aaa',
        last: 'bbb',
        addr: {
          street: '111 any street',
          state: 'AS',
          zip: 12345,
        },
      });

      collection.insert({
        first: 'ddd',
        last: 'eee',
        addr: {
          street: '222 any street',
          state: 'FF',
          zip: 32345,
        },
      });

      // make sure it can handle case where top level property doesn't exist
      collection.insert({
        first: 'mmm',
        last: 'nnn',
      });

      // make sure it can handle case where sub-scan property doesn't exist
      collection.insert({
        first: 'ooo',
        last: 'ppp',
        addr: {
          state: 'YY',
        },
      });

      collection.insert({
        first: 'jjj',
        last: 'kkk',
        addr: {
          street: '777 any street',
          state: 'WW',
          zip: 12345,
        },
      });

      // test dot notation using regular find (with multiple results)
      const firstResult = collection.find({
        'addr.zip': 12345,
      });
      expect(firstResult.length).toEqual(2);
      expect(firstResult[0].addr?.zip).toEqual(12345);
      expect(firstResult[1].addr?.zip).toEqual(12345);

      // test not notation using findOne
      const secObj = collection.findOne({
        'addr.state': 'FF',
      });

      expect(secObj !== null).toBeTruthy();
      expect(secObj?.addr?.zip).toEqual(32345);
    });
  });

  // We only support dot notation involving array when
  // the leaf property is the array.  This verifies that functionality
  describe('dot notation across leaf object array', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('collection');

      collection.insert({
        id: 1,
        children: [
          {
            someProperty: 11,
          },
        ],
      });

      collection.insert({
        id: 2,
        children: [
          {
            someProperty: 22,
          },
        ],
      });

      collection.insert({
        id: 3,
        children: [
          {
            someProperty: 33,
          },
          {
            someProperty: 22,
          },
        ],
      });

      collection.insert({
        id: 4,
        children: [
          {
            someProperty: 11,
          },
        ],
      });

      collection.insert({
        id: 5,
        children: [
          {
            missing: null,
          },
        ],
      });

      collection.insert({
        id: 6,
        children: [
          {
            someProperty: null,
          },
        ],
      });

      expect(collection.find({ 'children.someProperty': 33 }).length).toEqual(
        1
      );
      expect(collection.find({ 'children.someProperty': 11 }).length).toEqual(
        2
      );
      expect(collection.find({ 'children.someProperty': 22 }).length).toEqual(
        2
      );
    });
  });

  describe('dot notation terminating at leaf array', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('collection');

      collection.insert({
        relations: {
          ids: [379],
        },
      });

      collection.insert({
        relations: {
          ids: [12, 379],
        },
      });

      collection.insert({
        relations: {
          ids: [111],
        },
      });

      const results = collection.find({
        'relations.ids': { $contains: 379 },
      });

      expect(results.length).toEqual(2);
    });
  });

  describe('dot notation across child array', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('collection');

      collection.insert({
        id: 1,
        children: [
          {
            id: 11,
            someArray: [
              {
                someProperty: 111,
              },
            ],
          },
        ],
      });

      collection.insert({
        id: 2,
        children: [
          {
            id: 22,
            someArray: [
              {
                someProperty: 222,
              },
            ],
          },
        ],
      });

      collection.insert({
        id: 3,
        children: [
          {
            id: 33,
            someArray: [
              {
                someProperty: 333,
              },
              {
                someProperty: 222,
              },
            ],
          },
        ],
      });

      collection.insert({
        id: 4,
        children: [
          {
            id: 44,
            someArray: [
              {
                someProperty: 111,
              },
            ],
          },
        ],
      });

      collection.insert({
        id: 5,
        children: [
          {
            id: 55,
            someArray: [
              {
                missing: null,
              },
            ],
          },
        ],
      });

      collection.insert({
        id: 6,
        children: [
          {
            id: 66,
            someArray: [
              {
                someProperty: null,
              },
            ],
          },
        ],
      });

      expect(
        collection.find({
          'children.someArray.someProperty': 333,
        }).length
      ).toEqual(1);

      expect(
        collection.find({ 'children.someArray.someProperty': 111 }).length
      ).toEqual(2);

      expect(
        collection.find({ 'children.someArray.someProperty': 222 }).length
      ).toEqual(2);

      expect(
        collection.find({
          $and: [{ id: 3 }, { 'children.someArray.someProperty': 222 }],
        }).length
      ).toEqual(1);

      expect(
        collection.find({
          $and: [{ id: 1 }, { 'children.someArray.someProperty': 222 }],
        }).length
      ).toEqual(0);

      expect(
        collection.find({
          $or: [{ id: 1 }, { 'children.someArray.someProperty': 222 }],
        }).length
      ).toEqual(3);
    });
  });

  describe('calculateRange', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<IIdStrFloatTestRecord>('eic');
      collection.ensureIndex('testId');

      collection.insert({
        testId: 1,
        testString: 'hhh',
        testFloat: 5.2,
      }); // 0
      collection.insert({
        testId: 1,
        testString: 'aaa',
        testFloat: 6.2,
      }); // 1
      collection.insert({
        testId: 5,
        testString: 'zzz',
        testFloat: 7.2,
      }); // 2
      collection.insert({
        testId: 6,
        testString: 'ggg',
        testFloat: 1.2,
      }); // 3
      collection.insert({
        testId: 9,
        testString: 'www',
        testFloat: 8.2,
      }); // 4
      collection.insert({
        testId: 11,
        testString: 'yyy',
        testFloat: 4.2,
      }); // 5
      collection.insert({
        testId: 22,
        testString: 'yyz',
        testFloat: 9.2,
      }); // 6
      collection.insert({
        testId: 23,
        testString: 'm',
        testFloat: 2.2,
      }); // 7

      const chain = collection.chain();
      chain.find({
        testId: 1,
      }); // force index to be built

      // ranges are order of sequence in index not data array positions
      expect(collection.calculateRange('$eq', 'testId', 22)).toEqual([6, 6]);

      expect(collection.calculateRange('$eq', 'testId', 1)).toEqual([0, 1]);

      expect(collection.calculateRange('$eq', 'testId', 7)).toEqual([0, -1]);

      expect(collection.calculateRange('$gte', 'testId', 23)).toEqual([7, 7]);

      // reference this new record for future evaluations
      collection.insert({
        testId: 23,
        testString: 'bbb',
        testFloat: 1.9,
      });

      // test when all records are in range
      expect(collection.calculateRange('$lt', 'testId', 25)).toEqual([0, 8]);

      expect(collection.calculateRange('$lte', 'testId', 25)).toEqual([0, 8]);

      expect(collection.calculateRange('$gt', 'testId', 0)).toEqual([0, 8]);

      expect(collection.calculateRange('$gte', 'testId', 0)).toEqual([0, 8]);

      expect(collection.calculateRange('$gte', 'testId', 23)).toEqual([7, 8]);

      expect(collection.calculateRange('$gte', 'testId', 24)).toEqual([0, -1]);

      expect(collection.calculateRange('$lte', 'testId', 5)).toEqual([0, 2]);

      expect(collection.calculateRange('$lte', 'testId', 1)).toEqual([0, 1]);

      expect(collection.calculateRange('$lte', 'testId', -1)).toEqual([0, -1]);

      // add another index on string property
      collection.ensureIndex('testString');
      chain.find({
        testString: 'asdf',
      }); // force index to be built

      expect(collection.calculateRange('$lte', 'testString', 'ggg')).toEqual([
        0, 2,
      ]); // includes record added in middle

      expect(collection.calculateRange('$gte', 'testString', 'm')).toEqual([
        4, 8,
      ]); // offset by 1 because of record in middle

      // add some float range evaluations
      collection.ensureIndex('testFloat');
      chain.find({
        testFloat: '1.1',
      }); // force index to be built

      expect(collection.calculateRange('$lte', 'testFloat', 1.2)).toEqual([
        0, 0,
      ]);

      expect(collection.calculateRange('$eq', 'testFloat', 1.111)).toEqual([
        0, -1,
      ]);

      expect(collection.calculateRange('$eq', 'testFloat', 8.2)).toEqual([
        7, 7,
      ]); // 8th pos

      expect(collection.calculateRange('$gte', 'testFloat', 1.0)).toEqual([
        0, 8,
      ]); // 8th pos
    });
  });

  describe('lazy indexLifecycle', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('ilc', {
        adaptiveBinaryIndices: false,
      });

      const hasIdx = hasOwn(collection.binaryIndices, 'testId');
      expect(hasIdx).toEqual(false);

      collection.ensureIndex('testId');
      expect(hasOwn(collection.binaryIndices, 'testId')).toEqual(true);
      expect(collection.binaryIndices.testId.dirty).toEqual(false);
      expect(collection.binaryIndices.testId.values).toEqual([]);

      collection.insert({
        testId: 5,
      });
      expect(collection.binaryIndices.testId.dirty).toEqual(true);
      collection.insert({
        testId: 8,
      });
      expect(collection.binaryIndices.testId.values).toEqual([]);
      expect(collection.binaryIndices.testId.dirty).toEqual(true);

      collection.find({
        testId: 8,
      }); // should force index build
      expect(collection.binaryIndices.testId.dirty).toEqual(false);
      expect(collection.binaryIndices.testId.values.length).toEqual(2);
    });
  });

  describe('indexes', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('test', {
        indices: ['testId'],
      });

      collection.insert({
        testId: 1,
      });
      collection.insert({
        testId: 2,
      });
      collection.insert({
        testId: 5,
      });
      collection.insert({
        testId: 5,
      });
      collection.insert({
        testId: 9,
      });
      collection.insert({
        testId: 11,
      });
      collection.insert({
        testId: 22,
      });
      collection.insert({
        testId: 22,
      });

      // lte
      expect(
        collection.find({
          testId: {
            $lte: 1,
          },
        }).length
      ).toEqual(1);

      expect(
        collection.find({
          testId: {
            $lte: 22,
          },
        }).length
      ).toEqual(8);

      // lt
      expect(
        collection.find({
          testId: {
            $lt: 1,
          },
        }).length
      ).toEqual(0);

      expect(
        collection.find({
          testId: {
            $lt: 22,
          },
        }).length
      ).toEqual(6);

      // eq
      expect(
        collection.find({
          testId: {
            $eq: 22,
          },
        }).length
      ).toEqual(2);

      // gt
      expect(
        collection.find({
          testId: {
            $gt: 22,
          },
        }).length
      ).toEqual(0);

      expect(
        collection.find({
          testId: {
            $gt: 5,
          },
        }).length
      ).toEqual(4);

      // gte
      expect(
        collection.find({
          testId: {
            $gte: 5,
          },
        }).length
      ).toEqual(6);

      expect(
        collection.find({
          testId: {
            $gte: 10,
          },
        }).length
      ).toEqual(3);
    });
  });

  describe('resultSet', () => {
    it('works', () => {
      // resultSet find
      expect(
        globalCollection
          .chain()
          .find({
            age: {
              $gte: 30,
            },
          })
          .where((x) => {
            return x.lang === 'Swedish';
          })
          .data().length
      ).toEqual(1);

      // resultSet offset
      expect(globalCollection.chain().offset(1).data().length).toEqual(
        globalCollection.data.length - 1
      );

      // resultSet limit
      expect(globalCollection.chain().limit(2).data().length).toEqual(2);
    });
  });

  describe('andOrOps', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('eic');

      collection.insert({
        testId: 1,
        testString: 'hhh',
        testFloat: 5.2,
      }); // 0
      collection.insert({
        testId: 1,
        testString: 'bbb',
        testFloat: 6.2,
      }); // 1
      collection.insert({
        testId: 5,
        testString: 'zzz',
        testFloat: 7.2,
      }); // 2
      collection.insert({
        testId: 6,
        testString: 'ggg',
        testFloat: 1.2,
      }); // 3
      collection.insert({
        testId: 9,
        testString: 'www',
        testFloat: 8.2,
      }); // 4
      collection.insert({
        testId: 11,
        testString: 'yyy',
        testFloat: 4.2,
      }); // 5
      collection.insert({
        testId: 22,
        testString: 'bbb',
        testFloat: 9.2,
      }); // 6
      collection.insert({
        testId: 23,
        testString: 'm',
        testFloat: 2.2,
      }); // 7

      // coll.find explicit $and
      expect(
        collection.find({
          $and: [
            {
              testId: 1,
            },
            {
              testString: 'bbb',
            },
          ],
        }).length
      ).toEqual(1);

      // coll.find implicit '$and'
      expect(
        collection.find({
          testId: 1,
          testString: 'bbb',
        }).length
      ).toEqual(1);

      // resultSet.find explicit $and
      expect(
        collection
          .chain()
          .find({
            $and: [
              {
                testId: 1,
              },
              {
                testString: 'bbb',
              },
            ],
          })
          .data().length
      ).toEqual(1);

      // resultSet.find implicit $and
      expect(
        collection
          .chain()
          .find({
            testId: 1,
            testString: 'bbb',
          })
          .data().length
      ).toEqual(1);

      // resultSet.find explicit operators
      expect(
        collection
          .chain()
          .find({
            $and: [
              {
                testId: {
                  $eq: 1,
                },
              },
              {
                testFloat: {
                  $gt: 6.0,
                },
              },
            ],
          })
          .data().length
      ).toEqual(1);

      // coll.find $or
      expect(
        collection.find({
          $or: [
            {
              testId: 1,
            },
            {
              testString: 'bbb',
            },
          ],
        }).length
      ).toEqual(3);

      // resultSet.find $or
      expect(
        collection
          .chain()
          .find({
            $or: [
              {
                testId: 1,
              },
              {
                testString: 'bbb',
              },
            ],
          })
          .data().length
      ).toEqual(3);

      // resultSet.find explicit operators
      expect(
        collection
          .chain()
          .find({
            $or: [
              {
                testId: 1,
              },
              {
                testFloat: {
                  $gt: 7.0,
                },
              },
            ],
          })
          .data().length
      ).toEqual(5);

      // add index and repeat final test
      collection.ensureIndex('testId');

      expect(
        collection
          .chain()
          .find({
            $and: [
              {
                testId: {
                  $eq: 1,
                },
              },
              {
                testFloat: {
                  $gt: 6.0,
                },
              },
            ],
          })
          .data().length
      ).toEqual(1);

      expect(
        collection
          .chain()
          .find({
            $or: [
              {
                testId: 1,
              },
              {
                testFloat: {
                  $gt: 7.0,
                },
              },
            ],
          })
          .data().length
      ).toEqual(5);

      database.removeCollection('eic');
    });
  });

  // test for issue #747
  describe('nestedOrExpressions', () => {
    it('works', () => {
      const queryFails = {
        $or: [
          { state: 'STATE_FAILED' },
          { $or: [{ state: 'STATE_DEGRADED' }, { state: 'STATE_NORMAL' }] },
        ],
      };
      const queryWorks = {
        $or: [
          { state: 'STATE_NORMAL' },
          { $or: [{ state: 'STATE_DEGRADED' }, { state: 'STATE_FAILED' }] },
        ],
      };
      const superSlim = [
        {
          uri: '/api/v3/disks/bfe8c919c2a3df669b9e0291795e488f',
          state: 'STATE_NORMAL',
        },
        {
          uri: '/api/v3/disks/bc3f751ee02ae613ed42c667fb57de75',
          state: 'STATE_NORMAL',
        },
        {
          uri: '/api/v3/disks/710466edfdc6609ea23e17eb0719ea74',
          state: 'STATE_NORMAL',
        },
      ];
      const db = new Database('ssmc.db');
      const lokiTable = db.addCollection('bobTest', { unique: ['uri'] });
      lokiTable.clear();
      lokiTable.insert(superSlim);
      const resultsSet = lokiTable.chain();
      const result = resultsSet.find(queryWorks).data({ removeMeta: true });
      expect(result.length).toEqual(3);
      const resultsSet2 = lokiTable.chain();
      const result2 = resultsSet2.find(queryFails).data({ removeMeta: true });
      expect(result2.length).toEqual(3); // <<=== THIS FAILS WITH result2.length actually 0
    });
  });

  describe('findOne', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection<IIdStrFloatTestRecord>('eic');

      collection.insert({
        testId: 1,
        testString: 'hhh',
        testFloat: 5.2,
      }); // 0
      collection.insert({
        testId: 1,
        testString: 'bbb',
        testFloat: 6.2,
      }); // 1
      collection.insert({
        testId: 5,
        testString: 'zzz',
        testFloat: 7.2,
      }); // 2

      // coll.findOne return type
      expect(
        typeof collection.findOne({
          testId: 1,
        })
      ).toEqual('object');

      // coll.findOne return matches 7.2
      expect(
        collection.findOne({
          testId: 5,
        })?.testFloat
      ).toEqual(7.2);

      // findOne with $and op
      expect(
        collection.findOne({
          $and: [
            {
              testId: 1,
            },
            {
              testString: 'bbb',
            },
          ],
        })?.testFloat
      ).toEqual(6.2);

      // findOne with $or op
      expect(
        collection.findOne({
          $or: [
            {
              testId: 2,
            },
            {
              testString: 'zzz',
            },
          ],
        })?.testFloat
      ).toEqual(7.2);

      database.removeCollection('eic');
    });
  });

  describe('resultSet unfiltered simple sort works', () => {
    it('works', () => {
      const database = new Database('sandbox.db');

      // Add a collection to the database
      const collection = database.addCollection<IPersonTestRecord>('items', {
        indices: ['name'],
      });

      // Add some documents to the collection
      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // simple sort without filters on prop with index should work
      const data1 = collection.chain().simpleSort('name').data();
      expect(data1.length).toEqual(4);
      expect(data1[0].name).toEqual('draupnir');
      expect(data1[1].name).toEqual('gungnir');
      expect(data1[2].name).toEqual('mjolnir');
      expect(data1[3].name).toEqual('tyrfing');

      // simple sort without filters on prop without index should work
      const data2 = collection.chain().simpleSort('owner').data();
      expect(data2.length).toEqual(4);
      expect(data2[0].owner).toEqual('odin');
      expect(data2[1].owner).toEqual('odin');
      expect(data2[2].owner).toEqual('svafrlami');
      expect(data2[3].owner).toEqual('thor');
    });
  });

  describe('resultSet data removeMeta works', () => {
    it('works', () => {
      const database = new Database('sandbox.db');

      // Add a collection to the database
      const collection = database.addCollection<IPersonTestRecord>('items', {
        indices: ['owner'],
      });

      // Add some documents to the collection
      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // unfiltered with strip meta
      const data1 = collection.chain().data({ removeMeta: true });
      expect(data1.length).toEqual(4);
      data1.forEach((x) => expect(ensureDocumentType(x)).toThrow());

      // indexed sort with strip meta
      const data2 = collection
        .chain()
        .simpleSort('owner')
        .limit(2)
        .data({ removeMeta: true });
      expect(data2.length).toEqual(2);
      expect(data2[0].owner).toEqual('odin');
      expect(data2[1].owner).toEqual('odin');
      data2.forEach((x) => expect(ensureDocumentType(x)).toThrow());

      // un-indexed find strip meta
      const data3 = collection
        .chain()
        .find({ maker: 'elves' })
        .data({ removeMeta: true });
      expect(data3.length).toEqual(2);
      expect(data3[0].maker).toEqual('elves');
      expect(data3[1].maker).toEqual('elves');
      data3.forEach((x) => expect(ensureDocumentType(x)).toThrow());

      // now try unfiltered without strip meta and ensure loki and meta are present
      const data4 = collection.chain().data();
      expect(data4.length).toEqual(4);
      data3.forEach((x) => expect(ensureDocumentType(x)).not.toThrow());

      // now try without strip meta and ensure loki and meta are present
      const data5 = collection.chain().simpleSort('owner').limit(2).data();
      expect(data5.length).toEqual(2);
      expect(data5[0].owner).toEqual('odin');
      expect(data5[1].owner).toEqual('odin');
      data5.forEach((x) => expect(ensureDocumentType(x)).not.toThrow());

      // un-indexed find strip meta
      const data6 = collection.chain().find({ maker: 'elves' }).data();
      expect(data6.length).toEqual(2);
      expect(data6[0].maker).toEqual('elves');
      expect(data6[1].maker).toEqual('elves');
      data6.forEach((x) => expect(ensureDocumentType(x)).not.toThrow());
    });
  });

  describe('chained removes', () => {
    it('works', () => {
      const database = new Database('sandbox.db');
      const collection = database.addCollection<IIdStrFloatTestRecord>('rsc');

      collection.insert({
        testId: 1,
        testString: 'hhh',
        testFloat: 5.2,
      });
      collection.insert({
        testId: 1,
        testString: 'bbb',
        testFloat: 6.2,
      });
      collection.insert({
        testId: 2,
        testString: 'ccc',
        testFloat: 6.2,
      });
      collection.insert({
        testId: 5,
        testString: 'zzz',
        testFloat: 7.2,
      });

      const docCount = collection.find().length;

      // verify initial doc count
      expect(docCount).toEqual(4);

      // remove middle documents
      collection.chain().find({ testFloat: 6.2 }).remove();

      // verify new doc count
      expect(collection.find().length).toEqual(2);
      expect(collection.chain().data().length).toEqual(2);

      // now fetch and retain all remaining documents
      const results = collection.chain().simpleSort('testString').data();

      // make sure its the documents we expect
      expect(results[0].testString).toEqual('hhh');
      expect(results[1].testString).toEqual('zzz');
    });
  });

  describe('batches removes work', () => {
    it('works', () => {
      const database = new Database('sandbox.db');
      const collection = database.addCollection('rrs');

      const count = 100;

      for (let i = 0; i < count; i += 1) {
        collection.insert({ a: Math.floor(Math.random() * 5), b: i });
      }

      const r1 = collection.find({ a: 2 });
      const r2 = collection.find({ a: 4 });

      const c1 = r1 ? r1.length : 0;
      const c2 = r2 ? r2.length : 0;

      // on initial insert, loki ids will always be one greater than data position
      collection.chain().find({ a: 2 }).remove();
      // so not that data positions have shifted we will do another
      collection.chain().find({ a: 4 }).remove();

      // verify that leftover count matches total count minus deleted counts
      expect(collection.count()).toEqual(count - c1 - c2);
    });
  });

  /* Dynamic View Tests */
  describe('stepEvaluateDocument', () => {
    it('works', () => {
      const view = globalCollection.addDynamicView('test');
      const query = {
        age: {
          $gt: 24,
        },
      };

      view.applyFind(query);

      // churn evaluateDocuments() to make sure it works right
      globalDocument.age = 23;
      globalCollection.update(globalDocument);

      // evaluate documents
      expect(view.data().length).toEqual(globalCollection.data.length - 1);
      globalDocument.age = 30;
      globalCollection.update(globalDocument);
      expect(view.data().length).toEqual(globalCollection.data.length);
      globalDocument.age = 23;
      globalCollection.update(globalDocument);
      expect(view.data().length).toEqual(globalCollection.data.length - 1);
      globalDocument.age = 30;
      globalCollection.update(globalDocument);
      expect(view.data().length).toEqual(globalCollection.data.length);

      // assert set equality of docArrays irrelevant of sort/sequence
      const result1 = globalCollection.find(query).sort(compareDocument);
      const result2 = view.data().sort(compareDocument);
      result1.forEach((x) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (x as any).meta;
      });
      result2.forEach((x) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (x as any).meta;
      });

      // Result data Equality
      expect(result1).toEqual(result2);

      // Strict Equality
      expect(
        JSON.stringify(globalCollection.find(query)) ===
          JSON.stringify(view.data())
      ).toBeTruthy();

      // View data equality
      expect(JSON.stringify(view.resultSet)).toEqual(
        JSON.stringify(view.resultSet?.copy())
      );

      // View data copy strict equality
      expect(view.resultSet === view.resultSet?.copy()).toBeFalsy();
    });
  });

  describe('stepDynamicViewPersistence', () => {
    it('works', () => {
      const query = {
        age: {
          $gt: 24,
        },
      };

      // set up a persistent dynamic view with sort
      const dynamicView = globalCollection.addDynamicView('test2', {
        persistent: true,
      });
      dynamicView.applyFind(query);
      dynamicView.applySimpleSort('age');

      // the dynamic view depends on an internal resultSet
      // the persistent dynamic view also depends on an internal resultdata data array
      // filteredRows should be applied immediately to resultSet will be lazily built into resultdata later when data() is called

      // dynamic view initialization 1
      expect(dynamicView.resultSet?.filteredRows.length).toEqual(3);
      // dynamic view initialization 2
      expect(dynamicView.resultData.length).toEqual(0);

      // compare how many documents are in results before adding new ones
      const dynamicViewResultSetLenBefore =
        dynamicView.resultSet?.filteredRows.length ?? -1;

      globalCollection.insert({
        name: 'abc',
        age: 21,
        lang: 'English',
      });

      globalCollection.insert({
        name: 'def',
        age: 25,
        lang: 'English',
      });

      // now see how many are in resultSet (without rebuilding persistent view)
      const dynamicViewResultSetLenAfter =
        dynamicView.resultSet?.filteredRows.length;

      // only one document should have been added to resultSet (1 was filtered out)
      expect(dynamicViewResultSetLenBefore + 1).toEqual(
        dynamicViewResultSetLenAfter
      );

      // Test sorting and lazy build of resultdata

      // retain copy of internal resultSet's filteredRows before lazy sort
      const clonedData = dynamicView.resultSet?.filteredRows.slice();
      dynamicView.data();
      // now make a copy of internal result's filteredRows after lazy sort
      const clonedData2 = dynamicView.resultSet?.filteredRows.slice() ?? [];

      // verify filteredRows logically matches resultdata (irrelevant of sort)
      for (let i = 0; i < clonedData2.length; i += 1) {
        expect(dynamicView.resultData[i]).toEqual(
          dynamicView.collection?.data[clonedData2[i]]
        );
      }

      // now verify they are not exactly equal (verify sort moved stuff)
      expect(
        JSON.stringify(clonedData) === JSON.stringify(clonedData2)
      ).toBeFalsy();
    });
  });

  describe('stepDynamicViewPersistence', () => {
    it('works', () => {
      interface ITestRecord {
        index: string;
        a?: number;
      }
      const database = new Database('');
      const collection = database.addCollection<ITestRecord>('', {
        indices: ['index'],
      });

      const document = collection.insert({
        index: 'key',
        a: 1,
      });

      const data1 = collection.find({
        index: 'key',
      });

      // one result exists
      expect(data1.length).toEqual(1);
      // the correct result is returned
      expect(data1[0].a).toEqual(1);

      document.a = 2;
      collection.update(document);

      const data2 = collection.find({
        index: 'key',
      });

      // one result exists
      expect(data2.length).toEqual(1);
      // the correct result is returned
      expect(data2[0].a).toEqual(2);
    });
  });

  describe('stepDynamicViewPersistence', () => {
    it('works', () => {
      interface ITestRecord {
        testId?: number;
        testIndex?: number;
      }

      const database = new Database('sandbox.db');
      const collection = database.addCollection<ITestRecord>('test', {
        indices: ['testIndex'],
      });

      const resultsNoIndex = collection.find({
        testId: 2,
      });
      expect(resultsNoIndex.length).toEqual(0);

      const resultsWithIndex = collection.find({
        testIndex: 4,
      });
      // no results found
      expect(resultsWithIndex.length).toEqual(0);
    });
  });

  describe('stepDynamicViewPersistence', () => {
    it('works', () => {
      // mock persistence by using memory adapter
      const adapter = new MemoryAdapter();
      const database = new Database('testCollections', { adapter });

      // DB name
      expect(database.fileName).toEqual('testCollections');

      const collection = database.addCollection<IPersonTestRecord>('test1', {
        transactional: true,
      });
      database.addCollection('test2');
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection.remove('foo' as any);
      }).toThrow();
      expect(() => {
        collection.remove({
          name: 'joe',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }).toThrow();

      // List collections
      expect(database.listCollections().length).toEqual(2);

      collection.clear();
      const data = [
        {
          name: 'joe',
        },
        {
          name: 'dave',
        },
      ];
      collection.insert(data);

      // 2 docs after array insert
      expect(2).toEqual(collection.data.length);

      collection.remove(data.map(ensureDocumentType));
      // 0 docs after array remove
      expect(0).toEqual(collection.data.length);

      function TestError() {}
      TestError.prototype = new Error();
      database.autosaveEnable();
      database.on(DatabaseCloseEventName, () => {
        throw new TestError();
      });
      expect(database.close).not.toThrow();
    });
  });
});
