"use client";
// Building blocks for the Expenses tab. Everything here is drawn with the
// hub's own classes (card, stat-card, btn, chip, seg, field-input, tooltip)
// and --b-* tokens, so the tracker reads as part of the site.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { money, compact, parseD } from "@/lib/expenses/util";

export const B = {
  navy: "var(--b-navy)", navyDeep: "var(--b-navy-deep)", navyLight: "var(--b-navy-light)",
  white: "var(--b-white)", grayText: "var(--b-gray-text)", grayMuted: "var(--b-gray-muted)",
  grayBorder: "var(--b-gray-border)", strong: "var(--b-border-strong)", subtle: "var(--b-subtle)",
  pos: "var(--b-pos)", neg: "var(--b-neg)", warn: "var(--b-warn)", accent: "var(--b-accent)", solar: "var(--b-solar)",
};
export const SERIES = ["var(--x-s1)", "var(--x-s2)", "var(--x-s3)", "var(--x-s4)", "var(--x-s5)", "var(--x-s6)", "var(--x-s7)", "var(--x-s8)"];
export const TONE = { good: B.pos, bad: B.neg, warn: B.warn };
export const tone = (good) => (good === true ? B.pos : good === false ? B.neg : undefined);

export const labelStyle = { fontSize: 10.5, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 0.18, fontWeight: 400 };
export const subStyle = { fontSize: 12, color: B.grayMuted, lineHeight: "18px" };

