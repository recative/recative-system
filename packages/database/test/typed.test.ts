import { Database, ICollectionDocument } from '../src';
import { User } from './utils';

describe('typed', () => {
  it('works', () => {
    interface ITestRecord {
      name: string;
      objType: string;
      customInflater?: boolean;
      onlyInflater?: boolean;
    }

    const db = new Database('test.json');

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
          DynamicViews: [],
        },
      ],
      events: {
        close: [],
      },
      fs: {},
    };

    // Loading only using proto:
    db.loadJSON(JSON.stringify(json), {
      users: {
        Proto: User,
      },
    });

    const collection0 = db.getCollection<ITestRecord>('users');

    if (!collection0) {
      throw new TypeError(`Collection not serialized correctly.`);
    }

    expect(collection0.get(1) instanceof User).toBe(true);
    expect(collection0.get(1)?.name).toBe('joe');

    // Loading using proto and inflate:
    db.loadJSON(JSON.stringify(json), {
      users: {
        Proto: User,
        inflate(src, dest) {
          dest.$loki = src.$loki;
          dest.meta = src.meta;
          dest.customInflater = true;
        },
      },
    });

    const collection1 = db.getCollection<ITestRecord>('users');

    if (!collection1) {
      throw new TypeError(`Collection not serialized correctly.`);
    }

    expect(collection1.get(1) instanceof User).toBe(true);
    expect(collection1.get(1)?.name).toBe('');
    expect(collection1.get(1)?.customInflater).toBe(true);

    // Loading only using inflate:
    db.loadJSON<ITestRecord>(JSON.stringify(json), {
      users: {
        inflate(src) {
          const dest = {} as ITestRecord & ICollectionDocument;

          dest.$loki = src.$loki;
          dest.meta = src.meta;
          dest.onlyInflater = true;

          return dest;
        },
      },
    });

    const collection2 = db.getCollection<ITestRecord>('users');

    if (!collection2) {
      throw new TypeError(`Collection not serialized correctly.`);
    }

    expect(collection2.get(1) instanceof User).toBe(false);
    expect(collection2.get(1)?.name).toBe(undefined);
    expect(collection2.get(1)?.onlyInflater).toBe(true);
  });
});
