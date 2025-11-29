// src/pages/Projects.jsx
import React, { useEffect, useMemo, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Projects.jsx - single file
 * - localStorage persistence (KEY_PROJECTS, KEY_GALLERY)
 * - Add / Edit / Preview / Delete / Mark Completed (with upload)
 * - Modals are scrollable and won't be cut off
 * - Tailwind classes used for styling
 */

/* ---------- Storage helpers ---------- */
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

/* ---------- Keys & factories ---------- */
const KEY_PROJECTS = "projects";
const KEY_GALLERY = "gallery";
const LEGACY_KEYS = ["projects", "projectList", "project_data", "PROJECTS"];

const makeId = () => Date.now() + Math.floor(Math.random() * 9999);

const createNewProjectObj = ({ id, name, description, type, tech, status, subprojects, deadline } = {}) => ({
  id: id ?? makeId(),
  name: name ?? "Untitled",
  description: description ?? "",
  type: type ?? "Web",
  tech: tech ?? "",
  status: status ?? "In Progress",
  subprojects: subprojects ?? [], // [{id,name,status}]
  deadline: deadline ?? "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createGalleryEntry = ({ id, type, refId, title, description, image }) => ({
  id: id ?? makeId(),
  type: type ?? "project",
  refId: refId ?? null,
  title: title ?? "",
  description: description ?? "",
  image: image ?? "",
  createdAt: new Date().toISOString(),
});

/* ---------- Component ---------- */
export default function Projects() {
  /* AOS init */
  useEffect(() => {
    AOS.init({ duration: 400, once: true });
  }, []);

  /* States */
  const [projects, setProjects] = useState(() => readJSON(KEY_PROJECTS, []));
  const [gallery, setGallery] = useState(() => readJSON(KEY_GALLERY, []));

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "Web",
    tech: "",
    status: "In Progress",
    subprojectsText: "",
    deadline: "",
  });

  // Preview modal
  const [preview, setPreview] = useState(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Complete modal
  const [completeModal, setCompleteModal] = useState({
    open: false,
    projectId: null,
    title: "",
    description: "",
    file: null,
    previewImage: null,
    uploading: false,
  });

  /* Migration: try legacy keys if needed (best-effort) */
  useEffect(() => {
    const existing = readJSON(KEY_PROJECTS, null);
    if (existing && Array.isArray(existing) && existing.length) {
      setProjects(existing);
      return;
    }
    for (const k of LEGACY_KEYS) {
      const raw = readJSON(k, null);
      if (raw && Array.isArray(raw) && raw.length) {
        const migrated = raw.map((p) =>
          p && p.id
            ? p
            : createNewProjectObj({
                id: p?.id ?? p?.projectId,
                name: p?.name ?? p?.title,
                description: p?.description ?? p?.desc,
                type: p?.type ?? "Web",
                tech: p?.tech ?? "",
                status: p?.status ?? (p?.completed ? "Completed" : "In Progress"),
              })
        );
        setProjects(migrated);
        writeJSON(KEY_PROJECTS, migrated);
        return;
      }
    }
    writeJSON(KEY_PROJECTS, []);
    setProjects([]);
  }, []);

  /* Persist */
  useEffect(() => {
    writeJSON(KEY_PROJECTS, projects);
  }, [projects]);
  useEffect(() => {
    writeJSON(KEY_GALLERY, gallery);
  }, [gallery]);

  /* Derived */
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const active = total - completed;
    const ai = projects.filter((p) => p.type === "AI").length;
    return { total, completed, active, ai };
  }, [projects]);

  const filtered = useMemo(() => {
    let list = projects.slice();
    if (filterType !== "all") list = list.filter((p) => p.type === filterType);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tech || "").toLowerCase().includes(q) ||
          (p.subprojects || []).some((s) => s.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, search, filterType]);

  /* Utilities */
  const projectProgress = (p) => {
    if (!p || !p.subprojects || p.subprojects.length === 0) return p?.status === "Completed" ? 100 : 0;
    const done = p.subprojects.filter((s) => s.status === "Completed").length;
    return Math.round((done / p.subprojects.length) * 100);
  };

  /* ---------- Handlers: Add / Edit ---------- */
  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", type: "Web", tech: "", status: "In Progress", subprojectsText: "", deadline: "" });
    setShowModal(true);
  };

  const openEdit = (proj) => {
    setEditing(proj);
    setForm({
      name: proj.name ?? "",
      description: proj.description ?? "",
      type: proj.type ?? "Web",
      tech: proj.tech ?? "",
      status: proj.status ?? "In Progress",
      subprojectsText: (proj.subprojects || []).map((s) => s.name).join("\n"),
      deadline: proj.deadline ? proj.deadline.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const saveProject = () => {
    const name = (form.name || "").trim();
    if (!name) {
      alert("Nama project harus diisi.");
      return;
    }

    // parse subprojectsText -> add as new subprojects
    const parsedSubs = (form.subprojectsText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((txt) => ({ id: makeId(), name: txt, status: "In Progress" }));

    if (editing) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                name,
                description: form.description,
                type: form.type,
                tech: form.tech,
                status: form.status,
                subprojects: [...(p.subprojects || []), ...parsedSubs],
                deadline: form.deadline ? new Date(form.deadline).toISOString() : "",
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
    } else {
      const newProj = createNewProjectObj({
        name,
        description: form.description,
        type: form.type,
        tech: form.tech,
        status: form.status,
        subprojects: parsedSubs,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : "",
      });
      setProjects((prev) => [newProj, ...prev]);
    }

    setShowModal(false);
    setEditing(null);
  };

  /* ---------- Handlers: Delete ---------- */
  const confirmDeleteProject = (id) => setConfirmDelete(id);
  const doDelete = () => {
    if (confirmDelete == null) return;
    setProjects((prev) => prev.filter((p) => p.id !== confirmDelete));
    setConfirmDelete(null);
  };

  /* ---------- Subproject toggle ---------- */
  const toggleSubprojectStatus = (projectId, subId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              subprojects: (p.subprojects || []).map((s) =>
                s.id === subId ? { ...s, status: s.status === "Completed" ? "In Progress" : "Completed" } : s
              ),
              updatedAt: new Date().toISOString(),
            }
      )
    );
  };

  /* ---------- Preview ---------- */
  const openPreview = (proj) => setPreview(proj);

  /* ---------- Complete flow (upload image & save to gallery) ---------- */
  const openCompleteModal = (projectId) => {
    setCompleteModal({ open: true, projectId, title: "", description: "", file: null, previewImage: null, uploading: false });
  };

  const handleCompleteFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCompleteModal((c) => ({ ...c, file, previewImage: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const submitComplete = () => {
    if (!completeModal.file || !completeModal.previewImage) {
      alert("Silakan pilih gambar bukti sebelum menandai selesai.");
      return;
    }
    setCompleteModal((c) => ({ ...c, uploading: true }));

    const entry = createGalleryEntry({
      type: "project",
      refId: completeModal.projectId,
      title: completeModal.title || "Dokumentasi",
      description: completeModal.description || "",
      image: completeModal.previewImage,
    });

    setGallery((g) => [entry, ...g]);

    setProjects((prev) =>
      prev.map((p) => (p.id === completeModal.projectId ? { ...p, status: "Completed", updatedAt: new Date().toISOString() } : p))
    );

    // short delay to simulate saving, then close
    setTimeout(() => {
      setCompleteModal({ open: false, projectId: null, title: "", description: "", file: null, previewImage: null, uploading: false });
      alert("Project ditandai selesai dan dokumentasi tersimpan di gallery.");
    }, 300);
  };

  /* ---------- Add manual gallery (optional helper) ---------- */
  const addManualGallery = ({ title, description, image, refId = null }) => {
    const entry = createGalleryEntry({ title, description, image, refId });
    setGallery((g) => [entry, ...g]);
  };

  /* ---------- UI Render ---------- */
  return (
    <section className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto" data-aos="fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a new project, add subprojects, deadlines, and documentation.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search Project..."
            className="px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-400 w-full md:w-72"
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 rounded-lg border dark:bg-gray-800 dark:text-gray-200">
            <option value="all">All Types</option>
            <option>Web</option>
            <option>Mobile</option>
            <option>Desktop</option>
            <option>Game</option>
            <option>IoT</option>
            <option>AI</option>
          </select>
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow">Add Project</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-aos="zoom-in">
        <div className="bg-blue-600 text-white p-4 rounded-xl shadow">
          <p className="text-sm opacity-90">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-amber-500 text-white p-4 rounded-xl shadow">
          <p className="text-sm opacity-90">Active</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-emerald-500 text-white p-4 rounded-xl shadow">
          <p className="text-sm opacity-90">Completed</p>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow">
          <p className="text-sm opacity-90">AI Projects</p>
          <p className="text-2xl font-bold">{stats.ai}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8 rounded-lg border">Belum ada project.</div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-lg transition transform ${p.status === "Completed" ? "border-l-4 border-green-500" : "border-l-4 border-blue-500"}`}
              data-aos="fade-up"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{p.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.description || "Tidak ada deskripsi."}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">{p.type}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.status === "Completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"}`}>{p.status}</span>
                  {p.deadline ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                      Deadline: {new Date(p.deadline).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="h-2 bg-green-500 transition-all duration-700" style={{ width: `${projectProgress(p)}%` }} />
                </div>
              </div>

              {/* subprojects list */}
              {p.subprojects && p.subprojects.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  <strong>Subprojects:</strong>
                  <ul className="mt-2 space-y-1">
                    {p.subprojects.map((s) => (
                      <li key={s.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        <div>
                          <div className="font-medium text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.status}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSubprojectStatus(p.id, s.id)} className="px-2 py-1 text-xs rounded border">{s.status === "Completed" ? "Undo" : "Done"}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex justify-between items-center">
                <button onClick={() => openPreview(p)} className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2">View</button>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded text-sm">Edit</button>
                  <button onClick={() => confirmDeleteProject(p.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">Delete</button>
                  {p.status !== "Completed" && (
                    <button onClick={() => openCompleteModal(p.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Mark Completed</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* -------- Preview modal (scrollable) -------- */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">{preview.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{preview.description || "—"}</p>
            <p><strong>Type:</strong> {preview.type}</p>
            <p><strong>Status:</strong> {preview.status}</p>
            <p><strong>Tech:</strong> {(preview.tech || "").split(",").map(t => t.trim()).filter(Boolean).join(", ") || "—"}</p>
            {preview.deadline && <p><strong>Deadline:</strong> {new Date(preview.deadline).toLocaleString()}</p>}

            {preview.subprojects && preview.subprojects.length > 0 && (
              <>
                <h4 className="mt-3 font-semibold">Subprojects</h4>
                <ul className="list-disc ml-5 mt-1">
                  {preview.subprojects.map((s) => <li key={s.id}>{s.name} — {s.status}</li>)}
                </ul>
              </>
            )}

            <div className="mt-4 text-right">
              <button onClick={() => setPreview(null)} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Add / Edit modal (scrollable) -------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3">{editing ? "Edit Project" : "Add Project"}</h3>

            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} type="text" placeholder="Nama project" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
              <textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Deskripsi" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
              <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100">
                <option>Web</option>
                <option>Mobile</option>
                <option>Desktop</option>
                <option>Game</option>
                <option>IoT</option>
                <option>AI</option>
              </select>
              <input value={form.tech} onChange={(e) => setForm((s) => ({ ...s, tech: e.target.value }))} type="text" placeholder="Tech stack (pisahkan dengan ,)" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} className="p-2 border rounded dark:bg-gray-800 dark:text-gray-100">
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
                <input type="date" value={form.deadline} onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} className="p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subprojects (satu per baris)</label>
                <textarea value={form.subprojectsText} onChange={(e) => setForm((s) => ({ ...s, subprojectsText: e.target.value }))} rows={4} placeholder={"Contoh:\nUI Design\nBackend API\nIntegrasi"} className="w-full mt-1 p-2 border rounded dark:bg-gray-800 dark:text-gray-100" />
                <p className="text-xs text-gray-500 mt-1">Jika edit: baris baru akan ditambahkan ke subproject yang ada.</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={saveProject} className="px-4 py-2 bg-blue-600 text-white rounded">{editing ? "Simpan perubahan" : "Buat Project"}</button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Delete confirm -------- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Hapus project?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded border">Batal</button>
              <button onClick={doDelete} className="px-4 py-2 bg-red-500 text-white rounded">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Complete modal (upload bukti saat finish) -------- */}
      {completeModal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCompleteModal((c) => ({ ...c, open: false }))} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 z-50 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
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
    </section>
  );
}