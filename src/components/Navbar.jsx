// src/components/Navbar.jsx
import ThemeToggle from "./ThemeToggle";

export default function Navbar({ setIsOpen }) {
  return (
    <header
      className="
        hidden md:flex
        fixed top-0 right-0 left-64
        h-16 px-6
        items-center justify-between
        bg-white/80 dark:bg-slate-900/80
        backdrop-blur-lg
        border-b border-gray-200 dark:border-gray-700
        z-50
      "
    >
      {/* TITLE */}
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white tracking-wide">
        Astrava 
      </h1>

      {/* ACTIONS */}
      <div className="flex items-center gap-5">

        {/* NOTIFICATION */}
        <button className="relative hover:text-blue-600 transition">
          <i className="fa-solid fa-bell text-[20px]"></i>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* THEME */}
        <ThemeToggle />

      </div>
    </header>
  );
}
