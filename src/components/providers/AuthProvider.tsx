"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  signUp: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "thrifts_auth_users_v1";
const SESSION_KEY = "thrifts_auth_session_v1";

type StoredUser = { email: string; password: string };

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === "string") return { email: parsed.email };
    return null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser | null) {
  try {
    if (!user) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(loadSession());
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      signUp: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) {
          return { ok: false, message: "Email and password are required." };
        }
        const users = loadUsers();
        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { ok: false, message: "Email already exists. Please log in." };
        }
        users.push({ email: cleanEmail, password });
        saveUsers(users);
        const nextUser = { email: cleanEmail };
        setUser(nextUser);
        saveSession(nextUser);
        return { ok: true };
      },
      signIn: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) {
          return { ok: false, message: "Email and password are required." };
        }
        const users = loadUsers();
        const found = users.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.password === password
        );
        if (!found) {
          return { ok: false, message: "Invalid email or password." };
        }
        const nextUser = { email: cleanEmail };
        setUser(nextUser);
        saveSession(nextUser);
        return { ok: true };
      },
      signOut: () => {
        setUser(null);
        saveSession(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
