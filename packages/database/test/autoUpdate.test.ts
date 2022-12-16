import { Collection, Database } from '../src';

import { IPersonTestRecord } from './definition';

describe('Auto update', () => {
  it('Auto updates inserted documents', (done) => {
    const collection = new Collection('test', {
      unique: ['name'],
      autoupdate: true,
    });

    collection.insert({
      name: 'Jack',
    });

    const document = collection.insert({
      name: 'Peter',
    });

    function testDuplicateKey() {
      collection.addEventListener('error', (error) => {
        expect(error).toEqual(
          new Error(`Duplicate key for property name: ${document.name}`)
        );
        done();
      });
      document.name = 'Jack';
    }

    function testValueUpdate() {
      collection.addEventListener('update', (target) => {
        expect(target).toBe(document);

        testDuplicateKey();
      });
      document.name = 'John';
    }

    testValueUpdate();
  });

  it('Auto updates documents loaded from storage', (done) => {
    const db1 = new Database('autoupdate1.json');
    const db2 = new Database('autoupdate2.json');

    const collection1 = db1.addCollection<IPersonTestRecord>('test', {
      unique: ['name'],
      autoupdate: true,
    });
    const collection2 = db2.getCollection<IPersonTestRecord>('test');

    if (!collection2) {
      throw new TypeError(`Collection 2 not available!`);
    }

    const originalDocs = collection1.insert([
      {
        name: 'Jack',
      },
      {
        name: 'Peter',
      },
    ]);

    db2.loadJSON(db1.serialize());

    const document = collection2.by('name', 'Peter');

    expect(collection2.autoupdate).toBe(true);
    expect(document).toEqual(originalDocs[1]);

    function testDuplicateKey() {
      if (!collection2) {
        throw new TypeError(`Collection 2 not available!`);
      }

      collection2.addEventListener('error', (err) => {
        expect(err).toEqual(
          new Error(`Duplicate key for property name: ${document.name}`)
        );
        done();
      });
      document.name = 'Jack';
    }

    function testValueUpdate() {
      if (!collection2) {
        throw new TypeError(`Collection 2 not available!`);
      }

      collection2.addEventListener('update', (target) => {
        expect(target).toBe(document);

        testDuplicateKey();
      });
      document.name = 'John';
    }

    testValueUpdate();
  });
});
