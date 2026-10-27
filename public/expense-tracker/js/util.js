// Formatting, dates and small DOM helpers shared by every view.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sum = (arr, f) =>
  (arr || []).reduce((a, x) => a + (typeof f === 'function' ? f(x) : +x[f] || 0), 0);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (n, cents = false) => (Number.isFinite(n) ? (cents ? usd2 : usd0).format(n) : '—');
export const compact = (n) => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(1)}k`;
  return money(n);
};
export const pct = (n, d = 1) => (Number.isFinite(n) ? `${(n * 100).toFixed(d)}%` : '∞');
export const num = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—');

export const FMT = {
  money: (n) => money(n),
  compact,
  pct: (n) => pct(n),
  pct0: (n) => pct(n, 0),
  num: (n) => num(n),
  x: (n) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : '—'),
  days: (n) => `${Math.round(n)}d`,
  mo: (n) => `${n.toFixed(1)} mo`,
};

// ---- dates (local, YYYY-MM-DD) ----
export const parseD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export const addDays = (n, base) => {
  const d = base ? parseD(base) : new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const daysBetween = (a, b) => (a && b ? Math.round((parseD(b) - parseD(a)) / 864e5) : 0);
export const fmtDate = (s, year = true) =>
  s ? parseD(s).toLocaleDateString('en-US', year ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' }) : '—';
export const relDays = (s) => {
  const d = daysBetween(today(), s);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
};

export const initials = (s) => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- animated counters ----
// Values tween from their last rendered value, so editing an input makes the
// affected numbers roll instead of jump. On navigation they count up from zero.
const lastVals = new Map();
export function counter(value, fmt = 'money', key = '') {
  const f = FMT[fmt] || FMT.money;
  return `<span data-count="${Number.isFinite(value) ? value : ''}" data-fmt="${fmt}" data-key="${esc(key)}">${f(value)}</span>`;
}
export function runCounters(root, fromZero) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const raw = el.dataset.count;
    const fmt = FMT[el.dataset.fmt] || FMT.money;
    const key = el.dataset.key;
    if (raw === '') return;
    const to = +raw;
    const from = fromZero ? 0 : key && lastVals.has(key) ? lastVals.get(key) : to;
    if (key) lastVals.set(key, to);
    if (from === to || reducedMotion()) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const dur = fromZero ? 1200 : 550;
    el.textContent = fmt(from);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export const csvDownload = (filename, rows) => {
  const body = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
