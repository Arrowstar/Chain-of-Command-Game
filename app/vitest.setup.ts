import '@testing-library/jest-dom';
import 'vitest-canvas-mock';
import { vi, beforeEach } from 'vitest';

vi.mock('idb', () => {
  const stores = new Map<string, Map<string, any>>();
  function getStore(name: string) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  }
  const db = {
    put: async (storeName: string, value: any) => {
      const key = value.meta?.id ?? value.id;
      getStore(storeName).set(key, value);
      return key;
    },
    get: async (storeName: string, key: string) => getStore(storeName).get(key),
    getAll: async (storeName: string) => Array.from(getStore(storeName).values()),
    count: async (storeName: string) => getStore(storeName).size,
    delete: async (storeName: string, key: string) => getStore(storeName).delete(key),
    _stores: stores,
  };
  return { openDB: async () => db };
});

import { openDB } from 'idb';

beforeEach(async () => {
  const db = await openDB('' as any, 1 as any);
  (db as any)._stores.forEach((store: Map<string, any>) => store.clear());
});
