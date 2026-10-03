import { useState, useEffect, useContext, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import api from "../services/api";
import {
  formatMoney,
  formatDateTime,
  formatCloseDate,
  isCloseDatePast,
  getDueState,
} from "../utils/format";
import { telLink, whatsappLink, mailtoLink } from "../utils/contact";
import { LEAD_SOURCES, LEAD_STATUSES } from "../utils/constants";
import Navbar from "../components/Navbar";
import DealFormModal from "../components/DealFormModal";
import ActivityFormModal from "../components/ActivityFormModal";
import { AuthContext } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmDialog";

// Colors shared with the Dashboard
const ACTIVITY_COLORS = {
  Calls: "#0d6efd",
  Meetings: "#6f42c1",
  Notes: "#20c997",
  "Follow-ups": "#fd7e14",
};
const ACTIVITY_LABEL = {
  Calls: "Call",
  Meetings: "Meeting",
  Notes: "Note",
  "Follow-ups": "Follow-up",
};

// Due-date chip text for follow-ups
const DUE_LABEL = {
  done: () => "Done",
  overdue: (task) => `Overdue · ${formatDateTime(task.dueDate)}`,
  today: (task) => `Due today · ${formatDateTime(task.dueDate)}`,
  upcoming: (task) => `Due ${formatDateTime(task.dueDate)}`,
};

const EMPTY_DEAL = {
  title: "",
  amount: "",
  stage: "Prospect",
  expectedCloseDate: "",
};
const EMPTY_ACTIVITY = { type: "Calls", notes: "", dueDate: "" };

// Small inline icons
const iconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};
const EditIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const PhoneIcon = () => (
  <svg {...iconProps}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);
