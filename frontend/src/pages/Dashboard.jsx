import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  // 1. Pull the user from context
  const { user } = useContext(AuthContext);

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, status, page]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(
        `/leads?search=${search}&status=${status}&page=${page}&limit=5`,
      );
      setLeads(response.data.leads);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar />

      <div className="container-fluid px-4 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold m-0">Lead Management</h3>

          {/* 2. Hide the Add button from Admins */}
          {user?.role === "Sales User" && (
            <Link to="/leads/new" className="btn btn-primary shadow-sm">
              + Add New Lead
            </Link>
          )}
        </div>

        {/* Filters Section */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search leads by name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id}>
                      <td className="fw-semibold">{lead.name}</td>
                      <td>{lead.email}</td>
                      <td>
                        <span
                          className={`badge ${lead.status === "New" ? "bg-info" : lead.status === "Contacted" ? "bg-warning" : "bg-success"}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/leads/${lead._id}`}
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer bg-white border-top d-flex justify-content-end p-3">
              <button
                className="btn btn-sm btn-outline-primary me-2"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="align-self-center mx-3 text-muted small">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
