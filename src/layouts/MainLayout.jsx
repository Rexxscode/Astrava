import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ThemeToggle from "../components/ThemeToggle";
import Navbar from "../components/Navbar";
import MobileNavbar from "../components/MobileNavbar";



export default function MainLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">

      {/* SIDEBAR */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <Navbar setIsOpen={setIsOpen} />
      <MobileNavbar setIsOpen={setIsOpen} />



      {/* MOBILE TOPBAR */}
      <header className="md:hidden fixed top-4 left-4 right-4 z-40 flex items-center justify-between">
        {/* Toggle Sidebar */}
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-lg shadow-lg active:scale-95"
        >
          <i className="fa-solid fa-bars text-lg"></i>
        </button>

        {/* Theme Toggle */}
        <div className="bg-white/90 dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <ThemeToggle />
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main
        className="
          flex-1 
          ml-0 md:ml-64 
          p-6 
          pt-20 md:pt-6
          transition-all duration-300
        "
      >
        {children}
      </main>
    </div>
  );
}
