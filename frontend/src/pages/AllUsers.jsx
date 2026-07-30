import { useState, useEffect } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

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

  return (
    <div className="bg-light min-vh-100 pb-5">
      <Navbar />
      <div className="container-fluid px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold m-0">Admin: Sales Team Overview</h3>
        </div>

        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sales Rep Name</th>
                  <th>Email</th>
                  <th>Total Leads</th>
                  <th>Assigned Leads (Active Pipeline)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      Loading team data...
                    </td>
                  </tr>
                ) : salesUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      No sales users found.
                    </td>
                  </tr>
                ) : (
                  salesUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="fw-semibold">{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge bg-primary rounded-pill">
                          {user.assignedLeads.length}
                        </span>
                      </td>
                      <td>
                        {user.assignedLeads.length === 0 ? (
                          <span className="text-muted small">
                            No leads assigned
                          </span>
                        ) : (
                          <div className="d-flex flex-wrap gap-1">
                            {user.assignedLeads.map((lead) => (
                              <span
                                key={lead._id}
                                className="badge bg-secondary"
                              >
                                {lead.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllUsers;
