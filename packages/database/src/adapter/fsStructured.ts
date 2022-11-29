/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */

/*
  Loki (node) fs structured Adapter.
  This adapter will save database container and each collection to separate 
  files and save collection only if it is dirty.  It is also designed to use a
  destructured serialization method intended to lower the memory overhead of
  json serialization.
  
  This adapter utilizes ES6 generator/iterator functionality to stream output
  and uses node `readline` module to stream input.  This should lower memory
  pressure in addition to individual object serializations rather than loki's
  default deep object serialization.
*/

import fs, { ReadStream } from 'fs';
import { access, constants } from 'fs/promises';

import stream, { Writable } from 'stream';
import readline from 'readline';

import { Database, SerializationMethod } from '../Database';
import { PersistenceAdapter, PersistenceAdapterMode } from './typings';

interface IGenerateDestructuredIOption {
  /**
   * Can be used to only output an individual collection or db (-1)
   */
  partition: number;
}

export class DatabaseReferenceNotAvailableError extends Error {
  name = 'DatabaseReferenceNotAvailableError';

  constructor(task: string) {
    super(`Database not initialized while trying to ${task}`);
  }
}

export class FsStructuredAdapter
  implements PersistenceAdapter<PersistenceAdapterMode.Reference>
{
  mode = PersistenceAdapterMode.Reference as const;

  databaseReference: Database<PersistenceAdapterMode> | null = null;

  dirtyPartitions = [];

  /**
   * Loki structured (node) filesystem adapter class.
   * This class fulfills the loki 'reference' abstract adapter interface which
   * can be applied to other storage methods.
   *
   * @constructor LokiFsStructuredAdapter
   *
   */
  constructor() {
    this.generateDestructured = this.generateDestructured.bind(this);
    this.getPartition = this.getPartition.bind(this);
  }

  /**
   * Generator for constructing lines for file streaming output of db container
   * or collection.
   *
   * @param options - output format options for use externally to loki
   *
   * @returns A custom, restructured aggregation of independent serializations.
   */
  *generateDestructured(options: Partial<IGenerateDestructuredIOption> = {}) {
    let index;
    let dbCopy;

    if (!this.databaseReference) {
      throw new DatabaseReferenceNotAvailableError('generateDestructured');
    }

    const partition = options.partition ?? -1;

    // if partition is -1 we will return database container with no data
    if (partition === -1) {
      // instantiate lightweight clone and remove its collection data
      dbCopy = this.databaseReference.copy();

      for (index = 0; index < dbCopy.collections.length; index += 1) {
        dbCopy.collections[index].data = [];
      }

      yield dbCopy.serialize({
        serializationMethod: SerializationMethod.Normal
      });

      return;
    }

    // 'partitioned' along with 'partition' of 0 or greater is a request for
    // single collection serialization
    if (partition >= 0) {
      const docCount =
        this.databaseReference.collections[partition].data.length;

      for (let docIndex = 0; docIndex < docCount; docIndex += 1) {
        yield JSON.stringify(
          this.databaseReference.collections[partition].data[docIndex]
        );
      }
    }
  }

  /**
   * Loki persistence adapter interface function which outputs un-prototype db
   * object reference to load from.
   *
   * @param databaseName - the name of the database to retrieve.
   */
  loadDatabase = async (databaseName: string) => {
    this.databaseReference = null;

    // make sure file exists
    const stats = await new Promise<fs.Stats | null>((resolve, reject) => {
      fs.stat(databaseName, (fileError, x) => {
        if (!fileError) {
          return resolve(x);
        }

        if (fileError.code === 'ENOENT') {
          // file does not exist, so callback with null
          return resolve(null);
        }

        // some other file system error.
        return reject(fileError);
      });
    });

    if (!stats) return null;

    if (!stats.isFile()) {
      // something exists at this path but it isn't a file.
      throw new TypeError(`${databaseName} is not a valid file.`);
    }

    const inputStream = fs.createReadStream(databaseName);
    const outputStream = new stream.Writable();
    const lineReader = readline.createInterface(inputStream, outputStream);

    let jsonError: Error;
    // first, load db container component
    lineReader.on('line', (line) => {
      // it should single JSON object (a one line file)
      if (this.databaseReference === null && line !== '') {
        try {
          this.databaseReference = JSON.parse(line);
        } catch (e) {
          jsonError = e instanceof Error ? e : new Error(String(e));
        }
      }
    });

    // when that is done, examine its collection array to sequence loading
    // each
    return new Promise<Database<PersistenceAdapterMode> | null>(
      (resolve, reject) => {
        lineReader.on('close', async () => {
          if (jsonError) {
            // a json error was encountered reading the container file.
            reject(jsonError);
          } else if (
            !this.databaseReference ||
            !this.databaseReference.collections.length
          ) {
            resolve(this.databaseReference);
          } else if (this.databaseReference.collections.length > 0) {
            await this.loadNextCollection(databaseName, 0);
            resolve(this.databaseReference);
          } else {
            throw new Error('Unexpected lineReader finish condition branch');
          }
        });
      }
    );
  };

  /**
   * Recursive function to chain loading of each collection one at a time.
   * If at some point i can determine how to make async driven generator, this
   * may be converted to generator.
   *
   * @param databaseName - the name to give the serialized database
   * within the catalog.
   * @param collectionIndex - the ordinal position of the collection to
   * load.
   */
  loadNextCollection = async (
    databaseName: string,
    collectionIndex: number
  ) => {
    const fileName = `${databaseName}.${collectionIndex}`;

    let internalCollectionIndex = collectionIndex;

    const finalize = async () => {
      if (!this.databaseReference) {
        throw new DatabaseReferenceNotAvailableError('finalizeCollection');
      }

      internalCollectionIndex += 1;
      // if there are more collections, load the next one
      if (internalCollectionIndex < this.databaseReference.collections.length) {
        await this.loadNextCollection(databaseName, collectionIndex);
      }
      // otherwise we are done, callback to loadDatabase so it can return the
      // new db object representation.

      return null;
    };

    try {
      await access(fileName, constants.R_OK | constants.W_OK);
    } catch {
      // File does not exists, this may happen when the collection
      // is created but no data update happened after that, for this
      // case, we should skip reading the file and finalize the database.

      return finalize();
    }

    let inputStream: ReadStream | null = fs.createReadStream(fileName);
    let outputStream: Writable | null = new stream.Writable();
    let lineReader: readline.Interface | null = readline.createInterface(
      inputStream,
      outputStream
    );
    let data: unknown;

    return new Promise<null>((resolve, reject) => {
      if (!lineReader) {
        throw new TypeError('Line reader not available');
      }

      lineReader.on('line', (line) => {
        if (!this.databaseReference) {
          throw new DatabaseReferenceNotAvailableError(
            'loadNextCollectionReadLine'
          );
        }

        if (line !== '') {
          try {
            const parsedLine = JSON.parse(line);
            if (parsedLine.$loki === undefined) {
              // eslint-disable-next-line no-console
              console.warn('Invalid resource entry, will skip.');
              return;
            }

            data = parsedLine;
          } catch (e) {
            reject(e);
          }
          this.databaseReference.collections[collectionIndex].data.push(data);
        }
      });

      lineReader.on('close', () => {
        inputStream = null;
        outputStream = null;
        lineReader = null;
        data = null;

        resolve(finalize());
      });
    });
  };

  /**
   * Generator for yielding sequence of dirty partition indices to iterate.
   */
  *getPartition() {
    if (!this.databaseReference) {
      throw new DatabaseReferenceNotAvailableError('getPartition');
    }

    const collectionCount = this.databaseReference.collections.length;

    // since database container (partition -1) doesn't have dirty flag at db
    // level, always save
    yield -1;

    // yield list of dirty partitions for iteration
    for (let idx = 0; idx < collectionCount; idx += 1) {
      if (this.databaseReference.collections[idx]?.dirty) {
        yield idx;
      }
    }
  }

  /**
   * Saves structured json via database object reference.
   *
   * @param databaseName - the name to give the serialized database within the
   * catalog.
   * @param databaseReference - the database object reference to save.
   */

  saveDatabase = async (
    databaseName: string,
    databaseReference: Database<PersistenceAdapterMode>
  ) => {
    this.databaseReference = databaseReference;

    // create (dirty) partition generator/iterator
    const pi = this.getPartition();

    await this.saveNextPartition(databaseName, pi);
  };

  /**
   * Utility method for queueing one save at a time
   */
  saveNextPartition = async (
    databaseName: string,
    partition: Generator<number>
  ) => {
    const nextPartition = partition.next();
    if (nextPartition.done) {
      return;
    }

    // db container (partition -1) uses just databaseName for filename,
    // otherwise append collection array index to filename
    const filename =
      databaseName +
      (nextPartition.value === -1 ? '' : `.${nextPartition.value}`);
    const writeStream = fs.createWriteStream(filename);

    const lines = this.generateDestructured({
      partition: nextPartition.value
    });

    // iterate each of the lines generated by generateDestructured()
    for (const outline of lines) {
      writeStream.write(`${outline}\n`);
    }

    writeStream.end();

    return new Promise<void>((resolve) => {
      writeStream.on('close', async () => {
        await this.saveNextPartition(databaseName, partition);
        resolve();
      });
    });
  };

  deleteDatabase = () => {
    throw new Error(`This method is not implemented`);
  };
}
