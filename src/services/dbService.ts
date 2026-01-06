
import { SiteSurvey } from '../types';

const DB_NAME = 'OSP_Survey_Pro_DB';
const STORE_NAME = 'project_state';
const IMAGE_STORE_NAME = 'image_assets';
const CONFIG_STORE_NAME = 'app_config';
const DB_VERSION = 3;

export interface StorageEstimate {
  quota: number; // in bytes
  usage: number; // in bytes
  percent: number;
}

/**
 * Returns current storage health and remaining capacity.
 */
export const getStorageHealth = async (): Promise<StorageEstimate> => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    return {
      quota,
      usage,
      percent: quota > 0 ? (usage / quota) * 100 : 0
    };
  }
  return { quota: 0, usage: 0, percent: 0 };
};

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
};

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE_NAME)) {
        db.createObjectStore(CONFIG_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveState = async (key: string, data: SiteSurvey): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getState = async (key: string): Promise<SiteSurvey | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveImageBlob = async (photoId: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(blob, photoId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getImageBlob = async (photoId: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.get(photoId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveConfig = async (key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getConfig = async (key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CONFIG_STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const clearState = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, IMAGE_STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.objectStore(IMAGE_STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
