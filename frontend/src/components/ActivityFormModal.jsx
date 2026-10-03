import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import { toDateTimeInput } from "../utils/format";

const TYPES = [
  { value: "Calls", label: "Call" },
  { value: "Meetings", label: "Meeting" },
  { value: "Notes", label: "Note" },
  { value: "Follow-ups", label: "Follow-up" },
];

// Edit an activity's type, notes and (for follow-ups) due date.
// `onSave(updates)` must return a promise; the modal closes when it resolves.
const ActivityFormModal = ({ activity, onSave, onClose }) => {
  return (
    <Modal show={Boolean(activity)} onHide={onClose} centered>
      {activity && (
        <ActivityForm
          key={activity._id}
          activity={activity}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};

const ActivityForm = ({ activity, onSave, onClose }) => {
  const [form, setForm] = useState({
    type: activity.type,
    notes: activity.notes,
    dueDate: toDateTimeInput(activity.dueDate),
  });
  const [isSaving, setIsSaving] = useState(false);

  const isFollowUp = form.type === "Follow-ups";
  const update = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = { type: form.type, notes: form.notes };
      // datetime-local is in the user's timezone; send it as a full ISO date
      if (isFollowUp) updates.dueDate = new Date(form.dueDate).toISOString();
      await onSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Modal.Header closeButton>
        <Modal.Title>Edit activity</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label htmlFor="act-type" className="form-label">
            Type
          </label>
          <select
            id="act-type"
            className="form-select"
            value={form.type}
            onChange={update("type")}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {isFollowUp && (
          <div className="mb-3">
            <label htmlFor="act-due" className="form-label">
              Due
            </label>
            <input
              id="act-due"
              type="datetime-local"
              className="form-control"
              value={form.dueDate}
              required
              onChange={update("dueDate")}
            />
          </div>
        )}

        <div>
          <label htmlFor="act-notes" className="form-label">
            Notes
          </label>
          <textarea
            id="act-notes"
            className="form-control"
            rows="4"
            maxLength={2000}
            value={form.notes}
            required
            onChange={update("notes")}
          />
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

export default ActivityFormModal;
