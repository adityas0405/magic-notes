import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-base text-text">
      <Sidebar />
      <main className="flex-1 px-12 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
