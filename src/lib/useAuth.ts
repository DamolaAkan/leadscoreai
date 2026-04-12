"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "./dashboard-types";

const STORAGE_KEY = "lsai-session";

export function useAuth(orgSlug: string) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (sessionId) {
      return { Authorization: `Bearer ${sessionId}` };
    }
    return {};
  }, []);

  const checkAuth = useCallback(async () => {
    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${sessionId}` },
      });

      if (res.ok) {
        const data: AuthUser = await res.json();
        // Ensure session belongs to this org
        if (data.orgSlug === orgSlug) {
          setUser(data);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore logout API errors
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, [getAuthHeaders]);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";

  return { user, loading, logout, getAuthHeaders, isAdmin, isSuperAdmin };
}
