// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./tailwind.css"; // tailwind generated CSS
import { seedInitialData } from "./data/seed.js";
import 'aos/dist/aos.css';
import AOS from 'aos';
AOS.init();


seedInitialData(); // only seeds if not present

createRoot(document.getElementById("root")).render(<App />);
