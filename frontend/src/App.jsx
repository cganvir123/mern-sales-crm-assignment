import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { ConfirmProvider } from "./components/ConfirmDialog";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AllUsers from "./pages/AllUsers";
import CreateLead from "./pages/CreateLead";
import LeadDetail from "./pages/LeadDetail";
import SalesPipeline from "./pages/SalesPipeline";
import Leads from "./pages/Leads";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            {/* Only for logged-out users */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pipeline" element={<SalesPipeline />} />
              <Route path="/leads/new" element={<CreateLead />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
              <Route path="/users" element={<AllUsers />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
