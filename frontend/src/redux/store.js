import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import roomReducer from "./slices/roomSlice";
import bookingReducer from "./slices/bookingSlice";
import reviewReducer from "./slices/reviewSlice";
import notificationReducer from "./slices/notificationSlice";
import contactReducer from "./slices/contactSlice";
import userReducer from "./slices/userSlice";
import stripeReducer from "./slices/stripeSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomReducer,
    bookings: bookingReducer,
    reviews: reviewReducer,
    notifications: notificationReducer,
    contact: contactReducer,
    users: userReducer,
    stripe: stripeReducer,
  },
});

export default store;
