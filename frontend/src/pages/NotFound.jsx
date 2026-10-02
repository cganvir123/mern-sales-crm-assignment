import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="d-flex flex-column justify-content-center align-items-center vh-100 text-center px-3">
    <h1 className="display-4 fw-bold">404</h1>
    <p className="text-muted mb-4">
      The page you're looking for doesn't exist.
    </p>
    <Link to="/" className="btn btn-primary">
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
