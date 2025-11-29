// src/pages/Tasks.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Tasks.jsx (upgraded + gallery integration)
 * - All original Tasks features preserved (drag/drop, per-user keys, migration, accent)
 * - Style aligned with Projects/Gallery (Tailwind, AOS)
 * - Task "Mark Completed" requires upload of documentation (image + title + desc) -> saved to KEY_GALLERY
 * - Upload panel for manual docs (same UX as Gallery page)
 * - Sync button to reload gallery from storage (useful when switching pages)
 *
 * Storage keys:
 * - tasksKeyFor(...) (existing logic)
 * - KEY_GALLERY = "gallery" (shared with Projects/Gallery pages)
 */

// ---------- Helpers ----------
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

// ---------- Keys & user helpers ----------
const LEGACY_KEYS = ["tasks", "tasks_global", "tasks_last_backup"]; // keys to consider migrating
const SETTINGS_GLOBAL_KEY = "settings_global";
const KEY_GALLERY = "gallery";

function getActiveUser() {
  return (
    localStorage.getItem("activeUser") ||
    (() => {
      try {
        const auth = JSON.parse(localStorage.getItem("auth:user") || "null");
        if (auth && auth.id) return auth.id;
      } catch {}
      return localStorage.getItem("astrava_user") || null;
    })()
  );
}

function tasksKeyFor(userId, projectId = null) {
  if (userId) {
    return projectId ? `tasks_${userId}_${projectId}` : `tasks_${userId}`;
  } else {
    return projectId ? `tasks_${projectId}` : "tasks_global";
  }
}

function settingsKeyFor(userId) {
  return userId ? `settings_${userId}` : SETTINGS_GLOBAL_KEY;
}

function makeGalleryEntry({ id, type = "manual", refId = null, title = "", description = "", image = "" }) {
  return {
    id: id ?? (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())),
    type,
    refId,
    title,
    description,
    image,
    createdAt: new Date().toISOString(),
  };
}

// ---------- Toast ----------
function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return { show: (m) => setMsg(m), Toast: () => (msg ? <div className="fixed right-4 bottom-6 z-50"><div className="bg-black/80 text-white px-4 py-2 rounded shadow">{msg}</div></div> : null) };
}

// ---------- Migration ----------
function migrateLegacyTasks(activeUser, projectId) {
  const target = tasksKeyFor(activeUser, projectId);
  if (readJSON(target, null)?.length) return; // already has data

  const candidates = [];
  if (projectId) candidates.push(`tasks_${projectId}`);
  candidates.push("tasks_global", "tasks");

  for (const k of candidates) {
    const v = readJSON(k, null);
    if (Array.isArray(v) && v.length) {
      writeJSON(target, v);
      console.info(`[Tasks] Migrated key ${k} -> ${target}`);
      break;
    }
  }
}

// ---------- Accent loader ----------
function loadAccent(userId) {
  const sKey = settingsKeyFor(userId);
  const settings = readJSON(sKey, null);
  if (settings) {
    if (settings.customAccent && settings.customAccent.startsWith("#")) return settings.customAccent;
    if (settings.accentColor) {
      const map = { blue: "#3b82f6", emerald: "#10b981", rose: "#f43f5e", violet: "#7c3aed", amber: "#f59e0b", teal: "#14b8a6", fuchsia: "#d946ef" };
      return map[settings.accentColor] || map.blue;
    }
  }
  const g = readJSON(SETTINGS_GLOBAL_KEY, null);
  if (g) {
    if (g.customAccent && g.customAccent.startsWith("#")) return g.customAccent;
    if (g.accentColor) {
      const map = { blue: "#3b82f6", emerald: "#10b981", rose: "#f43f5e", violet: "#7c3aed", amber: "#f59e0b", teal: "#14b8a6", fuchsia: "#d946ef" };
      return map[g.accentColor] || map.blue;
    }
  }
  return "#3b82f6";
}

