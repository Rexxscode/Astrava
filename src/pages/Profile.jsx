// src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Profile.jsx (Refined & Optimized)
 * - Single-file component with:
 *   • Cover banner + centered overlapping avatar
 *   • Avatar cropper (canvas pan + zoom)
 *   • Live theme & accent preview (applies to document)
 *   • Random avatar (Dicebear), copy email, social links
 *   • Animated level badge, small stats badges
 *   • Particle-ish background in dark mode
 *   • Robust responsive layout (no horizontal overflow)
 *
 * Notes:
 * - Data stored under localStorage key `userProfile_<activeUser>`.
 * - Uses Tailwind utility classes throughout.
 */

/* --------------------------- Helpers --------------------------- */
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

function getActiveUser() {
  return localStorage.getItem("activeUser") || null;
}
function getProfileKey(user) {
  return user ? `userProfile_${user}` : null;
}

/* --------------------------- Defaults --------------------------- */
function defaultProfile() {
  return {
    username: "guest",
    name: "Guest User",
    handle: "@guest",
    bio: "Welcome — customize your profile.",
    email: "guest@example.com",
    avatar: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    cover: "",
    theme: "light",
    accent: "blue",
    joined: new Date().toISOString(),
    level: 1,
    xp: 0,
    social: { github: "", instagram: "", linkedin: "" },
    stats: { totalTasks: 0, completed: 0, streak: 0 },
  };
}

