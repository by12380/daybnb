import { Outlet } from "react-router-dom";
import GuestNavbar from "./Navbar.jsx";
import GuestFooter from "./Footer.jsx";

export default function GuestLayout() {
  return (
    <div className="min-h-screen bg-surface text-ink transition-colors duration-300 dark:bg-dark-navy dark:text-dark-ink">
      <GuestNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <Outlet />
      </main>
      <GuestFooter />
    </div>
  );
}
