import { useState, useEffect, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import api, { getErrorMessage } from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import { formatMoney, formatCloseDate, isCloseDatePast } from "../utils/format";

// Stage colors shared with the Dashboard and Lead Detail pages
const STAGE_META = {
  Prospect: { color: "#6c757d", tint: "#eceff3", text: "#495057" },
  Negotiation: { color: "#ffc107", tint: "#fff3cd", text: "#8a6100" },
  Won: { color: "#198754", tint: "#dcf1e5", text: "#146c43" },
  Lost: { color: "#dc3545", tint: "#fbe1e3", text: "#b02a37" },
};
const STAGES = Object.keys(STAGE_META);

const sumAmounts = (list) =>
  list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

// ---------- Deal card ----------

// What a card shows. Used both in the column and in the floating drag preview.
const DealCardContent = ({ deal }) => {
  const closePast = isCloseDatePast(deal);
  return (
    <>
      <div className="pl-deal-title">{deal.title}</div>
      <div className="pl-deal-amount">{formatMoney(deal.amount)}</div>

      {deal.expectedCloseDate && (
        <div className={`pl-deal-close ${closePast ? "is-past" : ""}`}>
          {closePast ? "Close date passed · " : "Closes "}
          {formatCloseDate(deal.expectedCloseDate)}
        </div>
      )}

      {deal.leadId?.name && (
        <div className="pl-deal-lead">
          <span className="pl-avatar" aria-hidden="true">
            {deal.leadId.name.charAt(0).toUpperCase()}
          </span>
          <span className="pl-deal-lead-name">{deal.leadId.name}</span>
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
    </>
  );
};

// A card that can be dragged (Sales Users) and clicked to open the lead
const DraggableDeal = ({ deal, canDrag, blockClickAfterDrag }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal._id,
    disabled: !canDrag,
  });

  return (
    <Link
      ref={setNodeRef}
      to={`/leads/${deal.leadId?._id || deal.leadId}`}
      className={`pl-deal ${canDrag ? "is-draggable" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      onClick={blockClickAfterDrag}
      {...listeners}
      // Keep it announced as a link; only add the drag hints
      aria-roledescription={canDrag ? "draggable deal" : undefined}
      aria-describedby={canDrag ? attributes["aria-describedby"] : undefined}
    >
      <DealCardContent deal={deal} />
    </Link>
  );
};

// ---------- Stage column ----------

const StageColumn = ({ stage, deals, canDrag, blockClickAfterDrag }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];

  return (
    <div
      ref={setNodeRef}
      className={`pl-column h-100 ${isOver ? "is-over" : ""}`}
      style={{ "--stage-color": meta.color, "--stage-tint": meta.tint }}
    >
      <div className="pl-column-head">
        <div className="pl-column-title">
          <span className="pl-stage-dot" style={{ background: meta.color }} />
          {stage}
          <span
            className="pl-count"
            style={{ background: meta.tint, color: meta.text }}
          >
            {deals.length}
          </span>
        </div>
        <div className="pl-column-total">{formatMoney(sumAmounts(deals))}</div>
      </div>

      <div className="pl-column-body">
        {deals.length === 0 ? (
          <div className="pl-empty">
            {canDrag ? "Drop a deal here." : "No deals in this stage."}
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDeal
              key={deal._id}
              deal={deal}
              canDrag={canDrag}
              blockClickAfterDrag={blockClickAfterDrag}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---------- Page ----------

const SalesPipeline = () => {
  const { user } = useContext(AuthContext);
  // Same rule as the lead page: only Sales Users change deal stages
  const canDrag = user?.role === "Sales User";

  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null); // deal being dragged

  // Toast notification
  const [toast, setToast] = useState({ message: "", type: "" });
  const toastTimer = useRef(null);
  const showToast = (message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(
      () => setToast({ message: "", type: "" }),
      3000,
    );
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // A drag ends with a mouseup, which can also fire a click on the card.
  // This flag stops that click from opening the lead.
  const justDragged = useRef(false);
  const blockClickAfterDrag = (e) => {
    if (justDragged.current) e.preventDefault();
  };

  // Mouse: drag after moving 8px, so a normal click still opens the lead.
  // Touch: press and hold for 250ms, so swiping still scrolls the page.
  // Keyboard: focus a card, Space to pick up, arrow keys to move, Space to drop.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space"],
      },
    }),
  );

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

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    justDragged.current = true;
    setTimeout(() => {
      justDragged.current = false;
    }, 0);

    const deal = deals.find((d) => d._id === active.id);
    const newStage = over?.id;
    if (!deal || !newStage || deal.stage === newStage) return;

    const oldStage = deal.stage;
    const setStage = (stage) =>
      setDeals((current) =>
        current.map((d) => (d._id === deal._id ? { ...d, stage } : d)),
      );

    // Move the card right away, then save. Undo the move if saving fails.
    setStage(newStage);
    try {
      await api.patch(`/deals/${deal._id}`, { stage: newStage });
      showToast(`"${deal.title}" moved to ${newStage}`);
    } catch (error) {
      setStage(oldStage);
      showToast(getErrorMessage(error, "Could not move the deal"), "danger");
    }
  };

  // Group deals by stage
  const groupedDeals = Object.fromEntries(
    STAGES.map((stage) => [stage, deals.filter((d) => d.stage === stage)]),
  );
  const activeDeal = deals.find((d) => d._id === activeId);

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

      {/* Toast */}
      <div
        className="pl-toast-wrap"
        style={{ opacity: toast.message ? 1 : 0 }}
        role="status"
        aria-live="polite"
      >
        {toast.message && (
          <div
            className={`pl-toast ${toast.type === "danger" ? "is-error" : "is-success"}`}
          >
            {toast.message}
          </div>
        )}
      </div>

      {/* ---------- Navy header band ---------- */}
      <section className="pl-hero">
        <div className="container-fluid px-4">
          <h3 className="pl-hero-title">Sales Pipeline</h3>
          <p className="pl-hero-subtitle">
            {canDrag
              ? "Drag a deal to another column to change its stage. Click a deal to open its lead."
              : "Every deal by stage. Click a deal to open its lead."}
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
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "To move a deal, press Space. Use the arrow keys to move it to another stage, then press Space to drop it or Escape to cancel.",
            },
          }}
        >
          <div className="row g-4">
            {STAGES.map((stage) => (
              <div key={stage} className="col-12 col-md-6 col-xl-3">
                <StageColumn
                  stage={stage}
                  deals={groupedDeals[stage]}
                  canDrag={canDrag}
                  blockClickAfterDrag={blockClickAfterDrag}
                />
              </div>
            ))}
          </div>

          {/* The card that follows the pointer while dragging */}
          <DragOverlay dropAnimation={null}>
            {activeDeal ? (
              <div
                className="pl-deal is-overlay"
                style={{ "--stage-color": STAGE_META[activeDeal.stage].color }}
              >
                <DealCardContent deal={activeDeal} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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

/* ---------- Drag and drop ---------- */
.pl-deal.is-draggable {
  cursor: grab;
  touch-action: manipulation;
  user-select: none;
}

/* The card's original spot while it is being dragged */
.pl-deal.is-dragging {
  opacity: 0.35;
  border-style: dashed;
  box-shadow: none;
  transform: none;
}

/* The floating copy that follows the pointer */
.pl-deal.is-overlay {
  cursor: grabbing;
  box-shadow: 0 16px 40px rgba(20, 33, 61, 0.25);
  transform: rotate(2deg);
}

/* Column being hovered with a deal */
.pl-column.is-over {
  box-shadow: 0 0 0 3px var(--stage-color), 0 8px 24px rgba(20, 33, 61, 0.08);
}

.pl-column.is-over .pl-column-body {
  background: var(--stage-tint);
}

.pl-deal-close {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.pl-deal-close.is-past {
  color: #b02a37;
}

/* Toast */
.pl-toast-wrap {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1050;
  transition: opacity 0.3s ease-in-out;
  pointer-events: none;
}

.pl-toast {
  background: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  font-family: "Manrope", system-ui, sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  box-shadow: 0 10px 30px rgba(20, 33, 61, 0.2);
  border-left: 4px solid #198754;
  max-width: 380px;
}

.pl-toast.is-error {
  border-left-color: #dc3545;
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
