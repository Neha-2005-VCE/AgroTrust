import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import FarmerDashboard from "./pages/FarmerDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import AdminVerification from "./pages/AdminVerification";
import AdminDashboard from "./pages/AdminDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import SettingsPage from "./pages/SettingsPage";
import Marketplace from "./pages/Marketplace";
import { getStoredUser } from "./services/api";

function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (roles && roles.length) {
    const user = getStoredUser();
    const r = user?.role?.toLowerCase();
    if (!r || !roles.includes(r)) {
      return <Navigate to="/" replace />;
    }
  }
  return children;
}

function App() {
  return (
    <div className="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute roles={["farmer"]}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/farmer/dashboard" replace />} />
          <Route
            path="/investor/dashboard"
            element={
              <ProtectedRoute roles={["investor"]}>
                <InvestorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <ProtectedRoute roles={["expert"]}>
                <AdminVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["expert"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/dashboard"
            element={
              <ProtectedRoute roles={["buyer"]}>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
