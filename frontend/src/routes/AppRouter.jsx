import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import GuestLayout from "../guest/components/layout/GuestLayout.jsx";
import Landing from "../guest/pages/Landing.jsx";
import ContactUs from "../guest/pages/ContactUs.jsx";
import Auth from "../pages/Auth.jsx";
import Booking from "../guest/pages/Booking.jsx";
import RoomDetail from "../guest/pages/RoomDetail.jsx";
import Profile from "../guest/pages/Profile.jsx";
import MyBookings from "../guest/pages/MyBookings.jsx";
import LikedRooms from "../guest/pages/LikedRooms.jsx";
import PaymentSuccess from "../guest/pages/PaymentSuccess.jsx";
import PaymentCancel from "../guest/pages/PaymentCancel.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";
import RequireAdmin from "../auth/RequireAdmin.jsx";
import RequireOwner from "../auth/RequireOwner.jsx";

// Admin imports
import AdminLayout from "../admin/components/layout/AdminLayout.jsx";
import AdminDashboard from "../admin/pages/Dashboard.jsx";
import AdminBookings from "../admin/pages/Bookings.jsx";
import AdminUsers from "../admin/pages/Users.jsx";
import AdminRooms from "../admin/pages/Rooms.jsx";
import AdminMessages from "../admin/pages/Messages.jsx";
import AdminOwners from "../admin/pages/Owners.jsx";
import AdminOffers from "../admin/pages/Offers.jsx";
import AdminHeroBanners from "../admin/pages/HeroBanners.jsx";
import AdminHeroBannerEditor from "../admin/pages/HeroBannerEditor.jsx";
import AdminRoomEditor from "../admin/pages/RoomEditor.jsx";
import AdminRoomView from "../admin/pages/RoomView.jsx";
import AdminAlgoliaSync from "../admin/pages/AlgoliaSync.jsx";
import AdminCheckInOut from "../admin/pages/CheckInOut.jsx";
import AdminBookingHistory from "../admin/pages/BookingHistory.jsx";

// Owner imports
import OwnerLayout from "../owner/components/layout/OwnerLayout.jsx";
import OwnerDashboard from "../owner/pages/Dashboard.jsx";
import OwnerRooms from "../owner/pages/Rooms.jsx";
import OwnerBookings from "../owner/pages/Bookings.jsx";
import OwnerCustomers from "../owner/pages/Customers.jsx";
import OwnerChat from "../owner/pages/Chat.jsx";
import OwnerOffers from "../owner/pages/Offers.jsx";
import OwnerCheckInOut from "../owner/pages/CheckInOut.jsx";
import OwnerBookingHistory from "../owner/pages/BookingHistory.jsx";
import OwnerRoomEditor from "../owner/pages/RoomEditor.jsx";

// Admin chat
import AdminChat from "../admin/pages/Chat.jsx";

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
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/room/:roomId" element={<RoomDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<RequireAuth />}>
            <Route path="/book/:roomId" element={<Booking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/liked-rooms" element={<LikedRooms />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancel" element={<PaymentCancel />} />
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
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/rooms" element={<AdminRooms />} />
            <Route path="/admin/rooms/new" element={<AdminRoomEditor />} />
            <Route path="/admin/rooms/:roomId" element={<AdminRoomView />} />
            <Route path="/admin/rooms/:roomId/edit" element={<AdminRoomEditor />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/chat" element={<AdminChat />} />
            <Route path="/admin/owners" element={<AdminOwners />} />
            <Route path="/admin/offers" element={<AdminOffers />} />
            <Route path="/admin/hero-banners" element={<AdminHeroBanners />} />
            <Route path="/admin/hero-banners/new" element={<AdminHeroBannerEditor />} />
            <Route path="/admin/hero-banners/:bannerId/edit" element={<AdminHeroBannerEditor />} />
            <Route path="/admin/check-in-out" element={<AdminCheckInOut />} />
            <Route path="/admin/booking-history" element={<AdminBookingHistory />} />
            <Route path="/admin/algolia" element={<AdminAlgoliaSync />} />
          </Route>
        </Route>

        {/* Owner Routes - Protected by RequireOwner */}
        <Route element={<RequireOwner />}>
          <Route element={<OwnerLayout />}>
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/owner/rooms" element={<OwnerRooms />} />
            <Route path="/owner/rooms/new" element={<OwnerRoomEditor />} />
            <Route path="/owner/rooms/:roomId/edit" element={<OwnerRoomEditor />} />
            <Route path="/owner/bookings" element={<OwnerBookings />} />
            <Route path="/owner/customers" element={<OwnerCustomers />} />
            <Route path="/owner/chat" element={<OwnerChat />} />
            <Route path="/owner/check-in-out" element={<OwnerCheckInOut />} />
            <Route path="/owner/booking-history" element={<OwnerBookingHistory />} />
            <Route path="/owner/offers" element={<OwnerOffers />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