/* Accent -> Tailwind classes + hex fallback */
const ACCENT_MAP = {
  blue: { bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-600", soft: "bg-blue-100", hex: "#3b82f6" },
  green: { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-600", soft: "bg-emerald-100", hex: "#10b981" },
  purple: { bg: "bg-violet-500", text: "text-violet-600", ring: "ring-violet-600", soft: "bg-violet-100", hex: "#7c3aed" },
  orange: { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-600", soft: "bg-amber-100", hex: "#f59e0b" },
  pink: { bg: "bg-pink-500", text: "text-pink-600", ring: "ring-pink-600", soft: "bg-pink-100", hex: "#f472b6" },
};
const ACCENT_KEYS = Object.keys(ACCENT_MAP);

/* --------------------------- Small toast --------------------------- */
function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return { toast: msg, show: (m) => setMsg(m) };
}

/* --------------------------- Component --------------------------- */
export default function ProfilePage() {
  // AOS init
  useEffect(() => {
    AOS.init({ duration: 600, once: true });
  }, []);

  const activeUser = useMemo(() => getActiveUser(), []);
  const profileKey = useMemo(() => getProfileKey(activeUser), [activeUser]);
  const { toast, show } = useToast();

  // profile state (persisted)
  const [profile, setProfile] = useState(() => {
    if (!profileKey) return defaultProfile();
    return readJSON(profileKey, defaultProfile());
  });

  // ensure stats exist
  useEffect(() => {
    if (!profile.stats) setProfile((p) => ({ ...p, stats: defaultProfile().stats }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mirrored editable fields for form
  const [username, setUsername] = useState(profile.username || "");
  const [handle, setHandle] = useState(profile.handle || "");
  const [name, setName] = useState(profile.name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatar, setAvatar] = useState(profile.avatar || defaultProfile().avatar);
  const [cover, setCover] = useState(profile.cover || "");
  const [accent, setAccent] = useState(profile.accent || "blue");
  const [theme, setTheme] = useState(profile.theme || "light");
  const [social, setSocial] = useState(profile.social || { github: "", instagram: "", linkedin: "" });
  const [importing, setImporting] = useState(false);

  // cropper refs & state
  const [cropOpen, setCropOpen] = useState(false);
  const cropSrcRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const cropImgRef = useRef(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  // persist profile when changes (debounced not necessary here but kept simple)
  useEffect(() => {
    if (!profileKey) return;
    writeJSON(profileKey, profile);
  }, [profileKey, profile]);

  // apply live theme & accent
  useEffect(() => {
    // theme
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    // accent CSS var
    const hex = ACCENT_MAP[accent]?.hex || ACCENT_MAP.blue.hex;
    document.documentElement.style.setProperty("--accent", hex);
  }, [theme, accent]);

  // computed values
  const xpPercent = profile.xp ?? 0;
  const level = profile.level ?? Math.floor((xpPercent / 20) + 1);
  const accentCls = ACCENT_MAP[accent] || ACCENT_MAP.blue;

  /* --------------------------- Helpers --------------------------- */
  function persistProfile(next) {
    setProfile(next);
    if (profileKey) writeJSON(profileKey, next);
  }

  function saveProfile() {
    if (!email || !email.includes("@")) {
      show("❌ Invalid email");
      return;
    }
    const next = {
      ...profile,
      username: username || profile.username || "guest",
      handle: handle || `@${(username || "guest").replace(/\s+/g, "").toLowerCase()}`,
      name: name || "Unnamed",
      email,
      bio,
      avatar,
      cover,
      accent,
      theme,
      social,
    };
    persistProfile(next);
    show("✅ Profile saved");
  }

  function resetProfile() {
    if (!profileKey) return;
    if (!confirm("Reset profile to default?")) return;
    const def = defaultProfile();
    persistProfile(def);
    setUsername(def.username);
    setHandle(def.handle);
    setName(def.name);
    setEmail(def.email);
    setBio(def.bio);
    setAvatar(def.avatar);
    setCover(def.cover);
    setAccent(def.accent);
    setTheme(def.theme);
    setSocial(def.social);
    show("Profile reset");
  }

  function exportProfile() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `profile_${getActiveUser() || "backup"}.json`;
    a.click();
    show("💾 Profile exported");
  }

  function importProfile(file) {
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.name || !json.email) {
          show("❌ Invalid profile JSON");
          setImporting(false);
          return;
        }
        persistProfile(json);
        setUsername(json.username || "");
        setHandle(json.handle || "");
        setName(json.name || "");
        setEmail(json.email || "");
        setBio(json.bio || "");
        setAvatar(json.avatar || defaultProfile().avatar);
        setAccent(json.accent || "blue");
        setTheme(json.theme || "light");
        setSocial(json.social || { github: "", instagram: "", linkedin: "" });
        setCover(json.cover || "");
        show("📂 Profile imported");
      } catch {
        show("❌ Invalid JSON file");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  }

  /* --------------------------- Avatar & Crop --------------------------- */
  function onAvatarFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      cropSrcRef.current = ev.target.result;
      setCropZoom(1);
      setCropPos({ x: 0, y: 0 });
      setCropOpen(true);
      // slight delay to ensure canvas sizing in modal
      setTimeout(() => drawCropPreview(), 40);
    };
    reader.readAsDataURL(file);
  }

  // Dicebear random avatar
  function randomAvatar() {
    const seed = (username || handle || Math.random().toString(36).slice(2, 8)).replace("@", "");
    const url = `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
    fetch(url)
      .then((r) => r.text())
      .then((svg) => {
        const dataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
        setAvatar(dataUrl);
        show("🎲 Random avatar generated");
      })
      .catch(() => show("Failed to generate avatar"));
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      show("Copied email to clipboard");
    } catch {
      show("Copy failed");
    }
  };

  // Draw crop preview to canvas
  function drawCropPreview() {
    const canvas = cropCanvasRef.current;
    const src = cropSrcRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      cropImgRef.current = img;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // scaled size
      const scale = cropZoom;
      const sw = img.width * scale;
      const sh = img.height * scale;

      // offset so image is centered + pan
      const dx = cropPos.x + (w - sw) / 2;
      const dy = cropPos.y + (h - sh) / 2;

      // white background then image
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, dx, dy, sw, sh);

      // subtle overlay border to show crop area
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
    };
    img.src = src;
  }

  useEffect(() => {
    if (cropOpen) drawCropPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropZoom, cropPos, cropOpen]);

  function startDrag(e) {
    isDraggingRef.current = true;
    const client = e.clientX !== undefined ? e : e.touches?.[0] || e;
    dragStartRef.current = { x: client.clientX, y: client.clientY };
    posStartRef.current = { ...cropPos };
  }
  function moveDrag(e) {
    if (!isDraggingRef.current) return;
    const client = e.clientX !== undefined ? e : e.touches?.[0] || e;
    const cx = client.clientX;
    const cy = client.clientY;
    const dx = cx - dragStartRef.current.x;
    const dy = cy - dragStartRef.current.y;
    setCropPos({ x: posStartRef.current.x + dx, y: posStartRef.current.y + dy });
  }
  function endDrag() {
    isDraggingRef.current = false;
  }

  function applyCrop() {
    const canvas = cropCanvasRef.current;
    if (!canvas || !cropImgRef.current) {
      setCropOpen(false);
      return;
    }
    const outSize = 512;
    const out = document.createElement("canvas");
    out.width = outSize;
    out.height = outSize;
    const ctx = out.getContext("2d");

    const img = cropImgRef.current;
    const sw = img.width * cropZoom;
    const sh = img.height * cropZoom;
    const dx = cropPos.x + (canvas.width - sw) / 2;
    const dy = cropPos.y + (canvas.height - sh) / 2;

    // draw the current preview transform onto output (scaled)
    const ratio = outSize / canvas.width;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outSize, outSize);
    ctx.drawImage(img, dx * ratio, dy * ratio, sw * ratio, sh * ratio);

    const dataUrl = out.toDataURL("image/png");
    setAvatar(dataUrl);
    setCropOpen(false);
    show("Avatar updated");
  }

  /* --------------------------- Layout & Render --------------------------- */
  return (
    <div className="relative min-h-screen">
      {/* particle-ish background for dark mode (keeps small, lightweight) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity"
        style={{
          opacity: theme === "dark" ? 1 : 0,
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 10% 10%, rgba(255,255,255,0.02), transparent 8%), radial-gradient(ellipse at 90% 90%, rgba(255,255,255,0.02), transparent 8%)"
              : "transparent",
        }}
      />

      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* COVER with centered avatar inside banner */}
<div className="relative rounded-2xl overflow-hidden shadow-md">

  {/* COVER */}
  <div
    className="w-full h-56 md:h-72 bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
    style={{
      backgroundImage: cover ? `url('${cover}')` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    {!cover && (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No cover — add one
      </div>
    )}

    {/* AVATAR PERFECT CENTER */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 shadow-xl overflow-hidden pointer-events-auto ${
          theme === "dark" ? "border-neutral-900" : "border-white"
        }`}
      >
        <img
          src={avatar}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  </div>

  {/* COVER CONTROLS */}
  <div className="absolute top-3 right-3 flex gap-2 z-20">
    <input
      id="coverInput"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => {
          setCover(ev.target.result);
          show("Cover updated");
        };
        r.readAsDataURL(f);
      }}
    />

    <label
      htmlFor="coverInput"
      className="px-3 py-1 bg-white/90 dark:bg-neutral-900/80 rounded border text-sm cursor-pointer"
    >
      Change
    </label>

    <button
      onClick={() => {
        setCover("");
        show("Cover cleared");
      }}
      className="px-3 py-1 bg-white/90 dark:bg-neutral-900/80 rounded border text-sm"
    >
      Clear
    </button>
  </div>

</div>



        {/* Spacer so content below isn't covered by avatar (avatar overlap) */}
        <div className="h-14 md:h-16" />

        {/* Preview card */}
        <section
          className="bg-white/90 dark:bg-neutral-900/80 rounded-2xl p-6 shadow-lg overflow-hidden"
          data-aos="fade-up"
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                className={`absolute top-0 right-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${accentCls.bg} animate-pulse`}
                style={{ boxShadow: `0 6px 22px ${accentCls.hex ?? ""}20` }}
              >
                Level {level}
              </div>
            </div>

            <div className="mt-2 mb-3">
              <img src={avatar} alt="avatar" className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 ${accentCls.bg} object-cover`} />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{email}</p>
              <button onClick={copyEmail} className="text-xs px-2 py-1 border rounded ml-2">Copy</button>
            </div>

            <p className="mt-3 text-gray-700 dark:text-gray-300 italic">{bio}</p>

            <div className="w-full mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">XP Progress ({xpPercent}%)</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                <div className={`${accentCls.bg} h-full`} style={{ width: `${xpPercent}%`, transition: "width 400ms ease" }} />
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400">Joined: {new Date(profile.joined).toLocaleDateString()}</div>
          </div>
        </section>

        {/* Stats badges */}
        <div className="grid grid-cols-3 gap-3 mt-4" data-aos="zoom-in">
          <Badge count={profile.stats?.totalTasks ?? 0} label="Total" accent={accentCls} />
          <Badge count={profile.stats?.completed ?? 0} label="Completed" accent={accentCls} />
          <Badge count={profile.stats?.streak ?? 0} label="Streak" accent={accentCls} />
        </div>

        {/* Edit form: avatar on top (always) + inputs below */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile();
          }}
          className="bg-white/80 dark:bg-neutral-900/80 p-6 rounded-2xl shadow-lg mt-6 space-y-6"
          data-aos="fade-up"
        >
          {/* Avatar controls (always above form fields) */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-4 overflow-hidden ${accentCls.bg}`}>
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              </div>

              <div className="flex gap-2 mt-3">
                <label htmlFor="avatarInput" className="px-3 py-1 border rounded cursor-pointer text-sm">Upload & Crop</label>
                <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarFile(e.target.files?.[0])} />
                <button type="button" onClick={randomAvatar} className="px-3 py-1 border rounded text-sm">Random</button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Square recommended • 256×256 final</p>
            </div>
          </div>

          {/* Inputs (stacked vertical for mobile, compact for wide) */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Handle</label>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <div className="flex gap-2 mt-1">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 p-2 rounded-md border dark:bg-neutral-900" />
                  <button type="button" onClick={copyEmail} className="px-3 py-2 border rounded">Copy</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub</label>
                <input value={social.github} onChange={(e) => setSocial((s) => ({ ...s, github: e.target.value }))} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" placeholder="github.com/username" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" />
            </div>

            {/* Accent & Theme preview (live) */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

  {/* ACCENT SECTION */}
  <div className="flex flex-col">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Accent
    </label>

    {/* Accent bubbles */}
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      {ACCENT_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => setAccent(k)}
          title={k}
          className={`w-8 h-8 rounded-full ${
            accent === k ? "ring-2 ring-offset-2 ring-[var(--accent)]" : ""
          }`}
        >
          <span
            className={`block w-full h-full rounded-full ${ACCENT_MAP[k].bg}`}
          />
        </button>
      ))}
    </div>

    {/* PREVIEW now BELOW accent */}
    <div className="flex items-center gap-2 mt-3">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Preview:
      </span>
      <div
        className={`px-3 py-1 rounded-md border ${ACCENT_MAP[accent].soft} ${ACCENT_MAP[accent].text}`}
      >
        Aa
      </div>
    </div>
  </div>

  {/* THEME SECTION */}
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Theme
    </label>

    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-3 py-1 rounded ${
          theme === "light" ? "bg-gray-200 dark:bg-gray-700" : "bg-transparent"
        }`}
      >
        Light
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-3 py-1 rounded ${
          theme === "dark"
            ? "bg-gray-700 text-white dark:bg-gray-600"
            : "bg-transparent"
        }`}
      >
        Dark
      </button>

      <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
        Preview updates live
      </span>
    </div>
  </div>

