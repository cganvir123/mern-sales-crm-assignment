import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { formatMoney } from "../utils/format";

// Stage colors shared with the Dashboard and Lead Detail pages
const STAGE_META = {
  Prospect: { color: "#6c757d", tint: "#eceff3", text: "#495057" },
  Negotiation: { color: "#ffc107", tint: "#fff3cd", text: "#8a6100" },
  Won: { color: "#198754", tint: "#dcf1e5", text: "#146c43" },
  Lost: { color: "#dc3545", tint: "#fbe1e3", text: "#b02a37" },
};

const sumAmounts = (list) =>
  list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

const SalesPipeline = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ignore the response if the page unmounts before it arrives
    let ignore = false;

    const fetchDeals = async () => {
      try {
        const response = await api.get("/deals");
        if (!ignore) setDeals(response.data);
      } catch (error) {
        console.error("Error fetching pipeline deals:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchDeals();
    return () => {
      ignore = true;
    };
  }, []);

  // Group deals by the stages mandated in the PDF
  const groupedDeals = {
    Prospect: deals.filter((d) => d.stage === "Prospect"),
    Negotiation: deals.filter((d) => d.stage === "Negotiation"),
    Won: deals.filter((d) => d.stage === "Won"),
    Lost: deals.filter((d) => d.stage === "Lost"),
  };

  if (isLoading) {
    return (
      <div className="pl-page">
        <style>{styles}</style>
        <Navbar />
        <section className="pl-hero pl-hero-compact" />
        <div className="container text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Summary numbers for the header strip
  const openValue =
    sumAmounts(groupedDeals.Prospect) + sumAmounts(groupedDeals.Negotiation);
  const wonValue = sumAmounts(groupedDeals.Won);
  const closedCount = groupedDeals.Won.length + groupedDeals.Lost.length;
  const winRate = closedCount
    ? `${Math.round((groupedDeals.Won.length / closedCount) * 100)}%`
    : "—";

  return (
    <div className="pl-page">
      <style>{styles}</style>
      <Navbar />

      {/* ---------- Navy header band ---------- */}
      <section className="pl-hero">
        <div className="container-fluid px-4">
          <h3 className="pl-hero-title">Sales Pipeline</h3>
          <p className="pl-hero-subtitle">
            Every deal by stage. Open a deal to update it from its lead's page.
          </p>

          <div className="pl-summary">
            <div>
              <div className="pl-summary-value">{deals.length}</div>
              <div className="pl-summary-label">Total deals</div>
            </div>
            <div>
              <div className="pl-summary-value">{formatMoney(openValue)}</div>
              <div className="pl-summary-label">Open pipeline</div>
            </div>
            <div>
              <div className="pl-summary-value">{formatMoney(wonValue)}</div>
              <div className="pl-summary-label">Revenue won</div>
            </div>
            <div>
              <div className="pl-summary-value">{winRate}</div>
              <div className="pl-summary-label">Win rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Kanban board ---------- */}
      <div className="container-fluid px-4 pl-main">
        <div className="row g-4">
          {/* Render a column for each stage */}
          {Object.entries(groupedDeals).map(([stage, stageDeals]) => {
            const meta = STAGE_META[stage];
            return (
              <div key={stage} className="col-12 col-md-6 col-xl-3">
                <div
                  className="pl-column h-100"
                  style={{ "--stage-color": meta.color }}
                >
                  <div className="pl-column-head">
                    <div className="pl-column-title">
                      <span
                        className="pl-stage-dot"
                        style={{ background: meta.color }}
                      />
                      {stage}
                      <span
                        className="pl-count"
                        style={{ background: meta.tint, color: meta.text }}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="pl-column-total">
                      {formatMoney(sumAmounts(stageDeals))}
                    </div>
                  </div>

                  <div className="pl-column-body">
                    {stageDeals.length === 0 ? (
                      <div className="pl-empty">No deals in this stage.</div>
                    ) : (
                      stageDeals.map((deal) => (
                        <Link
                          key={deal._id}
                          to={`/leads/${deal.leadId._id || deal.leadId}`}
                          className="pl-deal"
                        >
                          <div className="pl-deal-title">{deal.title}</div>
                          <div className="pl-deal-amount">
                            {formatMoney(deal.amount)}
                          </div>

                          {/* Safely check if leadId is populated or just an ID */}
                          {deal.leadId && deal.leadId.name && (
                            <div className="pl-deal-lead">
                              <span className="pl-avatar" aria-hidden="true">
                                {deal.leadId.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="pl-deal-lead-name">
                                {deal.leadId.name}
                              </span>
                            </div>
                          )}

                          <span className="pl-deal-link">
                            View lead
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "pl-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.pl-page {
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

.pl-hero,
.pl-main {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ---------- Navy header band ---------- */
.pl-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 32px 0 76px;
  color: #e2e8f0;
}

.pl-hero-compact {
  padding: 0;
  height: 120px;
}

.pl-hero-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
}

.pl-hero-subtitle {
  color: #a9b6cc;
  margin: 6px 0 0;
  font-size: 0.95rem;
}

.pl-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 24px;
  background: var(--ink-line);
  border: 1px solid var(--ink-line);
  border-radius: 12px;
  overflow: hidden;
}

.pl-summary > div {
  background: var(--ink-soft);
  padding: 14px 18px;
}

.pl-summary-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.pl-summary-label {
  font-size: 0.8rem;
  color: #8a99b4;
  margin-top: 2px;
}

/* ---------- Board (overlaps the navy band) ---------- */
.pl-main {
  margin-top: -48px;
  color: var(--text);
}

.pl-column {
  background: #fff;
  border: 1px solid var(--line);
  border-top: 4px solid var(--stage-color);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 8px 24px rgba(20, 33, 61, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 420px;
}

.pl-column-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid #eef1f5;
}

.pl-column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1rem;
  color: var(--text);
}

.pl-stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.pl-count {
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.pl-column-total {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.pl-column-body {
  flex: 1;
  padding: 14px;
  background: #f7f9fc;
  border-radius: 0 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Deal cards */
.pl-deal {
  display: block;
  background: #fff;
  border: 1px solid #e6eaf1;
  border-left: 4px solid var(--stage-color);
  border-radius: 10px;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.pl-deal:hover {
  box-shadow: 0 6px 18px rgba(20, 33, 61, 0.1);
  transform: translateY(-1px);
  color: inherit;
}

.pl-deal:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.pl-deal-title {
  font-weight: 700;
  color: var(--text);
  line-height: 1.35;
}

.pl-deal-amount {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.pl-deal-lead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eef1f5;
}

.pl-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.pl-deal-lead-name {
  font-size: 0.875rem;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-deal-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
}

.pl-deal:hover .pl-deal-link {
  text-decoration: underline;
}

/* Empty column */
.pl-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  color: var(--muted);
  font-size: 0.9rem;
  border: 1.5px dashed #d6dce6;
  border-radius: 10px;
  text-align: center;
  padding: 16px;
}

/* ---------- Responsive ---------- */
@media (max-width: 767px) {
  .pl-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pl-column {
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pl-page * {
    transition: none !important;
  }
  .pl-deal:hover {
    transform: none;
  }
}
`;

export default SalesPipeline;
