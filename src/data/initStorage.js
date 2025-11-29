// src/utils/initStorage.js
export function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("loadData error", e);
    return null;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("saveData error", e);
    return false;
  }
}

export function removeData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearAllData() {
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

export function showToast(message, type = "info") {
  // Simple non-blocking toast (DOM) — can be replaced by a React toast lib
  const id = `toast_${Date.now()}`;
  const el = document.createElement("div");
  el.id = id;
  el.className = `fixed right-4 bottom-6 z-50 px-4 py-2 rounded shadow text-white ${type==="success"?"bg-green-600":type==="error"?"bg-red-600":type==="warning"?"bg-yellow-500 text-black":"bg-blue-600"}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 350);
  }, 2200);
}

/**
 * initDefault - helper to seed default keys if absent
 * Example keys:
 *  - settings_global
 *  - projects (array)
 *  - tasks_global (array)
 *  - users (array)
 */
export function initDefaultStore(defaults = {}) {
  Object.entries(defaults).forEach(([k, v]) => {
    if (loadData(k) === null) saveData(k, v);
  });
}
