import { Database } from '../Database';
import { PersistenceAdapterMode } from './typings';
import type { PersistenceAdapter } from './typings';

export class DatabaseReferenceNotReadyError extends Error {
  name = 'DatabaseReferenceNotReadyError';

  constructor() {
    super(
      'Database reference is not initialized, unable to perform the action'
    );
  }
}

/**
 * configuration options for partitioning and paging
 * @param paging - (default: false) set to true to enable paging collection
 *        data.
 * @param pageSize - (default : 25MB, 25 * 1024 * 1024) you can use this to
 *        limit size of strings passed to inner adapter.
 * @param delimiter - allows you to override the default delimiter
 */
export interface IPartitioningAdapterOptions {
  paging: boolean;
  pageSize: number;
  delimiter: string;
}

export interface IPageIterator {
  collection: number;
  docIndex: number;
  pageIndex: number;
}

export class PartitioningAdapter
  implements PersistenceAdapter<PersistenceAdapterMode.Reference>
{
  mode = PersistenceAdapterMode.Reference as const;

  databaseReference: Database<PersistenceAdapterMode.Default> | null = null;

  databaseName = '';

  pageIterator: IPageIterator = {
    collection: 0,
    docIndex: 0,
    pageIndex: 0
  };

  options: IPartitioningAdapterOptions;

  dirtyPartitions: number[] = [];

  /**
   * An adapter for adapters.
   * Converts a non reference mode adapter into a reference mode adapter which
   * can perform destructuring and partitioning.  Each collection will be stored
   * in its own key/save and only dirty collections will be saved.
   * If you turn on paging with default page size of 25megs and save a 75 meg
   * collection it should use up roughly 3 save slots (key/value pairs sent to
   * inner adapter).
   * A dirty collection that spans three pages will save all three pages again
   * Paging mode was added mainly because Chrome has issues saving 'too large'
   * of a string within a single indexedDb row.
   * If a single document update causes the collection to be flagged as dirty,
   * all of that collection's pages will be written on next save.
   *
   * @param adapter - reference to a 'non-reference' mode adapter instance.
   * @param options - configuration options for partitioning and paging
   */
  constructor(
    public adapter: PersistenceAdapter<PersistenceAdapterMode.Default>,
    options?: Partial<IPartitioningAdapterOptions>
  ) {
    this.options = {
      paging: false,
      pageSize: 25 * 1024 * 1024,
      delimiter: '$<\n',
      ...options
    };
  }

  /**
   * Loads a database which was partitioned into several key/value saves.
   *
   * @param databaseName - name of the database (fileName/keyName)
   */
  loadDatabase = async (databaseName: string) => {
    this.databaseName = databaseName;
    this.databaseReference = new Database(databaseName);

    // load the db container (without data)
    const result = await this.adapter.loadDatabase(databaseName);

    // empty database condition is for inner adapter return null/undefined/falsy
    if (!result) {
      // partition 0 not found so new database, no need to try to load other
      // partitions.
      // return same falsy result to loadDatabase to signify no database exists
      // (yet).
      return result;
    }

    if (typeof result !== 'string') {
      throw new TypeError(
        'PartitioningAdapter received an unexpected response from inner adapter loadDatabase()'
      );
    }

    // I will want to use loki destructuring helper methods so i will inflate
    // into typed instance
    let databaseObject = JSON.parse(result);
    this.databaseReference.loadJSONObject(databaseObject);
    databaseObject = null;

    if (this.databaseReference.collections.length === 0) {
      return this.databaseReference;
    }

    this.pageIterator = {
      collection: 0,
      docIndex: 0,
      pageIndex: 0
    };

    await this.loadNextPartition(0);

    return this.databaseReference;
  };

  /**
   * Used to sequentially load each collection partition, one at a time.
   *
   * @param {int} partition - ordinal collection position to load next
   */
  loadNextPartition = async (partition: number): Promise<null> => {
    if (!this.databaseReference) {
      throw new DatabaseReferenceNotReadyError();
    }

    const keyName = `${this.databaseName}.${partition}`;

    if (this.options.paging === true) {
      this.pageIterator.pageIndex = 0;
      return this.loadNextPage();
    }

    const result = await this.adapter.loadDatabase(keyName);

    // The database could be null is it is a new one.
    if (result) {
      const data = this.databaseReference.deserializeCollection(result, {
        delimited: true,
        delimiter: this.options.delimiter,
        collectionIndex: partition
      });
      this.databaseReference.collections[partition].data = data;
    }

    if (partition + 1 < this.databaseReference.collections.length) {
      return this.loadNextPartition(partition + 1);
    }

    return null;
  };

  /**
   * Used to sequentially load the next page of collection partition, one at a
   * time.
   */
  loadNextPage = async (): Promise<null> => {
    if (!this.databaseReference) {
      throw new DatabaseReferenceNotReadyError();
    }

    // calculate name for next saved page in sequence
    const keyName = `${this.databaseName}.${this.pageIterator.collection}.${this.pageIterator.pageIndex}`;

    // load whatever page is next in sequence
    let result = await this.adapter.loadDatabase(keyName);

    let data: (string | null)[] = result?.split(this.options.delimiter) ?? [];

    // free up memory now that we have split it into array
    result = '';

    let dataLength = data.length;

    // detect if last page by presence of final empty string element and remove
    // it if so
    const isLastPage = data[dataLength - 1] === '';
    if (isLastPage) {
      data.pop();
      dataLength = data.length;
      // empty collections are just a delimiter meaning two blank items
      if (data[dataLength - 1] === '' && dataLength === 1) {
        data.pop();
        dataLength = data.length;
      }
    }

    // convert stringified array elements to object instances and push to
    // collection data
    for (let i = 0; i < dataLength; i += 1) {
      const line = data[i];
      if (!line) continue;

      this.databaseReference.collections[
        this.pageIterator.collection
      ].data.push(JSON.parse(line));

      data[i] = null;
    }

    data = [];

    // if last page, we are done with this partition
    if (isLastPage) {
      this.pageIterator.collection += 1;

      // if there are more partitions, kick off next partition load
      if (
        this.pageIterator.collection < this.databaseReference.collections.length
      ) {
        return this.loadNextPartition(this.pageIterator.collection);
      }
      return null;
    }

    this.pageIterator.pageIndex += 1;

    return this.loadNextPage();
  };

  /**
   * Saves a database by portioning into separate key/value saves.
   *
   * @param databaseName - name of the database (fileName/keyName)
   * @param databaseReference - reference to database which we will partition
   *        and save
   */
  saveDatabase = async (
    databaseName: string,
    databaseReference: Database<PersistenceAdapterMode.Default>
  ): Promise<void> => {
    const collectionCount = databaseReference.collections.length;

    this.databaseName = databaseName;
    this.databaseReference = databaseReference;

    // queue up dirty partitions to be saved
    this.dirtyPartitions = [-1];
    for (let i = 0; i < collectionCount; i += 1) {
      if (databaseReference.collections[i].dirty) {
        this.dirtyPartitions.push(i);
      }
    }

    return this.saveNextPartition();
  };

  /**
   * Helper method used internally to save each dirty collection, one at a time.
   *
   */
  saveNextPartition = async (): Promise<void> => {
    if (!this.databaseReference) {
      throw new DatabaseReferenceNotReadyError();
    }

    const partition = this.dirtyPartitions.shift();
    const keyName =
      this.databaseName + (partition === -1 ? '' : `.${partition}`);

    // if we are doing paging and this is collection partition
    if (this.options.paging && partition !== -1) {
      this.pageIterator = {
        collection: partition ?? 0,
        docIndex: 0,
        pageIndex: 0
      };

      // since saveNextPage recursively calls itself until done, our callback
      // means this whole paged partition is finished
      await this.saveNextPage();

      if (this.dirtyPartitions.length === 0) {
        return;
      }

      return this.saveNextPartition();
    }

    // otherwise this is 'non-paged' partitioning...
    const result = this.databaseReference.serializeDestructured({
      partitioned: true,
      delimited: true,
      partition
    });

    await this.adapter.saveDatabase(
      keyName,
      Array.isArray(result) ? result.join(this.options.delimiter) : result
    );

    if (this.dirtyPartitions.length === 0) {
      return;
    }
    return this.saveNextPartition();
  };

  /**
   * Helper method used internally to generate and save the next page of the
   * current (dirty) partition.
   */
  saveNextPage = async (): Promise<void> => {
    if (!this.databaseReference) {
      throw new DatabaseReferenceNotReadyError();
    }

    const collection =
      this.databaseReference.collections[this.pageIterator.collection];
    const keyName = `${this.databaseName}.${this.pageIterator.collection}.${this.pageIterator.pageIndex}`;

    let pageLength = 0;
    let serializedObject = '';
    let pageBuilder = '';
    let doneWithPartition = false;
    let doneWithPage = false;

    if (collection.data.length === 0) {
      doneWithPartition = true;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!doneWithPartition) {
        // serialize object
        serializedObject = JSON.stringify(
          collection.data[this.pageIterator.docIndex]
        );
        pageBuilder += serializedObject;
        pageLength += serializedObject.length;

        this.pageIterator.docIndex += 1;
        // if no more documents in collection to add, we are done with partition
        if (this.pageIterator.docIndex >= collection.data.length)
          doneWithPartition = true;
      }
      // if our current page is bigger than defined pageSize, we are done with
      // page
      if (pageLength >= this.options.pageSize) doneWithPage = true;

      // if not done with current page, need delimiter before next item
      // if done with partition we also want a delimiter to indicate 'end of
      // pages' final empty row
      if (!doneWithPage || doneWithPartition) {
        pageBuilder += this.options.delimiter;
        pageLength += this.options.delimiter.length;
      }

      // if we are done with page save it and pass off to next recursive call or
      // callback
      if (doneWithPartition || doneWithPage) {
        await this.adapter.saveDatabase(keyName, pageBuilder);

        pageBuilder = '';

        // update meta properties then continue process by invoking callback
        if (doneWithPartition) {
          return;
        }

        this.pageIterator.pageIndex += 1;
        return this.saveNextPage();
      }
    }
  };

  deleteDatabase = (fileName: string) => {
    return this.adapter.deleteDatabase(fileName);
  };
}
