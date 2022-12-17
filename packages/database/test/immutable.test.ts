import {
  Database,
  Collection,
  ICollectionChange,
  DynamicViewSortEventName,
  DynamicViewFilterEventName,
  CollectionDocumentInsertEventName,
  CollectionDocumentUpdateEventName,
  CollectionDocumentDeleteEventName,
} from '../src';
import { MemoryAdapter } from '../src/adapter/memory';
import { Operators } from '../src/Operations';
import {
  deepFreeze,
  deepUnFreeze,
  freeze,
  isFrozen,
  unFreeze,
} from '../src/utils/freeze';
import {
  IABTestRecord,
  IIdTestRecord,
  INumericABTestRecord,
  IPersonTestRecord,
} from './definition';
import { User } from './utils';

const PERSON_TEST_RECORDS = [
  { name: 'mjolnir', owner: 'thor', maker: 'dwarves' },
  { name: 'gungnir', owner: 'odin', maker: 'elves' },
  { name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves' },
  { name: 'draupnir', owner: 'odin', maker: 'elves' },
];

const AB_TEST_RECORDS = [
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

describe('immutable', () => {
  const removeMeta = <T extends object | null>(
    x: T
  ): T extends null
    ? null
    : T extends ArrayLike<infer U>
    ? Omit<U, 'meta'>[]
    : Omit<T, 'meta'>[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (x === null) return null as any;

    if (Array.isArray(x)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return x.map(removeMeta) as any;
    }

    const result = JSON.parse(JSON.stringify(x));
    delete result.meta;

    return result;
  };

  describe('deepFreeze', () => {
    it('should deep freeze', () => {
      const object = { a: [{ b: 'b' }, 10, false], c: 10, d: false };
      const frozen = deepFreeze(object);
      expect(object).toBe(frozen);
      expect(Object.isFrozen(object)).toBe(true);
      expect(Object.isFrozen(object.a)).toBe(true);
      expect(Object.isFrozen(object.a[0])).toBe(true);
    });
  });

  describe('freeze', () => {
    it('should shallow freeze when not frozen', () => {
      const object = {};
      freeze(object);
      expect(Object.isFrozen(object)).toBe(true);
      freeze(object);
      expect(Object.isFrozen(object)).toBe(true);
    });
  });

  describe('unFreeze', () => {
    it('should return the object when not frozen', () => {
      const object = {};
      expect(unFreeze(object)).toBe(object);
    });
    it('should make a shallow copy of a frozen object', () => {
      const object = deepFreeze({ a: { b: 'b' }, c: 'c', d: [0, 1] });
      const unfrozen = unFreeze(object);
      expect(unfrozen).toEqual(object);
      expect(Object.isFrozen(unfrozen)).toBe(false);
      expect(Object.isFrozen(object.a)).toBe(true);
      expect(Object.isFrozen(object.d)).toBe(true);
    });
  });

  describe('deepUnFreeze', () => {
    it('should deep unFreeze', () => {
      const object = { a: [{ b: 'b' }, 10, false], c: 10, d: false };
      const unFrozen = deepUnFreeze(deepFreeze(object));
      expect(object).toEqual(unFrozen);
      expect(Object.isFrozen(object)).toBe(true);
      expect(Object.isFrozen(object.a)).toBe(true);
      expect(Object.isFrozen(object.a[0])).toBe(true);
      expect(Object.isFrozen(unFrozen)).toBe(false);
      expect(Object.isFrozen(unFrozen.a)).toBe(false);
      expect(Object.isFrozen(unFrozen.a[0])).toBe(false);
    });
  });

  describe('isFrozen', () => {
    it('should return false when there exists a (deep) property that is not frozen', () => {
      const object1 = deepFreeze({
        a: [{ b: 'b' }, 10, false],
        c: 10,
        d: false,
      });
      expect(isFrozen(object1)).toBe(true);
      const object2 = { a: [{ b: 'b' }, 10, false], c: 10, d: false };
      Object.freeze(object2);
      expect(isFrozen(object2)).toBe(false);
      Object.freeze(object2.a[0]);
      expect(isFrozen(object2)).toBe(false);
      Object.freeze(object2.a);
      expect(isFrozen(object2)).toBe(true);
    });
  });

  it('should deep freeze inserted object', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });

    collection.addEventListener(
      CollectionDocumentInsertEventName,
      ({ detail }) => {
        expect(isFrozen(detail.documents[0])).toBe(true);
      }
    );

    const inserted = collection.insert({ name: 'n1' });
    expect(removeMeta(inserted)).toEqual({ $loki: 1, name: 'n1' });
    expect(isFrozen(inserted)).toBe(true);

    const documents = collection.find();
    expect(removeMeta(documents)).toEqual([{ $loki: 1, name: 'n1' }]);
    expect(isFrozen(documents[0]) && isFrozen(documents[1])).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n1' }))).toEqual({
      $loki: 1,
      name: 'n1',
    });
    expect(isFrozen(collection.findOne({ name: 'n1' }))).toBe(true);
  });

  it('should deep freeze inserted object with meta object', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.addEventListener('insert', (object) => {
      expect(isFrozen(object)).toBe(true);
    });
    const inserted = collection.insert({ name: 'n1', meta: {} });
    expect(removeMeta(inserted)).toEqual({ $loki: 1, name: 'n1' });
    expect(isFrozen(inserted)).toBe(true);
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([{ $loki: 1, name: 'n1' }]);
    expect(isFrozen(docs[0]) && isFrozen(docs[1])).toBe(true);
    const insertedDocument = collection.findOne({ name: 'n1' });

    if (!insertedDocument) {
      throw new TypeError(`Inserted document not found`);
    }
    expect(removeMeta(insertedDocument)).toEqual({
      $loki: 1,
      name: 'n1',
    });
    expect(isFrozen(insertedDocument)).toBe(true);
  });

  it('should deep freeze all inserted objects', () => {
    const database = new Database('test.database');
    const collection = database.addCollection('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentInsertEventName,
      ({ detail: { documents } }) => {
        expect(isFrozen(documents[0]) && isFrozen(documents[1])).toBe(true);
      }
    );
    const inserted = collection.insert([
      { name: 'n1' },
      deepFreeze({ name: 'n2' }),
    ]);
    expect(removeMeta(inserted)).toEqual([
      { $loki: 1, name: 'n1' },
      { $loki: 2, name: 'n2' },
    ]);
    expect(isFrozen(inserted[0]) && isFrozen(inserted[1])).toBe(true);
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n1' },
      { $loki: 2, name: 'n2' },
    ]);
    expect(isFrozen(docs[0]) && isFrozen(docs[1])).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n1' }))).toEqual({
      $loki: 1,
      name: 'n1',
    });
    expect(isFrozen(collection.findOne({ name: 'n1' }))).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n2' }))).toEqual({
      $loki: 2,
      name: 'n2',
    });
    expect(isFrozen(collection.findOne({ name: 'n2' }))).toBe(true);
  });

  it('should deep freeze updated object', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentUpdateEventName,
      ({ detail: { newDocument } }) => {
        expect(isFrozen(newDocument)).toBe(true);
      }
    );
    const inserted = collection.insert({ name: 'n1' });
    const draft = deepUnFreeze(inserted);
    draft.name = 'n2';
    const updated = collection.update(draft);
    expect(removeMeta(updated)).toEqual({ $loki: 1, name: 'n2' });
    expect(isFrozen(updated)).toBe(true);
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([{ $loki: 1, name: 'n2' }]);
    expect(isFrozen(docs[0])).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n2' }))).toEqual({
      $loki: 1,
      name: 'n2',
    });
    expect(isFrozen(collection.findOne({ name: 'n2' }))).toBe(true);
  });

  it('should deep freeze all updated objects', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentUpdateEventName,
      ({ detail: { newDocument } }) => {
        expect(isFrozen(newDocument)).toBe(true);
      }
    );
    const inserted = collection.insert([
      { name: 'n1' },
      deepFreeze({ name: 'n2' }),
    ]);
    const drafts = deepUnFreeze(inserted);
    drafts[0].name = 'n3';
    drafts[1].name = 'n4';
    deepFreeze(drafts[1]);
    collection.update(drafts);
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n3' },
      { $loki: 2, name: 'n4' },
    ]);
    expect(isFrozen(docs[0]) && isFrozen(docs[1])).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n3' }))).toEqual({
      $loki: 1,
      name: 'n3',
    });
    expect(isFrozen(collection.findOne({ name: 'n3' }))).toBe(true);
    expect(removeMeta(collection.findOne({ name: 'n4' }))).toEqual({
      $loki: 2,
      name: 'n4',
    });
    expect(isFrozen(collection.findOne({ name: 'n4' }))).toBe(true);
  });

  it('should work with chain().update()', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentUpdateEventName,
      ({ detail: { newDocument } }) => {
        expect(isFrozen(newDocument)).toBe(true);
      }
    );
    collection.insert([{ name: 'n1' }, { name: 'n2' }]);
    collection.chain().update((obj) => {
      obj.name += 'u';
    });
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n1u' },
      { $loki: 2, name: 'n2u' },
    ]);
    expect(isFrozen(docs[1]) && isFrozen(docs[2])).toBe(true);
  });

  it('should work with updateWhere', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentUpdateEventName,
      ({ detail: { newDocument } }) => {
        expect(isFrozen(newDocument)).toBe(true);
      }
    );
    collection.insert([{ name: 'n1' }, { name: 'n2' }]);
    collection.updateWhere(
      () => {
        return true;
      },
      (document) => {
        const result = deepUnFreeze(document);
        result.name += 'u';
        return result;
      }
    );
    const documents = collection.find();
    expect(removeMeta(documents)).toEqual([
      { $loki: 1, name: 'n1u' },
      { $loki: 2, name: 'n2u' },
    ]);
    expect(isFrozen(documents[1]) && isFrozen(documents[2])).toBe(true);
  });

  it('should work with the staging api', () => {
    const database = new Database('test.database');
    const collection = database.addCollection('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentUpdateEventName,
      ({ detail: { newDocument } }) => {
        expect(isFrozen(newDocument)).toBe(true);
      }
    );
    const inserted = collection.insert([{ name: 'n1' }, { name: 'n2' }]);
    const draft1 = collection.stage('draft', inserted[0]);
    draft1.name = 'n1u';
    const draft2 = collection.stage('draft', inserted[1]);
    draft2.name = 'n2u';
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n1' },
      { $loki: 2, name: 'n2' },
    ]);
    expect(isFrozen(docs[0])).toBe(true);
    expect(isFrozen(docs[1])).toBe(true);
    const commitMessage = 'draft commit';
    collection.commitStage('draft', commitMessage);
    const committedDocs = collection.find();
    expect(removeMeta(committedDocs)).toEqual([
      { $loki: 1, name: 'n1u' },
      { $loki: 2, name: 'n2u' },
    ]);
    expect(isFrozen(committedDocs[0])).toBe(true);
    expect(isFrozen(committedDocs[1])).toBe(true);
    expect(
      collection.commitLog.filter((entry) => {
        return entry.message === commitMessage;
      }).length
    ).toBe(2);
  });

  it('should remove frozen object', () => {
    const database = new Database('test.database');
    const collection = database.addCollection('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentDeleteEventName,
      ({ detail: { document } }) => {
        expect(isFrozen(document)).toBe(true);
      }
    );
    const inserted = collection.insert(
      deepFreeze([{ name: 'n1' }, { name: 'n2' }])
    );
    const removed = collection.remove(inserted[0]);
    expect(removeMeta(removed)).toEqual({ name: 'n1' });
    expect(isFrozen(removed)).toBe(true);
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([{ $loki: 2, name: 'n2' }]);
    expect(isFrozen(docs[0])).toBe(true);
  });

  it('should remove all frozen objects', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentDeleteEventName,
      ({ detail: { document } }) => {
        expect(isFrozen(document)).toBe(true);
      }
    );
    const inserted = collection.insert([
      { name: 'n1' },
      deepFreeze({ name: 'n2' }),
      { name: 'n3' },
    ]);
    collection.remove(inserted.slice(0, 2));
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([{ $loki: 3, name: 'n3' }]);
    expect(isFrozen(docs[0])).toBe(true);
  });

  it('should work with chain().find(fn).remove()', () => {
    const database = new Database('test.database');
    const collection = database.addCollection('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentDeleteEventName,
      ({ detail: { document } }) => {
        expect(isFrozen(document)).toBe(true);
      }
    );
    collection.insert([
      { name: 'n1' },
      { name: 'n2' },
      { name: 'n3' },
      { name: 'n4' },
    ]);
    collection
      .chain()
      .find({ name: { $regex: /3|4/ } })
      .remove();
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n1' },
      { $loki: 2, name: 'n2' },
    ]);
    expect(isFrozen(docs[0]) && isFrozen(docs[1])).toBe(true);
  });

  it('should work with removeWhere', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IPersonTestRecord>('documents', {
      disableFreeze: false,
    });
    collection.on(
      CollectionDocumentDeleteEventName,
      ({ detail: { document } }) => {
        expect(isFrozen(document)).toBe(true);
      }
    );
    collection.insert([
      { name: 'n1' },
      { name: 'n2' },
      { name: 'n3' },
      { name: 'n4' },
    ]);
    collection.removeWhere((obj) => {
      return obj.name === 'n3' || obj.name === 'n4';
    });
    const docs = collection.find();
    expect(removeMeta(docs)).toEqual([
      { $loki: 1, name: 'n1' },
      { $loki: 2, name: 'n2' },
    ]);
    expect(isFrozen(docs[0]) && isFrozen(docs[1])).toBe(true);
  });

  it('loadDatabase should freeze object', (callback) => {
    const adapter = new MemoryAdapter();
    const database = new Database('test.database', { adapter });
    const collection = database.addCollection('documents', {
      disableFreeze: false,
    });
    collection.insert([{ name: 'n1' }, { name: 'n2' }]);

    database.saveDatabase().then(() => {
      collection.clear();
      database.loadDatabase().then(() => {
        const internalCollection = database.getCollection('documents');
        const documents = internalCollection?.find();

        if (!documents) {
          throw new TypeError('Documents not found');
        }

        expect(removeMeta(documents)).toEqual([
          { $loki: 1, name: 'n1' },
          { $loki: 2, name: 'n2' },
        ]);

        expect(isFrozen(documents[0]) && isFrozen(documents[1])).toBe(true);
        callback();
      });
    });
  });

  it('should update unique index', () => {
    const database = new Database('test.database');
    const collection = database.addCollection<IIdTestRecord>('documents', {
      disableFreeze: false,
      unique: ['id'],
    });
    // insert one
    const inserted = collection.insert({ id: 'id1' });
    expect(collection.by('id', 'id1')).toBe(inserted);
    // insert array
    const inserted23 = collection.insert([{ id: 'id2' }, { id: 'id3' }]);
    expect(collection.by('id', 'id2')).toBe(inserted23[0]);
    expect(collection.by('id', 'id3')).toBe(inserted23[1]);
    // update one
    const draft1 = deepUnFreeze(inserted);
    draft1.id = 'id11';
    const updated = collection.update(draft1);
    expect(collection.by('id', 'id1')).toBe(undefined);
    expect(collection.by('id', 'id11')).toBe(updated);
    expect(collection.by('id', 'id11')).toBe(collection.get(1));
    // update array
    const draft2 = deepUnFreeze(inserted23);
    draft2[0].id = 'id22';
    draft2[1].id = 'id33';
    deepFreeze(draft2[1]);
    collection.update(draft2);
    expect(collection.by('id', 'id2')).toBe(undefined);
    expect(collection.by('id', 'id3')).toBe(undefined);
    expect(collection.by('id', 'id22')).toBe(collection.get(2));
    expect(collection.by('id', 'id33')).toBe(collection.get(3));
    // remove one
    collection.remove(1);
    expect(collection.find().length).toBe(2);
    expect(collection.by('id', 'id11')).toBe(undefined);
    // remove array
    collection.remove([2, 3]);
    expect(collection.find().length).toBe(0);
    expect(collection.by('id', 'id12')).toBe(undefined);
    expect(collection.by('id', 'id13')).toBe(undefined);
  });

  describe('dynamic views work and disableFreeze', () => {
    describe('test empty filter across changes', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IPersonTestRecord>('users', {
          disableFreeze: false,
        });
        documents.insert(PERSON_TEST_RECORDS);
        const dynamicView = documents.addDynamicView();

        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        // with no filter, results should be all documents
        expect(dynamicView.data().length).toBe(4);

        // find and update a document which will notify view to re-evaluate
        const document = documents.findOne({ name: 'gungnir' });
        expect(document?.owner).toBe('odin');

        if (!document) {
          throw new TypeError('Inserted document not found');
        }

        const unFreezedDocument = deepUnFreeze(document);
        unFreezedDocument.maker = 'dvalin';
        documents.update(document);

        expect(dynamicView.data().length).toBe(4);
      });
    });

    describe('dynamic view batch removes work as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IABTestRecord>('users', {
          disableFreeze: false,
        });
        const dynamicView = documents.addDynamicView('dynamicView');
        let filterEmitted = false;

        dynamicView.on(DynamicViewFilterEventName, () => {
          filterEmitted = true;
        });

        dynamicView.applyFind({ a: 1 });

        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(filterEmitted).toBe(true);

        documents.insert(AB_TEST_RECORDS);

        expect(dynamicView.data().length).toEqual(5);

        documents.findAndRemove({ b: { $lt: 7 } });

        expect(dynamicView.data().length).toEqual(2);

        const results = dynamicView.branchResultset().simpleSort('b').data();

        expect(results[0].b).toEqual(7);
        expect(results[1].b).toEqual(8);
      });
    });

    describe('dynamic (persistent/sorted) view batch removes work as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IABTestRecord>('users', {
          disableFreeze: false,
        });
        const dynamicView = documents.addDynamicView('dynamicView', {
          persistent: true,
        });
        let filterEmitted = false;
        let sortEmitted = false;
        dynamicView.on('filter', () => {
          filterEmitted = true;
        });
        dynamicView.on('sort', () => {
          sortEmitted = true;
        });
        dynamicView.applyFind({ a: 1 });
        dynamicView.applySimpleSort('b');
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);
        expect(filterEmitted).toBe(true);
        expect(sortEmitted).toBe(true);

        documents.insert(AB_TEST_RECORDS);

        expect(dynamicView.data().length).toEqual(5);

        documents.findAndRemove({ b: { $lt: 7 } });

        const results = dynamicView.data();
        expect(results.length).toEqual(2);
        expect(results[0].b).toEqual(7);
        expect(results[1].b).toEqual(8);
      });
    });

    describe('dynamic (persistent/sorted with criteria) view batch removes work as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IABTestRecord>('users', {
          disableFreeze: false,
        });
        const dynamicView = documents.addDynamicView('dynamicView', {
          persistent: true,
        });

        let filterEmitted = false;
        let sortEmitted = false;

        dynamicView.on(DynamicViewFilterEventName, () => {
          filterEmitted = true;
        });
        dynamicView.on(DynamicViewSortEventName, () => {
          sortEmitted = true;
        });

        dynamicView.applyFind({ a: 1 });
        dynamicView.applySortCriteria(['b']);
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);
        expect(filterEmitted).toBe(true);
        expect(sortEmitted).toBe(true);

        documents.insert(AB_TEST_RECORDS);

        expect(dynamicView.data().length).toEqual(5);

        documents.findAndRemove({ b: { $lt: 7 } });

        const results = dynamicView.data();
        expect(results.length).toEqual(2);
        expect(results[0].b).toEqual(7);
        expect(results[1].b).toEqual(8);
      });
    });

    describe('dynamic (persistent/sorted/indexed) view batch removes work as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IABTestRecord>('users', {
          disableFreeze: false,
          indices: ['b'],
        });
        const dynamicView = documents.addDynamicView('dynamicView', {
          persistent: true,
        });
        dynamicView.applyFind({ a: 1 });
        dynamicView.applySimpleSort('b');
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);

        documents.insert(AB_TEST_RECORDS);

        expect(dynamicView.data().length).toEqual(5);

        documents.findAndRemove({ b: { $lt: 7 } });

        const results = dynamicView.data();
        expect(results.length).toEqual(2);
        expect(results[0].b).toEqual(7);
        expect(results[1].b).toEqual(8);
      });
    });

    describe('dynamic view rematerialize works as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IPersonTestRecord>('users', {
          disableFreeze: false,
        });
        documents.insert(PERSON_TEST_RECORDS);
        const dynamicView = documents.addDynamicView();

        dynamicView.applyFind({ owner: 'odin' });
        dynamicView.applyWhere((obj) => {
          return obj.maker === 'elves';
        });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);

        expect(dynamicView.data().length).toEqual(2);
        expect(dynamicView.filterPipeline.length).toEqual(2);

        dynamicView.rematerialize({ removeWhereFilters: true });
        expect(dynamicView.data().length).toEqual(2);
        expect(dynamicView.filterPipeline.length).toEqual(1);
      });
    });

    describe('dynamic view toJSON does not circularly reference', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection('users', {
          disableFreeze: false,
        });
        documents.insert(PERSON_TEST_RECORDS);
        const dynamicView = documents.addDynamicView();
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);

        const obj = dynamicView.toJSON();
        expect(obj.collection).toEqual(null);
      });
    });

    describe('dynamic view removeFilters works as expected', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IPersonTestRecord>('users', {
          disableFreeze: false,
        });
        documents.insert(PERSON_TEST_RECORDS);
        const dynamicView = documents.addDynamicView('owner');

        dynamicView.applyFind({ owner: 'odin' });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        dynamicView.applyWhere((obj) => {
          return obj.maker === 'elves';
        });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);

        expect(dynamicView.filterPipeline.length).toEqual(2);
        expect(dynamicView.data().length).toEqual(2);

        dynamicView.removeFilters();
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(dynamicView.filterPipeline.length).toEqual(0);
        expect(dynamicView.count()).toEqual(4);
      });
    });

    describe('removeDynamicView works correctly', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest');
        const documents = database.addCollection<IPersonTestRecord>('users', {
          disableFreeze: false,
        });
        documents.insert(PERSON_TEST_RECORDS);
        const dynamicView = documents.addDynamicView('owner', {
          persistent: true,
        });

        dynamicView.applyFind({ owner: 'odin' });
        dynamicView.applyWhere((obj) => {
          return obj.maker === 'elves';
        });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);

        expect(documents.dynamicViews.length).toEqual(1);

        documents.removeDynamicView('owner');
        expect(documents.dynamicViews.length).toEqual(0);
      });
    });

    describe('removeDynamicView works correctly (2)', () => {
      it('works', () => {
        const database = new Database('test.database');
        const collection = database.addCollection('coll', {
          disableFreeze: false,
        });
        collection.addDynamicView('dynamicView1');
        collection.addDynamicView('dynamicView2');
        collection.addDynamicView('dynamicView3');
        collection.addDynamicView('dynamicView4');
        collection.addDynamicView('dynamicView5');

        expect(collection.dynamicViews.length).toEqual(5);
        collection.removeDynamicView('dynamicView3');
        expect(collection.dynamicViews.length).toEqual(4);

        expect(collection.getDynamicView('dynamicView1')?.name).toEqual(
          'dynamicView1'
        );
        expect(collection.getDynamicView('dynamicView2')?.name).toEqual(
          'dynamicView2'
        );
        expect(collection.getDynamicView('dynamicView3')).toEqual(null);
        expect(collection.getDynamicView('dynamicView4')?.name).toEqual(
          'dynamicView4'
        );
        expect(collection.getDynamicView('dynamicView5')?.name).toEqual(
          'dynamicView5'
        );
      });
    });

    describe('dynamic view simple sort options work correctly', () => {
      it('works', () => {
        const database = new Database('dynamicViewTest.database');
        const collection = database.addCollection<INumericABTestRecord>(
          'test',
          {
            disableFreeze: false,
            indices: ['a', 'b'],
          }
        );

        // add basic dynamicView with filter on a and basic simple sort on b
        let dynamicView = collection.addDynamicView('dynamicViewTest');
        dynamicView.applyFind({ a: { $lte: 20 } });
        dynamicView.applySimpleSort('b');
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);

        // data only needs to be inserted once since we are leaving collection intact while
        // building up and tearing down dynamic views within it
        collection.insert([
          { a: 1, b: 11 },
          { a: 2, b: 9 },
          { a: 8, b: 3 },
          { a: 6, b: 7 },
          { a: 2, b: 14 },
          { a: 22, b: 1 },
        ]);

        // test whether results are valid
        let dynamicViewData = dynamicView.data();
        expect(dynamicViewData.length).toBe(5);
        for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
          expect(
            Operators.$lte(dynamicViewData[i].b, dynamicViewData[i + 1].b)
          );
        }

        // remove dynamic view
        collection.removeDynamicView('dynamicViewTest');

        // add basic dynamicView with filter on a and simple sort (with js fallback) on b
        dynamicView = collection.addDynamicView('dynamicViewTest');
        dynamicView.applyFind({ a: { $lte: 20 } });
        dynamicView.applySimpleSort('b', { useJavaScriptSorting: true });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);

        // test whether results are valid
        // for our simple integer datatypes javascript sorting is same as loki sorting
        dynamicViewData = dynamicView.data();
        expect(dynamicViewData.length).toBe(5);
        for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
          expect(dynamicViewData[i].b <= dynamicViewData[i + 1].b);
        }

        // remove dynamic view
        collection.removeDynamicView('dynamicViewTest');

        // add basic dynamicView with filter on a and simple sort (forced js sort) on b
        dynamicView = collection.addDynamicView('dynamicViewTest');
        dynamicView.applyFind({ a: { $lte: 20 } });
        dynamicView.applySimpleSort('b', {
          disableIndexIntersect: true,
          useJavaScriptSorting: true,
        });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);

        // test whether results are valid
        dynamicViewData = dynamicView.data();
        expect(dynamicViewData.length).toBe(5);
        for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
          expect(dynamicViewData[i].b <= dynamicViewData[i + 1].b);
        }

        // remove dynamic view
        collection.removeDynamicView('dynamicViewTest');

        // add basic dynamicView with filter on a and simple sort (forced loki sort) on b
        dynamicView = collection.addDynamicView('dynamicViewTest');
        dynamicView.applyFind({ a: { $lte: 20 } });
        dynamicView.applySimpleSort('b', { forceIndexIntersect: true });
        expect(isFrozen(dynamicView.filterPipeline)).toBe(true);
        expect(isFrozen(dynamicView.sortCriteriaSimple)).toBe(true);

        // test whether results are valid
        dynamicViewData = dynamicView.data();
        expect(dynamicViewData.length).toBe(5);
        for (let i = 0; i < dynamicViewData.length - 1; i += 1) {
          expect(
            Operators.$lte(dynamicViewData[i].b, dynamicViewData[i + 1].b)
          );
        }
      });
    });

    describe('querying branched result set', () => {
      const database = new Database('firstInly.database');
      const documents = database.addCollection<IPersonTestRecord>('documents', {
        disableFreeze: false,
      });
      documents.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      documents.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      documents.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      documents.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      const elves = documents.addDynamicView('elves');
      elves.applyFind({ maker: 'elves' });
      expect(isFrozen(elves.filterPipeline)).toBe(true);

      it('finds first result with firstOnly: true', () => {
        const resultset = elves.branchResultset();
        const result = resultset.find({ name: { $ne: 'thor' } }, true).data();
        expect(result.length).toBe(1);
        expect(result[0]?.name).toBe('gungnir');
      });

      it('finds first result with firstOnly: true and empty query', () => {
        const resultset = elves.branchResultset();
        const result = resultset.find({}, true).data();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('gungnir');
      });
    });
  });

  describe('changesApi with disableFreeze', () => {
    it('does what it says on the tin', () => {
      const database = new Database();
      const options = {
        asyncListeners: false,
        disableChangesApi: false,
        disableFreeze: false,
      };
      const users = database.addCollection<IPersonTestRecord>('users', options);
      const test = database.addCollection<IPersonTestRecord>('test', options);
      const test2 = database.addCollection<IPersonTestRecord>('test2', options);

      let document = users.insert({
        name: 'joe',
      });
      document = deepUnFreeze(document);
      document.name = 'jack';
      users.update(document);
      test.insert({
        name: 'test',
      });
      test2.insert({
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
      users.setChangesApi(false);
      expect(users.disableChangesApi).toEqual(true);

      document = deepUnFreeze(document);
      document.name = 'john';
      users.update(document);
      const newChanges = database.generateChangesNotification(['users']);

      expect(newChanges.length).toEqual(2);
      database.clearChanges();

      expect(users.getChanges().length).toEqual(0);

      document = deepUnFreeze(document);
      document.name = 'jim';
      users.update(document);
      users.flushChanges();

      expect(users.getChanges().length).toEqual(0);
    });

    it('works with delta mode', () => {
      const database = new Database();
      const options = {
        asyncListeners: false,
        disableChangesApi: false,
        disableDeltaChangesApi: false,
        disableFreeze: false,
      };
      const documents = database.addCollection<IPersonTestRecord>(
        'documents',
        options
      );

      // Add some documents to the collection
      documents.insert({
        name: 'mjolnir',
        owner: 'thor',
        maker: { name: 'dwarves', count: 1 },
      });
      documents.insert({
        name: 'gungnir',
        owner: 'odin',
        maker: { name: 'elves', count: 1 },
      });
      documents.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: { name: 'dwarves', count: 1 },
      });
      documents.insert({
        name: 'draupnir',
        owner: 'odin',
        maker: { name: 'elves', count: 1 },
      });

      // Find and update an existing document
      let document = documents.findOne({ name: 'tyrfing' });

      expect(isFrozen(document)).toBe(true);
      document = deepUnFreeze(document);

      if (!document) {
        throw new TypeError('Inserted document not found');
      }

      document.owner = 'arngrim';
      documents.update(document);

      document = deepUnFreeze(document);

      if (!document || !document.maker) {
        throw new TypeError('Inserted document not found');
      }

      if (typeof document.maker !== 'object') {
        throw new TypeError('The type of maker is incorrect');
      }

      document.maker.count = 4;
      documents.update(document);

      const changes: ICollectionChange<IPersonTestRecord>[] = JSON.parse(
        database.serializeChanges(['documents'])
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
      interface ITestRecord {
        name: string;
        owner: string;
        maker: string;
        count: number;
      }

      const database = new Database();

      const documents = database.addCollection<ITestRecord>('documents', {
        asyncListeners: false,
        disableChangesApi: false,
        disableDeltaChangesApi: false,
        disableFreeze: false,
      });

      // Add some documents to the collection
      documents.insert([
        { name: 'mjolnir', owner: 'thor', maker: 'dwarves', count: 0 },
        { name: 'gungnir', owner: 'odin', maker: 'elves', count: 0 },
        { name: 'tyrfing', owner: 'Svafrlami', maker: 'dwarves', count: 0 },
        { name: 'draupnir', owner: 'odin', maker: 'elves', count: 0 },
      ]);

      documents.chain().update((o) => {
        o.count += 1;
      });

      const changes: ICollectionChange<IPersonTestRecord>[] = JSON.parse(
        database.serializeChanges(['documents'])
      );

      expect(changes.length).toEqual(8);

      expect(changes[0].name).toEqual('documents');
      expect(changes[0].operation).toEqual('I');
      expect(changes[1].name).toEqual('documents');
      expect(changes[1].operation).toEqual('I');
      expect(changes[2].name).toEqual('documents');
      expect(changes[2].operation).toEqual('I');
      expect(changes[3].name).toEqual('documents');
      expect(changes[3].operation).toEqual('I');

      expect(changes[4].name).toEqual('documents');
      expect(changes[4].operation).toEqual('U');
      expect(changes[4].object.count).toEqual(1);
      expect(changes[5].name).toEqual('documents');
      expect(changes[5].operation).toEqual('U');
      expect(changes[5].object.count).toEqual(1);
      expect(changes[6].name).toEqual('documents');
      expect(changes[6].operation).toEqual('U');
      expect(changes[6].object.count).toEqual(1);
      expect(changes[7].name).toEqual('documents');
      expect(changes[7].operation).toEqual('U');
      expect(changes[7].object.count).toEqual(1);

      const keys = Object.keys(changes[7].object);
      keys.sort();
      expect(keys[0]).toEqual('$loki');
      expect(keys[1]).toEqual('count');
      expect(keys[2]).toEqual('meta');
    });
  });

  describe('freeze typed', () => {
    interface IInjectedPersonTestRecord extends IPersonTestRecord {
      customInflater?: boolean;
      onlyInflater?: boolean;
    }

    it('works', () => {
      const database = new Database('test.json');
      let collection: Collection<IInjectedPersonTestRecord> | null;

      const json = {
        filename: 'test.json',
        collections: [
          {
            name: 'users',
            data: [
              {
                name: 'joe',
                objType: 'users',
                meta: {
                  version: 0,
                  created: 1415467401386,
                  revision: 0,
                },
                $loki: 1,
              },
              {
                name: 'jack',
                objType: 'users',
                meta: {
                  version: 0,
                  created: 1415467401388,
                  revision: 0,
                },
                $loki: 2,
              },
            ],
            idIndex: [1, 2],
            binaryIndices: {},
            objType: 'users',
            transactional: false,
            cachedIndex: null,
            cachedBinaryIndex: null,
            cachedData: null,
            maxId: 2,
            dynamicViews: [],
            disableFreeze: false,
          },
        ],
        events: {
          close: [],
        },
        fs: {},
      };

      // Loading only using proto:
      database.loadJSON(JSON.stringify(json), {
        users: {
          Proto: User,
        },
      });

      collection = database.getCollection('users');

      if (!collection) {
        throw new TypeError(`Collection not found`);
      }

      expect(collection.get(1) instanceof User).toBe(true);
      expect(collection.get(1)?.name).toBe('joe');
      expect(isFrozen(collection.get(1))).toBe(true);

      // Loading using proto and inflate:
      database.loadJSON<IInjectedPersonTestRecord>(JSON.stringify(json), {
        users: {
          Proto: User,
          inflate: (src, dest) => {
            dest.$loki = src.$loki;
            dest.meta = src.meta;
            dest.customInflater = true;
          },
        },
      });

      collection = database.getCollection('users');

      if (!collection) {
        throw new TypeError(`Collection not found`);
      }

      expect(collection.get(1) instanceof User).toBe(true);
      expect(collection.get(1)?.name).toBe('');
      expect(collection.get(1)?.customInflater).toBe(true);
      expect(isFrozen(collection.get(1))).toBe(true);

      // Loading only using inflate:
      database.loadJSON<Pick<IInjectedPersonTestRecord, 'onlyInflater'>>(
        JSON.stringify(json),
        {
          users: {
            inflate: (src) => {
              const destination = {
                $loki: src.$loki,
                meta: src.meta,
                onlyInflater: true,
              };

              return destination;
            },
          },
        }
      );

      collection = database.getCollection<IInjectedPersonTestRecord>('users');

      if (!collection) {
        throw new TypeError(`Collection not found`);
      }

      expect(collection.get(1) instanceof User).toBe(false);
      expect(collection.get(1)?.name).toBe(undefined);
      expect(collection.get(1)?.onlyInflater).toBe(true);
      expect(isFrozen(collection.get(1))).toBe(true);
    });
  });
});
