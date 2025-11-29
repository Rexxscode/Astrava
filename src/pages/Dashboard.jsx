// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import AOS from "aos"; // AOS
import "aos/dist/aos.css"; // AOS CSS

// --- Helpers for localStorage ---
const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const KEY_STATS = "dashboardStats";
const KEY_PROJECTS = "projects";
const KEY_TASKS = "tasks_global";

// Default stats
const DEFAULT_STATS = {
  totalProjects: 0,
  completedProjects: 0,
  activeProjects: 0,
  recentActivities: [],
  productivityScore: 0,
};

export default function Dashboard() {
  // Init AOS
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: false,
      offset: 60,
    });
  }, []);

  const [stats, setStats] = useState(() => readJSON(KEY_STATS, DEFAULT_STATS));
  const [projects, setProjects] = useState(() => readJSON(KEY_PROJECTS, []));
  const [tasks, setTasks] = useState(() => readJSON(KEY_TASKS, []));
  const [search, setSearch] = useState("");
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivityText, setNewActivityText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const autoSyncRef = useRef(null);

  // Current user
  const currentUserRaw = useMemo(() => {
    return (
      readJSON("currentUser") ||
      readJSON("auth:user") ||
      readJSON("rememberedUser") ||
      JSON.parse(localStorage.getItem("auth:user") || "null")
    );
  }, []);

  const currentUserName =
    (currentUserRaw &&
      (currentUserRaw.name ||
        currentUserRaw.username ||
        currentUserRaw.email)) ||
    localStorage.getItem("astrava_user") ||
    "Guest";

  // Compute stats
  const computeStats = (projList = [], taskList = [], stored = DEFAULT_STATS) => {
    const totalProjects = projList.length;
    const completedProjects = projList.filter(
      (p) => (p.status || "").toLowerCase() === "completed"
    ).length;
    const activeProjects = totalProjects - completedProjects;

    const totalTasks = taskList.length;
    const doneTasks = taskList.filter((t) => {
      const s = (t.status || "").toLowerCase();
      return s === "done" || s === "completed";
    }).length;

    const productivityScore = Math.min(
      100,
      Math.round(
        ((completedProjects + doneTasks) /
          Math.max(totalProjects + totalTasks, 1)) *
          100
      )
    );

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      productivityScore,
      recentActivities: stored.recentActivities || [],
    };
  };

  // Load initial
  useEffect(() => {
    const p = readJSON(KEY_PROJECTS, []);
    const t = readJSON(KEY_TASKS, []);
    const s = readJSON(KEY_STATS, DEFAULT_STATS);
    const computed = computeStats(p, t, s);
    writeJSON(KEY_STATS, computed);
    setProjects(p);
    setTasks(t);
    setStats(computed);
  }, []);

  // Auto-sync
  useEffect(() => {
    if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    autoSyncRef.current = setInterval(() => {
      const p = readJSON(KEY_PROJECTS, []);
      const t = readJSON(KEY_TASKS, []);
      const s = readJSON(KEY_STATS, DEFAULT_STATS);
      const computed = computeStats(p, t, s);
      writeJSON(KEY_STATS, computed);
      setProjects(p);
      setTasks(t);
      setStats(computed);
    }, 15000);
    return () => clearInterval(autoSyncRef.current);
  }, []);

  // Filter activity
  useEffect(() => {
    const list = (stats.recentActivities || []).slice().reverse();
    if (!search) setFilteredActivities(list);
    else {
      const q = search.toLowerCase();
      setFilteredActivities(list.filter((a) => String(a).toLowerCase().includes(q)));
    }
  }, [search, stats]);

  const formatActivity = (raw) => {
    const s = String(raw || "");
    const m = s.match(/\[(.*?)\]\s*/);
    const time = m
      ? m[1]
      : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const text = s.replace(/\[.*?\]\s*/, "");

    let emoji = "📝";
    const lower = text.toLowerCase();
    if (lower.includes("project")) emoji = "📁";
    else if (lower.includes("task")) emoji = "✅";
    else if (lower.includes("bug") || lower.includes("fix")) emoji = "🛠️";
    else if (lower.includes("meeting")) emoji = "📅";
    else if (lower.includes("plan")) emoji = "🧩";

    return { time, text, emoji };
  };

  const addActivity = () => {
    if (!newActivityText.trim()) return;
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const entry = `[${time}] ${newActivityText.trim()}`;

    const s = readJSON(KEY_STATS, DEFAULT_STATS);
    s.recentActivities = s.recentActivities || [];
    s.recentActivities.push(entry);
    writeJSON(KEY_STATS, s);
    setStats(computeStats(projects, tasks, s));
    setNewActivityText("");
    setShowAddModal(false);
  };

  const clearActivitiesConfirmed = () => {
    const s = readJSON(KEY_STATS, DEFAULT_STATS);
    s.recentActivities = [];
    writeJSON(KEY_STATS, s);
    setStats(computeStats(projects, tasks, s));
    setShowClearConfirm(false);
  };

  const recalcNow = () => {
    const p = readJSON(KEY_PROJECTS, []);
    const t = readJSON(KEY_TASKS, []);
    const s = readJSON(KEY_STATS, DEFAULT_STATS);
    const computed = computeStats(p, t, s);
    writeJSON(KEY_STATS, computed);
    setProjects(p);
    setTasks(t);
    setStats(computed);
  };

  const progressPct = Math.round(
    (stats.completedProjects / Math.max(stats.totalProjects, 1)) * 100
  );

  return (
    <section className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto px-4">

      {/* HEADER */}
      <div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        data-aos="fade-down"
      >
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-3 drop-shadow-sm">
            <i className="fa-solid fa-chart-line text-blue-600" /> Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
            Hello,{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {String(currentUserName)}
            </span>{" "}
            👋
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-200 transition w-full md:w-64"
          />
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <i className="fa-solid fa-moon text-gray-700 dark:text-gray-200" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-300/40 transition flex items-center gap-2"
          >
            <i className="fa-solid fa-plus" /> Add
          </button>
        </div>
      </div>

      {/* SUMMARY CARD */}
      <div
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-3xl shadow-xl p-8 flex flex-col md:flex-row justify-between items-center gap-4"
        data-aos="zoom-in-up"
      >
        <div>
          <h2 className="text-3xl font-bold drop-shadow">Productivity Score</h2>
          <p className="text-sm opacity-90 mt-1">
            {stats.productivityScore > 75
              ? "📈 Excellent"
              : stats.productivityScore > 50
              ? "⚡ Good"
              : "💤 Need Focus"}
          </p>
        </div>
        <div className="text-6xl font-extrabold drop-shadow-lg">
          {stats.productivityScore}%
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

       <div
  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4"
  data-aos="fade-right"
>
  {[
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: "fa-diagram-project",
      color: "bg-blue-600",
    },
    {
      title: "Completed",
      value: stats.completedProjects,
      icon: "fa-circle-check",
      color: "bg-green-600",
    },
    {
      title: "Active",
      value: stats.activeProjects,
      icon: "fa-spinner",
      color: "bg-yellow-500",
    },
  ].map((s, idx) => (
    <div
      key={idx}
      className={`${
        idx === 2 ? "col-span-2 md:col-span-1" : ""
      } ${s.color} text-white p-6 rounded-2xl shadow-xl hover:scale-[1.05] hover:shadow-2xl transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[110px]`}
    >
      <div className="text-4xl mb-2">
        <i className={`fa-solid ${s.icon}`} />
      </div>
      <p className="text-sm opacity-90">{s.title}</p>
      <p className="text-4xl font-bold">{s.value}</p>
    </div>
  ))}
</div>


        {/* CHART */}
        <div
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg"
          data-aos="fade-left"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Completion Progress
          </h2>

          <div className="w-full bg-gray-300 dark:bg-gray-700 h-4 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-4 bg-green-500 transition-all duration-1000 ease-in-out rounded-full"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>

          <p className="text-right text-sm text-gray-600 dark:text-gray-400 mt-2">
            {progressPct}% Completed
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs opacity-70">Projects</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {stats.totalProjects}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Completed</p>
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {stats.completedProjects}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={recalcNow}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Recalc
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(
                  JSON.stringify({ projects, tasks, stats })
                );
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Copy Data
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVITIES */}
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg"
        data-aos="fade-up"
      >
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Recent Activities
          </h2>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-red-500 hover:text-red-700 flex items-center gap-2"
          >
            <i className="fa-solid fa-trash" /> Clear
          </button>
        </div>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredActivities.length === 0 ? (
            <li className="py-4 text-center text-gray-500 dark:text-gray-400">
              No activities yet.
            </li>
          ) : (
            filteredActivities.map((act, idx) => {
              const { time, text, emoji } = formatActivity(act);

              return (
                <li
                  key={idx}
                  data-aos="fade-up"
                  data-aos-delay={idx * 80}
                  className="py-3 px-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    {emoji} {text}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {time}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* FOOTER */}
      <footer
        className="text-center mt-6 text-gray-500 dark:text-gray-400 text-sm py-6"
        data-aos="fade-up"
      >
        © {new Date().getFullYear()} Technorex Dashboard — Multi-user
      </footer>

      {/* ADD MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          data-aos="zoom-in"
        >
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl z-50 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Add Activity</h3>
            <textarea
              rows={4}
              value={newActivityText}
              onChange={(e) => setNewActivityText(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-gray-200"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={addActivity}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CONFIRM */}
      {showClearConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowClearConfirm(false)}
          />
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl z-50 max-w-sm w-full"
            data-aos="zoom-in"
          >
            <h3 className="text-lg font-bold mb-3">Clear Activities?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={clearActivitiesConfirmed}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
