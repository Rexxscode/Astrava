// src/pages/Settings.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Settings.jsx (Single-file, Enhanced UI)
 * - Clean, one-file implementation
 * - Avoids state-induced loops (applyAccent no longer calls setSettings directly)
 * - Applies theme/font/accent via effects
 * - Toast uses lower z-index so it won't block the sidebar
 */

/* ---------- helpers ---------- */
const readJSON = (k, fallback = null) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const downloadJSON = (obj, filename) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ---------- keys & defaults ---------- */
const getActiveUser = () => localStorage.getItem("activeUser") || null;
const getSettingsKey = (userId) => (userId ? `settings_${userId}` : "settings_global");

const DEFAULT_SETTINGS = {
  theme: "system",
  accentColor: "blue",
  customAccent: "",
  font: "inter",
  fontSize: 16,
};

const PALETTE = [
  { id: "blue", classBg: "bg-blue-500", label: "Blue" },
  { id: "emerald", classBg: "bg-emerald-500", label: "Emerald" },
  { id: "rose", classBg: "bg-rose-500", label: "Rose" },
  { id: "violet", classBg: "bg-violet-500", label: "Violet" },
  { id: "amber", classBg: "bg-amber-500", label: "Amber" },
  { id: "teal", classBg: "bg-teal-500", label: "Teal" },
  { id: "fuchsia", classBg: "bg-fuchsia-500", label: "Fuchsia" },
];

/* ---------- small toast hook ---------- */
function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return { toast: msg, show: (m) => setMsg(m) };
}

