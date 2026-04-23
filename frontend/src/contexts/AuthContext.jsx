import React, { createContext, useContext, useState, useEffect } from "react";
import apiServerClient from "@/lib/apiServerClient.js"; // ✅ FIXED IMPORT

const AuthContext = createContext();
const formatUserRole = (role) => {
  const normalized = String(role || '').toLowerCase().replace(/\s+/g, '_');

  if (normalized === 'job_seeker' || normalized === 'jobseeker') return 'Job Seeker';
  if (normalized === 'employer') return 'Employer';
  if (normalized === 'admin') return 'Admin';
  return role;
};

export const getDashboardPathForRole = (role) => {
  const formattedRole = formatUserRole(role);

  if (formattedRole === 'Employer') return '/employer/dashboard';
  if (formattedRole === 'Admin') return '/admin/dashboard';
  return '/dashboard';
};
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await apiServerClient.fetch("/auth/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const formattedUser = { ...userData, role: formatUserRole(userData.role), token };
        setCurrentUser(formattedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("authToken");
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ✅ SIGNUP
  const signup = async (email, password, passwordConfirm, role) => {
    try {
      const userData = await apiServerClient.fetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, passwordConfirm, role }),
      });

      const token = userData.token;
      localStorage.setItem("authToken", token);

      const formattedUser = { ...userData.user, role: formatUserRole(userData.user.role), token };
      setCurrentUser(formattedUser);
      setIsAuthenticated(true);

      return formattedUser;
    } catch (error) {
      throw new Error(error.body?.error || "Signup failed");
    }
  };

  // ✅ LOGIN
  const login = async (email, password) => {
    try {
      const userData = await apiServerClient.fetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = userData.token;
      localStorage.setItem("authToken", token);

      const formattedUser = { ...userData.user, role: formatUserRole(userData.user.role), token };
      setCurrentUser(formattedUser);
      setIsAuthenticated(true);

      return formattedUser;
    } catch (error) {
      throw new Error(error.body?.error || "Login failed");
    }
  };

  // ✅ GOOGLE LOGIN
  const loginWithGoogle = () => {
    window.location.href = `${apiServerClient.baseUrl}/auth/google`;
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem("authToken");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // ✅ REQUEST PASSWORD RESET
  const requestPasswordReset = async (email) => {
    try {
      return await apiServerClient.fetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      throw new Error(error.body?.error || "Password reset request failed");
    }
  };

  // ✅ CONFIRM PASSWORD RESET
  const confirmPasswordReset = async (
    token,
    password,
    passwordConfirm
  ) => {
    try {
      return await apiServerClient.fetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
    } catch (error) {
      throw new Error(error.body?.error || "Password reset failed");
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};