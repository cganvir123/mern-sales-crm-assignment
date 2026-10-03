import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

// Status filter tabs ("" = all statuses)
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Lost", label: "Lost" },
];

// Soft badge class per status
const STATUS_CLASS = {
  New: "leads-status-new",
  Contacted: "leads-status-contacted",
  Qualified: "leads-status-qualified",
  Lost: "leads-status-lost",
};

const Leads = () => {
  // 1. Pull the user from context
  const { user } = useContext(AuthContext);

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // "ignore" guards against out-of-order responses: if the user keeps
    // typing, a slow response for an older search can no longer overwrite
    // the results of a newer one.
    let ignore = false;

    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        // Let axios build and URL-encode the query string, so searches
        // containing "&", "#" or "+" don't break the request
        const response = await api.get("/leads", {
          params: { search, status, page, limit: 5 },
        });
        if (ignore) return;
        setLeads(response.data.leads);
        setTotalPages(response.data.pagination.pages);
      } catch (error) {
        if (!ignore) console.error("Error fetching leads:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(fetchLeads, 500);

    return () => {
      ignore = true;
      clearTimeout(delayDebounceFn);
    };
  }, [search, status, page]);

  const isFiltering = search !== "" || status !== "";

  return (
    <div className="leads-page">
      <style>{styles}</style>
      <Navbar />

      {/* ---------- Navy header band ---------- */}
      <section className="leads-hero">
        <div className="container-fluid px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="leads-hero-title">Leads</h3>
              <p className="leads-hero-subtitle">
                {user?.role === "Admin"
                  ? "Every lead across the team. Open one to see its deals and activity."
                  : "The leads assigned to you. Open one to log activity or add a deal."}
              </p>
            </div>

            <Link to="/leads/new" className="btn btn-primary leads-btn-primary">
              + Add New Lead
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Main content ---------- */}
      <div className="container-fluid px-4 leads-main">
        <div className="leads-card">
          {/* Toolbar: search + status tabs */}
          <div className="leads-toolbar">
            <div className="leads-search">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search leads by name..."
                aria-label="Search leads by name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div
              className="leads-tabs"
              role="group"
              aria-label="Filter by status"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  className={`leads-tab ${status === tab.value ? "is-active" : ""}`}
                  aria-pressed={status === tab.value}
                  onClick={() => {
                    setStatus(tab.value);
                    setPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="table-responsive">
            <table className="table align-middle mb-0 leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="leads-state">
                      <div
                        className="spinner-border spinner-border-sm text-primary me-2"
                        role="status"
                      />
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="leads-state">
                      <div className="leads-empty-title">
                        {isFiltering
                          ? "No leads match your search"
                          : "No leads yet"}
                      </div>
                      <div className="leads-empty-text">
                        {isFiltering
                          ? "Try a different name or status filter."
                          : user?.role === "Sales User"
                            ? "Add your first lead to start tracking it."
                            : "Add a lead and assign it to a sales user."}
                      </div>
                      {!isFiltering && (
                        <Link
                          to="/leads/new"
                          className="btn btn-primary btn-sm mt-3"
                        >
                          + Add New Lead
                        </Link>
                      )}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span className="leads-avatar" aria-hidden="true">
                            {lead.name?.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              <Link
                                to={`/leads/${lead._id}`}
                                className="leads-name"
                              >
                                {lead.name}
                              </Link>
                              {lead.overdueTasks > 0 && (
                                <span
                                  className="leads-overdue"
                                  title="Follow-ups past their due date"
                                >
                                  {lead.overdueTasks} overdue
                                </span>
                              )}
                            </div>
                            {lead.company && (
                              <div className="leads-company">
                                {lead.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="leads-email">{lead.email}</td>
                      <td>
                        <span
                          className={`leads-status ${STATUS_CLASS[lead.status] || ""}`}
                        >
                          <span className="leads-status-dot" />
                          {lead.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/leads/${lead._id}`}
                          className="leads-view-btn"
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="leads-footer">
              <span className="leads-page-info">
                Page {page} of {totalPages}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="leads-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="leads-page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "leads-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.leads-page {
  --ink: #14213d;
  --ink-soft: #1c2c4f;
  --ink-line: #2c3d63;
  --page-bg: #eef1f6;
  --text: #1e293b;
  --muted: #64748b;
  --line: #e2e7ef;
  --primary: #0d6efd;

  min-height: 100vh;
  background: var(--page-bg);
  padding-bottom: 48px;
}

.leads-hero,
.leads-main {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ---------- Navy header band ---------- */
.leads-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 32px 0 72px; /* extra bottom space for the overlapping card */
}

.leads-hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
}

.leads-hero-subtitle {
  color: #a9b6cc;
  margin: 6px 0 0;
  font-size: 0.95rem;
}

.leads-btn-primary {
  font-weight: 600;
}

/* ---------- Main card (overlaps the navy band) ---------- */
.leads-main {
  margin-top: -44px;
  color: var(--text);
}

.leads-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 8px 24px rgba(20, 33, 61, 0.08);
  overflow: hidden;
}

/* Toolbar */
.leads-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
}

.leads-search {
  position: relative;
  flex: 1 1 320px;
  max-width: 460px;
  color: #94a3b8;
}

.leads-search svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.leads-search input {
  width: 100%;
  height: 42px;
  padding: 0 14px 0 42px;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  background: #f5f7fb;
  border: 1.5px solid transparent;
  border-radius: 10px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.leads-search input::placeholder {
  color: #94a3b8;
}

.leads-search input:focus {
  outline: none;
  background: #fff;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
}

.leads-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #f1f4f9;
  border-radius: 10px;
}

.leads-tab {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
  padding: 7px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.leads-tab:hover {
  color: var(--text);
}

.leads-tab.is-active {
  background: #fff;
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(20, 33, 61, 0.12);
}

.leads-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Table */
.leads-table thead th {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
  padding: 12px 20px;
}

.leads-table td {
  padding: 14px 20px;
  border-color: #eef1f5;
}

.leads-table tbody tr {
  transition: background 0.12s;
}

.leads-table tbody tr:hover td {
  background: #f8fafd;
}

.leads-table tbody tr:last-child td {
  border-bottom: none;
}

.leads-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.leads-name {
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
}

.leads-name:hover {
  color: var(--primary);
  text-decoration: underline;
}

.leads-email {
  color: #475569;
}

/* Soft status badges (same colors as the rest of the app) */
.leads-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.leads-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.leads-status-new {
  background: #dff7fc;
  color: #087990;
}

.leads-status-contacted {
  background: #fff3cd;
  color: #8a6100;
}

.leads-status-qualified {
  background: #dcf1e5;
  color: #146c43;
}

.leads-status-lost {
  background: #fbe1e3;
  color: #b02a37;
}

.leads-company {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 1px;
}

.leads-overdue {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: #fbe1e3;
  color: #b02a37;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.leads-view-btn {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
  background: #eef4ff;
  padding: 6px 14px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}

.leads-view-btn:hover {
  background: #dfeaff;
}

.leads-view-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Loading / empty states */
.leads-state {
  text-align: center;
  padding: 48px 20px !important;
  color: var(--muted);
}

.leads-empty-title {
  font-weight: 700;
  color: var(--text);
  font-size: 1rem;
}

.leads-empty-text {
  font-size: 0.9rem;
  margin-top: 4px;
}

/* Pagination footer */
.leads-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  background: #fbfcfe;
}

.leads-page-info {
  font-size: 0.875rem;
  color: var(--muted);
}

.leads-page-btn {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  background: #fff;
  border: 1px solid #d6dce6;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.leads-page-btn:hover:not(:disabled) {
  background: #f5f7fb;
  border-color: #b8c2d2;
}

.leads-page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- Responsive ---------- */
@media (max-width: 767px) {
  .leads-search {
    max-width: none;
  }
  .leads-tabs {
    width: 100%;
    overflow-x: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .leads-page * {
    transition: none !important;
  }
}
`;

export default Leads;