</div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instagram</label>
                <input value={social.instagram} onChange={(e) => setSocial((s) => ({ ...s, instagram: e.target.value }))} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" placeholder="instagram.com/username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn</label>
                <input value={social.linkedin} onChange={(e) => setSocial((s) => ({ ...s, linkedin: e.target.value }))} className="w-full mt-1 p-2 rounded-md border dark:bg-neutral-900" placeholder="linkedin.com/in/username" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button type="button" onClick={exportProfile} className="px-4 py-2 border rounded hover:bg-gray-100">Export</button>
            <input id="profileImportInput" type="file" accept="application/json" className="hidden" onChange={(e) => importProfile(e.target.files?.[0])} />
            <button type="button" onClick={() => document.getElementById("profileImportInput").click()} className="px-4 py-2 border rounded hover:bg-gray-100">{importing ? "Importing..." : "Import"}</button>
            <button type="button" onClick={resetProfile} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Reset</button>
            <button type="submit" className={`px-4 py-2 rounded text-white ${accentCls.bg}`}>Save</button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-400 mt-4">Tip: Random avatar uses DiceBear; Upload lets you crop before saving.</div>

        {/* Toast */}
        {toast && (
          <div className="fixed right-4 bottom-6 z-50">
            <div className="bg-black/80 text-white px-4 py-2 rounded shadow">{toast}</div>
          </div>
        )}

        {/* Crop modal */}
        {cropOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setCropOpen(false)} />
            <div className="relative bg-white dark:bg-neutral-900 rounded-lg p-4 z-10 w-full max-w-lg">
              <h3 className="font-semibold mb-2">Crop Avatar (pan & zoom)</h3>

              <div
                className="w-full h-64 bg-gray-100 dark:bg-neutral-800 mb-3 overflow-hidden touch-none"
                onMouseDown={(e) => startDrag(e)}
                onMouseMove={(e) => moveDrag(e)}
                onMouseUp={() => endDrag()}
                onMouseLeave={() => endDrag()}
                onTouchStart={(e) => startDrag(e.touches?.[0] || e)}
                onTouchMove={(e) => moveDrag(e.touches?.[0] || e)}
                onTouchEnd={() => endDrag()}
              >
                {/* Canvas sized for good resolution but styled to fill container */}
                <canvas
                  ref={cropCanvasRef}
                  width={700}
                  height={700}
                  className="w-full h-full max-w-full max-h-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm">Zoom</label>
                <input type="range" min="0.5" max="3" step="0.01" value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} />
                <div className="flex-1" />
                <button onClick={() => setCropOpen(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={applyCrop} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* --------------------------- Small subcomponents --------------------------- */
function Badge({ count, label, accent }) {
  return (
    <div className="bg-white/80 dark:bg-neutral-900/70 p-3 rounded-lg flex flex-col items-center">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${accent.soft}`}>
        <span className={`font-bold ${accent.text}`}>{count}</span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{label}</div>
    </div>
  );
}
