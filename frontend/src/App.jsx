import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Example Page Imports
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AllUsers from "./pages/AllUsers"; // Admin only page
import CreateLead from "./pages/CreateLead";
import LeadDetail from "./pages/LeadDetail";
import SalesPipeline from "./pages/SalesPipeline";
import Leads from "./pages/Leads";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes (For ANY logged in user) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} /> {/* <-- NEW */}
            <Route path="/pipeline" element={<SalesPipeline />} />
            <Route path="/leads/new" element={<CreateLead />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
          </Route>

          {/* Protected Routes (STRICTLY Admin Only) */}
          <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
            <Route path="/users" element={<AllUsers />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
