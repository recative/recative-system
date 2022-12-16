import { hasOwn } from '../src/utils/hasOwn';
import { CloneMethod } from '../src/utils/clone';
import { Collection, Database } from '../src';

import { IPersonTestRecord } from './definition';

declare const personCollection: Collection<IPersonTestRecord>;

describe('Cloning behavior', () => {
  beforeEach(() => {
    const database = new Database('cloningDisabled');
    globalThis.personCollection =
      database.addCollection<IPersonTestRecord>('items');

    personCollection.insert({
      name: 'mjolnir',
      owner: 'thor',
      maker: 'dwarves',
    });
    personCollection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
    personCollection.insert({
      name: 'tyrfing',
      owner: 'Svafrlami',
      maker: 'dwarves',
    });
    personCollection.insert({
      name: 'draupnir',
      owner: 'odin',
      maker: 'elves',
    });
  });

  describe('Cloning disabled', () => {
    it('works', () => {
      let document = personCollection.findOne({ name: 'mjolnir' });

      if (!document) {
        throw new TypeError(`Inserted document not found`);
      }

      // you are modifying the actual object instance so this is worst case
      // where you modify that object and dont even call update().
      // this is not recommended, you should definately call update after modifying an object.
      document.maker = 'the dwarves';

      document = personCollection.findOne({ name: 'mjolnir' });

      expect(document?.maker).toBe('the dwarves');
    });
  });

  describe('Cloning inserts are immutable', () => {
    it('works', () => {
      const database = new Database('clonetest');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });
      const newDocument = { name: 'mjolnir', owner: 'thor', maker: 'dwarves' };
      const insertedDocument = collection.insert(newDocument);

      // cant' have either of these polluting our collection
      newDocument.name = 'mewmew';
      insertedDocument.name = 'mewmew';

      const document = collection.findOne({ owner: 'thor' });
      expect(document?.name).toBe('mjolnir');
    });
  });

  describe('cloning insert events emit cloned object', () => {
    it('works', () => {
      const datanase = new Database('clonetest');
      const collection = datanase.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.addEventListener('insert', (obj) => {
        /// attempt to tamper with name
        obj.name = 'zzz';
      });

      collection.insert({
        name: 'mjolnir',
        owner: 'thor',
        maker: 'dwarves',
        count: 0,
      });
      collection.insert({
        name: 'gungnir',
        owner: 'odin',
        maker: 'elves',
        count: 0,
      });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
        count: 0,
      });
      collection.insert({
        name: 'draupnir',
        owner: 'odin',
        maker: 'elves',
        count: 0,
      });

      const results = collection.find();
      expect(results.length).toEqual(4);

      results.forEach((obj) => {
        expect(obj.name === 'zzz').toEqual(false);
      });
    });
  });

  describe('Cloning updates are immutable', () => {
    it('works', () => {
      const database = new Database('clonetest');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });
      const newDocument = { name: 'mjolnir', owner: 'thor', maker: 'dwarves' };
      collection.insert(newDocument);
      const insertedDocument = collection.findOne({ owner: 'thor' });

      if (!insertedDocument) {
        throw new TypeError(`User not found`);
      }

      // after all that, just do this to ensure internal ref is different
      collection.update(insertedDocument);

      // can't have this polluting our collection
      insertedDocument.name = 'mewmew';

      const document = collection.findOne({ owner: 'thor' });
      expect(document?.name).toBe('mjolnir');
    });
  });

  describe('Cloning updates events emit cloned object', () => {
    it('works', () => {
      const database = new Database('clonetest');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.insert({
        name: 'mjolnir',
        owner: 'thor',
        maker: 'dwarves',
        count: 0,
      });
      collection.insert({
        name: 'gungnir',
        owner: 'odin',
        maker: 'elves',
        count: 0,
      });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
        count: 0,
      });
      collection.insert({
        name: 'draupnir',
        owner: 'odin',
        maker: 'elves',
        count: 0,
      });

      collection.addEventListener('update', (obj) => {
        /// attempt to tamper with name
        obj.name = 'zzz';
      });

      collection.findAndUpdate({ name: 'mjolnir' }, (o) => {
        // make an approved modification
        o.count = o.count ? o.count + 1 : 1;
      });

      const documents = collection.find();
      expect(documents.length).toEqual(4);

      documents.forEach((obj) => {
        expect(obj.name === 'zzz').toEqual(false);
      });

      const document = collection.findOne({ name: 'mjolnir' });
      expect(document?.count).toEqual(1);
    });
  });

  describe('cloning method "shallow" save prototype', () => {
    it('works', () => {
      const database = new Database('clonetest');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
        cloneMethod: CloneMethod.Shallow,
      });
      const newDocument = {
        name: 'mjolnir',
        owner: 'thor',
        maker: 'dwarves',
      };
      const insertedDocument = collection.insert(newDocument);

      // cant' have either of these polluting our collection
      newDocument.name = 'mewmew';
      insertedDocument.name = 'mewmew';

      const result = collection.findOne({ owner: 'thor' });

      expect(hasOwn(result, 'name')).toBe(true);
      expect(hasOwn(result, 'owner')).toBe(true);
      expect(hasOwn(result, 'maker')).toBe(true);
      expect(result?.name).toBe('mjolnir');
    });
  });

  describe('collection find() cloning works', () => {
    it('works', () => {
      const database = new Database('cloningEnabled');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      const document1 = collection.find({ name: 'mjolnir' })[0];
      document1.maker = 'the dwarves';

      const document2 = collection.find({ name: 'mjolnir' })[0];
      expect(document2.maker).toBe('dwarves');
    });
  });

  describe('Collection findOne() cloning works', () => {
    it('works', () => {
      const database = new Database('cloningEnabled');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      const document1 = collection.findOne({ name: 'mjolnir' });
      if (!document1) {
        throw new TypeError(`Inserted document not found`);
      }
      document1.maker = 'the dwarves';

      const document2 = collection.findOne({ name: 'mjolnir' });
      expect(document2?.maker).toBe('dwarves');
    });
  });

  describe('Collection where() cloning works', () => {
    it('works', () => {
      const database = new Database('cloningEnabled');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      const document1 = collection.where((document) => {
        return document.name === 'mjolnir';
      })[0];
      document1.maker = 'the dwarves';

      const document2 = collection.where((obj) => {
        return obj.name === 'mjolnir';
      })[0];

      expect(document2.maker).toBe('dwarves');
    });
  });

  describe('Collection by() cloning works', () => {
    it('works', () => {
      const database = new Database('cloningEnabled');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
        unique: ['name'],
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      const mj = collection.by('name', 'mjolnir');
      mj.maker = 'the dwarves';

      const mj2 = collection.by('name', 'mjolnir');

      expect(mj2.maker).toBe('dwarves');
    });
  });

  describe('collection by() cloning works with no data', () => {
    it('works', () => {
      const cdb = new Database('cloningEnabled');
      const collection = cdb.addCollection<IPersonTestRecord>('items', {
        clone: true,
        unique: ['name'],
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });

      // we dont have any items so this should return null
      let result = collection.by('name', 'gungnir');
      expect(result).toEqual(null);

      result = collection.by('name', 'mjolnir');
      expect(result.owner).toEqual('thor');
    });
  });

  describe('resultset data cloning works', () => {
    it('works', () => {
      const database = new Database('cloningEnabled');
      const collection = database.addCollection<IPersonTestRecord>('items', {
        clone: true,
      });

      collection.insert({ name: 'mjolnir', owner: 'thor', maker: 'dwarves' });
      collection.insert({ name: 'gungnir', owner: 'odin', maker: 'elves' });
      collection.insert({
        name: 'tyrfing',
        owner: 'Svafrlami',
        maker: 'dwarves',
      });
      collection.insert({ name: 'draupnir', owner: 'odin', maker: 'elves' });

      // just to prove that resultset.data() is not giving the user the actual object reference we keep internally
      // we will modify the object and see if future requests for that object show the change
      const document1 = collection.chain().find({ name: 'mjolnir' }).data()[0];
      if (!document1) {
        throw new TypeError(`Inserted document not found`);
      }

      document1.maker = 'the dwarves';

      const document2 = collection.findOne({ name: 'mjolnir' });

      expect(document2?.maker).toBe('dwarves');
    });
  });

  describe('resultset data forced cloning works', () => {
    it('works', () => {
      // although our collection does not define cloning, we can choose to clone results
      // within resultset.data() options
      const document1 = personCollection
        .chain()
        .find({ name: 'mjolnir' })
        .data({
          forceClones: true,
          // ,forceCloneMethod: 'parse-stringify'
        })[0];
      document1.maker = 'the dwarves';

      const document2 = personCollection.findOne({ name: 'mjolnir' });

      expect(document2?.maker).toBe('dwarves');
    });
  });
});
