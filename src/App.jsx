import AppRouter from "./routes/AppRouter.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import ThemeProvider from "./theme/ThemeProvider.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
