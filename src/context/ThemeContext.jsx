// src/context/ThemeContext.jsx
import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function applyTheme(t) {
    const html = document.documentElement;
    html.classList.remove("dark");
    if (t === "dark") html.classList.add("dark");
    if (t === "system") {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
