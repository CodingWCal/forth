export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StorageReadResult = {
  value: string | null;
  available: boolean;
};

export function tryReadStorage(storage: StorageLike, key: string): StorageReadResult {
  try {
    return { value: storage.getItem(key), available: true };
  } catch {
    return { value: null, available: false };
  }
}

export function tryWriteStorage(storage: StorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readBrowserStorage(key: string): StorageReadResult {
  if (typeof window === "undefined") return { value: null, available: false };
  try {
    return tryReadStorage(window.localStorage, key);
  } catch {
    // Accessing the localStorage property can itself throw when storage is
    // disabled by browser privacy settings.
    return { value: null, available: false };
  }
}

export function writeBrowserStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return tryWriteStorage(window.localStorage, key, value);
  } catch {
    return false;
  }
}
