import AppRouter from "./routes/AppRouter.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
