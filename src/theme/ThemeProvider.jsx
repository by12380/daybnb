import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "daybnb-theme"; // "light" | "dark" | "system"
const VALID_PREFERENCES = new Set(["light", "dark", "system"]);

function normalizePreference(value) {
  const v = String(value || "");
  return VALID_PREFERENCES.has(v) ? v : "system";
}

function getSystemIsDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(preference) {
  const pref = normalizePreference(preference);
  const isDark = pref === "dark" || (pref === "system" && getSystemIsDark());
  document.documentElement.classList.toggle("dark", isDark);
  return isDark ? "dark" : "light";
}

export const ThemeContext = createContext({
  preference: "system",
  resolvedTheme: "light",
  setPreference: () => {},
  toggle: () => {},
});

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => {
    try {
      return normalizePreference(localStorage.getItem(STORAGE_KEY) || "system");
    } catch {
      return "system";
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState("light");

  const setPreference = useCallback((next) => {
    const normalized = normalizePreference(next);
    setPreferenceState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  useEffect(() => {
    setResolvedTheme(applyThemeClass(preference));
  }, [preference]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (preference === "system") setResolvedTheme(applyThemeClass("system"));
    };
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggle }),
    [preference, resolvedTheme, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

