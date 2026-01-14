import React, { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOKEN_KEY = "atlas_token";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string) => void;
  signup: (email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const navigate = useNavigate();

  const setAuthToken = (value: string) => {
    localStorage.setItem(TOKEN_KEY, value);
    setToken(value);
  };

  const login = (email: string) => {
    setAuthToken(`token-${email}`);
    navigate("/app/library");
  };

  const signup = (email: string) => {
    setAuthToken(`token-${email}`);
    navigate("/app/library");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    navigate("/login");
  };

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(token), login, signup, logout }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
