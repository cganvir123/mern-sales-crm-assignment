import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

const SalesPipeline = () => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await api.get("/deals");
      setDeals(response.data);
    } catch (error) {
      console.error("Error fetching pipeline deals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group deals by the stages mandated in the PDF
  const groupedDeals = {
    Prospect: deals.filter((d) => d.stage === "Prospect"),
    Negotiation: deals.filter((d) => d.stage === "Negotiation"),
    Won: deals.filter((d) => d.stage === "Won"),
    Lost: deals.filter((d) => d.stage === "Lost"),
  };

  if (isLoading) {
    return (
      <div className="bg-light min-vh-100">
        <Navbar />
        <div className="container text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 pb-5">
      <Navbar />
      <div className="container-fluid px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold m-0">Sales Pipeline</h3>
        </div>

        <div className="row g-4">
          {/* Render a column for each stage */}
          {Object.entries(groupedDeals).map(([stage, stageDeals]) => (
            <div key={stage} className="col-12 col-md-6 col-xl-3">
              <div className="card shadow-sm border-0 h-100 bg-light">
                <div
                  className={`card-header text-white fw-bold py-3 ${
                    stage === "Won"
                      ? "bg-success"
                      : stage === "Lost"
                        ? "bg-danger"
                        : stage === "Negotiation"
                          ? "bg-warning text-dark"
                          : "bg-secondary"
                  }`}
                >
                  {stage} ({stageDeals.length})
                </div>
                <div className="card-body p-2" style={{ minHeight: "300px" }}>
                  {stageDeals.length === 0 ? (
                    <div className="text-muted small text-center mt-3">
                      No deals in this stage.
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal._id}
                        className="card mb-2 border shadow-sm"
                      >
                        <div className="card-body p-3">
                          <h6 className="fw-bold mb-1">{deal.title}</h6>
                          <div className="text-success fw-bold mb-2">
                            ${deal.amount?.toLocaleString()}
                          </div>
                          {/* Safely check if leadId is populated or just an ID */}
                          {deal.leadId && deal.leadId.name && (
                            <div className="small text-muted mb-2">
                              <i className="bi bi-person-fill me-1"></i>
                              {deal.leadId.name}
                            </div>
                          )}
                          <Link
                            to={`/leads/${deal.leadId._id || deal.leadId}`}
                            className="btn btn-sm btn-outline-primary w-100"
                          >
                            View Lead
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalesPipeline;
