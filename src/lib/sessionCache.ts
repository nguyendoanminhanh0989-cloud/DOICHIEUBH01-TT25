/**
 * BỘ NHỚ ĐỆM PHIÊN TRÌNH DUYỆT (SESSION CACHE: sessionStorage + IndexedDB)
 * - Khi người dùng bấm F5 (Reload trang): Giữ nguyên 100% dữ liệu đã import và trạng thái màn hình đang làm việc.
 * - Chỉ khi TẮT TRÌNH DUYỆT (đóng phiên làm việc): `sessionStorage` tự động bị trình duyệt xóa,
 *   lần mở trình duyệt tiếp theo hệ thống phát hiện mã phiên mới và tự động dọn sạch toàn bộ cache cũ trong IndexedDB.
 */

const BROWSER_SESSION_ID_KEY = 'bhxh_browser_session_id_v1';
const IDB_NAME = 'bhxh_session_cache_db_v1';
const IDB_STORE = 'session_kv';

interface CachedEnvelope<T = any> {
  sessionId: string;
  updatedAt: number;
  value: T;
}

let currentBrowserSessionId = '';
let isFreshBrowserSession = false;

function initBrowserSessionId(): string {
  if (currentBrowserSessionId) return currentBrowserSessionId;
  try {
    const existing = sessionStorage.getItem(BROWSER_SESSION_ID_KEY);
    if (existing) {
      currentBrowserSessionId = existing;
      isFreshBrowserSession = false;
    } else {
      const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(BROWSER_SESSION_ID_KEY, generated);
      currentBrowserSessionId = generated;
      isFreshBrowserSession = true;
    }
  } catch {
    currentBrowserSessionId = 'sess_fallback';
  }
  return currentBrowserSessionId;
}

// Khởi tạo ngay khi nạp module
initBrowserSessionId();

function openSessionIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Nếu vừa mở lại trình duyệt mới (sau khi đã tắt trình duyệt), dọn sạch dữ liệu phiên cũ trong IndexedDB
if (isFreshBrowserSession && typeof indexedDB !== 'undefined') {
  openSessionIdb()
    .then(db => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
    })
    .catch(() => {});
}

/**
 * Đọc đồng bộ từ sessionStorage (dùng cho khởi tạo state tức thì khi F5)
 */
export function getSessionSync<T>(key: string, defaultVal: T): T {
  try {
    const sid = initBrowserSessionId();
    const raw = sessionStorage.getItem(`sc_${key}`);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (!parsed || parsed.sessionId !== sid) {
      sessionStorage.removeItem(`sc_${key}`);
      return defaultVal;
    }
    return parsed.value ?? defaultVal;
  } catch {
    return defaultVal;
  }
}

/**
 * Lưu đồng bộ vào sessionStorage (kèm sao lưu bất đồng bộ vào IndexedDB)
 */
export function setSessionSync<T>(key: string, value: T): void {
  const sid = initBrowserSessionId();
  const env: CachedEnvelope<T> = {
    sessionId: sid,
    updatedAt: Date.now(),
    value,
  };
  try {
    sessionStorage.setItem(`sc_${key}`, JSON.stringify(env));
  } catch {
    // Nếu dữ liệu lớn vượt quá 5MB của sessionStorage, xóa bản sessionStorage để dùng bản IndexedDB
    try {
      sessionStorage.removeItem(`sc_${key}`);
    } catch {}
  }
  setSessionCache(key, value).catch(() => {});
}

/**
 * Lưu dữ liệu (kể cả bảng dữ liệu lớn hoặc file PDF Uint8Array) vào IndexedDB gắn với phiên trình duyệt hiện tại
 */
export async function setSessionCache<T>(key: string, value: T): Promise<void> {
  const sid = initBrowserSessionId();
  const env: CachedEnvelope<T> = {
    sessionId: sid,
    updatedAt: Date.now(),
    value,
  };
  try {
    if (!(value instanceof Uint8Array)) {
      sessionStorage.setItem(`sc_${key}`, JSON.stringify(env));
    }
  } catch {
    // Bỏ qua nếu vượt dung lượng sessionStorage, IndexedDB bên dưới sẽ lưu đầy đủ
  }

  try {
    const db = await openSessionIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(env, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/**
 * Đọc dữ liệu từ IndexedDB (hoặc sessionStorage) nếu cùng phiên trình duyệt (qua F5 vẫn còn, tắt trình duyệt tự mất)
 */
export async function getSessionCache<T>(key: string): Promise<T | null> {
  const sid = initBrowserSessionId();
  try {
    const db = await openSessionIdb();
    const res = await new Promise<CachedEnvelope<T> | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (res && res.sessionId === sid) {
      return res.value;
    }
    if (res && res.sessionId !== sid) {
      removeSessionCache(key).catch(() => {});
    }
  } catch {}

  const fallback = getSessionSync<T | null>(key, null);
  return fallback;
}

/**
 * Xóa 1 khóa khỏi cache phiên hiện tại
 */
export async function removeSessionCache(key: string): Promise<void> {
  try {
    sessionStorage.removeItem(`sc_${key}`);
  } catch {}
  try {
    const db = await openSessionIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/**
 * Xóa toàn bộ dữ liệu đã import trong phiên (khi người dùng bấm Đăng xuất)
 */
export async function clearAllSessionCache(): Promise<void> {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('sc_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {}
  try {
    const db = await openSessionIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