/* ---------- main component ---------- */
export default function Settings() {
  useEffect(() => { AOS.init({ duration: 600 }); }, []);

  const activeUser = useMemo(() => getActiveUser(), []);
  const settingsKey = useMemo(() => getSettingsKey(activeUser), [activeUser]);
  const { toast, show } = useToast();

  const [activeTab, setActiveTab] = useState("appearance");
  const [settings, setSettings] = useState(() => readJSON(settingsKey, DEFAULT_SETTINGS));
  const [customColor, setCustomColor] = useState(settings.customAccent || "");
  const [importing, setImporting] = useState(false);

  // keep previous font to remove class cleanly
  const prevFontRef = useRef(settings.font);

  // Persist settings when changed
  useEffect(() => {
    writeJSON(settingsKey, settings);
  }, [settingsKey, settings]);

  // Apply theme
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Apply font and font size
  useEffect(() => {
    applyFont(settings.font, prevFontRef);
    document.body.style.fontSize = `${settings.fontSize}px`;
  }, [settings.font, settings.fontSize]);

  // Apply accent (either named or custom) whenever accent fields change
  useEffect(() => {
    const hex = settings.customAccent && settings.customAccent.startsWith("#") ? settings.customAccent : null;
    const accentId = hex ? "custom" : settings.accentColor;
    const value = getAccentValue(accentId, hex);
    document.documentElement.style.setProperty("--accent", value);
  }, [settings.accentColor, settings.customAccent]);

  // keep local custom color input in sync with settings
  useEffect(() => setCustomColor(settings.customAccent || ""), [settings.customAccent]);

  /* ---------- helpers that don't modify settings directly ---------- */
  function applyTheme(theme) {
    const html = document.documentElement;
    html.classList.remove("dark");
    if (theme === "dark") html.classList.add("dark");
    if (theme === "system") {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
    }
  }

  function applyFont(font, prevRef) {
    const prev = prevRef.current;
    if (prev) document.body.classList.remove(`font-${prev}`);
    document.body.classList.add(`font-${font}`);
    prevRef.current = font;
  }

  function getAccentValue(accentId, customHex) {
    if (customHex && customHex.startsWith("#")) return customHex;
    const map = {
      blue: "#3b82f6",
      emerald: "#10b981",
      rose: "#f43f5e",
      violet: "#7c3aed",
      amber: "#f59e0b",
      teal: "#14b8a6",
      fuchsia: "#d946ef",
    };
    return map[accentId] || "#3b82f6";
  }

  /* ---------- UI handlers (update settings state only) ---------- */
  const handleThemeChange = (e) => {
    const val = e.target.value;
    setSettings((s) => ({ ...s, theme: val }));
    show(`Theme set to ${capitalize(val)}`);
  };

  const handleFontChange = (e) => {
    const val = e.target.value;
    setSettings((s) => ({ ...s, font: val }));
    show(`Font set to ${capitalize(val)}`);
  };

  const handleFontSizeChange = (e) => {
    const val = parseInt(e.target.value, 10) || DEFAULT_SETTINGS.fontSize;
    setSettings((s) => ({ ...s, fontSize: val }));
  };

  const handleAccentSelect = (id) => {
    setSettings((s) => ({ ...s, accentColor: id, customAccent: "" }));
    show(`Accent set to ${id}`);
  };

  const handleCustomAccent = (e) => {
    const hex = e.target.value;
    setCustomColor(hex);
    setSettings((s) => ({ ...s, accentColor: "custom", customAccent: hex }));
    show("Custom accent applied");
  };

  const handleClearCustom = () => {
    setCustomColor("");
    setSettings((s) => ({ ...s, customAccent: "" }));
    show("Custom accent cleared");
  };

  const handleExport = () => {
    downloadJSON(settings, `technorex_settings_${activeUser || "global"}.json`);
    show("Settings exported");
  };

  const handleImport = (file) => {
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json || typeof json !== "object") throw new Error("invalid");
        const merged = { ...DEFAULT_SETTINGS, ...json };
        setSettings(merged);
        writeJSON(settingsKey, merged);
        show("Settings imported");
      } catch {
        show("Invalid settings file");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (!confirm("Reset settings to default?")) return;
    setSettings(DEFAULT_SETTINGS);
    writeJSON(settingsKey, DEFAULT_SETTINGS);
    show("Settings reset to default");
  };

  const handleClearUserData = () => {
    if (!activeUser) {
      if (!confirm("No active user found. Clear ALL localStorage?")) return;
      localStorage.clear();
      show("All localStorage cleared");
      return;
    }
    if (!confirm(`Clear all data for user "${activeUser}"? This will remove keys that include the user id.`)) return;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.includes(`_${activeUser}`) || k.includes(activeUser)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    show("User data cleared");
    setTimeout(() => location.reload(), 700);
  };

  /* ---------- utilities ---------- */
  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- render ---------- */
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6" data-aos="fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">⚙️ Application Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Customize theme, accent, fonts, backup & restore.</p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Active user: <span className="font-medium">{activeUser || "— (none)"}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow grid grid-cols-1 md:grid-cols-4 overflow-hidden">
        {/* sidebar tabs */}
        <aside className="p-5 border-r dark:border-gray-700 space-y-3">
          <TabButton label="Appearance" active={activeTab === "appearance"} onClick={() => setActiveTab("appearance")} />
          <TabButton label="Preferences" active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} />
          <TabButton label="Backup" active={activeTab === "backup"} onClick={() => setActiveTab("backup")} />
          <TabButton label="Data Info" active={activeTab === "data"} onClick={() => setActiveTab("data")} />
        </aside>

        {/* content */}
        <section id="settingsContent" className="col-span-1 md:col-span-3 p-6 md:p-8 space-y-6">
          {activeTab === "appearance" && (
            <>
              <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">🌗 Theme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Switch between Light, Dark, or System theme.</p>
                <select value={settings.theme} onChange={handleThemeChange} className="border px-3 py-2 rounded-md">
                  <option value="light">☀️ Light</option>
                  <option value="dark">🌙 Dark</option>
                  <option value="system">💻 System Default</option>
                </select>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">🎨 Accent Color</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Choose a preset or pick a custom hex color.</p>

                <div className="flex items-center gap-3 mb-3">
                  {PALETTE.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAccentSelect(p.id)}
                      className={`w-9 h-9 rounded-full shadow ${p.classBg} ${settings.accentColor === p.id && !settings.customAccent ? "ring-2 ring-offset-2 ring-blue-600" : ""}`}
                      aria-label={`Accent ${p.label}`}
                    />
                  ))}

                  <div className="flex items-center gap-2 ml-4">
                    <input type="color" value={customColor} onChange={handleCustomAccent} className="w-10 h-10 p-0 border rounded" />
                    <button onClick={handleClearCustom} className="px-3 py-1 border rounded">Clear</button>
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">Current: <span className="font-medium">{settings.customAccent || settings.accentColor}</span></div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">🔤 Font</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Choose font family and size.</p>

                <div className="flex gap-3 items-center mb-3">
                  <select value={settings.font} onChange={handleFontChange} className="border px-3 py-2 rounded-md">
                    <option value="inter">Inter</option>
                    <option value="poppins">Poppins</option>
                    <option value="roboto">Roboto</option>
                    <option value="montserrat">Montserrat</option>
                  </select>

                  <div className="flex items-center gap-3">
                    <input type="range" min="12" max="15" value={settings.fontSize} onChange={handleFontSizeChange} />
                    <div className="text-sm text-gray-600 dark:text-gray-300">{settings.fontSize}px</div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === "preferences" && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">⚡ Quick Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Reset app settings to defaults (keeps data).</p>
              <div className="flex gap-3">
                <button onClick={handleResetDefaults} className="px-4 py-2 border rounded-md">Reset to Defaults</button>
                <button onClick={() => show("Not implemented: advanced quick actions")} className="px-4 py-2 border rounded-md">Other quick actions</button>
              </div>
            </Card>
          )}

          {activeTab === "backup" && (
            <>
              <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">💾 Backup & Restore</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Export or import your settings JSON.</p>
                <div className="flex gap-3">
                  <button onClick={handleExport} className="px-4 py-2 border rounded-md">Export Settings</button>

                  <input id="settingsImportInput" type="file" accept="application/json" className="hidden" onChange={(e) => handleImport(e.target.files?.[0])} />
                  <button onClick={() => document.getElementById("settingsImportInput").click()} className="px-4 py-2 border rounded-md">{importing ? "Importing..." : "Import Settings"}</button>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">🧹 Clear All User Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Remove data keys that include the active user's id (projects, tasks, profile, etc.).</p>
                <div className="flex gap-3">
                  <button onClick={handleClearUserData} className="px-4 py-2 bg-red-600 text-white rounded-md">Clear User Data</button>
                </div>
              </Card>
            </>
          )}

          {activeTab === "data" && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">📊 Data Overview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Quick summary of app data.</p>
              <DataOverview activeUser={activeUser} />
            </Card>
          )}
        </section>
      </div>

      {/* footer actions */}
      <div className="flex justify-end gap-3">
        <button onClick={() => { writeJSON(settingsKey, settings); show("Settings saved"); }} className="px-4 py-2 border rounded-md">Save</button>
        <button onClick={() => { setSettings(readJSON(settingsKey, DEFAULT_SETTINGS)); show("Reverted to saved settings"); }} className="px-4 py-2 border rounded-md">Revert</button>
      </div>

      {/* toast - lower z so it doesn't block sidebar */}
      {toast && (
        <div className="fixed right-4 bottom-6 z-30 pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded shadow pointer-events-auto">{toast}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- small presentational components inside same file ---------- */
function Card({ children }) {
  return <div className="setting-card bg-white dark:bg-gray-800 rounded-2xl p-4">{children}</div>;
}

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-2 rounded-lg ${active ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
      {label}
    </button>
  );
}

/* ---------- DataOverview inline ---------- */
function DataOverview({ activeUser }) {
  const [info, setInfo] = useState({ projects: 0, tasks: 0, settingsKeyCount: 0 });

  useEffect(() => {
    const projects = readJSON("projects", []) || [];
    const tasksGlobal = readJSON("tasks_global", []) || [];
    let userRelated = 0;
    if (activeUser) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.includes(activeUser)) userRelated++;
      }
    }
    setInfo({ projects: projects.length, tasks: tasksGlobal.length, settingsKeyCount: userRelated });
  }, [activeUser]);

  return (
    <div className="text-gray-700 dark:text-gray-300">
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Projects:</strong> {info.projects}</li>
        <li><strong>Global tasks:</strong> {info.tasks}</li>
        <li><strong>User-related keys:</strong> {info.settingsKeyCount} {activeUser ? `(keys containing "${activeUser}")` : ""}</li>
      </ul>
    </div>
  );
}
