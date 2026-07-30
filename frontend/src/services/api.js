import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // Pull from environment variables in production
  withCredentials: true, // CRUCIAL for sending the HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // If the request succeeds, just return the response normally
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't already retried this request
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      // Set a flag so we don't get stuck in an infinite loop if the refresh also fails
      originalRequest._retry = true;

      try {
        // FIX: Use plain 'axios' here, NOT 'api', to completely bypass the interceptor
        // You must specify the full URL and include withCredentials manually
        await axios.post(
          "http://localhost:5000/api/auth/refresh",
          {},
          { withCredentials: true },
        );

        // If successful, the backend just set a fresh accessToken cookie.
        // Now, retry the exact same original request that failed.
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh fails (e.g., the 7-day refresh token also expired),
        // the user must log in again.

        try {
          // Tell backend to explicitly destroy the dead/orphaned cookies
          await axios.post(
            "http://localhost:5000/api/auth/logout",
            {},
            { withCredentials: true },
          );
        } catch (logoutError) {
          console.error("Logout failed", logoutError);
        }

        // Clear the local profile data
        localStorage.removeItem("crm_user");

        // Force redirect to login page (standard browser redirect)
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    // For all other errors (400, 404, 500, etc.), just reject the promise normally
    return Promise.reject(error);
  },
);

export default api;
