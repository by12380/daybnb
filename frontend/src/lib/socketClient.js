import { io } from "socket.io-client";
import { supabase } from "./supabaseClient.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const DEFAULT_SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

export async function createAuthenticatedSocket() {
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) return null;

  return io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
}
