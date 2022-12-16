import { Database } from '../src';

describe('remove', () => {
  it('removes', () => {
    interface IPersonTestRecord {
      name: string;
      age: number;
    }

    const db = new Database();
    const users = db.addCollection<IPersonTestRecord>('users');

    users.insert({
      name: 'joe',
      age: 39,
    });
    users.insert({
      name: 'jack',
      age: 20,
    });
    users.insert({
      name: 'jim',
      age: 40,
    });
    users.insert({
      name: 'dave',
      age: 33,
    });
    users.insert({
      name: 'jim',
      age: 29,
    });
    users.insert({
      name: 'dave',
      age: 21,
    });

    const dynamicView = users.addDynamicView('testView');
    dynamicView.applyWhere((x) => {
      return x.name.length > 3;
    });

    users.removeWhere((x) => {
      return x.age > 35;
    });
    expect(users.data.length).toEqual(4);
    users.removeWhere({
      age: {
        $gt: 25,
      },
    });
    expect(users.data.length).toEqual(2);
    users.remove(6);
    expect(users.data.length).toEqual(1);
    users.removeDataOnly();
    expect(users.data.length).toEqual(0);
    expect(!!users.getDynamicView('testView')).toEqual(true);

    const rawData = {
      name: 'foo',
      age: 42,
    };
    const inserted = users.insert(rawData);
    expect(users.data.length).toEqual(1);
    const removed = users.remove(inserted);

    if (!removed) {
      throw new TypeError(`Removed data not returned`);
    }

    expect(users.data.length).toEqual(0);
    // test that $loki and meta properties have been removed correctly to allow object re-insertion
    expect(!removed.$loki).toEqual(true);
    expect(!removed.meta).toEqual(true);
    users.insert(removed);
    expect(users.data.length).toEqual(1);
  });

  it('removes with unique index', () => {
    const database = new Database();
    const collection = database.addCollection('userSwitchUnique', {
      unique: ['username'],
    });

    collection.insert({
      username: 'joe',
      name: 'joe',
      age: 39,
    });
    collection.insert({
      username: 'jack',
      name: 'jack',
      age: 20,
    });
    expect(collection.data.length).toEqual(2);
    collection.removeDataOnly();
    expect(collection.data.length).toEqual(0);
  });
});
