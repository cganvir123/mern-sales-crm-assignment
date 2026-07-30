import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Initialize state directly from localStorage so it survives page reloads
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("crm_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // We can set loading to false immediately since we are reading sync from localStorage
  const [loading, setLoading] = useState(false);

  // 2. Login function: Saves the non-sensitive profile data
  const loginContext = (userData) => {
    setUser(userData);
    localStorage.setItem("crm_user", JSON.stringify(userData));
  };

  // 3. Logout function: Clears the profile data
  const logoutContext = () => {
    setUser(null);
    localStorage.removeItem("crm_user");
    // Note: You will also make an API call to a /logout backend route
    // later to clear the httpOnly cookies.
  };

  return (
    <AuthContext.Provider
      value={{ user, loginContext, logoutContext, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
