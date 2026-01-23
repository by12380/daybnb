import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import GuestLayout from "../guest/components/layout/GuestLayout.jsx";
import Landing from "../guest/pages/Landing.jsx";
import Auth from "../pages/Auth.jsx";
import Booking from "../guest/pages/Booking.jsx";
import Profile from "../guest/pages/Profile.jsx";
import MyBookings from "../guest/pages/MyBookings.jsx";
import LikedRooms from "../guest/pages/LikedRooms.jsx";
import GuestNotifications from "../guest/pages/Notifications.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";
import RequireAdmin from "../auth/RequireAdmin.jsx";

// Admin imports
import AdminLayout from "../admin/components/layout/AdminLayout.jsx";
import AdminDashboard from "../admin/pages/Dashboard.jsx";
import AdminBookings from "../admin/pages/Bookings.jsx";
import AdminUsers from "../admin/pages/Users.jsx";
import AdminRooms from "../admin/pages/Rooms.jsx";
import AdminNotifications from "../admin/pages/Notifications.jsx";

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
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/liked-rooms" element={<LikedRooms />} />
            <Route path="/notifications" element={<GuestNotifications />} />
          </Route>
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/host" element={<Dashboard />} />
        </Route>
        
        {/* Admin Routes - Protected by RequireAdmin */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/rooms" element={<AdminRooms />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
