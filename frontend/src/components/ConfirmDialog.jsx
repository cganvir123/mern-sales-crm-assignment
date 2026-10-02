import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import Modal from "react-bootstrap/Modal";

// Themed replacement for window.confirm().
// Usage in any page:
//   const confirm = useConfirm();
//   if (await confirm({ title: "Delete lead?", message: "..." })) { ...delete... }

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: "Are you sure?",
  message: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "danger", // "danger" (red) or "primary" (blue)
};

export const ConfirmProvider = ({ children }) => {
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState(DEFAULTS);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    // If a dialog is somehow already open, treat it as cancelled
    resolverRef.current?.(false);

    setOptions({ ...DEFAULTS, ...opts });
    setShow(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setShow(false); // options stay until the fade-out finishes
  };

  const isDanger = options.variant === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <style>{styles}</style>
      <Modal
        show={show}
        onHide={() => close(false)} // Esc key or backdrop click = Cancel
        centered
        dialogClassName="cd-dialog"
        contentClassName="cd-content"
        backdropClassName="cd-backdrop"
        aria-labelledby="cd-title"
      >
        <div className="cd-body">
          <span
            className={`cd-icon ${isDanger ? "is-danger" : "is-primary"}`}
            aria-hidden="true"
          >
            {isDanger ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </span>

          <h5 id="cd-title" className="cd-title">
            {options.title}
          </h5>
          {options.message && <p className="cd-message">{options.message}</p>}
        </div>

        <div className="cd-actions">
          {/* Cancel gets focus first, so pressing Enter by accident is safe */}
          <button
            type="button"
            className="cd-btn cd-btn-cancel"
            onClick={() => close(false)}
            autoFocus
          >
            {options.cancelText}
          </button>
          <button
            type="button"
            className={`cd-btn ${isDanger ? "cd-btn-danger" : "cd-btn-primary"}`}
            onClick={() => close(true)}
          >
            {options.confirmText}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return confirm;
};

// The modal renders at the end of <body>, so these are global styles,
// scoped with "cd-" class names. Colors match the rest of the app.
const styles = `
.cd-backdrop.show {
  background: #14213d;
  opacity: 0.55;
}

.cd-dialog {
  max-width: 420px;
}

.cd-content {
  font-family: "Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border: none;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(20, 33, 61, 0.3);
  overflow: hidden;
}

.cd-body {
  padding: 28px 28px 8px;
  text-align: center;
}

.cd-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  margin-bottom: 14px;
}

.cd-icon.is-danger { background: #fbe1e3; color: #b02a37; }
.cd-icon.is-primary { background: #e7f0ff; color: #0d6efd; }

.cd-title {
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #1e293b;
  margin: 0 0 6px;
}

.cd-message {
  font-size: 0.925rem;
  color: #64748b;
  line-height: 1.55;
  margin: 0;
}

.cd-actions {
  display: flex;
  gap: 10px;
  padding: 20px 28px 26px;
}

.cd-btn {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.cd-btn-cancel {
  color: #1e293b;
  background: #fff;
  border: 1px solid #d6dce6;
}

.cd-btn-cancel:hover { background: #f5f7fb; }

.cd-btn-danger {
  color: #fff;
  background: #dc3545;
  border: none;
}

.cd-btn-danger:hover { background: #bb2d3b; }

.cd-btn-primary {
  color: #fff;
  background: #0d6efd;
  border: none;
}

.cd-btn-primary:hover { background: #0b5ed7; }

.cd-btn:focus-visible {
  outline: 3px solid rgba(13, 110, 253, 0.35);
  outline-offset: 2px;
}

@media (max-width: 400px) {
  .cd-actions { flex-direction: column-reverse; }
  .cd-btn { flex: none; width: 100%; }
}
`;
