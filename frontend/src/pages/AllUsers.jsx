import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

// Status colors shared with the rest of the app
const STATUS_META = {
  New: { color: "#0dcaf0", tint: "#dff7fc", text: "#087990" },
  Contacted: { color: "#ffc107", tint: "#fff3cd", text: "#8a6100" },
  Qualified: { color: "#198754", tint: "#dcf1e5", text: "#146c43" },
};
const STATUSES = ["New", "Contacted", "Qualified"];

const AllUsers = () => {
  const [salesUsers, setSalesUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSalesUsers();
  }, []);

  const fetchSalesUsers = async () => {
    try {
      const response = await api.get("/users/sales-users");
      setSalesUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Summary numbers for the header strip
  const totalLeads = salesUsers.reduce(
    (sum, u) => sum + u.assignedLeads.length,
    0,
  );
  const qualifiedLeads = salesUsers.reduce(
    (sum, u) =>
      sum + u.assignedLeads.filter((l) => l.status === "Qualified").length,
    0,
  );
  const repsWithoutLeads = salesUsers.filter(
    (u) => u.assignedLeads.length === 0,
  ).length;

  return (
    <div className="tm-page">
      <style>{styles}</style>
      <Navbar />

      {/* ---------- Navy header band ---------- */}
      <section className="tm-hero">
        <div className="container-fluid px-4">
          <h3 className="tm-hero-title">Team Overview</h3>
          <p className="tm-hero-subtitle">
            Every sales rep and the leads assigned to them. Click a lead to open
            it.
          </p>

          {!isLoading && (
            <div className="tm-summary">
              <div>
                <div className="tm-summary-value">{salesUsers.length}</div>
                <div className="tm-summary-label">Sales reps</div>
              </div>
              <div>
                <div className="tm-summary-value">{totalLeads}</div>
                <div className="tm-summary-label">Leads assigned</div>
              </div>
              <div>
                <div className="tm-summary-value">{qualifiedLeads}</div>
                <div className="tm-summary-label">Qualified leads</div>
              </div>
              <div>
                <div className="tm-summary-value">{repsWithoutLeads}</div>
                <div className="tm-summary-label">Reps without leads</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Main content ---------- */}
      <div className="container-fluid px-4 tm-main">
        <div className="tm-card">
          <div className="tm-card-head">
            <h5 className="tm-card-title">
              <span className="tm-card-accent" />
              Sales team
            </h5>
            <div className="tm-legend">
              {STATUSES.map((s) => (
                <span key={s}>
                  <span
                    className="tm-dot"
                    style={{ background: STATUS_META[s].color }}
                  />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0 tm-table">
              <thead>
                <tr>
                  <th>Sales rep</th>
                  <th>Leads</th>
                  <th>Assigned leads</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="3" className="tm-state">
                      <div
                        className="spinner-border spinner-border-sm text-primary me-2"
                        role="status"
                      />
                      Loading team data...
                    </td>
                  </tr>
                ) : salesUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="tm-state">
                      <div className="tm-empty-title">No sales users yet</div>
                      <div className="tm-empty-text">
                        Sales reps will appear here once they register with the
                        Sales User role.
                      </div>
                    </td>
                  </tr>
                ) : (
                  salesUsers.map((user) => {
                    const count = user.assignedLeads.length;
                    const byStatus = STATUSES.map((s) => ({
                      status: s,
                      count: user.assignedLeads.filter((l) => l.status === s)
                        .length,
                    }));

                    return (
                      <tr key={user._id}>
                        {/* Rep */}
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <span className="tm-avatar" aria-hidden="true">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="tm-name">{user.name}</div>
                              <div className="tm-email">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Lead count + status breakdown bar */}
                        <td className="tm-leads-cell">
                          <div className="tm-count">{count}</div>
                          {count > 0 ? (
                            <div
                              className="tm-bar"
                              title={byStatus
                                .map((b) => `${b.status}: ${b.count}`)
                                .join(", ")}
                            >
                              {byStatus
                                .filter((b) => b.count > 0)
                                .map((b) => (
                                  <span
                                    key={b.status}
                                    style={{
                                      width: `${(b.count / count) * 100}%`,
                                      background: STATUS_META[b.status].color,
                                    }}
                                  />
                                ))}
                            </div>
                          ) : (
                            <div className="tm-bar tm-bar-empty" />
                          )}
                        </td>

                        {/* Assigned lead chips */}
                        <td>
                          {count === 0 ? (
                            <span className="tm-none">No leads assigned</span>
                          ) : (
                            <div className="d-flex flex-wrap gap-2">
                              {user.assignedLeads.map((lead) => {
                                const meta =
                                  STATUS_META[lead.status] || STATUS_META.New;
                                return (
                                  <Link
                                    key={lead._id}
                                    to={`/leads/${lead._id}`}
                                    className="tm-chip"
                                    style={{
                                      background: meta.tint,
                                      color: meta.text,
                                    }}
                                    title={`${lead.name} (${lead.status})`}
                                  >
                                    <span
                                      className="tm-chip-dot"
                                      style={{ background: meta.color }}
                                    />
                                    {lead.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "tm-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.tm-page {
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

.tm-hero,
.tm-main {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ---------- Navy header band ---------- */
.tm-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 32px 0 76px;
  color: #e2e8f0;
  min-height: 150px;
}

.tm-hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
}

.tm-hero-subtitle {
  color: #a9b6cc;
  margin: 6px 0 0;
  font-size: 0.95rem;
}

.tm-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 24px;
  background: var(--ink-line);
  border: 1px solid var(--ink-line);
  border-radius: 12px;
  overflow: hidden;
}

.tm-summary > div {
  background: var(--ink-soft);
  padding: 14px 18px;
}

.tm-summary-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.tm-summary-label {
  font-size: 0.8rem;
  color: #8a99b4;
  margin-top: 2px;
}

/* ---------- Main card (overlaps the navy band) ---------- */
.tm-main {
  margin-top: -48px;
  color: var(--text);
}

.tm-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 8px 24px rgba(20, 33, 61, 0.08);
  overflow: hidden;
}

.tm-card-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
}

.tm-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.tm-card-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--ink);
}

.tm-legend {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #475569;
}

.tm-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tm-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

/* Table */
.tm-table thead th {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
  padding: 12px 20px;
}

.tm-table td {
  padding: 16px 20px;
  border-color: #eef1f5;
}

.tm-table tbody tr:hover td {
  background: #f8fafd;
}

.tm-table tbody tr:last-child td {
  border-bottom: none;
}

.tm-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.tm-name {
  font-weight: 700;
  color: var(--text);
}

.tm-email {
  font-size: 0.85rem;
  color: var(--muted);
}

.tm-leads-cell {
  width: 180px;
}

.tm-count {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  margin-bottom: 8px;
}

.tm-bar {
  display: flex;
  height: 6px;
  width: 120px;
  border-radius: 999px;
  overflow: hidden;
  background: #eef1f5;
}

.tm-bar > span {
  height: 100%;
}

.tm-bar > span + span {
  border-left: 2px solid #fff;
}

.tm-bar-empty {
  background: #eef1f5;
}

.tm-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 999px;
  text-decoration: none;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: filter 0.15s;
}

.tm-chip:hover {
  filter: brightness(0.95);
  text-decoration: underline;
}

.tm-chip:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.tm-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tm-none {
  font-size: 0.875rem;
  color: var(--muted);
  font-style: italic;
}

/* Loading / empty states */
.tm-state {
  text-align: center;
  padding: 48px 20px !important;
  color: var(--muted);
}

.tm-empty-title {
  font-weight: 700;
  color: var(--text);
  font-size: 1rem;
}

.tm-empty-text {
  font-size: 0.9rem;
  margin-top: 4px;
}

/* ---------- Responsive ---------- */
@media (max-width: 767px) {
  .tm-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .tm-page * {
    transition: none !important;
  }
}
`;

export default AllUsers;
