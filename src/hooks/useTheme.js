// src/hooks/useTheme.js
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext.jsx";
export default function useTheme() {
  return useContext(ThemeContext);
}
