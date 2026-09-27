import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

// What the app does — each item maps to a real feature in this project
const FEATURES = [
  {
    title: "Lead management",
    text: "Add leads, search them by name, and filter by New, Contacted or Qualified.",
    color: "#0dcaf0",
  },
  {
    title: "Activity history",
    text: "Record calls, meetings, notes and follow-ups on every lead.",
    color: "#ffc107",
  },
  {
    title: "Deal pipeline",
    text: "Move deals from Prospect to Negotiation to Won or Lost.",
    color: "#20c997",
  },
  {
    title: "Role-based access",
    text: "Admins see the whole team. Sales users see only the leads assigned to them.",
    color: "#6ea8fe",
  },
];

const LogoMark = () => (
  <span className="login-logo-mark" aria-hidden="true">
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

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { loginContext } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // The backend responds with the user profile, and automatically sets the cookies
      const response = await api.post("/auth/login", { email, password });

      // Save the profile to Context and LocalStorage
      loginContext(response.data.user);

      // Redirect to the protected dashboard area
      navigate("/");
    } catch (err) {
      // Handle validation errors from the backend gracefully
      if (err.response && err.response.data.errors) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError(
          err.response?.data?.message || "Login failed. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{styles}</style>

      {/* ---------- Left: brand panel (hidden on tablets/phones) ---------- */}
      <aside className="login-brand">
        <div className="login-logo">
          <LogoMark />
          <span>Sales CRM</span>
        </div>

        <div className="login-brand-copy">
          <h1>Every lead, from first contact to closed deal.</h1>
          <p>
            Track leads, log calls and meetings, and move deals through your
            pipeline, all in one place your whole sales team shares.
          </p>
        </div>

        <ul className="login-features">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="login-feature">
              <span
                className="login-feature-dot"
                style={{ background: feature.color }}
                aria-hidden="true"
              />
              <div>
                <div className="login-feature-title">{feature.title}</div>
                <div className="login-feature-text">{feature.text}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- Right: sign-in form ---------- */}
      <main className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-logo login-mobile-logo">
            <LogoMark />
            <span>Sales CRM</span>
          </div>

          <h2>Sign in</h2>
          <p className="login-subtitle">
            Use your work email to open your leads and pipeline.
          </p>

          {error && (
            <div className="login-error" role="alert">
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

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading && (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-register">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "login-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.login-page {
  --ink: #14213d;
  --primary: #0d6efd;
  --primary-hover: #0b5ed7;
  --surface: #f7f8fa;
  --text: #1e293b;
  --muted: #64748b;

  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--text);
  min-height: 100vh;
  display: flex;
  background: var(--surface);
}

/* ---------- Left: brand panel ---------- */
.login-brand {
  flex: 1 1 55%;
  background: var(--ink);
  color: #e2e8f0;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* CHANGED from space-between */
  gap: 40px;
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.25rem;
  color: #fff;
  letter-spacing: -0.01em;
}

.login-logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary);
  display: grid;
  place-items: center;
}

/* NEW: pushes headline + features to the vertical middle */
.login-brand-copy {
  margin-top: auto;
}

.login-brand-copy h1 {
  font-size: clamp(2rem, 3.2vw, 2.75rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: #fff;
  max-width: 16ch;
  margin: 0 0 16px;
}

.login-brand-copy p {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #a9b6cc;
  max-width: 46ch;
  margin: 0;
}

/* Feature list */
.login-features {
  list-style: none;
  padding: 0;
  margin: 0;
  margin-bottom: auto; /* NEW: balances margin-top above */
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 32px;
  max-width: 620px;
}

.login-feature {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.login-feature-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-top: 7px;
  flex-shrink: 0;
}

.login-feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.login-feature-text {
  font-size: 0.9rem;
  line-height: 1.55;
  color: #a9b6cc;
}

/* ---------- Right: form panel ---------- */
.login-form-side {
  flex: 1 1 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: #fff;
}

.login-form-wrap {
  width: 100%;
  max-width: 380px;
}

.login-mobile-logo {
  display: none;
  margin-bottom: 32px;
}

.login-form-wrap h2 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--text);
}

.login-subtitle {
  color: var(--muted);
  font-size: 0.95rem;
  margin: 0 0 28px;
}

.login-field {
  margin-bottom: 18px;
}

.login-field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text);
}

.login-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  background: #fff;
  border: 1.5px solid #d6dce5;
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.login-input::placeholder {
  color: #a0aabb;
}

.login-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.18);
}

.login-password {
  position: relative;
}

.login-password .login-input {
  padding-right: 64px;
}

.login-toggle {
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

.login-toggle:hover {
  background: #eef4ff;
}

.login-toggle:focus-visible,
.login-register a:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.login-error {
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

.login-submit {
  width: 100%;
  height: 48px;
  margin-top: 6px;
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

.login-submit:hover:not(:disabled) {
  background: var(--primary-hover);
}

.login-submit:focus-visible {
  outline: 3px solid rgba(13, 110, 253, 0.35);
  outline-offset: 2px;
}

.login-submit:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.login-register {
  text-align: center;
  font-size: 0.9rem;
  color: var(--muted);
  margin: 24px 0 0;
}

.login-register a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.login-register a:hover {
  text-decoration: underline;
}

/* ---------- Responsive ---------- */
@media (max-width: 1199px) {
  .login-brand {
    padding: 40px;
  }
  .login-features {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 991px) {
  .login-brand {
    display: none;
  }
  .login-mobile-logo {
    display: flex;
    color: var(--ink);
  }
  .login-form-side {
    align-items: flex-start;
    padding-top: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page * {
    transition: none !important;
  }
}
`;

export default Login;
