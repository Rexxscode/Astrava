// src/utils/db.js
// IndexedDB Helper — clean, stable & production ready

const DB_NAME = "RexxyAppDB";
const DB_VERSION = 1;
const STORE = "galleryImages";

/* -------------------------------------------------------------------------- */
/*                               OPEN / UPGRADE                               */
/* -------------------------------------------------------------------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);

    req.onupgradeneeded = (event) => {
      const db = req.result;

      // Create store if not exist
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });

        // Indexes
        store.createIndex("type", "type", { unique: false });
        store.createIndex("relatedId", "relatedId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
  });
}

/* -------------------------------------------------------------------------- */
/*                                 SAVE / PUT                                 */
/* -------------------------------------------------------------------------- */
export async function saveImage(data) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    store.put(data);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* -------------------------------------------------------------------------- */
/*                                 GET ALL                                     */
/* -------------------------------------------------------------------------- */
export async function getAllImages() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* -------------------------------------------------------------------------- */
/*                             GET BY TYPE (filter)                            */
/* -------------------------------------------------------------------------- */
export async function getImagesByType(type) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("type");

    const req = index.getAll(type);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* -------------------------------------------------------------------------- */
/*                           GET BY RELATED ID (task/project)                 */
/* -------------------------------------------------------------------------- */
export async function getImagesByRelatedId(relatedId) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("relatedId");

    const req = index.getAll(relatedId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                    */
/* -------------------------------------------------------------------------- */
export async function deleteImage(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* -------------------------------------------------------------------------- */
/*                                     CLEAR                                   */
/* -------------------------------------------------------------------------- */
export async function clearAllImages() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
