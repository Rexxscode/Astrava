// FINAL: Login.jsx — NO THEME TOGGLE, IMPROVED UI (Light/Dark auto, all backgrounds/forms white)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AOS from "aos";
import "aos/dist/aos.css";

/**
 * Login.jsx — final
 * - Theme chosen from localStorage or system, but UI backgrounds/forms are white
 * - 3D card tilt, parallax variables, AOS animations
 * - Admin demo bypass retained
 */

export default function Login() {
  const navigate = useNavigate();
  const { login, setUser } = useAuth();

  // Theme (auto from localStorage or system)
  const [theme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    AOS.init({
      duration: 900,
      once: false,
      easing: "ease-out-cubic",
      offset: 120,
      delay: 80,
      mirror: false,
      disableMutationObserver: true,
    });
    setTimeout(() => {
      try {
        AOS.refresh();
      } catch {}
    }, 100);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email wajib diisi";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Format email tidak valid";

    if (!password) e.password = "Password wajib diisi";
    else if (password.length < 5) e.password = "Minimal 5 karakter";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return triggerShake();

    setLoading(true);

    // Demo admin bypass
    if (email === "admin@astrava.com" && password === "150410") {
      const adminUser = { id: "admin", name: "admin", email: "admin@astrava.com", role: "admin" };
      localStorage.setItem("activeUser", JSON.stringify("admin"));
      localStorage.setItem("astrava_user", JSON.stringify("admin"));
      setUser(adminUser);
      navigate("/dashboard");
      return;
    }

    try {
      const maybePromise = login({ email, pass: password });
      const result =
        maybePromise && typeof maybePromise.then === "function"
          ? await maybePromise
          : maybePromise;

      setLoading(false);

      if (!result || !result.ok) {
        setErrors({ form: result?.message || "Login gagal" });
        return triggerShake();
      }

      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      setErrors({ form: "Terjadi kesalahan. Coba lagi." });
      triggerShake();
    }
  };

  const handleCardMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const rotateX = -y * 6;
    const rotateY = x * 8;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  };

  const handleCardLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      document.documentElement.style.setProperty("--bg-x", `${x}px`);
      document.documentElement.style.setProperty("--bg-y", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-700 relative overflow-hidden bg-white`}
    >
      {/* Parallax decorative blobs (set to transparent in light mode) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ transform: `translate3d(var(--bg-x,0px), var(--bg-y,0px), 0)` }}
      >
        {theme === "dark" ? (
          <>
            {/* keep subtle colored blobs for dark theme if desired */}
            <div className="absolute -left-28 -top-16 w-96 h-96 rounded-full bg-gradient-to-tr from-[#102e6b]/20 to-[#60a5fa]/8 blur-3xl" />
            <div className="absolute -right-28 -bottom-16 w-80 h-80 rounded-full bg-gradient-to-bl from-[#5b21b6]/14 to-[#a78bfa]/6 blur-2xl" />
          </>
        ) : (
          <>
            {/* transparent blobs for light (effectively invisible) */}
            <div className="absolute -left-28 -top-20 w-96 h-96 rounded-full bg-white/0 blur-3xl" />
            <div className="absolute -right-28 -bottom-20 w-80 h-80 rounded-full bg-white/0 blur-2xl" />
          </>
        )}
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        onMouseMove={handleCardMove}
        onMouseLeave={handleCardLeave}
        data-aos="fade-up"
        className={`relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl border transition-all duration-300 ${shake ? "animate-[shake_0.6s_ease]" : ""} bg-white border-gray-200 text-slate-900`}
        style={{ willChange: "transform" }}
      >
        {/* Logo / header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-[#12275a]" : "bg-[#1e3a8a]"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 12h18" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 6h18" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 18h18" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold">Astrava</h1>
            <p className="text-sm opacity-70">Tasks, Activity & Project Management</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              autoComplete="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white border-gray-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-2">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                autoComplete="current-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border bg-white border-gray-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none transition-colors"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-80 hover:opacity-100"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-2">{errors.password}</p>}
          </div>

          {/* Row: remember / forgot */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="form-checkbox h-4 w-4 rounded text-blue-600" />
              <span className="opacity-80">Remember me</span>
            </label>
            <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs underline opacity-80">
              Forgot password?
            </button>
          </div>

          {/* Error form */}
          {errors.form && <p className="text-red-500 text-sm text-center">{errors.form}</p>}

          {/* Submit */}
          <div className="space-y-3">
            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-colors shadow ${loading ? "opacity-70 cursor-not-allowed" : ""} ${theme === "dark" ? "bg-[#0f3a78] hover:bg-[#0c2e63] text-white" : "bg-[#1e3a8a] hover:bg-[#162a67] text-white"}`}
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? "Loading..." : "Sign in to Astrava"}
            </button>

            {/* REGISTER BUTTON */}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-3 shadow transition-all ${theme === "dark" ? "bg-transparent border border-slate-600 text-black hover:bg-slate-700/30" : "bg-white border border-gray-300 text-slate-900 hover:bg-gray-100"}`}
            >
              Create an Account
            </button>
          </div>

          {/* OR divider + Social (placeholders) */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200/60" />
            <div className="text-xs opacity-70">or continue with</div>
            <div className="h-px flex-1 bg-slate-200/60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="py-2 rounded-xl border flex items-center justify-center gap-2 text-sm hover:shadow-sm transition bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.99H7.898v-2.888h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.888h-2.33v6.99C18.343 21.128 22 16.991 22 12z" fill="currentColor" /></svg>
              Facebook
            </button>
            <button type="button" className="py-2 rounded-xl border flex items-center justify-center gap-2 text-sm hover:shadow-sm transition bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.6 11.2a9.6 9.6 0 10-4.4 7.7l3.2-3.2a7.2 7.2 0 11.8-4.5z" fill="currentColor"/></svg>
              Google
            </button>
          </div>
        </form>

        {/* small footer */}
        <p className="text-center text-xs mt-6 opacity-60">© {new Date().getFullYear()} Astrava — All rights reserved.</p>
      </div>
    </div>
  );
}
