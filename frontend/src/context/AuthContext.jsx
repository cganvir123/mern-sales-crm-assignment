import { createContext, useEffect, useState } from "react";
import api from "../services/api";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // The server (cookies) is the source of truth, so we ask it who is logged
  // in when the app starts instead of trusting localStorage.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Leftover from the old version that stored the user in localStorage
    localStorage.removeItem("crm_user");

    let ignore = false;

    api
      .get("/auth/me", { skipAuthRedirect: true })
      .then((response) => {
        if (!ignore) setUser(response.data.user);
      })
      .catch(() => {
        if (!ignore) setUser(null); // Not logged in / session expired
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const loginContext = (userData) => setUser(userData);
  const logoutContext = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{ user, loginContext, logoutContext, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
