import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/index.js";
import SearchField from "./ui/SearchField.jsx";

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const overlayRef = useRef(null);
  const searchRef = useRef(null);

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) ||
    LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ||
    LANGUAGES[0];

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
    setSearch("");
  }, []);

  const selectLanguage = useCallback(
    (code) => {
      i18n.changeLanguage(code);
      const lang = LANGUAGES.find((l) => l.code === code);
      if (lang) {
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = code;
      }
      setOpen(false);
      setSearch("");
    },
    [i18n]
  );

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const onOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  const filtered = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeLabel.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface/60 hover:text-brand-600 dark:text-dark-muted dark:hover:text-brand-400"
        title={t("common.changeLanguage")}
        aria-label={t("common.changeLanguage")}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        <span className="hidden sm:inline">{currentLang.flag}</span>
      </button>

      {/* Modal — portaled to document.body so it's always screen-centered */}
      {open &&
        createPortal(
          <div
            ref={overlayRef}
            onClick={onOverlayClick}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-10 bg-black/40 backdrop-blur-sm"
          >
            <div className="w-full max-w-xl rounded-2xl border border-border bg-panel shadow-2xl dark:border-dark-border dark:bg-dark-panel" style={{ animation: "langModalIn 0.2s ease-out" }}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-5 dark:border-dark-border">
                <div>
                  <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">
                    {t("common.selectLanguage")}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted dark:text-dark-muted">
                    15 {t("common.language").toLowerCase()}s
                  </p>
                </div>
                <button
                  onClick={toggle}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface/60 hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="px-6 pt-5">
                <SearchField
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  placeholder="Search languages..."
                  inputClassName="bg-surface/60 py-2.5 dark:bg-dark-surface/60"
                />
              </div>

              {/* Language grid */}
              <div className="max-h-[420px] overflow-y-auto overscroll-contain px-6 py-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filtered.map((lang) => {
                    const isActive = currentLang.code === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => selectLanguage(lang.code)}
                        className={`group relative flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                          isActive
                            ? "border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-900/30"
                            : "border-transparent bg-surface/40 hover:border-brand-200 hover:bg-surface/80 dark:bg-dark-surface/40 dark:hover:border-brand-700 dark:hover:bg-dark-surface/80"
                        }`}
                      >
                        <span className="text-2xl leading-none">{lang.flag}</span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-semibold ${
                              isActive
                                ? "text-brand-700 dark:text-brand-300"
                                : "text-ink dark:text-dark-ink"
                            }`}
                          >
                            {lang.nativeLabel}
                          </p>
                          <p className="truncate text-xs text-muted dark:text-dark-muted">
                            {lang.label}
                          </p>
                        </div>
                        {isActive && (
                          <svg
                            className="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted dark:text-dark-muted">
                    No languages found matching "{search}"
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-6 py-4 dark:border-dark-border">
                <p className="text-center text-xs text-muted dark:text-dark-muted">
                  Current: <span className="font-medium text-ink dark:text-dark-ink">{currentLang.flag} {currentLang.nativeLabel}</span>
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
