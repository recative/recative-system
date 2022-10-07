/* eslint-disable class-methods-use-this */
import { stat, readFile, writeFile, rename, unlink } from 'fs/promises';

/**
 * A persistence adapter which persists using node fs module
 */
export class FsAdapter {
  /**
   * Load data from file, will throw an error if the file does not exist
   *
   * @param databaseName - the filename of the database to load
   */
  loadDatabase = async (databaseName: string) => {
    try {
      const stats = await stat(databaseName);

      if (!stats.isFile()) {
        return null;
      }

      return await readFile(databaseName, { encoding: 'utf8' });
    } catch {
      return null;
    }
  };

  /**
   * save data to file, will throw an error if the file can't be saved
   * might want to expand this to avoid data loss on partial save
   * @param databaseName - the filename of the database to load
   */
  saveDatabase = async (databaseName: string, databaseString: string) => {
    const temporaryDatabaseName = `${databaseName}~`;
    await writeFile(temporaryDatabaseName, databaseString);
    await rename(temporaryDatabaseName, databaseName);
  };

  /**
   * delete the database file, will throw an error if the
   * file can't be deleted
   *
   * @param databaseName - the filename of the database to delete
   */
  deleteDatabase = (databaseName: string) => {
    return unlink(databaseName);
  };
}
