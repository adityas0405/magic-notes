import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-surface px-6 py-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-text text-white">
          A
        </div>
        <span className="text-lg font-semibold">Atlas</span>
      </div>

      <nav className="mt-8 space-y-2">
        <NavLink
          to="/app/library"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-teal-50 text-primary ring-1 ring-primary/20"
                : "text-text hover:bg-slate-50"
            }`
          }
        >
          <span>Library</span>
        </NavLink>
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-teal-50 text-primary ring-1 ring-primary/20"
                : "text-text hover:bg-slate-50"
            }`
          }
        >
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-base px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white text-sm font-semibold">
            JD
          </div>
          <div>
            <p className="text-sm font-semibold">John Doe</p>
            <p className="text-xs text-muted">john@example.com</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
