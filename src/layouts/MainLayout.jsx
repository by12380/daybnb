import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
