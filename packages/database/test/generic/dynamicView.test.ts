import { Database } from '../../src';
import { DynamicView } from '../../src/DynamicView';
import { Operators } from '../../src/Operations';
import { IPersonTestRecord } from './definition';

const PERSON_DATA: IPersonTestRecord[] = [
  { name: 'mjolnir', owner: 'thor', maker: 'dwarves' },
  { name: 'gungnir', owner: 'odin', maker: 'elves' },
  { name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' },
  { name: 'draupnir', owner: 'odin', maker: 'elves' },
];

interface IABTestRecord {
  a: number;
  b: number;
}

const AB_DATA: IABTestRecord[] = [
  { a: 0, b: 1 },
  { a: 1, b: 2 },
  { a: 0, b: 3 },
  { a: 1, b: 4 },
  { a: 0, b: 5 },
  { a: 1, b: 6 },
  { a: 1, b: 7 },
  { a: 1, b: 8 },
  { a: 0, b: 9 },
];

declare const exampleDyncmicView: DynamicView<IPersonTestRecord>;

describe('dynamicviews', () => {
  describe('test empty filter across changes', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IPersonTestRecord>('users');
      collection.insert(PERSON_DATA);
      const dynamicView = collection.addDynamicView();

      // with no filter, results should be all documents
      const dynamicViewData1 = dynamicView.data();
      expect(dynamicViewData1.length).toBe(4);

      // find and update a document which will notify view to re-evaluate
      const document = collection.findOne({ name: 'gungnir' });
      if (!document) throw new TypeError(`Inserted document not found`);

      expect(document?.owner).toBe('odin');
      document.maker = 'dvalin';
      collection.update(document);

      const dynamicViewData2 = dynamicView.data();
      expect(dynamicViewData2.length).toBe(4);
    });
  });

  describe('dynamic view batch removes work as expected', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const documents = database.addCollection<IABTestRecord>('users');
      const dynamicView = documents.addDynamicView('dv');
      dynamicView.applyFind({ a: 1 });

      documents.insert(AB_DATA);

      expect(dynamicView.data().length).toEqual(5);

      documents.findAndRemove({ b: { $lt: 7 } });

      expect(dynamicView.data().length).toEqual(2);

      const dynamicViewData = dynamicView
        .branchResultset()
        .simpleSort('b')
        .data();

      expect(dynamicViewData[0].b).toEqual(7);
      expect(dynamicViewData[1].b).toEqual(8);
    });
  });

  describe('dynamic (persistent/sorted) view batch removes work as expected', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IABTestRecord>('users');
      const dynamicView = collection.addDynamicView('dv', { persistent: true });
      dynamicView.applyFind({ a: 1 });
      dynamicView.applySimpleSort('b');

      collection.insert(AB_DATA);

      expect(dynamicView.data().length).toEqual(5);

      collection.findAndRemove({ b: { $lt: 7 } });

      const results = dynamicView.data();
      expect(results.length).toEqual(2);
      expect(results[0].b).toEqual(7);
      expect(results[1].b).toEqual(8);
    });
  });

  describe('dynamic (persistent/sorted/indexed) view batch removes work as expected', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IABTestRecord>('users', {
        indices: ['b'],
      });
      const dynamicView = collection.addDynamicView('dv', { persistent: true });
      dynamicView.applyFind({ a: 1 });
      dynamicView.applySimpleSort('b');

      collection.insert(AB_DATA);

      expect(dynamicView.data().length).toEqual(5);

      collection.findAndRemove({ b: { $lt: 7 } });

      const results = dynamicView.data();
      expect(results.length).toEqual(2);
      expect(results[0].b).toEqual(7);
      expect(results[1].b).toEqual(8);
    });
  });

  describe('dynamic view rematerialize works as expected', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IPersonTestRecord>('users');
      collection.insert(PERSON_DATA);
      const dynamicView = collection.addDynamicView();

      dynamicView.applyFind({ owner: 'odin' });
      dynamicView.applyWhere((x) => {
        return x.maker === 'elves';
      });

      expect(dynamicView.data().length).toEqual(2);
      expect(dynamicView.filterPipeline.length).toEqual(2);

      dynamicView.rematerialize({ removeWhereFilters: true });
      expect(dynamicView.data().length).toEqual(2);
      expect(dynamicView.filterPipeline.length).toEqual(1);
    });
  });

  describe('dynamic view toJSON does not circularly reference', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection('users');
      collection.insert(PERSON_DATA);
      const dynamicView = collection.addDynamicView();

      const serializedDynamicView = dynamicView.toJSON();
      expect(serializedDynamicView.collection).toEqual(null);
    });
  });

  describe('dynamic view removeFilters works as expected', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IPersonTestRecord>('users');
      collection.insert(PERSON_DATA);
      const dynamicView = collection.addDynamicView('ownr');

      dynamicView.applyFind({ owner: 'odin' });
      dynamicView.applyWhere((x) => {
        return x.maker === 'elves';
      });

      expect(dynamicView.filterPipeline.length).toEqual(2);
      expect(dynamicView.data().length).toEqual(2);

      dynamicView.removeFilters();
      expect(dynamicView.filterPipeline.length).toEqual(0);
      expect(dynamicView.count()).toEqual(4);
    });
  });

  describe('removeDynamicView works correctly', () => {
    it('works', () => {
      const database = new Database('dvtest');
      const collection = database.addCollection<IPersonTestRecord>('users');
      collection.insert(PERSON_DATA);
      const dynamicView = collection.addDynamicView('ownr', {
        persistent: true,
      });

      dynamicView.applyFind({ owner: 'odin' });
      dynamicView.applyWhere((x) => {
        return x.maker === 'elves';
      });

      expect(collection.dynamicViews.length).toEqual(1);

      collection.removeDynamicView('ownr');
      expect(collection.dynamicViews.length).toEqual(0);
    });
  });

  describe('removeDynamicView works correctly (2)', () => {
    it('works', () => {
      const database = new Database('test.db');
      const collection = database.addCollection('coll');
      collection.addDynamicView('dv1');
      collection.addDynamicView('dv2');
      collection.addDynamicView('dv3');
      collection.addDynamicView('dv4');
      collection.addDynamicView('dv5');

      expect(collection.dynamicViews.length).toEqual(5);
      collection.removeDynamicView('dv3');
      expect(collection.dynamicViews.length).toEqual(4);

      expect(collection.getDynamicView('dv1')?.name).toEqual('dv1');
      expect(collection.getDynamicView('dv2')?.name).toEqual('dv2');
      expect(collection.getDynamicView('dv3')).toEqual(null);
      expect(collection.getDynamicView('dv4')?.name).toEqual('dv4');
      expect(collection.getDynamicView('dv5')?.name).toEqual('dv5');
    });
  });

  describe('dynamic view simplesort options work correctly', () => {
    it('works', () => {
      const database = new Database('dvtest.db');
      const collection = database.addCollection<IABTestRecord>('colltest', {
        indices: ['a', 'b'],
      });

      // add basic dv with filter on a and basic simplesort on b
      let dynamicView = collection.addDynamicView('dvtest');
      dynamicView.applyFind({ a: { $lte: 20 } });
      dynamicView.applySimpleSort('b');

      // data only needs to be inserted once since we are leaving collection intact while
      // building up and tearing down dynamic views within it
      collection.insert(AB_DATA);

      // test whether results are valid
      let dynamicViewData = dynamicView.data();
      expect(dynamicViewData.length).toBe(5);
      for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
        expect(Operators.$lte(dynamicViewData[i].b, dynamicViewData[i + 1].b));
      }

      // remove dynamic view
      collection.removeDynamicView('dvtest');

      // add basic dv with filter on a and simplesort (with js fallback) on b
      dynamicView = collection.addDynamicView('dvtest');
      dynamicView.applyFind({ a: { $lte: 20 } });
      dynamicView.applySimpleSort('b', { useJavaScriptSorting: true });

      // test whether results are valid
      // for our simple integer datatypes javascript sorting is same as Database sorting
      dynamicViewData = dynamicView.data();
      expect(dynamicViewData.length).toBe(5);
      for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
        expect(dynamicViewData[i].b <= dynamicViewData[i + 1].b);
      }

      // remove dynamic view
      collection.removeDynamicView('dvtest');

      // add basic dv with filter on a and simplesort (forced js sort) on b
      dynamicView = collection.addDynamicView('dvtest');
      dynamicView.applyFind({ a: { $lte: 20 } });
      dynamicView.applySimpleSort('b', {
        disableIndexIntersect: true,
        useJavaScriptSorting: true,
      });

      // test whether results are valid
      dynamicViewData = dynamicView.data();
      expect(dynamicViewData.length).toBe(5);
      for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
        expect(dynamicViewData[i].b <= dynamicViewData[i + 1].b);
      }

      // remove dynamic view
      collection.removeDynamicView('dvtest');

      // add basic dv with filter on a and simplesort (forced Database sort) on b
      dynamicView = collection.addDynamicView('dvtest');
      dynamicView.applyFind({ a: { $lte: 20 } });
      dynamicView.applySimpleSort('b', { forceIndexIntersect: true });

      // test whether results are valid
      dynamicViewData = dynamicView.data();
      expect(dynamicViewData.length).toBe(5);
      for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
        expect(Operators.$lte(dynamicViewData[i].b, dynamicViewData[i + 1].b));
      }
    });
  });

  describe('querying branched result set', () => {
    beforeAll(() => {
      const database = new Database('firstonly.db');
      const collection = database.addCollection('items');
      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      globalThis.exampleDyncmicView = collection.addDynamicView('elves');
      globalThis.exampleDyncmicView.applyFind({ maker: 'elves' });
    });

    it('finds first result with firstOnly: true', () => {
      const resultSet = exampleDyncmicView.branchResultset();
      const result = resultSet.find({ name: { $ne: 'thor' } }, true).data();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('gungnir');
    });

    it('finds first result with firstOnly: true and empty query', () => {
      const resultSet = globalThis.exampleDyncmicView.branchResultset();
      const result = resultSet.find({}, true).data();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('gungnir');
    });
  });
});
