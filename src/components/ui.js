"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";

// ============================================
// ICONS — minimal stroke set on a 24px grid, drawn in currentColor.
// ============================================
const ICONS = {
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5V8m0 8v1.5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  scale: "M12 4v16M5 20h14M6 8l-3 6a3 3 0 0 0 6 0zm12 0l-3 6a3 3 0 0 0 6 0zM6 8h12M12 4l-6 4m6-4l6 4",
  list: "M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8l1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  save: "M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v5h8M7 21v-7h10v7",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  logout: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h11",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  book: "M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 18l-6-6 6-6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
};

export function Icon({ name, size, color, strokeWidth }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={strokeWidth || 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={ICONS[name]} />
    </svg>
  );
}

// ============================================
// THEME (OS preference on first visit, then the saved choice)
// The <html data-theme> attribute is the single source of truth. An inline
// script in layout.js sets it before first paint, so we subscribe to the
// DOM rather than mirroring it into React state — that keeps the toggle
// correct without a hydration mismatch or a setState inside an effect.
// ============================================
const THEME_KEY = "crih_theme";

function subscribeToTheme(onChange) {
  var observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return function () { observer.disconnect(); };
}
function getThemeSnapshot() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function getServerThemeSnapshot() { return "light"; }

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  var applyTheme = function (next) {
    var root = document.documentElement;
    // Crossfade colors only for the duration of the switch, so the global
    // color transition never fights the transform animations elsewhere.
    root.classList.add("theme-anim");
    root.setAttribute("data-theme", next);
    setTimeout(function () { root.classList.remove("theme-anim"); }, 500);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* silent fail */ }
  };
  return [theme, applyTheme];
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  var isDark = theme === "dark";
  var label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button className="icon-btn" onClick={function () { setTheme(isDark ? "light" : "dark"); }} title={label} aria-label={label}>
      <span key={theme} className="spin-in" style={{ display: "flex" }}><Icon name={isDark ? "sun" : "moon"} size={16} /></span>
    </button>
  );
}

// ============================================
// SCROLL REVEAL — fades children up the first time they enter the viewport.
// Content renders visible on the server; the hidden start state is only
// applied once JS confirms the element is below the fold.
// ============================================
export function Reveal({ children, delay, as, className, style }) {
  var ref = useRef(null);
  useEffect(function () {
    var el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // already on screen
    el.classList.add("sr-hidden");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { el.classList.remove("sr-hidden"); el.classList.add("sr-shown"); io.disconnect(); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return function () { io.disconnect(); };
  }, []);
  var Tag = as || "div";
  return <Tag ref={ref} className={className} style={{ ...style, transitionDelay: delay ? delay + "ms" : undefined }}>{children}</Tag>;
}
