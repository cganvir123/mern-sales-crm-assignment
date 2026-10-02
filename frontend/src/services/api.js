import axios from "axios";

// .env.local -> VITE_API_URL=http://localhost:5000/api
// Vercel     -> VITE_API_URL=https://mern-sales-crm-assignment.onrender.com/api
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Sends the HTTP-only auth cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Pulls the most useful message out of any API error. The backend now always
// sends { message }, validation errors included.
export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  error?.response?.data?.errors?.[0]?.msg ||
  fallback;

// These must never trigger the refresh-and-retry logic.
// (/auth/me is NOT in this list: an expired access token there should refresh.)
const NO_REFRESH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

// If several requests fail with 401 at once, they all wait on ONE refresh call
let refreshPromise = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const skipRefresh = NO_REFRESH_ROUTES.some((route) =>
      originalRequest?.url?.startsWith(route),
    );

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !skipRefresh
    ) {
      originalRequest._retry = true; // Don't loop if the retry also fails

      try {
        await refreshSession();
        return api(originalRequest);
      } catch (refreshError) {
        // The session check on app start handles "not logged in" itself;
        // redirecting here would reload /login forever.
        if (!originalRequest.skipAuthRedirect) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
