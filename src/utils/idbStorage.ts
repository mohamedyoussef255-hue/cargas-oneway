import { Station, AppSettings } from '../types/station';

const DB_NAME = 'aqrab_cargas_db';
const DB_VERSION = 1;
const STORE_STATIONS = 'stations';
const STORE_SETTINGS = 'settings';
const STORE_FILES = 'uploaded_files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_STATIONS)) {
        db.createObjectStore(STORE_STATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'name' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * حفظ كافة المحطات في التخزين العميق الثابت الدائم IndexedDB
 */
export async function saveStationsToIDB(stations: Station[]): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_STATIONS], 'readwrite');
      const store = tx.objectStore(STORE_STATIONS);
      store.clear(); // مسح المحطات السابقة لإعادة كتابة القائمة الحديثة
      for (const st of stations) {
        store.put(st);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('[IDB] Failed to save stations to IndexedDB:', e);
    return false;
  }
}

/**
 * استرجاع كافة المحطات من التخزين العميق IndexedDB
 */
export async function getStationsFromIDB(): Promise<Station[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_STATIONS], 'readonly');
      const store = tx.objectStore(STORE_STATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = req.result;
        if (Array.isArray(res) && res.length > 0) {
          resolve(res as Station[]);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * حفظ الإعدادات والشعار في IndexedDB
 */
export async function saveSettingsToIDB(settings: AppSettings): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put({ key: 'current_settings', data: settings, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * استرجاع الإعدادات من IndexedDB
 */
export async function getSettingsFromIDB(): Promise<AppSettings | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('current_settings');
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as AppSettings);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * حفظ نسخة أصلية من ملف KMZ المرفوع باسمه وتاريخه
 */
export async function saveUploadedKmzFileBackup(
  fileName: string,
  stationsCount: number,
  stationsData: Station[]
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.put({
        name: fileName,
        count: stationsCount,
        timestamp: new Date().toISOString(),
        stations: stationsData,
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * استرجاع قائمة ملفات KMZ المحفوظة كنسخ احتياطية
 */
export async function getSavedKmzBackups(): Promise<
  Array<{ name: string; count: number; timestamp: string }>
> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).map((item: any) => ({
          name: item.name,
          count: item.count,
          timestamp: item.timestamp,
        }));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
