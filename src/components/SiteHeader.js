"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Show, UserButton, useUser } from "@clerk/nextjs";
import { Icon, ThemeToggle } from "@/components/ui";
import { isAdminUser } from "@/lib/admin";

export const NAV_ITEMS = [
  { key: "analyzer", label: "Analyze" },
  { key: "markets", label: "Markets" },
  { key: "equity", label: "Equity" },
  { key: "portfolio", label: "Portfolio" },
  { key: "compare", label: "Compare" },
  { key: "insights", label: "Insights", href: "/insights" },
];

export function BrandMark({ size }) {
  var s = size || 30;
  return (
    <span style={{ width: s, height: s, borderRadius: s * 0.3, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--b-accent), var(--b-accent-2))", boxShadow: "0 6px 16px -6px var(--b-green-glow)", flexShrink: 0 }}>
      <svg width={s * 0.6} height={s * 0.6} viewBox="0 0 24 24" fill="none" stroke="var(--b-on-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11l9-7 9 7M6 9.5V20h12V9.5M10 20v-5h4v5" />
      </svg>
    </span>
  );
}

// `active` is the current section key. When `onNavigate` is given (inside
// the app) tab items switch in place; otherwise they link to /?tab=key.
export default function SiteHeader({ active, onNavigate, extraItems }) {
  var headerRef = useRef(null);
  var navRef = useRef(null);
  var hoverRef = useRef(null);
  var activeRef = useRef(null);
  var { user } = useUser();
  var isStaff = isAdminUser(user);
  var items = NAV_ITEMS.concat(extraItems || []);

  useEffect(function () {
    var onScroll = function () { if (headerRef.current) headerRef.current.setAttribute("data-scrolled", window.scrollY > 4 ? "true" : "false"); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  // Underline under the active item; slides when the section changes.
  useLayoutEffect(function () {
    var nav = navRef.current, bar = activeRef.current;
    if (!nav || !bar) return;
    var place = function () {
      var el = nav.querySelector('[data-k="' + active + '"]');
      if (!el) { bar.style.opacity = 0; return; }
      bar.style.opacity = 1;
      bar.style.width = (el.offsetWidth - 24) + "px";
      bar.style.transform = "translateX(" + (el.offsetLeft + 12) + "px)";
    };
    place();
    var ro = new ResizeObserver(place);
    ro.observe(nav);
    return function () { ro.disconnect(); };
  }, [active, items.length]);

  var moveHover = function (e) {
    var pill = hoverRef.current;
    if (!pill) return;
    var el = e.currentTarget;
    pill.style.width = el.offsetWidth + "px";
    pill.style.transform = "translateX(" + el.offsetLeft + "px)";
    pill.style.opacity = 1;
  };
  var hideHover = function () { if (hoverRef.current) hoverRef.current.style.opacity = 0; };

  return (
    <header ref={headerRef} className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" onClick={onNavigate ? function (e) { e.preventDefault(); onNavigate("analyzer"); } : undefined}>
          <BrandMark />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, color: "var(--b-white)" }}>Investor Hub</span>
            <span className="hide-sm" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--b-gray-muted)", marginTop: 2 }}>Capital Region · Empire Real Estate Firm</span>
          </span>
        </Link>

        <nav ref={navRef} className="site-nav nav-scroll" onMouseLeave={hideHover} aria-label="Main">
          <span ref={hoverRef} className="nav-hover" />
          <span ref={activeRef} className="nav-active" />
          {items.map(function (it) {
            var isActive = it.key === active;
            var common = { "data-k": it.key, "data-active": isActive, className: "nav-link", onMouseEnter: moveHover, "aria-current": isActive ? "page" : undefined };
            if (it.href || !onNavigate) {
              return <Link key={it.key} href={it.href || "/?tab=" + it.key} {...common}>{it.label}</Link>;
            }
            return <button key={it.key} type="button" onClick={function () { onNavigate(it.key); }} {...common}>{it.label}</button>;
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8, justifySelf: "end" }}>
          <ThemeToggle />
          <Show when="signed-in">
            <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }}>
              {isStaff && (
                <UserButton.MenuItems>
                  <UserButton.Link label="Advertise Studio" href="/advertise" labelIcon={<Icon name="video" size={14} />} />
                </UserButton.MenuItems>
              )}
            </UserButton>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
