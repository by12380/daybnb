import AppRouter from "./routes/AppRouter.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import ThemeProvider from "./theme/ThemeProvider.jsx";
import SocketProvider from "./lib/SocketProvider.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppRouter />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
