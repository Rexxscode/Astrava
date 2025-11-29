// FINAL REGISTER PAGE (UI SELARAS LOGIN)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const cardRef = useRef(null);

  // AOS INIT
  useEffect(() => {
    AOS.init({
      duration: 1100,
      easing: "ease-out-back",
      offset: 100,
      mirror: true,
    });
  }, []);

  // Shake Animation
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // 3D Tilt
  const handleCardMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = -(y - rect.height / 2) / 18;
    const rotateY = (x - rect.width / 2) / 18;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  };

  const handleCardLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  const handleRegister = () => {
    setError("");

    if (!name || !email || !pass || !confirm) {
      setError("Semua field wajib diisi!");
      return triggerShake();
    }

    if (pass !== confirm) {
      setError("Password tidak sama!");
      return triggerShake();
    }

    const existing = JSON.parse(localStorage.getItem("astrava_accounts")) || [];

    if (existing.some((acc) => acc.email === email)) {
      setError("Email sudah digunakan!");
      return triggerShake();
    }

    setLoading(true);

    setTimeout(() => {
      existing.push({ name, email, pass });
      localStorage.setItem("astrava_accounts", JSON.stringify(existing));
      localStorage.setItem("astrava_login", "true");
      localStorage.setItem("astrava_user", name);
      navigate("/dashboard");
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-black transition-colors duration-500 px-4 relative overflow-hidden">
      {/* Parallax Lights */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-10 w-96 h-96 rounded-full bg-gradient-to-tr from-[#1e3a8a]/30 to-[#60a5fa]/20 blur-3xl" />
        <div className="absolute -right-20 -bottom-10 w-80 h-80 rounded-full bg-gradient-to-bl from-[#7c3aed]/20 to-[#a78bfa]/10 blur-2xl" />
      </div>

      {/* CARD */}
      <div
        ref={cardRef}
        data-aos="fade-up"
        onMouseMove={handleCardMove}
        onMouseLeave={handleCardLeave}
        className={`relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl border transition-transform duration-300 ${shake ? "animate-[shake_0.4s_ease]" : ""} bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white`}
        style={{ willChange: "transform" }}
      >
        <h2 className="text-2xl font-extrabold text-center mb-2">Create Account</h2>
        <p className="text-sm opacity-70 text-center mb-6">Join the Astrava workspace</p>

        {/* NAME */}
        <div className="mb-4" data-aos="fade-right">
          <label className="block mb-1 text-sm font-medium">Full Name</label>
          <input
            type="text"
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* EMAIL */}
        <div className="mb-4" data-aos="fade-right" data-aos-delay="150">
          <label className="block mb-1 text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="mb-4" data-aos="fade-right" data-aos-delay="250">
          <label className="block mb-1 text-sm font-medium">Password</label>
          <input
            type="password"
            placeholder="••••••"
            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            onChange={(e) => setPass(e.target.value)}
          />
        </div>

        {/* CONFIRM */}
        <div className="mb-4" data-aos="fade-right" data-aos-delay="350">
          <label className="block mb-1 text-sm font-medium">Confirm Password</label>
          <input
            type="password"
            placeholder="••••••"
            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        {/* BUTTON */}
        <button
          onClick={handleRegister}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 text-white ${loading ? "opacity-60 cursor-not-allowed" : ""} bg-[#1e3a8a] hover:bg-[#162a67]`}
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {loading ? "Processing..." : "Register"}
        </button>

        <p className="text-center text-sm mt-5 opacity-80" data-aos="fade-up">
          Sudah punya akun? {" "}
          <button
            onClick={() => navigate("/login")}
            className="text-[#1e3a8a] dark:text-indigo-300 font-semibold"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}