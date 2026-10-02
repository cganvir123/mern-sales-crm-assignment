import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

// Same colors as the badges used elsewhere in the app
const STATUS_COLORS = {
  New: "#0dcaf0",
  Contacted: "#ffc107",
  Qualified: "#198754",
};
const STAGE_COLORS = {
  Prospect: "#6c757d",
  Negotiation: "#ffc107",
  Won: "#198754",
  Lost: "#dc3545",
};
const ACTIVITY_COLORS = {
  Calls: "#0d6efd",
  Meetings: "#6f42c1",
  Notes: "#20c997",
  "Follow-ups": "#fd7e14",
};
const STATUS_BADGE = {
  New: "bg-info",
  Contacted: "bg-warning",
  Qualified: "bg-success",
};
const ACTIVITY_LABEL = {
  Calls: "Call",
  Meetings: "Meeting",
  Notes: "Note",
  "Follow-ups": "Follow-up",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

// Shared tooltip look for all charts
const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 10,
    border: "none",
    boxShadow: "0 8px 24px rgba(20, 33, 61, 0.18)",
    fontSize: 13,
    padding: "8px 12px",
  },
  labelStyle: { fontWeight: 700, color: "#14213d", marginBottom: 2 },
};

// ---------- Icons for the KPI tiles ----------

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const ICONS = {
  leads: (
    <svg {...iconProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  pipeline: (
    <svg {...iconProps}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  won: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  winRate: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

// ---------- Small building blocks ----------

const KpiCard = ({ label, value, detail, color, icon }) => (
  <div className="dash-kpi">
    <div className="dash-kpi-top">
      <span className="dash-kpi-label">{label}</span>
      <span
        className="dash-kpi-icon"
        style={{ color, background: `${color}26` }}
      >
        {icon}
      </span>
    </div>
    <div className="dash-kpi-value">{value}</div>
    <div className="dash-kpi-detail">{detail}</div>
  </div>
);

const ChartCard = ({
  title,
  subtitle,
  action,
  accent = "#0d6efd",
  children,
}) => (
  <div className="dash-card h-100">
    <div className="dash-card-head">
      <div>
        <h5 className="dash-card-title">
          <span className="dash-card-accent" style={{ background: accent }} />
          {title}
        </h5>
        {subtitle && <p className="dash-card-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const DonutChart = ({ data, colors, centerLabel, emptyText }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <div className="dash-empty">{emptyText}</div>;
  }

  return (
    <div className="dash-donut">
      <div className="dash-donut-chart">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={colors[entry.name]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="dash-donut-center">
          <div className="dash-donut-total">{total}</div>
          <div className="dash-donut-caption">{centerLabel}</div>
        </div>
      </div>

      <ul className="dash-legend">
        {data.map((entry) => (
          <li key={entry.name}>
            <span
              className="dash-dot"
              style={{ background: colors[entry.name] }}
            />
            <span className="dash-legend-name">{entry.name}</span>
            <span className="dash-legend-value">{entry.value}</span>
            <span className="dash-legend-pct">
              {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------- Page ----------

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bumping this number re-runs the fetch (used by the "Try again" button)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/stats");
        if (!ignore) setStats(response.data);
      } catch (err) {
        if (!ignore)
          setError(
            err.response?.data?.message || "Could not load dashboard data.",
          );
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retryFetch = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  // Personal greeting for the header
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "";

  const showData = !isLoading && !error && stats;

  return (
    <div className="dash-page">
      <style>{styles}</style>
      <Navbar />

      {/* ---------- Navy header band: greeting + KPIs ---------- */}
      <section className="dash-hero">
        <div className="container-fluid px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="dash-hero-title">
                {greeting}
                {firstName && `, ${firstName}`}
              </h3>
              <p className="dash-hero-subtitle">
                {isAdmin
                  ? "Here's how the whole team's leads, deals and activity are tracking."
                  : "Here's how your leads, deals and activity are tracking."}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/leads" className="btn dash-btn-ghost">
                View leads
              </Link>
              {!isAdmin && (
                <Link
                  to="/leads/new"
                  className="btn btn-primary dash-btn-primary"
                >
                  + Add New Lead
                </Link>
              )}
            </div>
          </div>

          {showData && (
            <div className="row g-3 g-lg-4 mt-2">
              <div className="col-12 col-sm-6 col-xl-3">
                <KpiCard
                  label="Total leads"
                  value={stats.totals.leads}
                  detail={`${stats.totals.qualifiedLeads} qualified`}
                  color="#0dcaf0"
                  icon={ICONS.leads}
                />
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <KpiCard
                  label="Open pipeline"
                  value={currency.format(stats.totals.pipelineValue)}
                  detail={`${stats.totals.openDeals} open deals`}
                  color="#ffc107"
                  icon={ICONS.pipeline}
                />
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <KpiCard
                  label="Revenue won"
                  value={currency.format(stats.totals.wonValue)}
                  detail={`${stats.totals.wonDeals} deals won`}
                  color="#20c997"
                  icon={ICONS.won}
                />
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <KpiCard
                  label="Win rate"
                  value={
                    stats.totals.winRate === null
                      ? "—"
                      : `${stats.totals.winRate}%`
                  }
                  detail={
                    stats.totals.winRate === null
                      ? "No closed deals yet"
                      : `${stats.totals.wonDeals} won, ${stats.totals.lostDeals} lost`
                  }
                  color="#6ea8fe"
                  icon={ICONS.winRate}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Main content ---------- */}
      <div className="container-fluid px-4 dash-main">
        {isLoading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={retryFetch}
            >
              Try again
            </button>
          </div>
        )}

        {showData && (
          <>
            {/* Leads over time + lead status */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-8">
                <ChartCard
                  title="New leads"
                  subtitle="Leads added in the last 6 months"
                  accent="#0d6efd"
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart
                      data={stats.leadsByMonth}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="leadsFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#0d6efd"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#0d6efd"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e6eaf1"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(value) => [value, "Leads"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#0d6efd"
                        strokeWidth={2.5}
                        fill="url(#leadsFill)"
                        dot={{ r: 3, fill: "#0d6efd" }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="col-12 col-lg-4">
                <ChartCard
                  title="Lead status"
                  subtitle="Where your leads are right now"
                  accent="#0dcaf0"
                >
                  <DonutChart
                    data={stats.leadsByStatus}
                    colors={STATUS_COLORS}
                    centerLabel="leads"
                    emptyText="No leads yet."
                  />
                </ChartCard>
              </div>
            </div>

            {/* Deals by stage + activity mix */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-7">
                <ChartCard
                  title="Deal value by stage"
                  subtitle={`${stats.totals.deals} deals in total`}
                  accent="#198754"
                  action={
                    <Link to="/pipeline" className="dash-link">
                      Open pipeline
                    </Link>
                  }
                >
                  {stats.totals.deals === 0 ? (
                    <div className="dash-empty">
                      No deals yet. Add a deal from a lead's detail page.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={stats.dealsByStage}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e6eaf1"
                        />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(v) => compactCurrency.format(v)}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          cursor={{ fill: "rgba(20, 33, 61, 0.04)" }}
                          formatter={(value, name, item) => [
                            `${currency.format(value)} (${item.payload.count} deals)`,
                            "Value",
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={56}
                        >
                          {stats.dealsByStage.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={STAGE_COLORS[entry.name]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <div className="col-12 col-lg-5">
                <ChartCard
                  title="Activity mix"
                  subtitle="Calls, meetings, notes and follow-ups logged"
                  accent="#6f42c1"
                >
                  <DonutChart
                    data={stats.activitiesByType}
                    colors={ACTIVITY_COLORS}
                    centerLabel="activities"
                    emptyText="No activities logged yet."
                  />
                </ChartCard>
              </div>
            </div>

            {/* Admin only: team performance */}
            {isAdmin && (
              <div className="row g-4 mb-4">
                <div className="col-12">
                  <ChartCard
                    title="Team performance"
                    subtitle="Top sales users by leads assigned"
                    accent="#14213d"
                    action={
                      <Link to="/users" className="dash-link">
                        Team overview
                      </Link>
                    }
                  >
                    {stats.teamPerformance.length === 0 ? (
                      <div className="dash-empty">
                        No leads assigned to sales users yet.
                      </div>
                    ) : (
                      <>
                        <div className="dash-inline-legend">
                          <span>
                            <span
                              className="dash-dot"
                              style={{ background: "#0d6efd" }}
                            />
                            Leads
                          </span>
                          <span>
                            <span
                              className="dash-dot"
                              style={{ background: "#198754" }}
                            />
                            Qualified
                          </span>
                        </div>
                        <ResponsiveContainer
                          width="100%"
                          height={60 + stats.teamPerformance.length * 48}
                        >
                          <BarChart
                            data={stats.teamPerformance}
                            layout="vertical"
                            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="#e6eaf1"
                            />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#64748b", fontSize: 12 }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={120}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#1e293b", fontSize: 13 }}
                            />
                            <Tooltip
                              {...TOOLTIP_STYLE}
                              cursor={{ fill: "rgba(20, 33, 61, 0.04)" }}
                            />
                            <Bar
                              dataKey="leads"
                              name="Leads"
                              fill="#0d6efd"
                              radius={[0, 4, 4, 0]}
                              barSize={14}
                            />
                            <Bar
                              dataKey="qualified"
                              name="Qualified"
                              fill="#198754"
                              radius={[0, 4, 4, 0]}
                              barSize={14}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </ChartCard>
                </div>
              </div>
            )}

            {/* Recent leads + recent activity */}
            <div className="row g-4">
              <div className="col-12 col-lg-7">
                <ChartCard
                  title="Recent leads"
                  accent="#0dcaf0"
                  action={
                    <Link to="/leads" className="dash-link">
                      View all
                    </Link>
                  }
                >
                  {stats.recentLeads.length === 0 ? (
                    <div className="dash-empty">No leads yet.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0 dash-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th className="text-end">Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentLeads.map((lead) => (
                            <tr key={lead._id}>
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <span
                                    className="dash-avatar"
                                    aria-hidden="true"
                                  >
                                    {lead.name?.charAt(0).toUpperCase()}
                                  </span>
                                  <div>
                                    <Link
                                      to={`/leads/${lead._id}`}
                                      className="dash-lead-name"
                                    >
                                      {lead.name}
                                    </Link>
                                    <div className="small text-muted">
                                      {lead.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`badge ${STATUS_BADGE[lead.status]}`}
                                >
                                  {lead.status}
                                </span>
                              </td>
                              <td className="text-end text-muted small">
                                {timeAgo(lead.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ChartCard>
              </div>

              <div className="col-12 col-lg-5">
                <ChartCard title="Recent activity" accent="#fd7e14">
                  {stats.recentActivities.length === 0 ? (
                    <div className="dash-empty">No activities logged yet.</div>
                  ) : (
                    <ul className="dash-feed">
                      {stats.recentActivities.map((activity) => (
                        <li key={activity._id}>
                          <span
                            className="dash-feed-marker"
                            style={{
                              background: ACTIVITY_COLORS[activity.type],
                              boxShadow: `0 0 0 4px ${ACTIVITY_COLORS[activity.type]}26`,
                            }}
                          />
                          <div className="dash-feed-body">
                            <div className="dash-feed-top">
                              <span>
                                <strong>
                                  {ACTIVITY_LABEL[activity.type] ||
                                    activity.type}
                                </strong>
                                {activity.leadId && (
                                  <>
                                    {" with "}
                                    <Link to={`/leads/${activity.leadId._id}`}>
                                      {activity.leadId.name}
                                    </Link>
                                  </>
                                )}
                              </span>
                              <span className="dash-feed-time">
                                {timeAgo(activity.createdAt)}
                              </span>
                            </div>
                            <div className="dash-feed-notes">
                              {activity.notes}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "dash-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.dash-page {
  --ink: #14213d;
  --ink-soft: #1c2c4f;
  --ink-line: #2c3d63;
  --page-bg: #eef1f6;
  --text: #1e293b;
  --muted: #64748b;

  min-height: 100vh;
  background: var(--page-bg);
  padding-bottom: 48px;
}

.dash-hero,
.dash-main {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ---------- Navy header band ---------- */
.dash-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 32px 0 36px;
  color: #e2e8f0;
}

.dash-hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
}

.dash-hero-subtitle {
  color: #a9b6cc;
  margin: 6px 0 0;
  font-size: 0.95rem;
}

.dash-btn-ghost {
  color: #e2e8f0;
  border: 1px solid var(--ink-line);
  background: transparent;
  font-weight: 600;
}

.dash-btn-ghost:hover {
  color: #fff;
  background: var(--ink-soft);
  border-color: #3b4f7a;
}

.dash-btn-primary {
  font-weight: 600;
}

/* KPI tiles (on the navy band) */
.dash-kpi {
  background: var(--ink-soft);
  border: 1px solid var(--ink-line);
  border-radius: 14px;
  padding: 18px 20px;
  height: 100%;
}

.dash-kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dash-kpi-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #a9b6cc;
}

.dash-kpi-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.dash-kpi-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: #fff;
  margin: 8px 0 2px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.dash-kpi-detail {
  font-size: 0.85rem;
  color: #8a99b4;
}

/* ---------- Main content ---------- */
.dash-main {
  padding-top: 28px;
  color: var(--text);
}

.dash-card {
  background: #fff;
  border: 1px solid #e2e7ef;
  border-radius: 14px;
  padding: 20px 22px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 4px 16px rgba(20, 33, 61, 0.05);
}

.dash-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.dash-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.dash-card-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.dash-card-subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 4px 0 0 14px;
}

.dash-link {
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 6px;
  background: #eef4ff;
}

.dash-link:hover {
  background: #dfeaff;
}

.dash-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* Donut charts */
.dash-donut-chart {
  position: relative;
}

.dash-donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.dash-donut-total {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
}

.dash-donut-caption {
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 4px;
}

.dash-legend {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

.dash-legend li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid #eef1f5;
  font-size: 0.9rem;
}

.dash-legend-name {
  flex: 1;
  color: #334155;
}

.dash-legend-value {
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.dash-legend-pct {
  width: 44px;
  text-align: right;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.dash-inline-legend {
  display: flex;
  gap: 18px;
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 8px;
}

.dash-inline-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Empty states */
.dash-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
  color: var(--muted);
  font-size: 0.9rem;
  background: #f5f7fb;
  border: 1px dashed #d6dce6;
  border-radius: 10px;
  padding: 16px;
}

/* Recent leads table */
.dash-table thead th {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  background: #f5f7fb;
  border-bottom: none;
  padding-top: 10px;
  padding-bottom: 10px;
}

.dash-table thead th:first-child {
  border-radius: 8px 0 0 8px;
}

.dash-table thead th:last-child {
  border-radius: 0 8px 8px 0;
}

.dash-table td {
  padding-top: 12px;
  padding-bottom: 12px;
  border-color: #eef1f5;
}

.dash-table tbody tr:last-child td {
  border-bottom: none;
}

.dash-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.dash-lead-name {
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
}

.dash-lead-name:hover {
  color: #0d6efd;
  text-decoration: underline;
}

/* Activity feed */
.dash-feed {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dash-feed li {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid #eef1f5;
}

.dash-feed li:first-child {
  border-top: none;
  padding-top: 0;
}

.dash-feed-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}

.dash-feed-body {
  flex: 1;
  min-width: 0;
}

.dash-feed-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9rem;
}

.dash-feed-top a {
  text-decoration: none;
  font-weight: 700;
}

.dash-feed-time {
  color: var(--muted);
  font-size: 0.8rem;
  white-space: nowrap;
}

.dash-feed-notes {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

export default Dashboard;
