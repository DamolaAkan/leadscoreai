"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "lsai-admin-session";

export type AdminRole = "rep" | "supervisor" | "super_admin";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
}

export function useInvoiceAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (sessionId) {
      return { Authorization: `Bearer ${sessionId}` };
    }
    return {};
  }, []);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    fetch("/api/invoices/auth", {
      headers: { Authorization: `Bearer ${sessionId}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        localStorage.removeItem(STORAGE_KEY);
        return null;
      })
      .then((data) => {
        if (data) setUser(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      });
  }, []);

  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (sessionId) {
      try {
        await fetch("/api/invoices/auth", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionId}` },
        });
      } catch {
        // Ignore
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, loading, logout, getAuthHeaders };
}
