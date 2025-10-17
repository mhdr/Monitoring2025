/**
 * IndexedDB storage adapter for redux-persist
 * Provides a Storage interface compatible with redux-persist using IndexedDB
 */

import { getItem, setItem, removeItem } from './indexedDbStorage';
import { createLogger } from './logger';

const logger = createLogger('Redux-IndexedDB');

/**
 * Redux Persist storage interface
 */
interface ReduxPersistStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Create IndexedDB storage adapter for redux-persist
 * Uses a specific key prefix for Redux data
 */
const REDUX_PREFIX = 'persist:';

const indexedDBReduxStorage: ReduxPersistStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const fullKey = `${REDUX_PREFIX}${key}`;
      const value = await getItem<string>(fullKey);
      return value;
    } catch (error) {
      logger.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const fullKey = `${REDUX_PREFIX}${key}`;
      // Don't use TTL for Redux persist data - it should be permanent
      await setItem(fullKey, value);
    } catch (error) {
      logger.error(`Error setting item ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const fullKey = `${REDUX_PREFIX}${key}`;
      await removeItem(fullKey);
    } catch (error) {
      logger.error(`Error removing item ${key}:`, error);
      throw error;
    }
  },
};

export default indexedDBReduxStorage;
