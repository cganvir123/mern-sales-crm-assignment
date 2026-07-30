import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  // 1. Handle the loading state while checking the user's token
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // 2. If no user is logged in, boot them to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Optional: Role-based access control
  // If the route requires specific roles and the user doesn't have it, boot them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Redirect to their default dashboard
  }

  // 4. If they pass all checks, render the protected child routes
  return <Outlet />;
};

export default ProtectedRoute;
