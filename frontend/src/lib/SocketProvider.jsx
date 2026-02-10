import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import { connectSocket, disconnectSocket, getSocket } from "./socket.js";

const SocketContext = createContext(null);

/**
 * Provides the Socket.IO client to the whole app.
 * Connects when the user logs in, disconnects on logout.
 */
export default function SocketProvider({ children }) {
  const { session } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = session?.access_token;

    if (token) {
      const s = connectSocket(token);
      setSocket(s);

      return () => {
        disconnectSocket();
        setSocket(null);
      };
    } else {
      // No session – make sure we're disconnected
      disconnectSocket();
      setSocket(null);
    }
  }, [session?.access_token]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

/**
 * Hook to access the socket instance from any component.
 */
export function useSocket() {
  return useContext(SocketContext);
}
