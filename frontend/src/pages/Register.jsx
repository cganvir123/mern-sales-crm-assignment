import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

// Explains the two roles in the app. New sign-ups are always Sales Users;
// an Admin account is created by promoting a user on the server.
const ROLES_INFO = [
  {
    title: "Sales User",
    text: "Work the leads assigned to you, log calls, meetings and follow-ups, and move your deals forward.",
    color: "#0dcaf0",
  },
  {
    title: "Admin",
    text: "See every sales user and their leads in Team Overview, and keep an eye on the whole pipeline.",
    color: "#6ea8fe",
  },
];

const LogoMark = () => (
  <span className="auth-logo-mark" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="9" width="4" height="8" rx="1" fill="#fff" opacity="0.6" />
      <rect
        x="7"
        y="5"
        width="4"
        height="12"
        rx="1"
        fill="#fff"
        opacity="0.8"
      />
      <rect x="13" y="1" width="4" height="16" rx="1" fill="#fff" />
    </svg>
  </span>
);

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post("/auth/register", formData);
      // On successful registration, redirect to login page
      navigate("/login");
    } catch (err) {
      if (err.response && err.response.data.errors) {
        // Display the first validation error from express-validator
        setError(err.response.data.errors[0].msg);
      } else {
        setError(err.response?.data?.message || "Registration failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{styles}</style>

      {/* ---------- Left: brand panel (hidden on tablets/phones) ---------- */}
      <aside className="auth-brand">
        <div className="auth-logo">
          <LogoMark />
          <span>Sales CRM</span>
        </div>

        <div className="auth-brand-copy">
          <h1>Set up your account and start working your leads.</h1>
          <p>
            New accounts start as Sales Users. Ask your admin if you need access
            to Team Overview.
          </p>
        </div>

        <ul className="auth-features">
          {ROLES_INFO.map((role) => (
            <li key={role.title} className="auth-feature">
              <span
                className="auth-feature-dot"
                style={{ background: role.color }}
                aria-hidden="true"
              />
              <div>
                <div className="auth-feature-title">{role.title}</div>
                <div className="auth-feature-text">{role.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- Right: registration form ---------- */}
      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-logo auth-mobile-logo">
            <LogoMark />
            <span>Sales CRM</span>
          </div>

          <h2>Create your account</h2>
          <p className="auth-subtitle">
            Fill in your details to get access to the CRM.
          </p>

          {error && (
            <div className="auth-error" role="alert">
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="auth-field">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                className="auth-input"
                placeholder="e.g. Priya Sharma"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                className="auth-input"
                placeholder="you@company.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <div className="auth-password">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="auth-input"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={72}
                  required
                  aria-describedby="reg-password-hint"
                />
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div id="reg-password-hint" className="auth-hint">
                At least 8 characters.
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading && (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "auth-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.auth-page {
  --ink: #14213d;
  --primary: #0d6efd;
  --primary-hover: #0b5ed7;
  --surface: #f7f8fa;
  --text: #1e293b;
  --muted: #64748b;
  --border: #d6dce5;

  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--text);
  min-height: 100vh;
  display: flex;
  background: var(--surface);
}

/* ---------- Left: brand panel ---------- */
.auth-brand {
  flex: 1 1 55%;
  background: var(--ink);
  color: #e2e8f0;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 40px;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.25rem;
  color: #fff;
  letter-spacing: -0.01em;
}

.auth-logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary);
  display: grid;
  place-items: center;
}

.auth-brand-copy {
  margin-top: auto;
}

.auth-brand-copy h1 {
  font-size: clamp(2rem, 3.2vw, 2.75rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: #fff;
  max-width: 17ch;
  margin: 0 0 16px;
}

.auth-brand-copy p {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #a9b6cc;
  max-width: 46ch;
  margin: 0;
}

.auth-features {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-bottom: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 32px;
  max-width: 620px;
}

.auth-feature {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.auth-feature-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-top: 7px;
  flex-shrink: 0;
}

.auth-feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.auth-feature-text {
  font-size: 0.9rem;
  line-height: 1.55;
  color: #a9b6cc;
}

/* ---------- Right: form panel ---------- */
.auth-form-side {
  flex: 1 1 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: #fff;
}

.auth-form-wrap {
  width: 100%;
  max-width: 400px;
}

.auth-mobile-logo {
  display: none;
  margin-bottom: 32px;
}

.auth-form-wrap h2 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--text);
}

.auth-subtitle {
  color: var(--muted);
  font-size: 0.95rem;
  margin: 0 0 28px;
}

.auth-field {
  margin-bottom: 18px;
}

.auth-field > label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text);
}

.auth-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-input::placeholder {
  color: #a0aabb;
}

.auth-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.18);
}

.auth-hint {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 6px;
}

.auth-password {
  position: relative;
}

.auth-password .auth-input {
  padding-right: 64px;
}

.auth-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.auth-toggle:hover {
  background: #eef4ff;
}

.auth-toggle:focus-visible,
.auth-switch a:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.auth-error {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #fdf0f0;
  border: 1px solid #f5c2c7;
  color: #a4232f;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.auth-submit {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.15s;
}

.auth-submit:hover:not(:disabled) {
  background: var(--primary-hover);
}

.auth-submit:focus-visible {
  outline: 3px solid rgba(13, 110, 253, 0.35);
  outline-offset: 2px;
}

.auth-submit:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  font-size: 0.9rem;
  color: var(--muted);
  margin: 24px 0 0;
}

.auth-switch a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-switch a:hover {
  text-decoration: underline;
}

/* ---------- Responsive ---------- */
@media (max-width: 1199px) {
  .auth-brand {
    padding: 40px;
  }
  .auth-features {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 991px) {
  .auth-brand {
    display: none;
  }
  .auth-mobile-logo {
    display: flex;
    color: var(--ink);
  }
  .auth-form-side {
    align-items: flex-start;
    padding-top: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page * {
    transition: none !important;
  }
}
`;

export default Register;
