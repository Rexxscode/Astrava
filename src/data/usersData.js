// src/data/usersData.js
import { loadData, saveData } from "../data/initStorage.js";

const USERS_KEY = "users";
const AUTH_USER_KEY = "activeUser";

// A. Ambil semua user
export function getAllUsers() {
  return loadData(USERS_KEY) || [];
}

// B. Validasi login user biasa
export function validateCredentials(email, pass) {
  const users = getAllUsers();
  const u = users.find(x => x.email === email && x.pass === pass);
  if (u) {
    saveData(AUTH_USER_KEY, u.id);
    return u;
  }
  return null;
}

// C. Register user baru
export function registerUser({ id, name, email, pass }) {
  const users = getAllUsers();
  if (users.find(u => u.email === email))
    throw new Error("Email sudah terdaftar");

  users.push({ id, name, email, pass });
  saveData(USERS_KEY, users);
  saveData(AUTH_USER_KEY, id);

  return id;
}

// D. Ambil user yang sedang login
export function getCurrentUser() {
  let uid = loadData("activeUser");

  if (!uid) uid = loadData("auth:user");

  if (!uid) {
    try {
      const raw = localStorage.getItem("astrava_user");
      uid = raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("astrava_user");
      uid = null;
    }
  }

  if (!uid) return null;

  // 🟩 Jika admin → return object lengkap
  if (uid === "admin") {
    return {
      id: "admin",
      name: "admin",
      email: "admin@astrava.com",
      role: "admin",
      passChangeRequired: false
    };
  }

  // User biasa
  const users = getAllUsers();
  return users.find(u => u.id === uid) || null;
}

// E. Logout
export function logout() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("astrava_user");
  localStorage.removeItem("auth:user");
}
