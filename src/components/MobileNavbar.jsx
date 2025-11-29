// src/components/MobileNavbar.jsx
import ThemeToggle from "./ThemeToggle";

export default function MobileNavbar({ setIsOpen }) {
  return (
    <header
      className="
        md:hidden
        fixed top-0 left-0 right-0
        h-16 px-4
        flex items-center justify-between
        bg-white/90 dark:bg-slate-900/90
        backdrop-blur-lg
        border-b border-gray-200 dark:border-gray-700
        z-40
      "
    >
      {/* EMPTY LEFT (kosong) */}
      <div></div>

      {/* RIGHT ICONS */}
      <div className="flex items-center gap-4">

        {/* Notification */}
        <button className="relative hover:text-blue-600 transition">
          <i className="fa-solid fa-bell text-xl"></i>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        

  
      </div>
    </header>
  );
}
