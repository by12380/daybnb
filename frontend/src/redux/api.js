import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Impersonation state ─────────────────────────────────────
// Persisted in sessionStorage so it survives client-side navigations
// and soft refreshes within the same browser tab, but clears when the
// tab is closed.
const _IMPERSONATE_KEY = "daybnb_impersonate_owner";

let _impersonatingOwnerId = (() => {
  try { return sessionStorage.getItem(_IMPERSONATE_KEY) || null; }
  catch { return null; }
})();

export function setImpersonation(ownerId) {
  _impersonatingOwnerId = ownerId || null;
  try {
    if (_impersonatingOwnerId) {
      sessionStorage.setItem(_IMPERSONATE_KEY, _impersonatingOwnerId);
    } else {
      sessionStorage.removeItem(_IMPERSONATE_KEY);
    }
  } catch { /* private browsing */ }
}

export function getImpersonation() {
  return _impersonatingOwnerId;
}

export function clearImpersonation() {
  _impersonatingOwnerId = null;
  try { sessionStorage.removeItem(_IMPERSONATE_KEY); }
  catch { /* private browsing */ }
}

// Request interceptor – attach Supabase access token to every request
api.interceptors.request.use(
  async (config) => {
    // Try to get the token from Supabase client-side session
    const { supabase } = await import("../lib/supabaseClient.js");
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }

    // Attach impersonation header if active
    if (_impersonatingOwnerId) {
      config.headers["x-impersonate-owner"] = _impersonatingOwnerId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