// ---------- icons (same stroke set and grid as the rest of the hub) ----------
const ICONS = {
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3",
  check: "M5 12l5 5L20 7",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  upload: "M12 21V9m0 0l-4 4m4-4l4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 18l-6-6 6-6",
  alert: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
  x: "M6 6l12 12M18 6L6 18",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  hammer: "M14 6l4 4M4 20l9-9M12 4l6 6 2-2-6-6z",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  printer: "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  dollar: "M12 2v20M17 6.5c-.8-1.5-2.6-2.5-5-2.5-3 0-5 1.4-5 3.5S9 10.6 12 11.3s5 1.8 5 4-2 3.7-5 3.7c-2.4 0-4.2-1-5-2.5",
};
export function Icon({ name, size, color }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---------- animated figures (same behavior as the hub's StatCard) ----------
function parseFigure(str) {
  if (typeof str !== "string" && typeof str !== "number") return null;
  str = String(str);
  var m = /-?[\d,]*\.?\d+/.exec(str);
  if (!m) return null;
  var raw = m[0];
  return { pre: str.slice(0, m.index), post: str.slice(m.index + raw.length), n: parseFloat(raw.replace(/,/g, "")), dec: raw.indexOf(".") >= 0 ? raw.split(".")[1].length : 0, grouped: raw.indexOf(",") >= 0 };
}
function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}
export function AnimatedNumber({ value }) {
  var ref = useRef(null);
  var fromRef = useRef(null);
  useEffect(function () {
    var el = ref.current;
    var target = parseFigure(value);
    if (!el || !target || reducedMotion()) { if (el) el.textContent = String(value); fromRef.current = target ? target.n : null; return; }
    var start = fromRef.current === null ? 0 : fromRef.current;
    fromRef.current = target.n;
    if (start === target.n) { el.textContent = String(value); return; }
    var useGrouping = target.grouped || Math.abs(target.n) < 1000;
    var t0 = performance.now(), dur = 750, raf;
    var tick = function (now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var cur = start + (target.n - start) * eased;
      el.textContent = p >= 1 ? String(value) : target.pre + cur.toLocaleString("en-US", { minimumFractionDigits: target.dec, maximumFractionDigits: target.dec, useGrouping: useGrouping }) + target.post;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return function () { cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className="num">{String(value)}</span>;
}

export function Stat({ label, value, sub, color, i, children }) {
  return (
    <div className="card card-hover stat-card reveal" style={{ "--i": i || 0, padding: "14px 16px 14px 18px", minWidth: 0 }}>
      <div style={{ ...labelStyle, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: color || B.white, lineHeight: "32px" }}><AnimatedNumber value={value} /></div>
      {children}
      {sub && <div style={{ fontSize: 11, color: B.grayMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
export function StatRow({ children, style }) {
  return <div className="stat-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 12, ...style }}>{children}</div>;
}

// ---------- surfaces ----------
export function Panel({ title, sub, action, children, flush, i, style }) {
  return (
    <div className="card reveal" style={{ "--i": i || 0, padding: flush ? 0 : 24, minWidth: 0, overflow: flush ? "hidden" : undefined, ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", padding: flush ? "20px 24px 0" : 0, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, color: B.white, lineHeight: "22px" }}>{title}</div>
            {sub && <div style={{ ...subStyle, marginTop: 2 }}>{sub}</div>}
          </div>
          {action && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
export function Grid({ cols, children, style }) {
  var tpl = cols === "21" ? "minmax(0, 2fr) minmax(0, 1fr)" : cols === "12" ? "minmax(0, 1fr) minmax(0, 2fr)" : cols === 3 ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))";
  return <div className="xt-grid" style={{ display: "grid", gridTemplateColumns: tpl, gap: 12, marginBottom: 12, ...style }}>{children}</div>;
}
export function SectionLabel({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "8px 0 10px" }}>
      <div style={{ fontSize: 10, lineHeight: "22px", color: B.white, textTransform: "uppercase", letterSpacing: 0.18 }}>{children}</div>
      {action && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

// Label/value line in the hub's results style. `total` draws the dashed rule.
export function Row({ label, value, total, color, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderTop: total ? "1px dashed " + B.grayBorder : "none", marginTop: total ? 4 : 0, paddingTop: total ? 8 : 5 }}>
      <span style={{ fontSize: 14, color: total ? B.white : B.grayText, fontWeight: total ? 500 : 400 }}>{label}</span>
      <span className="num" style={{ fontSize: 14, fontWeight: total ? 500 : 400, color: color || (muted ? B.grayMuted : B.white), whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

export function MiniFigure({ label, value, sub, color }) {
  return (
    <div style={{ background: B.navy, border: "1px solid " + B.grayBorder, borderRadius: 8, padding: "12px 14px", minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div className="num" style={{ fontSize: 20, lineHeight: "26px", color: color || B.white, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: B.grayMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const PILL_TONE = {
  Paid: "good", Pending: "warn", Scheduled: "", "In progress": "ink", Complete: "good", "On hold": "warn",
  Quoted: "", Ordered: "", Delivered: "ink", Installed: "good", Requested: "warn", Inspection: "", Funded: "good",
  Occupied: "good", Vacant: "bad", Notice: "warn", "Make-ready": "", Overdue: "bad", Logged: "good", Auto: "", Sub: "",
};
export function Pill({ children, t, onClick, title }) {
  var k = t !== undefined ? t : PILL_TONE[children] || "";
  var Tag = onClick ? "button" : "span";
  return <Tag type={onClick ? "button" : undefined} title={title} onClick={onClick} className={"xt-pill" + (k ? " xt-pill-" + k : "")} style={{ cursor: onClick ? "pointer" : undefined }}>{children}</Tag>;
}

export function Bar({ value, color, height, i }) {
  var v = Math.max(0, Math.min(1, value || 0));
  var over = value > 1;
  return (
    <div style={{ height: height || 6, background: B.subtle, borderRadius: 99, overflow: "hidden" }}>
      <div className="bar-grow" style={{ "--i": i || 0, width: v * 100 + "%", height: "100%", borderRadius: 99, background: over ? B.neg : color || B.accent }} />
    </div>
  );
}

export function Btn({ children, onClick, primary, small, icon, title, type, style }) {
  return (
    <button type={type || "button"} onClick={onClick} title={title} className={"btn " + (primary ? "btn-primary" : "btn-ghost")} style={{ height: small ? 32 : 40, padding: small ? "0 12px" : undefined, fontSize: small ? 13 : undefined, ...style }}>
      {icon && <Icon name={icon} size={small ? 13 : 14} />}{children}
    </button>
  );
}
// Quiet outline button for secondary actions inside tables and cards.
export function LinkBtn({ children, onClick, icon, title }) {
  return <button type="button" className="xt-link" onClick={onClick} title={title}>{icon && <Icon name={icon} size={13} />}{children}</button>;
}

export function Empty({ title, text, action }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: B.grayMuted }}>
      <div style={{ fontSize: 15, color: B.white, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function CheckRow({ level, title, sub, value }) {
  var c = TONE[level] || B.grayMuted;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid " + B.grayBorder }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center", border: "1px solid " + B.grayBorder, color: c }}><Icon name={level === "good" ? "check" : "alert"} size={13} /></span>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, color: B.white }}>{title}</div><div style={subStyle}>{sub}</div></div>
      <span className="num" style={{ fontSize: 14, color: B.white, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

export function AlertList({ alerts, limit, onOpen }) {
  if (!alerts.length) return <Empty title="All clear" text="Nothing needs your attention." />;
  return (
    <div>
      {alerts.slice(0, limit || 8).map(function (a, i) {
        return (
          <button key={i} type="button" className="xt-row-btn" onClick={function () { onOpen(a); }} style={{ gridTemplateColumns: "10px minmax(0,1fr)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, marginTop: 7, background: TONE[a.level] || B.grayMuted }} />
            <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 14, color: B.white }}>{a.title}</span><span style={{ display: "block", ...subStyle }}>{a.text}</span></span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- segmented control (same sliding pill as the hub's) ----------
export function Segmented({ options, value, onChange }) {
  var wrapRef = useRef(null);
  var indRef = useRef(null);
  useLayoutEffect(function () {
    var wrap = wrapRef.current, ind = indRef.current;
    if (!wrap || !ind) return;
    var place = function () {
      var el = wrap.querySelector('[data-k="' + value + '"]');
      if (!el) { ind.style.opacity = 0; return; }
      ind.style.opacity = 1;
      ind.style.width = el.offsetWidth + "px";
      ind.style.transform = "translateX(" + el.offsetLeft + "px)";
    };
    place();
    var ro = new ResizeObserver(place);
    ro.observe(wrap);
    return function () { ro.disconnect(); };
  }, [value, options.length]);
  return (
    <div className="nav-scroll" style={{ maxWidth: "100%" }}>
      <div ref={wrapRef} className="seg" style={{ width: "max-content" }} role="tablist">
        <span ref={indRef} className="seg-indicator" style={{ opacity: 0 }} />
        {options.map(function (o) {
          var active = o.key === value;
          return (
            <button key={o.key} data-k={o.key} role="tab" aria-selected={active} className="seg-btn" onClick={function () { onChange(o.key); }}
              style={{ padding: "8px 12px", fontSize: 11.5, borderRadius: 9, color: active ? B.white : B.grayMuted, letterSpacing: 0.6, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              {o.label}{o.count != null && <span className="num" style={{ fontSize: 10, color: B.grayMuted }}>{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- inputs ----------
export function FieldLabel({ children }) {
  return <label style={{ display: "block", fontSize: 10.5, color: B.grayText, marginBottom: 5, letterSpacing: 0.18, textTransform: "uppercase" }}>{children}</label>;
}
// Text/number/date input with the hub's $ prefix and unit suffix treatment.
export function Input({ value, onChange, type, prefix, suffix, placeholder, list, required, step, style, autoFocus }) {
  var isNum = type === "number" || type === "money";
  return (
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, fontSize: 13, pointerEvents: "none" }}>{prefix}</span>}
      <input className="field-input" type={isNum ? "number" : type || "text"} step={isNum ? step || "any" : undefined} value={value ?? ""} placeholder={placeholder} list={list} required={required} autoFocus={autoFocus}
        onChange={function (e) { onChange(isNum ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value); }}
        style={{ padding: prefix ? "10px 12px 10px 26px" : suffix ? "10px 44px 10px 12px" : "10px 12px", ...style }} />
      {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, fontSize: 11, pointerEvents: "none" }}>{suffix}</span>}
    </div>
  );
}
export function Field({ label, hint, full, children }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined, minWidth: 0 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: B.grayMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
export function FormGrid({ children, cols }) {
  return <div className="xt-form" style={{ display: "grid", gridTemplateColumns: "repeat(" + (cols || 2) + ", minmax(0, 1fr))", gap: 14 }}>{children}</div>;
}
export function Select({ value, onChange, options, style }) {
  return (
    <select className="field-input" value={value ?? ""} onChange={function (e) { onChange(e.target.value); }} style={{ padding: "10px 12px", ...style }}>
      {options.map(function (o) { var v = typeof o === "string" ? o : o.value; return <option key={v} value={v}>{typeof o === "string" ? o : o.label}</option>; })}
    </select>
  );
}
export function Check({ checked, onChange, children }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: B.white, cursor: "pointer" }}>
      <input type="checkbox" checked={!!checked} onChange={function (e) { onChange(e.target.checked); }} style={{ width: 16, height: 16, accentColor: "var(--b-ink)" }} />{children}
    </label>
  );
}

// ---------- modal + toast hosts ----------
// A tiny module-level store so any handler can open a dialog or a toast
// without threading callbacks through every component.
var overlay = { modal: null, toasts: [] };
var overlayListeners = new Set();
var emitOverlay = function () { overlay = { ...overlay }; overlayListeners.forEach(function (f) { f(); }); };
var subscribeOverlay = function (f) { overlayListeners.add(f); return function () { overlayListeners.delete(f); }; };
var getOverlay = function () { return overlay; };

export function openModal(render, opts) { overlay.modal = { render: render, wide: opts && opts.wide, key: Date.now() }; emitOverlay(); }
export function closeModal() { overlay.modal = null; emitOverlay(); }
export function toast(msg, opts) {
  var id = Math.random();
  overlay.toasts = overlay.toasts.concat([{ id: id, msg: msg, undo: opts && opts.undo }]).slice(-3);
  emitOverlay();
  setTimeout(function () { overlay.toasts = overlay.toasts.filter(function (t) { return t.id !== id; }); emitOverlay(); }, opts && opts.undo ? 6000 : 3200);
}

export function OverlayHost() {
  var o = useSyncExternalStore(subscribeOverlay, getOverlay, getOverlay);
  useEffect(function () {
    if (!o.modal) return;
    var onKey = function (e) { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [o.modal]);
  return (
    <>
      {o.modal && (
        <div className="xt-scrim" onMouseDown={function (e) { if (e.target === e.currentTarget) closeModal(); }}>
          <div key={o.modal.key} className="card scale-in xt-modal" role="dialog" aria-modal="true" style={{ maxWidth: o.modal.wide ? 680 : 520 }}>{o.modal.render()}</div>
        </div>
      )}
      <div className="xt-toasts" aria-live="polite">
        {o.toasts.map(function (t) {
          return (
            <div key={t.id} className="xt-toast scale-in">
              <span>{t.msg}</span>
              {t.undo && <button type="button" onClick={function () { t.undo(); overlay.toasts = overlay.toasts.filter(function (x) { return x.id !== t.id; }); emitOverlay(); }}>Undo</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ModalHead({ title, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "22px 24px 0" }}>
      <div><div style={{ fontSize: 20, lineHeight: "26px", color: B.white }}>{title}</div>{sub && <div style={{ ...subStyle, marginTop: 4, fontSize: 13 }}>{sub}</div>}</div>
      <button type="button" className="icon-btn xt-x" aria-label="Close" onClick={closeModal}><Icon name="x" size={16} /></button>
    </div>
  );
}
export function ModalFoot({ children }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", padding: "16px 24px 22px", borderTop: "1px solid " + B.grayBorder, marginTop: 20 }}>{children}</div>;
}

// Schema-driven form dialog. Fields: { k, label, type: text|money|number|
// date|select|checkbox, options, list, required, full, hint, placeholder }.
function FormBody({ title, subtitle, fields, values, submit, onSubmit, onDelete }) {
  var [v, setV] = useState(function () { return { ...(values || {}) }; });
  var set = function (k) { return function (x) { setV(function (cur) { return { ...cur, [k]: x }; }); }; };
  var listId = function (f) { return f.list ? "xt-list-" + f.k : undefined; };
  return (
    <form onSubmit={function (e) { e.preventDefault(); if (onSubmit(v) !== false) closeModal(); }}>
      <ModalHead title={title} sub={subtitle} />
      <div style={{ padding: "20px 24px 0" }}>
        <FormGrid>
          {fields.map(function (f, i) {
            if (f.type === "checkbox") return <div key={f.k} style={{ gridColumn: "1 / -1" }}><Check checked={v[f.k]} onChange={set(f.k)}>{f.label}</Check></div>;
            return (
              <Field key={f.k} label={f.label} hint={f.hint} full={f.full}>
                {f.type === "select"
                  ? <Select value={v[f.k]} onChange={set(f.k)} options={f.options} />
                  : <Input value={v[f.k]} onChange={set(f.k)} type={f.type} prefix={f.type === "money" ? "$" : undefined} placeholder={f.placeholder} list={listId(f)} required={f.required} autoFocus={i === 0} />}
                {f.list && <datalist id={listId(f)}>{f.list.map(function (o) { return <option key={o} value={o} />; })}</datalist>}
              </Field>
            );
          })}
        </FormGrid>
      </div>
      <ModalFoot>
        {onDelete && <button type="button" className="xt-link xt-danger" style={{ marginRight: "auto" }} onClick={function () { onDelete(); closeModal(); }}><Icon name="trash" size={13} />Delete</button>}
        <Btn onClick={closeModal}>Cancel</Btn>
        <Btn primary type="submit">{submit || "Save"}</Btn>
      </ModalFoot>
    </form>
  );
}
export function openForm(cfg) { openModal(function () { return <FormBody {...cfg} />; }, { wide: cfg.fields.length > 6 }); }

// ---------- tables ----------
export function Table({ head, children, foot, minWidth }) {
  return (
    <div className="xt-table-wrap">
      <table className="data-table xt-table" style={{ minWidth: minWidth || 640 }}>
        <thead><tr>{head.map(function (h, i) { var r = typeof h === "object" && h; return <th key={i} className={r && r.r ? "r" : undefined} style={r && r.w ? { width: r.w } : undefined}>{r ? r.t : h}</th>; })}</tr></thead>
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  );
}

// ---------- charts ----------
// Waterfall: start bar, cost steps down, and a closing total. Hover a bar
// for its figure.
export function Waterfall({ steps }) {
  var [hover, setHover] = useState(null);
  var W = 620, H = 230, padL = 52, padB = 34, padT = 12;
  // Each bar spans [lo, hi]: costs step down from the running total.
  var bars = [];
  steps.forEach(function (s, i) {
    var run = i === 0 ? 0 : bars[i - 1].kind === "start" ? bars[i - 1].hi : bars[i - 1].lo;
    var b = s.kind === "start" ? { lo: 0, hi: s.value }
      : s.kind === "cost" ? { lo: run - s.value, hi: run }
      : { lo: Math.min(0, s.value), hi: Math.max(0, s.value) };
    bars.push({ ...s, ...b });
  });
  var max = Math.max.apply(null, bars.map(function (b) { return b.hi; }).concat([1]));
  var min = Math.min.apply(null, bars.map(function (b) { return b.lo; }).concat([0]));
  var plotW = W - padL - 6, plotH = H - padB - padT;
  var span = max - min || 1;
  var y = function (v) { return padT + ((max - v) / span) * plotH; };
  var slot = plotW / bars.length, bw = Math.min(46, slot - 12);
  var ticks = [min, (max + min) / 2, max].filter(function (t, i, a) { return a.indexOf(t) === i; });
  var fill = function (b) { return b.kind === "start" ? B.accent : b.kind === "cost" ? "var(--x-cost)" : b.value >= 0 ? B.pos : B.neg; };
  var h = hover !== null ? bars[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img" aria-label="Waterfall" style={{ display: "block", overflow: "visible" }} onMouseLeave={function () { setHover(null); }}>
        {ticks.map(function (t) { return (<g key={t}><line x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--b-gray-border)" strokeDasharray={t === 0 ? "" : "3 4"} /><text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--b-gray-muted)">{compact(t)}</text></g>); })}
        {bars.map(function (b, i) {
          var x = padL + i * slot + (slot - bw) / 2;
          var top = y(b.hi), hgt = Math.max(2, y(b.lo) - y(b.hi));
          return (
            <g key={b.label} onMouseEnter={function () { setHover(i); }}>
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
              <rect className="col-grow" style={{ "--i": i }} x={x} y={top} width={bw} height={hgt} rx="3" fill={fill(b)} opacity={hover === null || hover === i ? 1 : 0.45} />
              {i < bars.length - 1 && b.kind !== "total" && <line x1={x + bw} x2={x + slot} y1={b.kind === "start" ? top : y(b.lo)} y2={b.kind === "start" ? top : y(b.lo)} stroke="var(--b-border-strong)" strokeDasharray="2 3" />}
              <text x={x + bw / 2} y={H - 18} textAnchor="middle" fontSize="10" fill="var(--b-gray-muted)">{b.label.split(" ")[0]}</text>
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--b-gray-muted)">{b.label.split(" ").slice(1).join(" ")}</text>
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: ((padL + hover * slot + slot / 2) / W) * 100 + "%", top: (y(h.hi) / H) * 100 + "%" }}>
          <div style={{ color: B.white, marginBottom: 2 }}>{h.label}</div>
          <div className="num" style={{ color: h.kind === "cost" ? B.grayText : B.white }}>{h.kind === "cost" ? "−" : ""}{money(h.value)}</div>
        </div>
      )}
    </div>
  );
}

// Cumulative spend (stepped, filled) against a dashed straight-line pace.
export function SpendChart({ series, pace }) {
  var [hover, setHover] = useState(null);
  var W = 620, H = 210, padL = 52, padB = 22, padT = 10;
  var t = function (s) { return parseD(s).getTime(); };
  var all = series.concat(pace);
  var x0 = Math.min.apply(null, all.map(function (p) { return t(p.x); }));
  var x1 = Math.max.apply(null, all.map(function (p) { return t(p.x); }));
  var top = Math.max.apply(null, all.map(function (p) { return p.y; }).concat([1])) * 1.08;
  var plotW = W - padL - 8, plotH = H - padB - padT;
  var X = function (s) { return padL + ((t(s) - x0) / (x1 - x0 || 1)) * plotW; };
  var Y = function (v) { return padT + plotH - (v / top) * plotH; };
  var d = "";
  series.forEach(function (p, i) { d += i === 0 ? "M" + X(p.x) + "," + Y(p.y) : "H" + X(p.x) + "V" + Y(p.y); });
  var area = d + "V" + Y(0) + "H" + X(series[0].x) + "Z";
  var ticks = [0, top / 2, top];
  var months = [];
  var m = new Date(x0); m.setDate(1); m.setMonth(m.getMonth() + 1);
  while (m.getTime() <= x1) { months.push(new Date(m)); m.setMonth(m.getMonth() + 1); }
  var step = Math.ceil(months.length / 6) || 1;
  var h = hover !== null ? series[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img" aria-label="Rehab spend over time" style={{ display: "block", overflow: "visible" }}
        onMouseLeave={function () { setHover(null); }}
        onMouseMove={function (e) {
          var r = e.currentTarget.getBoundingClientRect();
          var px = ((e.clientX - r.left) / r.width) * W;
          var best = 0, bd = Infinity;
          series.forEach(function (p, i) { var dd = Math.abs(X(p.x) - px); if (dd < bd) { bd = dd; best = i; } });
          setHover(best);
        }}>
        {ticks.map(function (v) { return (<g key={v}><line x1={padL} x2={W - 8} y1={Y(v)} y2={Y(v)} stroke="var(--b-gray-border)" strokeDasharray={v === 0 ? "" : "3 4"} /><text x={padL - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="var(--b-gray-muted)">{compact(v)}</text></g>); })}
        {months.map(function (mm, i) { return i % step ? null : <text key={i} x={X(mm.toISOString().slice(0, 10))} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--b-gray-muted)">{mm.toLocaleDateString("en-US", { month: "short" })}</text>; })}
        <path d={area} fill="var(--b-solar)" opacity="0.35" />
        <path d={d} fill="none" stroke="var(--b-accent)" strokeWidth="2" />
        <line x1={X(pace[0].x)} y1={Y(pace[0].y)} x2={X(pace[1].x)} y2={Y(pace[1].y)} stroke="var(--b-gray-muted)" strokeWidth="1.5" strokeDasharray="5 5" />
        {h && <circle cx={X(h.x)} cy={Y(h.y)} r="4" fill="var(--b-navy-light)" stroke="var(--b-accent)" strokeWidth="2" />}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: (X(h.x) / W) * 100 + "%", top: (Y(h.y) / H) * 100 + "%" }}>
          <div style={{ color: B.white, marginBottom: 2 }}>{parseD(h.x).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          <div className="num" style={{ color: B.white }}>{money(h.y)} spent</div>
        </div>
      )}
    </div>
  );
}

// One horizontal stacked bar plus a legend list with values.
export function StackBar({ segs, legend, height }) {
  var total = segs.reduce(function (a, s) { return a + Math.max(0, s.value); }, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", gap: 2, height: height || 12, borderRadius: 6, overflow: "hidden", background: B.subtle }}>
        {segs.map(function (s, i) { return s.value > 0 ? <div key={s.label} className="bar-grow" title={s.label + " · " + money(s.value)} style={{ "--i": i, width: (s.value / total) * 100 + "%", background: s.color }} /> : null; })}
      </div>
      {legend !== false && (
        <div style={{ marginTop: 12 }}>
          {segs.map(function (s) {
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0, border: "1px solid " + B.grayBorder }} />
                <span style={{ fontSize: 13, color: B.grayText, flex: 1, minWidth: 0 }}>{s.label}</span>
                <span className="num" style={{ fontSize: 13, color: B.white }}>{money(s.value)}</span>
                <span className="num" style={{ fontSize: 11, color: B.grayMuted, width: 38, textAlign: "right" }}>{Math.round((Math.max(0, s.value) / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Budget vs. actual by category: paid (ink) + pending (solar) on a budget track.
export function CategoryBars({ cats, limit }) {
  var rows = cats.filter(function (c) { return c.budget || c.spent; }).sort(function (a, b) { return b.spent / (b.budget || 1) - a.spent / (a.budget || 1); }).slice(0, limit || 99);
  if (!rows.length) return <Empty title="No budget yet" text="Add budget lines to compare against spend." />;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map(function (c, i) {
        var base = Math.max(c.budget, c.spent) || 1;
        return (
          <div key={c.category}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: B.white }}>{c.category}</span>
              <span className="num" style={{ color: c.over ? B.neg : B.grayText }}>{money(c.spent)} <span style={{ color: B.grayMuted }}>/ {money(c.budget)}</span></span>
            </div>
            <div style={{ position: "relative", display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: B.subtle }}>
              <div className="bar-grow" style={{ "--i": i, width: (c.paid / base) * 100 + "%", background: c.over ? B.neg : B.accent }} />
              <div className="bar-grow" style={{ "--i": i, width: (c.pending / base) * 100 + "%", background: B.solar }} />
              {c.over && <span style={{ position: "absolute", top: 0, bottom: 0, left: (c.budget / base) * 100 + "%", width: 2, background: B.navyLight }} />}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: B.grayMuted }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: B.accent }} />Paid</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: B.solar }} />Pending</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: B.neg }} />Over budget</span>
      </div>
    </div>
  );
}

// Big figure over a thick progress bar — replaces the radial gauges.
export function Meter({ value, figure, label, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span className="num" style={{ fontSize: 40, lineHeight: "44px", color: color || B.white }}><AnimatedNumber value={figure} /></span>
        <span style={{ fontSize: 13, color: B.grayMuted }}>{label}</span>
      </div>
      <Bar value={Math.min(1, value)} height={12} color={color} />
    </div>
  );
}
