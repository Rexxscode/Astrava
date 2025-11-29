import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import Logo from "../assets/icons/astrava.png"

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "fa-chart-line" },
    { label: "Projects", path: "/projects", icon: "fa-folder-tree" }, // free
    { label: "Tasks", path: "/tasks", icon: "fa-list-check" },
    { label: "Gallery", path: "/gallery", icon: "fa-image" },
    { label: "Profile", path: "/profile", icon: "fa-user" },
    { label: "Settings", path: "/settings", icon: "fa-gear" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <>
      {/* OVERLAY MOBILE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 z-40 
          bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg
          border-r border-gray-200 dark:border-gray-700 
          shadow-xl transform transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
      >
        {/* LOGO */}
        <div className="p-5 flex items-center gap-3">
          <img
            src={Logo}
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-xl font-bold">Astrava</h1>
        </div>

        {/* NAVIGATION */}
        <nav className="px-4 flex flex-col gap-2 font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 px-4 rounded-lg transition-all
                ${isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "hover:bg-blue-600 hover:text-white"}`
              }
              onClick={() => setIsOpen(false)}
            >
              <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* BOTTOM */}
        <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3">

          {/* LOGOUT CENTER */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 py-2 px-4 rounded-lg 
                       bg-red-600 text-white hover:bg-red-700 
                       transition-all shadow-md"
          >
            <i className="fa-solid fa-right-from-bracket text-lg"></i>
            <span className="font-medium">Logout</span>
          </button>

          <ThemeToggle full />
        </div>
      </aside>
    </>
  );
}
