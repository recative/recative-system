import { Collection, Database } from '../src';
import { TransformType, TransformRequest } from '../src/ResultSet';

import { IPersonTestRecord } from './definition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalDatabase: Database<any>;
declare const globalCollection: Collection<IPersonTestRecord>;

describe('transforms', () => {
  beforeEach(() => {
    globalThis.globalDatabase = new Database('transformTest');
    globalThis.globalCollection =
      globalDatabase.addCollection<IPersonTestRecord>('items');

    globalCollection.insert({
      name: 'mjolnir',
      owner: 'thor',
      maker: 'dwarves',
    });
    globalCollection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    globalCollection.insert({
      name: 'tyrfing',
      owner: 'Svafrlami',
      maker: 'dwarves',
    });
    globalCollection.insert({
      name: 'draupnir',
      owner: 'odin',
      maker: 'elves',
    });
  });

  describe('basic find transform', () => {
    it('works', () => {
      const results = globalCollection
        .chain([
          {
            type: TransformType.Find,
            value: {
              owner: 'odin',
            },
          },
        ])
        .data();

      expect(results.length).toBe(2);
    });
  });

  describe('basic multi-step transform', () => {
    it('works', () => {
      const results = globalCollection
        .chain([
          {
            type: TransformType.Find,
            value: {
              owner: 'odin',
            },
          },
          {
            type: TransformType.Where,
            filter: (x: IPersonTestRecord) => {
              return x.name.indexOf('drau') !== -1;
            },
          },
        ])
        .data();

      expect(results.length).toBe(1);
    });
  });

  describe('parameterized find', () => {
    it('works', () => {
      const results = globalCollection
        .chain(
          [
            {
              type: TransformType.Find,
              value: {
                owner: '[%lktxp]OwnerName',
              },
            },
          ],
          {
            OwnerName: 'odin',
          }
        )
        .data();

      expect(results.length).toBe(2);
    });
  });

  describe('parameterized find with $and/$or', () => {
    it('works', () => {
      const result0 = globalCollection
        .chain(
          [
            {
              type: TransformType.Find,
              value: {
                $or: [
                  { owner: '[%lktxp]OwnerName' },
                  { owner: '[%lktxp]OwnerNameOther' },
                ],
              },
            },
          ],
          {
            OwnerName: 'thor',
            OwnerNameOther: 'thor',
          }
        )
        .data();

      expect(result0.length).toBe(1);

      const result1 = globalCollection
        .chain(
          [
            {
              type: TransformType.Find,
              value: {
                $or: [
                  { owner: '[%lktxp]OwnerName' },
                  { owner: '[%lktxp]OwnerNameOther' },
                ],
              },
            },
          ],
          {
            OwnerName1: 'odin',
            OwnerNameOther: 'odin',
          }
        )
        .data();

      expect(result1.length).toBe(2);

      const result2 = globalCollection
        .chain(
          [
            {
              type: TransformType.Find,
              value: {
                $and: [
                  { owner: '[%lktxp]OwnerName' },
                  { name: '[%lktxp]Name' },
                ],
              },
            },
          ],
          {
            Name: 'mjolnir',
            OwnerName: 'thor',
          }
        )
        .data();
      expect(result2.length).toBe(1);

      const result3 = globalCollection
        .chain(
          [
            {
              type: TransformType.Find,
              value: {
                $and: [
                  { owner: '[%lktxp]OwnerName' },
                  { name: '[%lktxp]Name' },
                ],
              },
            },
          ],
          {
            Name: 'gungnir',
            OwnerName: 'odin',
          }
        )
        .data();
      expect(result3.length).toBe(1);
    });
  });

  describe('parameterized transform with non-serializable non-params', () => {
    it('works', () => {
      interface ITestRecord {
        name: string;
        age: number;
      }

      const database = new Database('tx.db');

      const collection = database.addCollection<ITestRecord>('items');

      collection.insert({ name: 'mjolnir', age: 5 });
      collection.insert({ name: 'tyrfing', age: 9 });

      const mapper = (item: ITestRecord) => {
        return item.age;
      };

      const averageReduceFunction = (values: number[]) => {
        let sum = 0;

        for (let i = 0; i < values.length; i += 1) {
          sum += values[i];
        }

        return sum / values.length;
      };

      // so ideally, transform params are useful for
      // - extracting values that will change across multiple executions, and also
      // - extracting values which are not serializable so that the transform can be
      //   named and serialized along with the database.
      //
      // The transform used here is not serializable so this test is just to verify
      // that our parameter substitution method does not have problem with
      // non-serializable transforms.

      const transform1 = [
        {
          type: TransformType.MapReduce,
          mapFunction: mapper,
          reduceFunction: averageReduceFunction,
        } as TransformRequest<IPersonTestRecord, number, number>,
      ];

      const transform2 = [
        {
          type: TransformType.Find,
          value: {
            age: {
              $gt: '[%lktxp]minimumAge',
            },
          },
        } as TransformRequest<IPersonTestRecord, number, number>,
        {
          type: TransformType.MapReduce,
          mapFunction: mapper,
          reduceFunction: averageReduceFunction,
        } as TransformRequest<IPersonTestRecord, number, number>,
      ];

      // no data() call needed to mapReduce
      expect(globalCollection.chain(transform1)).toBe(7);

      expect(globalCollection.chain(transform1, { foo: 5 })).toBe(7);
      // params will cause a recursive shallow clone of objects before substitution
      expect(globalCollection.chain(transform2, { minimumAge: 4 })).toBe(7);
      // make sure original transform is unchanged
      expect(transform2[0].type).toEqual(TransformType.Find);
      expect(transform2[1].type).toEqual(TransformType.MapReduce);
      expect(typeof Reflect.get(transform2[1], 'mapFunction')).toEqual(
        'function'
      );
      expect(typeof Reflect.get(transform2[1], 'reduceFunction')).toEqual(
        'function'
      );
    });
  });

  describe('parameterized where', () => {
    it('works', () => {
      const results = globalCollection
        .chain(
          [
            {
              type: TransformType.Where,
              filter: '[%lktxp]NameFilter',
            },
          ],
          {
            NameFilter: function (x: IPersonTestRecord) {
              return x.name.indexOf('nir') !== -1;
            },
          }
        )
        .data();

      expect(results.length).toBe(3);
    });
  });

  describe('named find transform', () => {
    it('works', () => {
      globalCollection.addTransform('OwnerLookup', [
        {
          type: TransformType.Find,
          value: {
            owner: '[%lktxp]OwnerName',
          },
        },
      ]);

      const params = {
        OwnerName: 'odin',
      };

      const results = globalCollection.chain('OwnerLookup', params).data();

      expect(results.length).toBe(2);
    });
  });

  describe('dynamic view named transform', () => {
    it('works', () => {
      interface ITestRecord {
        a: string;
        b: number;
      }
      const collection = globalDatabase.addCollection<ITestRecord>('test');

      collection.insert({
        a: 'first',
        b: 1,
      });

      collection.insert({
        a: 'second',
        b: 2,
      });

      collection.insert({
        a: 'third',
        b: 3,
      });

      collection.insert({
        a: 'fourth',
        b: 4,
      });

      collection.insert({
        a: 'fifth',
        b: 5,
      });

      collection.insert({
        a: 'sixth',
        b: 6,
      });

      collection.insert({
        a: 'seventh',
        b: 7,
      });

      collection.insert({
        a: 'eighth',
        b: 8,
      });

      // our view should allow only first 4 test records
      const dynamicView = collection.addDynamicView('lower');
      dynamicView.applyFind({ b: { $lte: 4 } });

      // our transform will desc sort string column as 'third', 'second', 'fourth', 'first',
      // and then limit to first two
      const transform = [
        {
          type: TransformType.SimpleSort,
          property: 'a',
          desc: true,
        } as TransformRequest<ITestRecord, number, number>,
        {
          type: TransformType.Limit,
          count: 2,
        } as TransformRequest<ITestRecord, number, number>,
      ];

      expect(dynamicView.branchResultset(transform).data().length).toBe(2);

      // now store as named (collection) transform and run off dynamic view
      collection.addTransform('desc4limit2', transform);

      const results = dynamicView
        .branchResultset<ITestRecord>('desc4limit2')
        .data();

      expect(results.length).toBe(2);
      expect(results[0].a).toBe('third');
      expect(results[1].a).toBe('second');
    });
  });

  describe('eqJoin step with dataOptions works', () => {
    it('works', () => {
      interface ITestRecord {
        name: string;
        directorId: number;
      }

      interface ITestRecord0 {
        title: string;
        filmId: number;
        directorId: number;
      }

      const database = new Database('testJoins');

      const collection = database.addCollection<ITestRecord>('directors');
      const films = database.addCollection<ITestRecord0>('films');

      collection.insert([
        { name: 'Martin Scorsese', directorId: 1 },
        { name: 'Francis Ford Coppola', directorId: 2 },
        { name: 'Steven Spielberg', directorId: 3 },
        { name: 'Quentin Tarantino', directorId: 4 },
      ]);

      films.insert([
        { title: 'Taxi', filmId: 1, directorId: 1 },
        { title: 'Raging Bull', filmId: 2, directorId: 1 },
        { title: 'The Godfather', filmId: 3, directorId: 2 },
        { title: 'Jaws', filmId: 4, directorId: 3 },
        { title: 'ET', filmId: 5, directorId: 3 },
        { title: 'Raiders of the Lost Ark', filmId: 6, directorId: 3 },
      ]);

      // The 'joinData' in this instance is a Collection which we will call
      //   data() on with the specified (optional) dataOptions on.
      //   It could also be a resultset or data array.
      // Our left side resultset which this transform is executed on will also
      //   call data() with specified (optional) dataOptions.
      films.addTransform('filmDirect', [
        {
          type: TransformType.EqJoin,
          joinData: collection,
          leftJoinKey: 'directorId',
          rightJoinKey: 'directorId',
          mapFunction: (left, right) => {
            // Since our collection options do not specify cloning, this is only safe
            // because we have cloned internal objects with dataOptions before modifying them.
            Object.keys(right).forEach(function (key) {
              left[key] = right[key];
            });

            return left as ITestRecord & ITestRecord0;
          },
          dataOptions: { removeMeta: true },
        } as TransformRequest<
          ITestRecord0,
          ITestRecord,
          ITestRecord & ITestRecord0
        >,
      ]);

      // Although we removed all meta, the eqJoin inserts the resulting objects
      // into a new volatile collection which would adds its own meta and loki.
      // We don't care about these useless volatile data so grab results without it.
      const results = films
        .chain('filmDirect')
        .data({ removeMeta: true }) as unknown as (ITestRecord &
        ITestRecord0)[];

      expect(results.length).toEqual(6);
      expect(results[0].title).toEqual('Taxi');
      expect(results[0].name).toEqual('Martin Scorsese');
      expect(results[5].title).toEqual('Raiders of the Lost Ark');
      expect(results[5].name).toEqual('Steven Spielberg');
      results.forEach(function (obj) {
        expect(Object.keys(obj).length).toEqual(4);
      });
    });
  });

  describe('map step with dataOptions works', () => {
    it('works', () => {
      interface ITestRecord {
        a: number;
        b: number;
        c?: number;
      }
      const database = new Database('testJoins');

      const collection = database.addCollection<ITestRecord>('c1');
      collection.insert([
        { a: 1, b: 9 },
        { a: 2, b: 8 },
        { a: 3, b: 7 },
        { a: 4, b: 6 },
      ]);

      const results = collection
        .chain([
          {
            type: TransformType.Map,
            mapFunction: (x: ITestRecord) => {
              // only safe because our 'removeMeta' option will clone objects passed in
              x.c = x.b - x.a;

              return x;
            },
            dataOptions: { removeMeta: true },
          },
        ])
        .data({ removeMeta: true }) as unknown as ITestRecord[];

      expect(results.length).toEqual(4);
      expect(results[0].a).toEqual(1);
      expect(results[0].b).toEqual(9);
      expect(results[0].c).toEqual(8);
      expect(results[3].a).toEqual(4);
      expect(results[3].b).toEqual(6);
      expect(results[3].c).toEqual(2);
      results.forEach(function (obj) {
        expect(Object.keys(obj).length).toEqual(3);
      });
    });
  });
});