// ---------- Component ----------
export default function Tasks() {
  // AOS
  useEffect(() => {
    AOS.init({ duration: 420, once: true });
  }, []);

  const activeUser = useMemo(() => getActiveUser(), []);
  const currentProjectRaw = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentProject") || "null");
    } catch {
      return null;
    }
  }, []);
  const projectContext = currentProjectRaw ? currentProjectRaw.id : null;
  const projectName = currentProjectRaw ? currentProjectRaw.name : null;

  // accent
  const [accent, setAccent] = useState(() => loadAccent(activeUser));

  // migration
  useEffect(() => {
    migrateLegacyTasks(activeUser, projectContext);
  }, [activeUser, projectContext]);

  // storage key
  const storageKey = useMemo(() => tasksKeyFor(activeUser, projectContext), [activeUser, projectContext]);

  // tasks state
  const [tasks, setTasks] = useState(() => readJSON(storageKey, []) || []);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // modal/editing
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", deadline: "", priority: "medium", status: "pending" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // drag/drop
  const [draggedId, setDraggedId] = useState(null);

  // gallery (shared)
  const [gallery, setGallery] = useState(() => readJSON(KEY_GALLERY, []) || []);

  // upload panel for manual gallery add (same as Gallery page)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadType, setUploadType] = useState("manual");
  const [uploadRefId, setUploadRefId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);

  // complete modal for tasks (require image when marking completed)
  const [completeModal, setCompleteModal] = useState({ open: false, taskId: null, title: "", description: "", file: null, previewImage: null, uploading: false });

  const { show, Toast } = useToast();
  const progressRef = useRef(null);

  // load tasks when storageKey changes
  useEffect(() => {
    const loaded = readJSON(storageKey, []) || [];
    setTasks(Array.isArray(loaded) ? loaded : []);
  }, [storageKey]);

  // persist tasks
  useEffect(() => {
    writeJSON(storageKey, tasks);
  }, [tasks, storageKey]);

  // persist gallery when changed
  useEffect(() => {
    writeJSON(KEY_GALLERY, gallery);
    AOS.refresh();
  }, [gallery]);

  // accent var
  useEffect(() => {
    if (accent) document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

  // Derived stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inprogress = tasks.filter((t) => t.status === "inprogress").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inprogress, pending, percent };
  }, [tasks]);

  // filtered tasks
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch = !q || (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;
      const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, filterStatus, filterPriority]);

  // progress bar animation
  useEffect(() => {
    if (!progressRef.current) return;
    progressRef.current.style.width = `${stats.percent}%`;
  }, [stats.percent]);

  // ---------- Handlers (Tasks) ----------
  const openAddModal = () => {
    setEditingTaskId(null);
    setForm({ title: "", description: "", deadline: "", priority: "medium", status: "pending" });
    setShowModal(true);
  };
  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setForm({ title: task.title || "", description: task.description || "", deadline: task.deadline || "", priority: task.priority || "medium", status: task.status || "pending" });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingTaskId(null);
  };

  const saveTask = (e) => {
    e && e.preventDefault && e.preventDefault();
    const title = (form.title || "").trim();
    if (!title) {
      show("⚠️ Task title required!");
      return;
    }
    const newTask = {
      id: editingTaskId || Date.now().toString(), // ensure string id
      title,
      description: form.description || "",
      deadline: form.deadline || "",
      priority: form.priority || "medium",
      status: form.status || "pending",
      projectId: projectContext || null,
      updatedAt: new Date().toISOString(),
      createdAt: editingTaskId ? tasks.find((t) => String(t.id) === String(editingTaskId))?.createdAt : new Date().toISOString(),
    };
    if (editingTaskId) {
      setTasks((prev) => prev.map((t) => (String(t.id) === String(editingTaskId) ? newTask : t)));
      show("✏️ Task updated!");
    } else {
      setTasks((prev) => [newTask, ...prev]);
      show("✅ Task added!");
    }
    closeModal();
  };

  // set confirmDeleteId as string
  const confirmDelete = (id) => setConfirmDeleteId(String(id));

  // actual delete function (works with string/number ids)
  const doDelete = () => {
    if (confirmDeleteId == null) return;

    setTasks((prev) =>
      prev.filter((t) => String(t.id) !== String(confirmDeleteId))
    );

    setConfirmDeleteId(null);
    show("🗑️ Task deleted!");
  };

  const toggleStatus = (id) => {
    // If marking completed, open completeModal to require image
    const current = tasks.find((t) => String(t.id) === String(id));
    if (!current) return;
    if (current.status !== "completed") {
      // open complete modal to upload documentation
      setCompleteModal({ open: true, taskId: String(id), title: `Dokumentasi: ${current.title}`, description: "", file: null, previewImage: null, uploading: false });
      return;
    }

    // if already completed, revert
    setTasks((prev) => prev.map((t) => (String(t.id) === String(id) ? { ...t, status: "pending", updatedAt: new Date().toISOString() } : t)));
    show("⏳ Task reopened");
  };

  // reorder drag/drop
  const onDragStart = (e, id) => {
    setDraggedId(String(id));
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(id)); } catch {}
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e, dropId) => {
    e.preventDefault();
    const dragged = draggedId || (e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData("text/plain"));
    if (!dragged) return;
    const draggedIdStr = String(dragged);
    if (draggedIdStr === String(dropId)) return;
    const idxFrom = tasks.findIndex((t) => String(t.id) === draggedIdStr);
    const idxTo = tasks.findIndex((t) => String(t.id) === String(dropId));
    if (idxFrom < 0 || idxTo < 0) return;
    const copy = [...tasks];
    const [item] = copy.splice(idxFrom, 1);
    copy.splice(idxTo, 0, item);
    setTasks(copy);
    setDraggedId(null);
    show("🔀 Tasks reordered");
  };

  const isExpired = (d) => {
    if (!d) return false;
    try {
      return new Date(d).setHours(23, 59, 59, 999) < new Date();
    } catch {
      return false;
    }
  };

  // Accent change UI
  const setAccentAndPersist = (hex) => {
    setAccent(hex);
    const sKey = settingsKeyFor(activeUser);
    const s = readJSON(sKey, {}) || {};
    s.customAccent = hex;
    s.accentColor = "custom";
    writeJSON(sKey, s);
    show("🎨 Accent updated");
  };

  // Export/import tasks
  const exportTasks = () => {
    downloadJSON(tasks, `technorex_tasks_${activeUser || "global"}${projectContext ? `_${projectContext}` : ""}.json`);
    show("💾 Tasks exported");
  };
  const importTasks = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const arr = JSON.parse(ev.target.result);
        if (!Array.isArray(arr)) throw new Error("invalid");
        const existingIds = new Set(tasks.map((t) => String(t.id)));
        const merged = [...tasks];
        arr.forEach((t) => {
          if (!existingIds.has(String(t.id))) merged.push({ ...t, id: String(t.id) });
        });
        setTasks(merged);
        show("📂 Tasks imported");
      } catch {
        show("❌ Invalid tasks file");
      }
    };
    reader.readAsText(file);
  };

  // ---------- Handlers (Gallery Uploads) ----------
  const handleUploadFile = (file) => {
    if (!file) {
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAddManual = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!uploadPreview) return alert("Pilih gambar terlebih dahulu.");
    setSavingUpload(true);
    const entry = makeGalleryEntry({ type: uploadType || "manual", refId: uploadRefId || null, title: uploadTitle || "Dokumentasi", description: uploadDesc || "", image: uploadPreview });
    setGallery((s) => [entry, ...s]);
    // reset
    setUploadFile(null);
    setUploadPreview(null);
    setUploadTitle("");
    setUploadDesc("");
    setUploadRefId("");
    setUploadType("manual");
    setUploadOpen(false);
    setSavingUpload(false);
    show("📸 Dokumentasi disimpan ke Gallery");
  };

  // complete modal handlers (task specific)
  const handleCompleteFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCompleteModal((c) => ({ ...c, file, previewImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const submitComplete = async () => {
    if (!completeModal.file || !completeModal.previewImage) {
      alert("Silakan pilih gambar bukti sebelum menandai selesai.");
      return;
    }
    setCompleteModal((c) => ({ ...c, uploading: true }));

    // create gallery entry
    const entry = makeGalleryEntry({ type: "task", refId: completeModal.taskId, title: completeModal.title || "Dokumentasi", description: completeModal.description || "", image: completeModal.previewImage });
    setGallery((g) => [entry, ...g]);

    // update task status
    setTasks((prev) => prev.map((t) => (String(t.id) === String(completeModal.taskId) ? { ...t, status: "completed", updatedAt: new Date().toISOString() } : t)));

    setTimeout(() => {
      setCompleteModal({ open: false, taskId: null, title: "", description: "", file: null, previewImage: null, uploading: false });
      show("✅ Task completed & dokumentasi tersimpan di Gallery");
      AOS.refresh();
    }, 300);
  };

  // sync gallery from storage
  const syncFromStorage = () => {
    const g = readJSON(KEY_GALLERY, []);
    setGallery(Array.isArray(g) ? g : []);
    AOS.refresh();
    show("🔁 Gallery synced");
  };

  // add manual gallery helper (exposed in-page)
  const addManualGallery = ({ title, description, image, type = "manual", refId = null }) => {
    const entry = makeGalleryEntry({ type, refId, title, description, image });
    setGallery((g) => [entry, ...g]);
    show("📸 Dokumentasi ditambahkan");
  };

  // ---------- Render ----------
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 md:p-8">
      <style>{`
        :root { --accent: ${accent}; }
        .break-inside-avoid { break-inside: avoid; -webkit-column-break-inside: avoid; }
      `}</style>

      {/* toolbar */}
      <div className="sticky top-4 z-39 bg-white dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-xl p-3 md:p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h1 className="text-2xl font-semibold">🗂️ Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">Manage tasks per-project or globally. Upload documentation upon completion..</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
            <button className={`px-3 py-1 text-sm rounded-md transition bg-white dark:bg-neutral-900 shadow-sm`}>All</button>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search Tasks..." className="w-full md:w-72 p-2 pl-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2" />
            {search && <button onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Clear</button>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setUploadOpen((s) => !s)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:opacity-95">+ Add Doc</button>
            <button onClick={syncFromStorage} className="px-3 py-2 border rounded-md text-sm">Sync Gallery</button>
          </div>
        </div>
      </div>

      {/* controls */}
      <section className="mt-6 p-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-md px-3 py-2 dark:bg-gray-800 dark:text-gray-100">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="inprogress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border rounded-md px-3 py-2 dark:bg-gray-800 dark:text-gray-100">
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button onClick={openAddModal} className="bg-[var(--accent)] hover:opacity-95 text-white px-4 py-2 rounded-lg shadow transition">+ Add Task</button>
            <input title="Pick accent color" type="color" value={accent} onChange={(e) => setAccentAndPersist(e.target.value)} className="w-9 h-9 p-0 border rounded" />
          </div>
        </div>
      </section>

      {/* stats & progress */}
      <section className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
  <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-center">
    <h3 className="text-sm font-medium">Total</h3>
    <p className="text-2xl font-bold">{stats.total}</p>
  </div>

  <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-center">
    <h3 className="text-sm font-medium">Completed</h3>
    <p className="text-2xl font-bold">{stats.completed}</p>
  </div>

  {/* CARD MELEBAR DI MOBILE */}
  <div className="col-span-2 sm:col-span-1 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center">
    <h3 className="text-sm font-medium">In Progress</h3>
    <p className="text-2xl font-bold">{stats.inprogress}</p>
  </div>
</section>

      <div className="relative mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
          <div ref={progressRef} className="h-2 bg-green-500 transition-all duration-700" style={{ width: `${stats.percent}%` }} />
        </div>
      </div>

      {/* task cards grid */}
      <section className="mt-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8 rounded-lg border">No tasks found</div>
          ) : (
            filteredTasks.map((t, idx) => {
              const deadlineExpired = isExpired(t.deadline);
              return (
                <article
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, t.id)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, t.id)}
                  className={`bg-white dark:bg-gray-800 border-l-4 rounded-lg p-5 shadow hover:shadow-lg transition flex flex-col justify-between min-h-[180px] ${t.status === "completed" ? "border-green-500" : t.status === "inprogress" ? "border-yellow-500" : "border-red-500"}`}
                  data-aos="fade-up"
                  data-aos-delay={Math.min(idx * 20, 300)}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 break-words">{t.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${t.priority === "high" ? "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200" : t.priority === "medium" ? "bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200" : "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200"}`}>{t.priority}</span>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 break-words">{t.description || "No description"}</p>

                    <div className="flex justify-between items-center mt-3 text-sm">
                      <span className={`${deadlineExpired ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-400"}`}>{t.deadline || "No deadline"}</span>
                      <span className={`capitalize ${t.status === "completed" ? "text-green-600" : t.status === "inprogress" ? "text-yellow-600" : "text-red-600"}`}>{t.status}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 mt-4">
                    <button onClick={() => toggleStatus(t.id)} className={`px-3 py-1 rounded text-white text-sm min-w-[78px] ${t.status === "completed" ? "bg-gray-500 hover:bg-gray-600" : "bg-green-500 hover:bg-green-600"}`}>{t.status === "completed" ? "Undo" : "Complete"}</button>
                    <button onClick={() => openEditModal(t)} className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-sm min-w-[65px]">Edit</button>
                    <button onClick={() => confirmDelete(t.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm min-w-[70px]">Delete</button>
                    <button onClick={() => setCompleteModal((c) => ({ ...c, open: true, taskId: t.id, title: `Dokumentasi: ${t.title}`, description: "" }))} className="px-3 py-1 border rounded text-sm">Add Doc</button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Add/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <form onSubmit={saveTask} className="bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-md shadow-lg">
            <h2 className="text-2xl font-bold mb-4">{editingTaskId ? "Edit Task" : "Add Task"}</h2>

            <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} id="inputTitle" type="text" placeholder="Task title..." required className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 w-full" />
            <textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} id="inputDesc" placeholder="Description..." className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 w-full mt-3" />
            <input value={form.deadline} onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} id="inputDeadline" type="date" className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 w-full mt-3" />
            <select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))} id="inputPriority" className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 w-full mt-3">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} id="inputStatus" className="border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 w-full mt-3">
              <option value="pending">Pending</option>
              <option value="inprogress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 rounded border">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded">{editingTaskId ? "Save" : "Add"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Hapus tugas?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Tugas akan dihapus secara permanen. Yakin ingin melanjutkan?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={doDelete} className="px-4 py-2 bg-red-600 text-white rounded">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete modal for tasks (upload doc while finishing) */}
      {completeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCompleteModal((c) => ({ ...c, open: false }))} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Upload dokumentasi & tandai selesai</h3>

            <div className="space-y-3">
              <input value={completeModal.title} onChange={(e) => setCompleteModal((c) => ({ ...c, title: e.target.value }))} placeholder="Judul dokumentasi" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
              <textarea value={completeModal.description} onChange={(e) => setCompleteModal((c) => ({ ...c, description: e.target.value }))} rows={3} placeholder="Deskripsi" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gambar bukti</label>
                <input type="file" accept="image/*" onChange={(e) => handleCompleteFile(e.target.files?.[0])} className="mt-1" />
                {completeModal.previewImage && <img src={completeModal.previewImage} alt="preview" className="mt-2 w-full rounded object-cover max-h-52" />}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setCompleteModal((c) => ({ ...c, open: false }))} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={submitComplete} disabled={completeModal.uploading} className="px-4 py-2 bg-green-600 text-white rounded">{completeModal.uploading ? "Menyimpan..." : "Simpan & Tandai Selesai"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload panel for manual gallery add */}
      {uploadOpen && (
        <form onSubmit={handleAddManual} className="mt-4 bg-white dark:bg-neutral-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex flex-col gap-2">
              <label className="text-sm font-medium">Gambar</label>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={(e) => handleUploadFile(e.target.files?.[0])} className="text-sm" />
                {uploadPreview ? (
                  <img src={uploadPreview} alt="preview" className="w-full h-36 object-cover rounded-md border" />
                ) : (
                  <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-sm text-gray-400">Preview</div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Judul dokumentasi" className="p-2 border rounded-md md:col-span-2" />
              <div>
                <label className="block text-sm font-medium mb-1">Tipe</label>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="p-2 border rounded-md w-full">
                  <option value="manual">Manual</option>
                  <option value="task">Task</option>
                  <option value="project">Project</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Ref ID (opsional)</label>
                <input value={uploadRefId} onChange={(e) => setUploadRefId(e.target.value)} placeholder="related task/project id" className="p-2 border rounded-md w-full" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="Deskripsi singkat..." />
              </div>

              <div className="md:col-span-3 flex gap-2 justify-end">
                <button type="button" onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadTitle(""); setUploadDesc(""); setUploadRefId(""); setUploadType("manual"); setUploadOpen(false); }} className="px-4 py-2 border rounded-md">Batal</button>
                <button type="submit" disabled={savingUpload} className="px-4 py-2 bg-blue-600 text-white rounded-md">{savingUpload ? "Menyimpan..." : "Simpan & Tambah"}</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Footer */}
      <footer className="text-center mt-6 text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
        © {new Date().getFullYear()} Technorex Tasks
        <div className="text-xs opacity-75 mt-1">Autosaved to localStorage • Gallery key: {KEY_GALLERY}</div>
      </footer>

      {/* Toast */}
      <Toast />
    </main>
  );
}
