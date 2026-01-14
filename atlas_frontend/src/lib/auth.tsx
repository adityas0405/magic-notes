import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl } from "./api";
import { clearStoredToken, getStoredToken, setStoredToken } from "./authStorage";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export type AuthUser = {
  id: number;
  email: string;
  created_at: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredToken()));
  const navigate = useNavigate();

  const setAuthToken = (value: string) => {
    setStoredToken(value);
    setToken(value);
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Failed to load user");
        }
        const data = (await response.json()) as { user: AuthUser };
        setUser(data.user);
      } catch (error) {
        clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error("Login failed");
    }
    const data = (await response.json()) as {
      access_token: string;
      user: AuthUser;
    };
    setAuthToken(data.access_token);
    setUser(data.user);
    navigate("/app/library");
  };

  const signup = async (email: string, password: string) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error("Signup failed");
    }
    const data = (await response.json()) as {
      access_token: string;
      user: AuthUser;
    };
    setAuthToken(data.access_token);
    setUser(data.user);
    navigate("/app/library");
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      isLoading,
      user,
      login,
      signup,
      logout,
    }),
    [token, isLoading, user]
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
