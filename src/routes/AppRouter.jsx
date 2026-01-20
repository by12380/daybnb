import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import GuestLayout from "../guest/components/layout/GuestLayout.jsx";
import Landing from "../guest/pages/Landing.jsx";
import Auth from "../pages/Auth.jsx";
import Booking from "../guest/pages/Booking.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route element={<GuestLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<RequireAuth />}>
            <Route path="/book/:roomId" element={<Booking />} />
          </Route>
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/host" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