const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Pull user from context for role checks
  const confirm = useConfirm(); // Themed confirmation dialog

  const [lead, setLead] = useState(null);
  const [deals, setDeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toast notification
  const [notification, setNotification] = useState({ message: "", type: "" });

  const [newDeal, setNewDeal] = useState(EMPTY_DEAL);
  const [newActivity, setNewActivity] = useState(EMPTY_ACTIVITY);

  // Edit-lead modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Deal / activity currently open in an edit modal (null = closed)
  const [editingDeal, setEditingDeal] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);

  // Admin only: sales users for the "Assigned to" dropdown
  const isAdmin = user?.role === "Admin";
  const [salesUsers, setSalesUsers] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    api
      .get("/users/sales-users/options")
      .then((res) => {
        if (!ignore) setSalesUsers(res.data);
      })
      .catch((err) => console.error("Could not load sales users", err));
    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  // --- Helper function to show notifications ---
  // The ref remembers the pending hide-timer so a new toast restarts the
  // 3-second countdown instead of being hidden early by the previous one.
  const toastTimer = useRef(null);

  const showToast = (message, type = "success") => {
    clearTimeout(toastTimer.current);
    setNotification({ message, type });
    toastTimer.current = setTimeout(
      () => setNotification({ message: "", type: "" }),
      3000,
    );
  };

  // Clear any pending toast timer when leaving the page
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Pulls the most useful message out of an API error
  const apiError = (error, fallback) =>
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.msg ||
    fallback;

  useEffect(() => {
    // Ignore responses that arrive after the user has moved to another lead
    let ignore = false;

    const fetchLeadData = async () => {
      try {
        const [leadRes, activitiesRes, dealsRes] = await Promise.all([
          api.get(`/leads/${id}`),
          api.get(`/activities/lead/${id}`),
          // Only this lead's deals, instead of downloading every deal
          api.get("/deals", { params: { leadId: id } }),
        ]);
        if (ignore) return;

        setLead(leadRes.data);
        setActivities(activitiesRes.data);
        setDeals(dealsRes.data);
      } catch (error) {
        if (ignore) return;
        console.error("Error fetching lead details:", error);
        setLead(null); // Shows the "Lead not found" card
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchLeadData();
    return () => {
      ignore = true;
    };
  }, [id]);

  // --- Lead Actions ---
  const handleDeleteLead = async () => {
    // Tell the user exactly what will be removed along with the lead
    const extras = [];
    if (deals.length)
      extras.push(`${deals.length} deal${deals.length > 1 ? "s" : ""}`);
    if (activities.length)
      extras.push(
        `${activities.length} activit${activities.length > 1 ? "ies" : "y"}`,
      );

    const ok = await confirm({
      title: `Delete ${lead.name}?`,
      message: extras.length
        ? `This also deletes its ${extras.join(" and ")}. This cannot be undone.`
        : "This cannot be undone.",
      confirmText: "Delete lead",
    });
    if (!ok) return;

    try {
      await api.delete(`/leads/${id}`);
      navigate("/leads"); // Route back to the leads list after deletion
    } catch (error) {
      showToast(apiError(error, "Failed to delete lead"), "danger");
    }
  };

  const handleUpdateLeadStatus = async (newStatus) => {
    try {
      // The backend accepts partial updates, so only the status is sent
      const response = await api.patch(`/leads/${id}`, { status: newStatus });
      setLead(response.data);
      showToast("Lead status updated successfully!", "success");
    } catch (error) {
      showToast(
        `Failed to update lead status: ${apiError(error, "Bad request")}`,
        "danger",
      );
    }
  };

  const openEdit = () => {
    setEditForm({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      source: lead.source || "",
      notes: lead.notes || "",
    });
    setShowEdit(true);
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Empty optional fields are sent as "", which clears them on the server
      const response = await api.patch(`/leads/${id}`, editForm);
      setLead(response.data);
      setShowEdit(false);
      showToast("Lead details updated!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to update lead"), "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReassign = async (assignedTo) => {
    try {
      const response = await api.patch(`/leads/${id}`, { assignedTo });
      setLead(response.data);
      showToast(
        `Lead reassigned to ${response.data.assignedTo?.name}`,
        "success",
      );
    } catch (error) {
      showToast(apiError(error, "Failed to reassign lead"), "danger");
    }
  };

  // --- Deal Actions ---
  const replaceDeal = (updated) =>
    setDeals((current) =>
      current.map((d) => (d._id === updated._id ? updated : d)),
    );

  const handleAddDeal = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newDeal, leadId: id };
      if (!payload.expectedCloseDate) delete payload.expectedCloseDate;

      const response = await api.post("/deals", payload);
      setDeals((current) => [...current, response.data]);
      setNewDeal(EMPTY_DEAL);
      showToast("Deal added successfully!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to add deal"), "danger");
    }
  };

  const handleUpdateDealStage = async (dealId, newStage) => {
    try {
      const response = await api.patch(`/deals/${dealId}`, { stage: newStage });
      replaceDeal(response.data);
      showToast("Deal stage updated!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to update deal stage"), "danger");
    }
  };

  const handleSaveDeal = async (updates) => {
    try {
      const response = await api.patch(`/deals/${editingDeal._id}`, updates);
      replaceDeal(response.data);
      setEditingDeal(null);
      showToast("Deal updated!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to update deal"), "danger");
    }
  };

  const handleDeleteDeal = async (dealId) => {
    const deal = deals.find((d) => d._id === dealId);
    const ok = await confirm({
      title: `Delete "${deal?.title}"?`,
      message: `This ${formatMoney(deal?.amount)} deal will be permanently removed.`,
      confirmText: "Delete deal",
    });
    if (!ok) return;

    try {
      await api.delete(`/deals/${dealId}`);
      setDeals((current) => current.filter((d) => d._id !== dealId));
      showToast("Deal deleted successfully!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to delete deal"), "danger");
    }
  };

  // --- Activity Actions ---
  const replaceActivity = (updated) =>
    setActivities((current) =>
      current.map((a) => (a._id === updated._id ? updated : a)),
    );

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: newActivity.type,
        notes: newActivity.notes,
        leadId: id,
      };
      if (newActivity.type === "Follow-ups") {
        // datetime-local is in the user's timezone; send a full ISO date
        payload.dueDate = new Date(newActivity.dueDate).toISOString();
      }

      const response = await api.post("/activities", payload);
      setActivities((current) => [response.data, ...current]);
      setNewActivity(EMPTY_ACTIVITY);
      showToast(
        payload.dueDate
          ? "Follow-up scheduled!"
          : "Activity logged successfully!",
        "success",
      );
    } catch (error) {
      showToast(apiError(error, "Failed to log activity"), "danger");
    }
  };

  const handleToggleTask = async (activity) => {
    try {
      const response = await api.patch(`/activities/${activity._id}`, {
        completed: !activity.completed,
      });
      replaceActivity(response.data);
      showToast(
        response.data.completed
          ? "Follow-up marked as done"
          : "Follow-up reopened",
        "success",
      );
    } catch (error) {
      showToast(apiError(error, "Failed to update follow-up"), "danger");
    }
  };

  const handleSaveActivity = async (updates) => {
    try {
      const response = await api.patch(
        `/activities/${editingActivity._id}`,
        updates,
      );
      replaceActivity(response.data);
      setEditingActivity(null);
      showToast("Activity updated!", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to update activity"), "danger");
    }
  };

  const handleDeleteActivity = async (activity) => {
    const label = (ACTIVITY_LABEL[activity.type] || "activity").toLowerCase();
    const ok = await confirm({
      title: `Delete this ${label}?`,
      message: "It will be removed from the activity history.",
      confirmText: "Delete",
    });
    if (!ok) return;

    try {
      await api.delete(`/activities/${activity._id}`);
      setActivities((current) => current.filter((a) => a._id !== activity._id));
      showToast("Activity deleted", "success");
    } catch (error) {
      showToast(apiError(error, "Failed to delete activity"), "danger");
    }
  };

  if (isLoading)
    return (
      <div className="ld-page">
        <style>{styles}</style>
        <Navbar />
        <section className="ld-hero ld-hero-compact" />
        <div className="container text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );

  if (!lead)
    return (
      <div className="ld-page">
        <style>{styles}</style>
        <Navbar />
        <section className="ld-hero ld-hero-compact" />
        <div className="container py-5">
          <div className="ld-card ld-notfound">
            <h3>Lead not found</h3>
            <p>
              It may have been deleted, or it isn't assigned to your account.
            </p>
            <Link to="/leads" className="btn btn-primary mt-2">
              Back to leads
            </Link>
          </div>
        </div>
      </div>
    );

  // Summary numbers for the header strip (calculated from data already loaded)
  const openValue = deals
    .filter((d) => d.stage === "Prospect" || d.stage === "Negotiation")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const wonValue = deals
    .filter((d) => d.stage === "Won")
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const openTasks = activities.filter(
    (a) => a.type === "Follow-ups" && !a.completed,
  );
  const overdueTasks = openTasks.filter((a) => getDueState(a) === "overdue");

  const isSalesUser = user?.role === "Sales User";
  const whatsapp = lead.phone ? whatsappLink(lead.phone) : null;

  return (
    <div className="ld-page">
      <style>{styles}</style>
      <Navbar />

      {/* --- Floating Notification Toast --- */}
      <div
        className="ld-toast-wrap"
        style={{
          opacity: notification.message ? 1 : 0,
          pointerEvents: notification.message ? "auto" : "none",
        }}
      >
        {notification.message && (
          <div
            className={`ld-toast ${
              notification.type === "danger" ? "is-error" : "is-success"
            }`}
            role="alert"
          >
            <span className="ld-toast-icon" aria-hidden="true">
              {notification.type === "danger" ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            {notification.message}
          </div>
        )}
      </div>

      {/* ---------- Navy header band ---------- */}
      <section className="ld-hero">
        <div className="container-fluid px-4">
          <Link to="/leads" className="ld-back">
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

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-4 mt-3">
            <div className="d-flex align-items-start gap-3">
              <span className="ld-avatar" aria-hidden="true">
                {lead.name?.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="ld-title">{lead.name}</h2>
                {lead.company && (
                  <div className="ld-company">{lead.company}</div>
                )}
                <div className="ld-meta">
                  <span>{lead.email}</span>
                  {lead.phone && <span>{lead.phone}</span>}
                  {lead.source && (
                    <span className="ld-source">Source: {lead.source}</span>
                  )}
                  {lead.assignedTo?.name && (
                    <span>Assigned to {lead.assignedTo.name}</span>
                  )}
                </div>

                {/* Quick actions: open the phone dialer, WhatsApp or the mail app */}
                <div className="ld-contact">
                  {lead.phone && (
                    <a href={telLink(lead.phone)} className="ld-contact-btn">
                      <PhoneIcon /> Call
                    </a>
                  )}
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ld-contact-btn is-whatsapp"
                    >
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  )}
                  <a href={mailtoLink(lead.email)} className="ld-contact-btn">
                    <MailIcon /> Email
                  </a>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              {/* Admin only: move the lead to another sales user */}
              {isAdmin && (
                <>
                  <label className="ld-status-label" htmlFor="ld-assignee">
                    Owner
                  </label>
                  <select
                    id="ld-assignee"
                    className="ld-status-select"
                    value={lead.assignedTo?._id || ""}
                    onChange={(e) => handleReassign(e.target.value)}
                  >
                    {salesUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label className="ld-status-label" htmlFor="ld-status">
                Status
              </label>
              <select
                id="ld-status"
                className="ld-status-select"
                value={lead.status}
                onChange={(e) => handleUpdateLeadStatus(e.target.value)}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="ld-btn-edit" onClick={openEdit}>
                Edit
              </button>
              <button className="ld-btn-delete" onClick={handleDeleteLead}>
                Delete lead
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="ld-summary">
            <div>
              <div className="ld-summary-value">{deals.length}</div>
              <div className="ld-summary-label">Deals</div>
            </div>
            <div>
              <div className="ld-summary-value">{formatMoney(openValue)}</div>
              <div className="ld-summary-label">Open pipeline</div>
            </div>
            <div>
              <div className="ld-summary-value">{formatMoney(wonValue)}</div>
              <div className="ld-summary-label">Revenue won</div>
            </div>
            <div>
              <div className="ld-summary-value">
                {openTasks.length}
                {overdueTasks.length > 0 && (
                  <span className="ld-summary-alert">
                    {overdueTasks.length} overdue
                  </span>
                )}
              </div>
              <div className="ld-summary-label">Open follow-ups</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Main content ---------- */}
      <div className="container-fluid px-4 ld-main">
        {/* Notes about the lead (only when there are some) */}
        {lead.notes && (
          <div className="ld-card ld-notes mb-4">
            <div className="ld-card-head mb-2">
              <h5 className="ld-card-title">
                <span
                  className="ld-card-accent"
                  style={{ background: "#0dcaf0" }}
                />
                Notes
              </h5>
              <button className="ld-link-btn" onClick={openEdit}>
                Edit
              </button>
            </div>
            <p className="ld-notes-text">{lead.notes}</p>
          </div>
        )}

        <div className="row g-4">
          {/* Left Column: Deals */}
          <div className="col-lg-6">
            <div className="ld-card h-100">
              <div className="ld-card-head">
                <h5 className="ld-card-title">
                  <span
                    className="ld-card-accent"
                    style={{ background: "#198754" }}
                  />
                  Deals
                </h5>
                <span className="ld-count">{deals.length}</span>
              </div>

              {/* Hide Add Deal form from Admins */}
              {isSalesUser && (
                <form onSubmit={handleAddDeal} className="ld-form">
                  <div className="ld-form-title">Add a deal</div>
                  <div className="row g-2 mb-2">
                    <div className="col-sm-7">
                      <input
                        type="text"
                        className="ld-input"
                        placeholder="Deal title"
                        aria-label="Deal title"
                        value={newDeal.title}
                        onChange={(e) =>
                          setNewDeal({ ...newDeal, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-sm-5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="ld-input"
                        placeholder="Amount (₹)"
                        aria-label="Amount"
                        value={newDeal.amount}
                        onChange={(e) =>
                          setNewDeal({ ...newDeal, amount: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-sm-6">
                      <select
                        className="ld-input"
                        aria-label="Deal stage"
                        value={newDeal.stage}
                        onChange={(e) =>
                          setNewDeal({ ...newDeal, stage: e.target.value })
                        }
                      >
                        <option value="Prospect">Prospect</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="ld-prefixed">
                        <span>Closes</span>
                        <input
                          type="date"
                          aria-label="Expected close date (optional)"
                          value={newDeal.expectedCloseDate}
                          onChange={(e) =>
                            setNewDeal({
                              ...newDeal,
                              expectedCloseDate: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="ld-btn-submit ld-btn-green">
                    Add deal
                  </button>
                </form>
              )}

              {deals.length === 0 ? (
                <div className="ld-empty">No deals for this lead yet.</div>
              ) : (
                <ul className="ld-deals">
                  {deals.map((deal) => {
                    const closePast = isCloseDatePast(deal);
                    return (
                      <li
                        key={deal._id}
                        className={`ld-deal ld-deal-${deal.stage.toLowerCase()}`}
                      >
                        <div className="ld-deal-info">
                          <div className="ld-deal-title">{deal.title}</div>
                          <div className="ld-deal-amount">
                            {formatMoney(deal.amount)}
                          </div>
                          {deal.expectedCloseDate && (
                            <div
                              className={`ld-deal-close ${closePast ? "is-past" : ""}`}
                            >
                              {closePast ? "Close date passed · " : "Closes "}
                              {formatCloseDate(deal.expectedCloseDate)}
                            </div>
                          )}
                        </div>
                        <div className="ld-deal-actions">
                          <select
                            className={`ld-stage ld-stage-${deal.stage.toLowerCase()}`}
                            aria-label={`Stage for ${deal.title}`}
                            value={deal.stage}
                            onChange={(e) =>
                              handleUpdateDealStage(deal._id, e.target.value)
                            }
                            disabled={!isSalesUser} // Disable select for Admins
                          >
                            <option value="Prospect">Prospect</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Won">Won</option>
                            <option value="Lost">Lost</option>
                          </select>
                          {/* Edit / delete are hidden from Admins */}
                          {isSalesUser && (
                            <>
                              <button
                                className="ld-icon-btn is-edit"
                                onClick={() => setEditingDeal(deal)}
                                aria-label={`Edit ${deal.title}`}
                                title="Edit deal"
                              >
                                <EditIcon />
                              </button>
                              <button
                                className="ld-icon-btn"
                                onClick={() => handleDeleteDeal(deal._id)}
                                aria-label={`Delete ${deal.title}`}
                                title="Delete deal"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column: Activity */}
          <div className="col-lg-6">
            <div className="ld-card h-100">
              <div className="ld-card-head">
                <h5 className="ld-card-title">
                  <span
                    className="ld-card-accent"
                    style={{ background: "#6f42c1" }}
                  />
                  Activity history
                </h5>
                <span className="ld-count">{activities.length}</span>
              </div>

              {/* Hide Add Activity form from Admins */}
              {isSalesUser && (
                <form onSubmit={handleAddActivity} className="ld-form">
                  <div className="ld-form-title">Log an activity</div>
                  <div className="row g-2 mb-2">
                    <div
                      className={
                        newActivity.type === "Follow-ups"
                          ? "col-sm-5"
                          : "col-12"
                      }
                    >
                      <select
                        className="ld-input"
                        aria-label="Activity type"
                        value={newActivity.type}
                        onChange={(e) =>
                          setNewActivity({
                            ...newActivity,
                            type: e.target.value,
                          })
                        }
                      >
                        <option value="Calls">Call</option>
                        <option value="Meetings">Meeting</option>
                        <option value="Notes">Note</option>
                        <option value="Follow-ups">Follow-up</option>
                      </select>
                    </div>
                    {/* Follow-ups are tasks, so they need a due date */}
                    {newActivity.type === "Follow-ups" && (
                      <div className="col-sm-7">
                        <label className="ld-prefixed">
                          <span>Due</span>
                          <input
                            type="datetime-local"
                            aria-label="Follow-up due date and time"
                            value={newActivity.dueDate}
                            onChange={(e) =>
                              setNewActivity({
                                ...newActivity,
                                dueDate: e.target.value,
                              })
                            }
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="mb-2">
                    <textarea
                      className="ld-input ld-textarea"
                      rows="2"
                      maxLength={2000}
                      placeholder={
                        newActivity.type === "Follow-ups"
                          ? "What needs to happen? e.g. Send revised quote."
                          : "What happened? e.g. Discussed pricing, sending proposal Friday."
                      }
                      aria-label="Activity details"
                      value={newActivity.notes}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          notes: e.target.value,
                        })
                      }
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="ld-btn-submit">
                    {newActivity.type === "Follow-ups"
                      ? "Schedule follow-up"
                      : "Log activity"}
                  </button>
                </form>
              )}

              {activities.length === 0 ? (
                <div className="ld-empty">No activities logged yet.</div>
              ) : (
                <ul className="ld-timeline">
                  {activities.map((activity) => {
                    const color = ACTIVITY_COLORS[activity.type] || "#64748b";
                    const isTask = activity.type === "Follow-ups";
                    const dueState = isTask ? getDueState(activity) : null;

                    return (
                      <li
                        key={activity._id}
                        className={activity.completed ? "is-done" : ""}
                      >
                        <span
                          className="ld-timeline-marker"
                          style={{
                            background: color,
                            boxShadow: `0 0 0 4px ${color}26`,
                          }}
                        />
                        <div className="ld-timeline-body">
                          <div className="ld-timeline-top">
                            <span
                              className="ld-timeline-type"
                              style={{ color }}
                            >
                              {ACTIVITY_LABEL[activity.type] || activity.type}
                            </span>
                            <span className="ld-timeline-date">
                              {formatDateTime(activity.createdAt)}
                            </span>
                          </div>

                          {isTask && activity.dueDate && (
                            <span className={`ld-due ld-due-${dueState}`}>
                              {DUE_LABEL[dueState](activity)}
                            </span>
                          )}

                          <p className="ld-timeline-notes">{activity.notes}</p>

                          <div className="ld-timeline-foot">
                            <span className="ld-timeline-author">
                              {activity.createdBy?.name &&
                                `by ${activity.createdBy.name}`}
                            </span>

                            {isSalesUser && (
                              <div className="ld-timeline-actions">
                                {isTask && activity.dueDate && (
                                  <button
                                    className={`ld-task-btn ${activity.completed ? "is-done" : ""}`}
                                    onClick={() => handleToggleTask(activity)}
                                  >
                                    {activity.completed
                                      ? "Reopen"
                                      : "✓ Mark done"}
                                  </button>
                                )}
                                <button
                                  className="ld-icon-btn is-edit"
                                  onClick={() => setEditingActivity(activity)}
                                  aria-label="Edit activity"
                                  title="Edit"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  className="ld-icon-btn"
                                  onClick={() => handleDeleteActivity(activity)}
                                  aria-label="Delete activity"
                                  title="Delete"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Edit lead modal ---------- */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <form onSubmit={handleSaveLead}>
          <Modal.Header closeButton>
            <Modal.Title>Edit lead</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-sm-6">
                <label htmlFor="edit-name" className="form-label">
                  Name
                </label>
                <input
                  id="edit-name"
                  className="form-control"
                  value={editForm.name}
                  maxLength={150}
                  required
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="col-sm-6">
                <label htmlFor="edit-company" className="form-label">
                  Company
                </label>
                <input
                  id="edit-company"
                  className="form-control"
                  value={editForm.company}
                  maxLength={150}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company: e.target.value })
                  }
                />
              </div>
              <div className="col-sm-6">
                <label htmlFor="edit-email" className="form-label">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  required
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
              <div className="col-sm-6">
                <label htmlFor="edit-phone" className="form-label">
                  Phone
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  className="form-control"
                  value={editForm.phone}
                  maxLength={30}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="col-12">
                <label htmlFor="edit-source" className="form-label">
                  Source
                </label>
                <select
                  id="edit-source"
                  className="form-select"
                  value={editForm.source}
                  onChange={(e) =>
                    setEditForm({ ...editForm, source: e.target.value })
                  }
                >
                  <option value="">Not set</option>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label htmlFor="edit-notes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="edit-notes"
                  className="form-control"
                  rows="4"
                  maxLength={2000}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowEdit(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ---------- Edit deal / activity modals ---------- */}
      <DealFormModal
        deal={editingDeal}
        onSave={handleSaveDeal}
        onClose={() => setEditingDeal(null)}
      />
      <ActivityFormModal
        activity={editingActivity}
        onSave={handleSaveActivity}
        onClose={() => setEditingActivity(null)}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles (scoped with "ld-" class names so they don't affect other pages)
// ---------------------------------------------------------------------------
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

.ld-page {
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

.ld-hero,
.ld-main,
.ld-toast-wrap,
.ld-notfound {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* ---------- Toast ---------- */
.ld-toast-wrap {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1050;
  transition: opacity 0.3s ease-in-out;
}

.ld-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  box-shadow: 0 10px 30px rgba(20, 33, 61, 0.2);
  border-left: 4px solid;
  max-width: 380px;
}

.ld-toast.is-success { border-left-color: #198754; }
.ld-toast.is-error { border-left-color: #dc3545; }

.ld-toast-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.ld-toast.is-success .ld-toast-icon { background: #dcf1e5; color: #146c43; }
.ld-toast.is-error .ld-toast-icon { background: #fbe1e3; color: #b02a37; }

/* ---------- Navy header band ---------- */
.ld-hero {
  background: var(--ink);
  margin-top: -1.5rem; /* sits flush under the navbar (navbar has mb-4) */
  padding: 22px 0 76px;
  color: #e2e8f0;
}

.ld-hero-compact {
  padding: 0;
  height: 120px;
}

.ld-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a9b6cc;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.ld-back:hover {
  color: #fff;
}

.ld-avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.ld-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
}

.ld-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  color: #a9b6cc;
  font-size: 0.95rem;
  margin-top: 4px;
}

.ld-status-label {
  color: #a9b6cc;
  font-size: 0.875rem;
  font-weight: 600;
  margin-right: 2px;
}

.ld-status-select {
  height: 38px;
  padding: 0 34px 0 12px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  background-color: var(--ink-soft);
  border: 1px solid var(--ink-line);
  border-radius: 8px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a9b6cc' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  cursor: pointer;
}

.ld-status-select:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ld-status-select option {
  color: var(--text);
  background: #fff;
}

.ld-btn-delete {
  height: 38px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ff8a95;
  background: transparent;
  border: 1px solid rgba(255, 138, 149, 0.4);
  border-radius: 8px;
  margin-left: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ld-btn-edit {
  height: 38px;
  padding: 0 14px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  margin-left: 6px;
  cursor: pointer;
}

.ld-btn-edit:hover {
  background: rgba(255, 255, 255, 0.12);
}

.ld-btn-delete:hover {
  background: #dc3545;
  border-color: #dc3545;
  color: #fff;
}

.ld-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.ld-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.ld-status-new { background: #dff7fc; color: #087990; }
.ld-status-contacted { background: #fff3cd; color: #8a6100; }
.ld-status-qualified { background: #dcf1e5; color: #146c43; }

/* Summary strip */
.ld-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 26px;
  background: var(--ink-line);
  border: 1px solid var(--ink-line);
  border-radius: 12px;
  overflow: hidden;
}

.ld-summary > div {
  background: var(--ink-soft);
  padding: 14px 18px;
}

.ld-summary-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.ld-summary-label {
  font-size: 0.8rem;
  color: #8a99b4;
  margin-top: 2px;
}

/* ---------- Main content (overlaps the navy band) ---------- */
.ld-main {
  margin-top: -48px;
  color: var(--text);
}

.ld-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px 22px;
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.04),
    0 8px 24px rgba(20, 33, 61, 0.08);
}

.ld-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ld-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.ld-card-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
}

.ld-count {
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #eef1f6;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

/* Forms */
.ld-form {
  background: #f5f7fb;
  border: 1px solid #e6eaf1;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 18px;
}

.ld-form-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 10px;
}

.ld-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text);
  background: #fff;
  border: 1.5px solid #d6dce6;
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ld-textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
}

.ld-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
}

.ld-btn-submit {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}

.ld-btn-submit:hover { background: #0b5ed7; }
.ld-btn-green { background: #198754; }
.ld-btn-green:hover { background: #157347; }

.ld-btn-submit:focus-visible,
.ld-icon-btn:focus-visible,
.ld-btn-delete:focus-visible,
.ld-back:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Deals list */
.ld-deals {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ld-deal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e6eaf1;
  border-left: 4px solid var(--deal-color, #6c757d);
  border-radius: 10px;
  background: #fff;
}

.ld-deal-prospect { --deal-color: #6c757d; }
.ld-deal-negotiation { --deal-color: #ffc107; }
.ld-deal-won { --deal-color: #198754; }
.ld-deal-lost { --deal-color: #dc3545; }

.ld-deal-title {
  font-weight: 700;
  color: var(--text);
}

.ld-deal-amount {
  font-weight: 700;
  color: #146c43;
  font-size: 0.95rem;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.ld-deal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ld-stage {
  height: 34px;
  padding: 0 30px 0 12px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid transparent;
  appearance: none;
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  cursor: pointer;
}

.ld-stage:disabled {
  cursor: default;
  background-image: none;
  padding-right: 12px;
  opacity: 1;
}

.ld-stage:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ld-stage-prospect { background-color: #eceff3; color: #495057; }
.ld-stage-negotiation { background-color: #fff3cd; color: #8a6100; }
.ld-stage-won { background-color: #dcf1e5; color: #146c43; }
.ld-stage-lost { background-color: #fbe1e3; color: #b02a37; }

.ld-stage option {
  color: var(--text);
  background: #fff;
}

.ld-icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ld-icon-btn:hover {
  background: #fbe1e3;
  color: #b02a37;
}

/* Activity timeline */
.ld-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}

.ld-timeline li {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 18px;
}

.ld-timeline li:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 16px;
  bottom: 0;
  width: 2px;
  background: #e6eaf1;
}

.ld-timeline-marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.ld-timeline-body {
  flex: 1;
  min-width: 0;
}

.ld-timeline-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ld-timeline-type {
  font-weight: 700;
  font-size: 0.95rem;
}

.ld-timeline-date {
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
}

.ld-timeline-notes {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.55;
}

/* Empty / not found */
.ld-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  color: var(--muted);
  font-size: 0.9rem;
  background: #f5f7fb;
  border: 1px dashed #d6dce6;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.ld-notfound {
  max-width: 460px;
  margin: -60px auto 0;
  text-align: center;
  padding: 36px 28px;
}

.ld-notfound h3 {
  font-weight: 800;
  margin-bottom: 6px;
}

.ld-notfound p {
  color: var(--muted);
}

/* ---------- Lead details: company, source, quick contact ---------- */
.ld-company {
  color: #cbd5e1;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 2px;
}

.ld-source {
  color: #a9b6cc;
}

.ld-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.ld-contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #e2e8f0;
  background: var(--ink-soft);
  border: 1px solid var(--ink-line);
  border-radius: 999px;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.ld-contact-btn:hover {
  background: #263a63;
  color: #fff;
}

.ld-contact-btn.is-whatsapp {
  color: #6ee7a8;
  border-color: rgba(37, 211, 102, 0.4);
}

.ld-contact-btn.is-whatsapp:hover {
  background: #25d366;
  border-color: #25d366;
  color: #fff;
}

.ld-contact-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.ld-summary-alert {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dc3545;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  vertical-align: middle;
}

/* Notes card */
.ld-notes-text {
  margin: 0;
  white-space: pre-wrap; /* keep the user's line breaks */
  color: #334155;
  line-height: 1.6;
}

.ld-link-btn {
  border: none;
  background: none;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0;
  cursor: pointer;
}

.ld-link-btn:hover {
  text-decoration: underline;
}

/* Input with a small text prefix ("Closes", "Due") */
.ld-prefixed {
  display: flex;
  align-items: center;
  height: 40px;
  margin: 0;
  background: #fff;
  border: 1.5px solid #d6dce6;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ld-prefixed:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
}

.ld-prefixed span {
  padding: 0 10px;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  background: #f5f7fb;
  border-right: 1px solid #e6eaf1;
}

.ld-prefixed input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  padding: 0 10px;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text);
  background: transparent;
}

/* Deal close date */
.ld-deal-close {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.ld-deal-close.is-past {
  color: #b02a37;
}

.ld-icon-btn.is-edit:hover {
  background: #e7f0ff;
  color: var(--primary);
}

/* Follow-up due chips */
.ld-due {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.ld-due-overdue { background: #fbe1e3; color: #b02a37; }
.ld-due-today { background: #fff3cd; color: #8a6100; }
.ld-due-upcoming { background: #eef1f6; color: #475569; }
.ld-due-done { background: #dcf1e5; color: #146c43; }

.ld-timeline li.is-done .ld-timeline-notes {
  color: var(--muted);
  text-decoration: line-through;
}

.ld-timeline-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  min-height: 34px;
}

.ld-timeline-author {
  font-size: 0.8rem;
  color: var(--muted);
}

.ld-timeline-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ld-task-btn {
  height: 30px;
  padding: 0 12px;
  margin-right: 4px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: #146c43;
  background: #dcf1e5;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s;
}

.ld-task-btn:hover {
  background: #c3e6d1;
}

.ld-task-btn.is-done {
  color: #475569;
  background: #eef1f6;
}

.ld-task-btn:focus-visible,
.ld-link-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ---------- Responsive ---------- */
@media (max-width: 767px) {
  .ld-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ld-deal {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ld-page *,
  .ld-toast-wrap {
    transition: none !important;
  }
}
`;

export default LeadDetail;
