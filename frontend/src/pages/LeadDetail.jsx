import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Pull user from context for role checks

  const [lead, setLead] = useState(null);
  const [deals, setDeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: Custom Notification State ---
  const [notification, setNotification] = useState({ message: "", type: "" });

  const [newDeal, setNewDeal] = useState({
    title: "",
    amount: "",
    stage: "Prospect",
  });
  const [newActivity, setNewActivity] = useState({ type: "Calls", notes: "" });

  // --- NEW: Helper function to show notifications ---
  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000); // Auto hide after 3 seconds
  };

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const fetchLeadData = async () => {
    setIsLoading(true);
    try {
      const [leadRes, activitiesRes, dealsRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/activities/lead/${id}`),
        api.get("/deals"),
      ]);

      setLead(leadRes.data);
      setActivities(activitiesRes.data);

      const leadDeals = dealsRes.data.filter(
        (deal) => (deal.leadId._id || deal.leadId) === id,
      );
      setDeals(leadDeals);
    } catch (error) {
      console.error("Error fetching lead details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lead Actions ---
  const handleDeleteLead = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this lead? This cannot be undone.",
      )
    ) {
      try {
        await api.delete(`/leads/${id}`);
        navigate("/"); // Route back to dashboard after deletion
      } catch (error) {
        showToast("Failed to delete lead", "danger");
      }
    }
  };

  const handleUpdateLeadStatus = async (newStatus) => {
    try {
      // Send the existing name and email along with the new status
      // to satisfy strict backend validation rules
      const response = await api.patch(`/leads/${id}`, {
        name: lead.name,
        email: lead.email,
        status: newStatus,
      });

      setLead(response.data);
      showToast("Lead status updated successfully!", "success"); // NEW: Success notification
    } catch (error) {
      // Log the exact error from the backend so you can see what it's rejecting
      console.error("Backend Validation Error:", error.response?.data);

      // Show a more descriptive alert
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        "Bad request";
      showToast(`Failed to update lead status: ${errorMessage}`, "danger");
    }
  };

  // --- Deal Actions ---
  const handleAddDeal = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/deals", { ...newDeal, leadId: id });
      setDeals([...deals, response.data]);
      setNewDeal({ title: "", amount: "", stage: "Prospect" });
      showToast("Deal added successfully!", "success");
    } catch (error) {
      showToast("Failed to add deal", "danger");
    }
  };

  const handleUpdateDealStage = async (dealId, newStage) => {
    try {
      const response = await api.patch(`/deals/${dealId}`, { stage: newStage });
      setDeals(
        deals.map((deal) => (deal._id === dealId ? response.data : deal)),
      );
      showToast("Deal stage updated!", "success");
    } catch (error) {
      showToast("Failed to update deal stage", "danger");
    }
  };

  const handleDeleteDeal = async (dealId) => {
    if (window.confirm("Delete this deal?")) {
      try {
        await api.delete(`/deals/${dealId}`);
        setDeals(deals.filter((deal) => deal._id !== dealId));
        showToast("Deal deleted successfully!", "success");
      } catch (error) {
        showToast("Failed to delete deal", "danger");
      }
    }
  };

  // --- Activity Actions ---
  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/activities", {
        ...newActivity,
        leadId: id,
      });
      setActivities([response.data, ...activities]);
      setNewActivity({ type: "Calls", notes: "" });
      showToast("Activity logged successfully!", "success");
    } catch (error) {
      showToast("Failed to log activity", "danger");
    }
  };

  if (isLoading)
    return (
      <div className="bg-light min-vh-100">
        <Navbar />
        <div className="container text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );

  if (!lead)
    return (
      <div className="bg-light min-vh-100">
        <Navbar />
        <div className="container py-5 text-center">
          <h3>Lead not found.</h3>
          <Link to="/" className="btn btn-primary mt-3">
            Back
          </Link>
        </div>
      </div>
    );

  return (
    <div className="bg-light min-vh-100 pb-5 position-relative">
      <Navbar />

      {/* --- NEW: Floating Notification Toast --- */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1050,
          transition: "opacity 0.3s ease-in-out",
          opacity: notification.message ? 1 : 0,
          pointerEvents: notification.message ? "auto" : "none",
        }}
      >
        {notification.message && (
          <div
            className={`alert alert-${notification.type} shadow-sm`}
            role="alert"
          >
            {notification.message}
          </div>
        )}
      </div>

      <div className="container-fluid px-4">
        {/* Header Section */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 bg-white p-4 rounded shadow-sm border">
          <div>
            <h2 className="fw-bold mb-1">{lead.name}</h2>
            <p className="text-muted mb-0">{lead.email}</p>
          </div>

          <div className="d-flex gap-3 align-items-center mt-3 mt-md-0">
            {/* Display static status badge for Admin, Interactive dropdown for Sales User */}
            {user?.role === "Sales User" ? (
              <>
                <div className="d-flex align-items-center gap-2">
                  <label className="fw-semibold small text-muted">
                    Status:
                  </label>
                  <select
                    className="form-select form-select-sm fw-bold"
                    value={lead.status}
                    onChange={(e) => handleUpdateLeadStatus(e.target.value)}
                    style={{ width: "130px" }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                  </select>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleDeleteLead}
                >
                  Delete Lead
                </button>
              </>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold small text-muted">Status:</span>
                <span
                  className={`badge ${
                    lead.status === "New"
                      ? "bg-info"
                      : lead.status === "Contacted"
                        ? "bg-warning"
                        : "bg-success"
                  }`}
                >
                  {lead.status}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="row g-4">
          {/* Left Column: Deals Pipeline */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom pt-3 pb-2">
                <h5 className="fw-bold m-0">Deals Pipeline</h5>
              </div>
              <div className="card-body">
                {/* Hide Add Deal form from Admins */}
                {user?.role === "Sales User" && (
                  <form
                    onSubmit={handleAddDeal}
                    className="bg-light p-3 rounded mb-4 border"
                  >
                    <div className="row g-2 mb-2">
                      <div className="col-sm-6">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Deal Title"
                          value={newDeal.title}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, title: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Amount ($)"
                          value={newDeal.amount}
                          onChange={(e) =>
                            setNewDeal({ ...newDeal, amount: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="row g-2 align-items-center">
                      <div className="col-sm-8">
                        <select
                          className="form-select form-select-sm"
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
                      <div className="col-sm-4">
                        <button
                          type="submit"
                          className="btn btn-sm btn-success w-100"
                        >
                          Add Deal
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="list-group list-group-flush">
                  {deals.length === 0 ? (
                    <p className="text-muted small text-center">
                      No deals active for this lead.
                    </p>
                  ) : (
                    deals.map((deal) => (
                      <div
                        key={deal._id}
                        className="list-group-item px-0 py-3 border-bottom d-flex flex-column gap-2"
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-0 fw-semibold">{deal.title}</h6>
                            <small className="text-success fw-bold">
                              ${deal.amount.toLocaleString()}
                            </small>
                          </div>
                          {/* Hide Delete Deal button from Admins */}
                          {user?.role === "Sales User" && (
                            <button
                              className="btn btn-sm text-danger p-0"
                              onClick={() => handleDeleteDeal(deal._id)}
                            >
                              <small>Delete</small>
                            </button>
                          )}
                        </div>
                        <select
                          className={`form-select form-select-sm w-auto fw-semibold ${
                            deal.stage === "Won"
                              ? "text-success border-success"
                              : deal.stage === "Lost"
                                ? "text-danger border-danger"
                                : "text-secondary"
                          }`}
                          value={deal.stage}
                          onChange={(e) =>
                            handleUpdateDealStage(deal._id, e.target.value)
                          }
                          disabled={user?.role !== "Sales User"} // Disable select for Admins
                        >
                          <option value="Prospect">Prospect</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Activity Tracking */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom pt-3 pb-2">
                <h5 className="fw-bold m-0">Activity History</h5>
              </div>
              <div className="card-body">
                {/* Hide Add Activity form from Admins */}
                {user?.role === "Sales User" && (
                  <form
                    onSubmit={handleAddActivity}
                    className="bg-light p-3 rounded mb-4 border"
                  >
                    <div className="mb-2">
                      <select
                        className="form-select form-select-sm"
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
                    <div className="mb-2">
                      <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Activity details..."
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
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary w-100"
                    >
                      Log Activity
                    </button>
                  </form>
                )}

                <div className="list-group list-group-flush">
                  {activities.length === 0 ? (
                    <p className="text-muted small text-center">
                      No activities logged yet.
                    </p>
                  ) : (
                    activities.map((activity) => (
                      <div
                        key={activity._id}
                        className="list-group-item px-0 pb-3 mb-2 border-bottom"
                      >
                        <div className="d-flex w-100 justify-content-between mb-1">
                          <strong className="text-primary">
                            {activity.type}
                          </strong>
                          <small className="text-muted">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        <p className="mb-0 small">{activity.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
