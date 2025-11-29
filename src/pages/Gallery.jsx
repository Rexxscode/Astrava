// src/pages/Gallery.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Gallery (Final+)
 * - LocalStorage persistence (KEY_GALLERY)
 * - Upload (manual), Viewer modal with edit/delete/download/copy-ref
 * - Undo delete (toast with Undo)
 * - Export / Import JSON (merge)
 * - Sort (newest/oldest)
 * - Search + filter tabs
 * - Accessibility: keyboard (Enter to open, Esc to close), aria attributes
 * - AOS animations + responsive masonry via CSS columns
 */

// ----- Storage keys & helpers -----
const KEY_GALLERY = "gallery";
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024; // 8MB

const readJSON = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};

function makeEntry({ id, type = "manual", refId = null, title = "", description = "", image = "" }) {
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

// ----- Simple toast with optional action -----
function useToast() {
  const [msg, setMsg] = useState(null);
  const actionRef = useRef(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000); // 5s default
    return () => clearTimeout(t);
  }, [msg]);
  const show = (message, opts = {}) => {
    // opts: { duration, action: { label, onClick } }
    actionRef.current = opts.action || null;
    setMsg(message);
    if (opts.duration) {
      setTimeout(() => setMsg(null), opts.duration);
    }
  };
  const Toast = () =>
    msg ? (
      <div className="fixed right-4 bottom-6 z-50">
        <div className="bg-black/85 text-white px-4 py-2 rounded shadow flex items-center gap-3">
          <div className="text-sm">{msg}</div>
          {actionRef.current && (
            <button
              onClick={() => {
                try {
                  actionRef.current.onClick();
                } catch {}
                setMsg(null);
              }}
              className="ml-2 px-3 py-1 bg-white text-black rounded text-xs"
            >
              {actionRef.current.label}
            </button>
          )}
        </div>
      </div>
    ) : null;
  return { show, Toast };
}

