// Formatting, dates and small helpers shared by the expense tracker.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const sum = (arr, f) =>
  (arr || []).reduce((a, x) => a + (typeof f === 'function' ? f(x) : +x[f] || 0), 0);

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

export const csvDownload = (filename, rows) => {
  const body = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
