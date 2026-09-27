import axios from "axios";

// ----------------------------------------------------
// TOGGLE THESE DEPENDING ON YOUR ENVIRONMENT
// ----------------------------------------------------

// 1. Local Development URL:
const BASE_URL = "http://localhost:5000/api";

// 2. Live Production URL (Render):
// const BASE_URL = "https://mern-sales-crm-assignment.onrender.com/api";

// ----------------------------------------------------

const api = axios.create({
  baseURL: BASE_URL,
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

    // NEW: Don't run refresh logic for the auth endpoints themselves.
    // A 401 from /auth/login means "wrong email or password", not "token expired",
    // so the error must go straight back to the Login page to be displayed.
    const isAuthRoute = originalRequest?.url?.startsWith("/auth/");

    // If the error is 401 (Unauthorized) and we haven't already retried this request
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute // <-- NEW
    ) {
      // Set a flag so we don't get stuck in an infinite loop if the refresh also fails
      originalRequest._retry = true;

      try {
        // Use plain 'axios' here to completely bypass the interceptor
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        // If successful, retry the exact same original request that failed
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, explicitly destroy cookies and redirect to login
        try {
          await axios.post(
            `${BASE_URL}/auth/logout`,
            {},
            { withCredentials: true },
          );
        } catch (logoutError) {
          console.error("Logout failed", logoutError);
        }

        // Clear local storage and redirect
        localStorage.removeItem("crm_user");
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
