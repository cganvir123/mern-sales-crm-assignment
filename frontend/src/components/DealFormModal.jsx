import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import { toCloseDateInput } from "../utils/format";

const STAGES = ["Prospect", "Negotiation", "Won", "Lost"];

// Edit a deal's title, amount, stage and expected close date.
// `deal` is the deal being edited (or null when closed).
// `onSave(updates)` must return a promise; the modal closes when it resolves.
const DealFormModal = ({ deal, onSave, onClose }) => {
  return (
    <Modal show={Boolean(deal)} onHide={onClose} centered>
      {/* key resets the form each time a different deal is opened */}
      {deal && (
        <DealForm
          key={deal._id}
          deal={deal}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};

const DealForm = ({ deal, onSave, onClose }) => {
  const [form, setForm] = useState({
    title: deal.title,
    amount: deal.amount,
    stage: deal.stage,
    expectedCloseDate: toCloseDateInput(deal.expectedCloseDate),
  });
  const [isSaving, setIsSaving] = useState(false);

  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        ...form,
        amount: Number(form.amount),
        expectedCloseDate: form.expectedCloseDate || null, // null clears it
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Modal.Header closeButton>
        <Modal.Title>Edit deal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label htmlFor="deal-title" className="form-label">
            Title
          </label>
          <input
            id="deal-title"
            className="form-control"
            value={form.title}
            maxLength={150}
            required
            onChange={update("title")}
          />
        </div>
        <div className="row g-3">
          <div className="col-sm-6">
            <label htmlFor="deal-amount" className="form-label">
              Amount
            </label>
            <input
              id="deal-amount"
              type="number"
              min="0"
              step="any"
              className="form-control"
              value={form.amount}
              required
              onChange={update("amount")}
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="deal-stage" className="form-label">
              Stage
            </label>
            <select
              id="deal-stage"
              className="form-select"
              value={form.stage}
              onChange={update("stage")}
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label htmlFor="deal-close" className="form-label">
              Expected close date <span className="text-muted">(optional)</span>
            </label>
            <input
              id="deal-close"
              type="date"
              className="form-control"
              value={form.expectedCloseDate}
              onChange={update("expectedCloseDate")}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </Modal.Footer>
    </form>
  );
};

export default DealFormModal;
