import { Outlet } from "react-router-dom";
import GuestNavbar from "./Navbar.jsx";
import GuestFooter from "./Footer.jsx";
import ChatWidget from "../ChatWidget.jsx";

export default function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink transition-colors duration-300">
      <GuestNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <Outlet />
      </main>
      <GuestFooter />
      <ChatWidget />
    </div>
  );
}
