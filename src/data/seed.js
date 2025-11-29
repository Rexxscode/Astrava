// src/data/seed.js
import { initDefaultStore } from "./initStorage.js";

export function seedInitialData() {
  initDefaultStore({
    "settings_global": { theme: "system", accentColor: "blue", customAccent: "", font: "inter", fontSize: 16 },
    "projects": [
      { id: "p-1", name: "Welcome Project", description: "Contoh project awal", type: "Web", status: "In Progress", tech: "React, Tailwind" }
    ],
    "users": [ { id: "admin", name: "Administrator", email: "admin@astrava.com", pass: "150410" } ]
  });
}
