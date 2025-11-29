// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import {
  validateCredentials,
  registerUser,
  getCurrentUser as getCU,
  logout as logoutLS
} from "../data/usersData.js";

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCU());

  useEffect(() => {
    setUser(getCU());
  }, []);

  const login = ({ email, pass }) => {
    const u = validateCredentials(email, pass);
    if (u) {
      setUser(u);
      return { ok: true, user: u };
    }
    return { ok: false, message: "Email atau password salah" };
  };

  const register = ({ id, name, email, pass }) => {
    try {
      const createdId = registerUser({ id, name, email, pass });
      setUser({ id: createdId, name, email });
      return { ok: true, id: createdId };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  };

  const logout = () => {
    logoutLS();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
