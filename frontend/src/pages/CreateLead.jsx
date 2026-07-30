import { useState, useContext } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

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
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post("/leads", formData);
      navigate("/"); // Head back to dashboard on success
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
    <div className="bg-light min-vh-100">
      <Navbar />
      <div className="container-fluid px-4 py-4">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom pt-3 pb-2 d-flex justify-content-between align-items-center">
                <h4 className="fw-bold m-0">Create New Lead</h4>
                <Link to="/" className="btn btn-sm btn-outline-secondary">
                  Cancel
                </Link>
              </div>
              <div className="card-body p-4">
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Company / Client Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      Initial Status
                    </label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Lead"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLead;