// ----- Component -----
export default function Gallery() {
  const [items, setItems] = useState(() => readJSON(KEY_GALLERY, []));
  const [filter, setFilter] = useState("all"); // all | project | task | manual
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadType, setUploadType] = useState("manual");
  const [uploadRefId, setUploadRefId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest

  // undo delete buffer
  const lastDeletedRef = useRef(null);
  const undoTimerRef = useRef(null);

  // toast
  const { show, Toast } = useToast();

  // AOS init
  useEffect(() => {
    AOS.init({ duration: 420, once: true, easing: "ease-out-cubic" });
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // persist items
  useEffect(() => {
    writeJSON(KEY_GALLERY, items);
    AOS.refresh();
  }, [items]);

  // keyboard: Esc to close viewer & others
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selected) {
          closeViewer();
        } else if (uploadOpen) {
          setUploadOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, uploadOpen]);

  // filtered + search + sort
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let arr = items.filter((it) => (filter === "all" ? true : it.type === filter));
    if (q) {
      arr = arr.filter(
        (it) =>
          (it.title || "").toLowerCase().includes(q) ||
          (it.description || "").toLowerCase().includes(q) ||
          (it.type || "").toLowerCase().includes(q) ||
          (it.refId || "").toLowerCase().includes(q)
      );
    }
    arr.sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    return arr;
  }, [items, filter, query, sortOrder]);

  // small skeleton card
  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-sm">
      <div className="w-full h-40 bg-gray-200 dark:bg-gray-700" />
      <div className="p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );

  // file -> dataURL
  const handleUploadFile = (file) => {
    if (!file) {
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      show(`File terlalu besar. Maks ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB.`);
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // save manual
  const handleAddManual = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!uploadPreview) return alert("Pilih gambar terlebih dahulu.");
    setSaving(true);
    const entry = makeEntry({
      id: crypto?.randomUUID ? crypto.randomUUID() : undefined,
      type: uploadType || "manual",
      refId: uploadRefId || null,
      title: uploadTitle || "Dokumentasi",
      description: uploadDesc || "",
      image: uploadPreview,
    });
    setItems((s) => [entry, ...s]);
    // reset
    setUploadFile(null);
    setUploadPreview(null);
    setUploadTitle("");
    setUploadDesc("");
    setUploadRefId("");
    setUploadType("manual");
    setUploadOpen(false);
    setSaving(false);
    show("📸 Dokumentasi disimpan");
  };

  // open viewer + prepare edit fields
  const openViewer = (it) => {
    setSelected(it);
    setEditTitle(it.title || "");
    setEditDesc(it.description || "");
    document.body.style.overflow = "hidden";
  };
  const closeViewer = () => {
    setSelected(null);
    document.body.style.overflow = "";
  };

  // save edits
  const saveEdit = () => {
    if (!selected) return;
    setItems((prev) => prev.map((it) => (it.id === selected.id ? { ...it, title: editTitle, description: editDesc } : it)));
    setSelected((s) => (s ? { ...s, title: editTitle, description: editDesc } : s));
    show("✏️ Perubahan tersimpan");
  };

  // delete with undo
  const deleteSelected = (id) => {
    // store deleted item for undo
    const toDelete = items.find((it) => it.id === id);
    if (!toDelete) return;

    lastDeletedRef.current = { item: toDelete, timestamp: Date.now() };
    // optimistic remove
    setItems((prev) => prev.filter((it) => it.id !== id));
    closeViewer();

    // show toast with undo
    show("Gambar dihapus", {
      action: {
        label: "Undo",
        onClick: () => {
          if (lastDeletedRef.current?.item) {
            setItems((prev) => [lastDeletedRef.current.item, ...prev]);
            lastDeletedRef.current = null;
          }
        },
      },
    });

    // clear undo after time (5s)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      lastDeletedRef.current = null;
      undoTimerRef.current = null;
    }, 5000);
  };

  // download single image
  const downloadImage = (it) => {
    if (!it || !it.image) return;
    const a = document.createElement("a");
    a.href = it.image;
    const ext = (it.image.split(";")[0].split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
    a.download = `${(it.title || "image").replace(/\s+/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // export gallery JSON
  const exportGallery = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `technorex_gallery_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    show("💾 Gallery diekspor");
  };

  // import gallery JSON (merge, avoid duplicates by id)
  const importGallery = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const arr = JSON.parse(ev.target.result);
        if (!Array.isArray(arr)) throw new Error("invalid");
        const existing = new Set(items.map((it) => String(it.id)));
        const toAdd = arr.filter((it) => !existing.has(String(it.id))).map((it) => ({ ...it, id: String(it.id) }));
        if (toAdd.length) {
          setItems((prev) => [...toAdd, ...prev]);
          show(`✅ ${toAdd.length} item diimpor`);
        } else {
          show("⚠️ Tidak ada item baru untuk diimpor");
        }
      } catch {
        show("❌ File import tidak valid");
      }
    };
    reader.readAsText(file);
  };

  // sync from storage (useful when tasks/pages write KEY_GALLERY)
  const syncFromStorage = () => {
    const g = readJSON(KEY_GALLERY, []);
    setItems(Array.isArray(g) ? g : []);
    AOS.refresh();
    show("🔁 Gallery disinkronkan");
  };

  // copy ref id to clipboard
  const copyRef = async (refId) => {
    if (!refId) return;
    try {
      await navigator.clipboard.writeText(String(refId));
      show("Ref ID disalin");
    } catch {
      show("Gagal menyalin");
    }
  };

  // small counts for tabs
  const counts = useMemo(() => {
    const c = { all: items.length, project: 0, task: 0, manual: 0 };
    for (const it of items) {
      if (it.type === "project") c.project++;
      else if (it.type === "task") c.task++;
      else c.manual++;
    }
    return c;
  }, [items]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      {/* toolbar */}
      <div className="sticky top-4 z-39 bg-white dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-xl p-3 md:p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h1 className="text-2xl font-semibold">📸 Gallery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">Document the results</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-1">
            {["all", "project", "task", "manual"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 text-sm rounded-md transition ${filter === t ? "bg-white dark:bg-neutral-900 shadow-sm" : "text-gray-600 dark:text-gray-300/80"}`}
                aria-pressed={filter === t}
              >
                {t === "all" ? `All (${counts.all})` : `${t[0].toUpperCase() + t.slice(1)} (${counts[t]})`}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative flex-1 sm:flex-none">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Search Title / Description"
              className="w-full md:w-72 p-2 pl-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-300"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-2 py-2 border rounded text-sm">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
            <button onClick={() => setUploadOpen((s) => !s)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:opacity-95">+ Add</button>
            <button onClick={syncFromStorage} className="px-3 py-2 border rounded-md text-sm">Sync</button>
          </div>
        </div>
      </div>

      {/* upload panel */}
      {uploadOpen && (
        <form onSubmit={handleAddManual} className="mt-4 bg-white dark:bg-neutral-900 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 flex flex-col gap-2">
              <label className="text-sm font-medium">Gambar (maks 8MB)</label>
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
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md">{saving ? "Menyimpan..." : "Simpan & Tambah"}</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* masonry grid */}
      <section className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium">Belum ada dokumentasi tersimpan.</p>
                <p className="text-sm mt-2">Klik <span className="font-semibold">+ Add</span> untuk menambahkan dokumentasi.</p>
              </div>
            ) : (
              <div className="gallery-masonry columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {filtered.map((it, idx) => (
                  <article
                    key={it.id}
                    className="break-inside-avoid mb-4 rounded-xl overflow-hidden shadow hover:shadow-lg transition transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => openViewer(it)}
                    data-aos="fade-up"
                    data-aos-delay={Math.min(idx * 30, 300)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") openViewer(it); }}
                    aria-label={`Open ${it.title || "dokumentasi"}`}
                  >
                    <div className="relative bg-gray-100">
                      <img src={it.image} alt={it.title || "image"} className="w-full h-auto object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-95 flex items-end">
                        <div className="p-3 w-full">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-semibold text-white line-clamp-1">{it.title || "(Tanpa judul)"}</h3>
                            <span className="text-xs bg-white/90 text-gray-900 px-2 py-0.5 rounded">{it.type}</span>
                          </div>
                          <p className="text-xs text-white/90 mt-1 line-clamp-2">{it.description || ""}</p>
                          <div className="text-xs text-white/70 mt-2">{new Date(it.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* viewer modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeViewer} />
          <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
            <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <img src={selected.image} alt={selected.title} className="max-h-[80vh] w-full object-contain rounded" />
            </div>

            <div className="p-4 flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-lg font-semibold bg-transparent border-b pb-1 focus:outline-none" />
                  <div className="text-xs text-gray-500 mt-1">Tipe: <strong className="capitalize">{selected.type}</strong> {selected.refId ? <>• Ref: <code className="bg-gray-100 px-1 rounded text-xs">{selected.refId}</code> <button onClick={() => copyRef(selected.refId)} className="ml-2 text-xs px-2 py-1 rounded border">Copy</button></> : null}</div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => downloadImage(selected)} className="px-3 py-1 rounded-md border text-sm">Download</button>
                  <button onClick={() => deleteSelected(selected.id)} className="px-3 py-1 rounded-md bg-red-600 text-white text-sm">Delete</button>
                </div>
              </div>

              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={8} className="mt-3 p-2 border rounded-md flex-1 resize-none" placeholder="Deskripsi..." />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={closeViewer} className="px-4 py-2 rounded-md border">Tutup</button>
                <button onClick={() => { saveEdit(); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* masonry styles */}
      <style>{`
        .gallery-masonry { column-gap: 1rem; }
        @media (min-width: 640px) { .gallery-masonry { column-count: 2; } }
        @media (min-width: 768px) { .gallery-masonry { column-count: 3; } }
        @media (min-width: 1280px) { .gallery-masonry { column-count: 4; } }
        .break-inside-avoid { break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid; }
        .line-clamp-1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Toast */}
      <Toast />
    </main>
  );
}
