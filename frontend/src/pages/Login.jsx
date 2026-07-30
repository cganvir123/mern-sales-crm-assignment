import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { loginContext } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // The backend responds with the user profile, and automatically sets the cookies
      const response = await api.post("/auth/login", { email, password });

      // Save the profile to Context and LocalStorage
      loginContext(response.data.user);

      // Redirect to the protected dashboard area
      navigate("/");
    } catch (err) {
      // Handle validation errors from the backend gracefully
      if (err.response && err.response.data.errors) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError(
          err.response?.data?.message || "Login failed. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div
        className="card shadow p-4"
        style={{ width: "100%", maxWidth: "400px" }}
      >
        <h2 className="text-center mb-4">CRM Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center mt-3">
          <small>
            Don't have an account? <Link to="/register">Register here</Link>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;
