/* eslint-disable no-underscore-dangle */

const SECURE_STORE_KEY_PREFIX = '@recative/naive-store';

/**
 * A naive store implementation that compatible with ionic's secureStore
 * implementation, this is useful if you want to build a website but keep the
 * compatibility with the application implementation.
 */
export class NaiveStore {
  private _objectInstance = localStorage;

  /**
   * Get value from the store.
   * @param key The key of your stored value
   * @returns Stored value or an empty string
   */
  get(key: string) {
    return Promise.resolve(
      this._objectInstance.getItem(`${SECURE_STORE_KEY_PREFIX}~~${key}`) ?? '',
    );
  }

  /**
   * Save value to the store.
   * @param key The key of your stored value
   * @param value The value to be saved
   * @returns This API will return nothing
   */
  set(key: string, value: string) {
    return Promise.resolve(
      this._objectInstance.setItem(`${SECURE_STORE_KEY_PREFIX}~~${key}`, value),
    );
  }

  /**
   * Remove a key from your store.
   * @param key The key of your stored value
   * @returns This API will return nothing
   */
  remove(key: string) {
    this._objectInstance.removeItem(`${SECURE_STORE_KEY_PREFIX}~~${key}`);
    return Promise.resolve(key);
  }

  /**
   * List all keys available.
   * @returns Keys available in the storage.
   */
  keys(): Promise<string[]> {
    return Promise.resolve(
      Object.keys(this._objectInstance).filter((key) => key.startsWith(SECURE_STORE_KEY_PREFIX)),
    );
  }

  /**
   * Remove all items from your storage.
   * @returns This API will return nothing
   */
  clear() {
    Object.keys(this._objectInstance).forEach((key) => {
      if (key.startsWith(SECURE_STORE_KEY_PREFIX)) {
        this._objectInstance.removeItem(key);
      }
    });
    return Promise.resolve();
  }

  // eslint-disable-next-line class-methods-use-this
  secureDevice() {
    return Promise.resolve(null);
  }
}
