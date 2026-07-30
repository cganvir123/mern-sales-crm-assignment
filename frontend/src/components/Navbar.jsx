import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logoutContext } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutContext();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold me-4" to="/">
          Sales CRM
        </Link>

        {/* Left-aligned Menu Bar */}
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Dashboard (Leads)
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/pipeline">
                Sales Pipeline
              </Link>
            </li>
            {user?.role === "Admin" && (
              <li className="nav-item">
                <Link className="nav-link" to="/users">
                  Team Overview
                </Link>
              </li>
            )}
          </ul>

          {/* Right-aligned User Info & Logout */}
          <div className="d-flex align-items-center gap-3">
            <div className="text-light small">
              Welcome, <strong>{user?.name}</strong>
              <span className="badge bg-secondary ms-2">{user?.role}</span>
            </div>
            <button
              className="btn btn-outline-light btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
