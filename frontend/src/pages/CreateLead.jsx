import { useState, useContext } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

// Status options with the same colors used across the app
const STATUS_OPTIONS = [
  { value: "New", hint: "Not contacted yet", color: "#0dcaf0" },
  { value: "Contacted", hint: "In conversation", color: "#ffc107" },
  { value: "Qualified", hint: "Good fit, ready for a deal", color: "#198754" },
];

const CreateLead = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "New",
  });

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // SECURITY CHECK: If an Admin tries to force their way to this URL, boot them out.
  if (user?.role !== "Sales User") {
    return <Navigate to="/leads" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post("/leads", formData);
      navigate("/leads"); // Head back to the leads list on success
    } catch (err) {
      if (err.response && err.response.data.errors) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError("Failed to create lead. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cl-page">
      <style>{styles}</style>
      <Navbar />

      {/* ---------- Navy header band ---------- */}
      <section className="cl-hero">
        <div className="cl-container">
          <Link to="/leads" className="cl-back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to leads
          </Link>
          <h3 className="cl-hero-title">Add a new lead</h3>
          <p className="cl-hero-subtitle">
            The lead will be assigned to you. You can add deals and log activity
            from its page after saving.
          </p>
        </div>
      </section>

      {/* ---------- Form card (overlaps the navy band) ---------- */}
      <div className="cl-container cl-main">
        <div className="cl-card">
          {error && (
            <div className="cl-error" role="alert">
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

          <form onSubmit={handleSubmit}>
            <div className="cl-field">
              <label htmlFor="cl-name">Company / client name</label>
              <input
                id="cl-name"
                type="text"
                className="cl-input"
                placeholder="e.g. Acme Technologies Pvt. Ltd."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="cl-field">
              <label htmlFor="cl-email">Contact email</label>
              <input
                id="cl-email"
                type="email"
                className="cl-input"
                placeholder="contact@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <fieldset className="cl-field cl-status-field">
              <legend>Initial status</legend>
              <div className="cl-status-grid">
                {STATUS_OPTIONS.map((option) => {
                  const selected = formData.status === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cl-status ${selected ? "is-selected" : ""}`}
                      style={{ "--status-color": option.color }}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={selected}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      />
                      <span className="cl-status-top">
                        <span className="cl-status-dot" aria-hidden="true" />
                        <span className="cl-status-name">{option.value}</span>
                        <span className="cl-status-radio" aria-hidden="true" />
                      </span>
                      <span className="cl-status-hint">{option.hint}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="cl-actions">
              <Link to="/leads" className="cl-btn-cancel">
                Cancel
              </Link>
              <button
                type="submit"
                className="cl-btn-save"
                disabled={isLoading}
              >
                {isLoading && (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {isLoading ? "Saving..." : "Save lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "cl-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.cl-page {
  --ink: #14213d;
  --page-bg: #eef1f6;
  --text: #1e293b;
  --muted: #64748b;
  --line: #e2e7ef;
  --border: #d6dce6;
  --primary: #0d6efd;

  min-height: 100vh;
  background: var(--page-bg);
  padding-bottom: 48px;
}

.cl-hero,
.cl-main {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

.cl-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 20px;
}

/* ---------- Navy header band ---------- */
.cl-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 22px 0 84px;
}

.cl-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a9b6cc;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.cl-back:hover {
  color: #fff;
}

.cl-back:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.cl-hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 14px 0 0;
}

.cl-hero-subtitle {
  color: #a9b6cc;
  margin: 6px 0 0;
  font-size: 0.95rem;
  max-width: 52ch;
}

/* ---------- Form card ---------- */
.cl-main {
  margin-top: -56px;
  color: var(--text);
}

.cl-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 8px 24px rgba(20, 33, 61, 0.08);
}

.cl-field {
  margin-bottom: 20px;
}

/* "> label" so this doesn't style the status cards inside the grid */
.cl-field > label,
.cl-status-field legend {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text);
}

.cl-input {
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

.cl-input::placeholder {
  color: #a0aabb;
}

.cl-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.18);
}

/* Status picker (radio cards) */
.cl-status-field {
  border: none;
  padding: 0;
  margin: 0 0 24px;
}

.cl-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.cl-status {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  margin: 0;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.cl-status:hover {
  border-color: #b3bfd0;
}

.cl-status input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.cl-status-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cl-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--status-color);
  flex-shrink: 0;
}

.cl-status-name {
  flex: 1;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.cl-status-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #9aa6b8;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.cl-status-hint {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.35;
}

.cl-status.is-selected {
  border-color: var(--primary);
  background: #f3f7ff;
}

.cl-status.is-selected .cl-status-radio {
  border-color: var(--primary);
}

.cl-status.is-selected .cl-status-radio::after {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.cl-status:has(input:focus-visible) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Error */
.cl-error {
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

/* Actions */
.cl-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #eef1f5;
}

.cl-btn-cancel,
.cl-btn-save {
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.cl-btn-cancel {
  color: var(--text);
  background: #fff;
  border: 1px solid var(--border);
}

.cl-btn-cancel:hover {
  background: #f5f7fb;
  color: var(--text);
}

.cl-btn-save {
  min-width: 140px;
  color: #fff;
  background: var(--primary);
  border: none;
}

.cl-btn-save:hover:not(:disabled) {
  background: #0b5ed7;
}

.cl-btn-save:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.cl-btn-cancel:focus-visible,
.cl-btn-save:focus-visible {
  outline: 3px solid rgba(13, 110, 253, 0.35);
  outline-offset: 2px;
}

/* ---------- Responsive ---------- */
@media (max-width: 575px) {
  .cl-card {
    padding: 20px;
  }
  .cl-status-grid {
    grid-template-columns: 1fr;
  }
  .cl-actions {
    flex-direction: column-reverse;
  }
  .cl-btn-cancel,
  .cl-btn-save {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cl-page * {
    transition: none !important;
  }
}
`;

export default CreateLead;
