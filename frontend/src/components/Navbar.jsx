import { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const Navbar = () => {
  const { user, logoutContext } = useContext(AuthContext);
  const navigate = useNavigate();

  // Controls the mobile menu. Previously the menu used Bootstrap's "collapse"
  // class with no toggle button, so on screens < 992px the links and the
  // Logout button were hidden with no way to open them.
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    try {
      // Clear the HTTP-only cookies on the server. Previously only
      // localStorage was cleared, leaving the refresh token valid for 7 days.
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      logoutContext();
      navigate("/login");
    }
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link${isActive ? " active fw-semibold" : ""}`;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold me-4" to="/" onClick={closeMenu}>
          Sales CRM
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="main-navbar"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          id="main-navbar"
          className={`collapse navbar-collapse${isOpen ? " show" : ""}`}
        >
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/leads" onClick={closeMenu}>
                Leads
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                className={navLinkClass}
                to="/pipeline"
                onClick={closeMenu}
              >
                Sales Pipeline
              </NavLink>
            </li>
            {user?.role === "Admin" && (
              <li className="nav-item">
                <NavLink
                  className={navLinkClass}
                  to="/users"
                  onClick={closeMenu}
                >
                  Team Overview
                </NavLink>
              </li>
            )}
          </ul>

          {/* User info & Logout */}
          <div className="d-flex flex-wrap align-items-center gap-3 py-2 py-lg-0">
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
