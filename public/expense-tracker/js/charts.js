// Hand-rolled SVG/HTML charts. Each returns markup; hover is wired via data-tip
// (per-mark tooltips) or bindLineCharts (crosshair).
import { esc, money, compact, pct, parseD, fmtDate, uid, iso } from './util.js';

export const tipHTML = (title, rows) =>
  `<div class="t-title">${esc(title)}</div>` + rows.map(([l, v, c]) =>
    `<div class="t-row"><span>${c ? `<i class="sw" style="background:${c}"></i>` : ''}${esc(l)}</span><b>${esc(v)}</b></div>`).join('');
// escaped for use inside a data-tip="" attribute
export const tipRows = (title, rows) => esc(tipHTML(title, rows));

// ---- donut ----
export function donut(segments, { center = '', centerLabel = '' } = {}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const r = 70, C = 2 * Math.PI * r, gap = segments.length > 1 ? 3 : 0;
  let off = 0;
  const arcs = segments.map((s, i) => {
    const len = Math.max(0, (Math.max(0, s.value) / total) * C - gap);
    const el = `<circle class="seg arc" style="--i:${i}" cx="90" cy="90" r="${r}" fill="none" stroke="${s.color}" stroke-width="22"
      stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}"
      data-tip="${tipRows(s.label, [['Amount', money(s.value)], ['Share', pct(s.value / total)]])}"></circle>`;
    off += len + gap;
    return el;
  }).join('');
  const legend = segments.map((s) => `
    <div class="row"><i style="background:${s.color}"></i><span>${esc(s.label)}</span>
    <span class="v">${money(s.value)}</span><span class="p">${pct(s.value / total, 0)}</span></div>`).join('');
  return `<div class="donut-wrap">
    <div class="donut"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="22"/>${arcs}</svg>
      <div class="center"><b>${center}</b><span>${esc(centerLabel)}</span></div></div>
    <div class="d-legend">${legend}</div></div>`;
}

// ---- budget vs actual bars ----
export function budgetBars(cats, { limit = 0 } = {}) {
  let rows = cats.filter((c) => c.budget > 0 || c.spent > 0);
  rows.sort((a, b) => b.budget - a.budget);
  if (limit) rows = rows.slice(0, limit);
  if (!rows.length) return `<div class="empty"><b>No budget yet</b>Add budget lines to see progress.</div>`;
  return `<div class="hbars">${rows.map((c, i) => {
    const denom = Math.max(c.budget, c.spent) || 1;
    const paidW = (c.paid / denom) * 100, pendW = (c.pending / denom) * 100;
    const over = c.spent > c.budget;
    const color = over ? 'var(--bad)' : 'var(--accent)';
    const tip = tipRows(c.category, [['Budget', money(c.budget)], ['Paid', money(c.paid), color], ['Pending', money(c.pending)], [over ? 'Over by' : 'Remaining', money(Math.abs(c.remaining))]]);
    return `<div class="hbar" data-tip="${tip}">
      <div class="top"><span>${esc(c.category)} ${over ? '<span class="pill bad plain" style="margin-left:6px">Over</span>' : ''}</span>
      <span class="v">${money(c.spent)} <span class="muted">/ ${money(c.budget)}</span></span></div>
      <div class="track">
        <span class="fill grow" style="--i:${i};width:${paidW}%;background:${color}"></span>
        <span class="fill pending grow" style="--i:${i};left:${paidW}%;width:${pendW}%;background:${color}"></span>
        ${over ? `<span style="position:absolute;top:0;bottom:0;left:${(c.budget / denom) * 100}%;width:2px;background:#fff"></span>` : ''}
      </div></div>`;
  }).join('')}</div>`;
}

// ---- line chart (cumulative spend vs budget pace) ----
const lineData = new Map();
export function lineChart(series, { height = 240, yFmt = compact } = {}) {
  const id = 'lc' + uid();
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return `<div class="empty"><b>Not enough data yet</b>Log a few expenses to see the curve.</div>`;
  const xs = all.map((p) => +parseD(p.x)), ys = all.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const yMax = niceMax(Math.max(...ys, 1));
  const W = 1000, H = 400;
  const X = (d) => ((+parseD(d) - x0) / (x1 - x0 || 1)) * W;
  const Y = (v) => H - (v / yMax) * H;
  const paths = series.map((s, si) => {
    const pts = s.points;
    let d = '';
    pts.forEach((p, i) => {
      const x = X(p.x).toFixed(1), y = Y(p.y).toFixed(1);
      if (i === 0) d += `M${x},${y}`;
      else if (s.step) d += `H${x}V${y}`;
      else d += `L${x},${y}`;
    });
    const area = s.area ? `<path d="${d}V${H}H${X(pts[0].x)}Z" fill="url(#${id}g${si})" class="fade-late"/>
      <defs><linearGradient id="${id}g${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>` : '';
    return `${area}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" vector-effect="non-scaling-stroke"
      ${s.dashed ? 'stroke-dasharray="5 5"' : 'pathLength="1" class="draw"'} stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const ticks = [0, .25, .5, .75, 1].map((t) => t * yMax);
  const grid = ticks.map((t) => `<line x1="0" x2="${W}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
  const ylabs = ticks.map((t) => `<span class="ylab" style="top:calc(8px + ${(1 - t / yMax)} * (100% - 34px))">${yFmt(t)}</span>`).join('');
  const nX = 5;
  const xlabs = Array.from({ length: nX }, (_, i) => {
    const ms = x0 + ((x1 - x0) * i) / (nX - 1);
    const d = new Date(ms);
    return `<span class="xlab" style="left:calc(52px + ${i / (nX - 1)} * (100% - 60px))">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
  }).join('');
  lineData.set(id, { series, x0, x1, yMax, yFmt });
  return `<div class="line-chart" id="${id}" style="height:${height}px">${ylabs}${xlabs}
    <div class="plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${paths}</svg>
      <div class="cross"></div>${series.map((s) => `<div class="cdot" style="background:${s.color}"></div>`).join('')}</div></div>`;
}
// round the top of the axis so four gridlines land on clean values
function niceMax(v) {
  const raw = v * 1.05 / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw);
  return step * 4;
}
const valueAt = (s, ms) => {
  const pts = s.points;
  let v = pts[0].y;
  for (let i = 0; i < pts.length; i++) {
    const t = +parseD(pts[i].x);
    if (t > ms) {
      if (s.step || i === 0) return v;
      const t0 = +parseD(pts[i - 1].x);
      return pts[i - 1].y + (pts[i].y - pts[i - 1].y) * ((ms - t0) / (t - t0));
    }
    v = pts[i].y;
  }
  return v;
};
export function bindLineCharts(root, tip) {
  root.querySelectorAll('.line-chart').forEach((el) => {
    const data = lineData.get(el.id);
    if (!data) return;
    const plot = el.querySelector('.plot'), cross = el.querySelector('.cross'), dots = el.querySelectorAll('.cdot');
    plot.addEventListener('mousemove', (ev) => {
      const r = plot.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      const ms = data.x0 + fx * (data.x1 - data.x0);
      el.classList.add('hovering');
      cross.style.left = `${fx * 100}%`;
      const rows = data.series.map((s, i) => {
        const v = valueAt(s, ms);
        dots[i].style.left = `${fx * 100}%`;
        dots[i].style.top = `${(1 - v / data.yMax) * 100}%`;
        return [s.name, money(v), s.color];
      });
      tip.show(tipHTML(fmtDate(iso(new Date(ms))), rows), ev.clientX, ev.clientY, true);
    });
    plot.addEventListener('mouseleave', () => { el.classList.remove('hovering'); tip.hide(); });
  });
}

// ---- waterfall ----
// steps: [{label, value, kind: 'start'|'cost'|'total'}]
export function waterfall(steps) {
  let run = 0;
  const bars = steps.map((s) => {
    let a, b;
    if (s.kind === 'start') { a = 0; b = s.value; run = s.value; }
    else if (s.kind === 'total') { a = 0; b = run; }
    else { a = run; b = run - s.value; run = b; }
    return { ...s, lo: Math.min(a, b), hi: Math.max(a, b), end: s.kind === 'total' ? run : b };
  });
  const min = Math.min(0, ...bars.map((b) => b.lo)), max = Math.max(...bars.map((b) => b.hi), 1);
  const span = max - min;
  const pctOf = (v) => ((v - min) / span) * 100;
  return `<div class="wf">${bars.map((b, i) => {
    const color = b.kind === 'start' ? 'var(--s1)' : b.kind === 'total' ? (b.end >= 0 ? 'var(--good)' : 'var(--bad)') : '#a3acb9';
    const v = b.kind === 'cost' ? `−${compact(b.value)}` : compact(b.kind === 'total' ? b.end : b.value);
    const below = b.kind === 'total' && b.end < 0;
    const next = bars[i + 1];
    const conn = next && b.kind !== 'total' ? `<span class="wf-connector" style="bottom:${pctOf(b.end)}%"></span>` : '';
    return `<div class="wf-col"><div class="wf-area">
      <div class="wf-bar grow-y ${below ? 'below' : ''}" style="--i:${i};bottom:${pctOf(b.lo)}%;height:max(2px, ${pctOf(b.hi) - pctOf(b.lo)}%);background:${color}"
        data-tip="${tipRows(b.label, [[b.kind === 'cost' ? 'Cost' : 'Amount', money(b.kind === 'total' ? b.end : b.value)]])}">
        <span class="wf-v">${v}</span></div>${conn}</div>
      <div class="wf-lab">${esc(b.label)}</div></div>`;
  }).join('')}</div>`;
}

// ---- semicircle gauge ----
export function gauge(frac, { label = '', value = '', color = 'var(--accent)' } = {}) {
  const f = Math.max(0, Math.min(1, frac));
  const r = 90, L = Math.PI * r;
  return `<div class="gauge"><svg viewBox="0 0 220 120">
    <path d="M20,110 A${r},${r} 0 0 1 200,110" fill="none" stroke="var(--line-2)" stroke-width="16" stroke-linecap="round"/>
    <path class="arc" d="M20,110 A${r},${r} 0 0 1 200,110" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="${f * L} ${L}"/>
    </svg><div class="g-center"><b>${value}</b><span>${esc(label)}</span></div></div>`;
}

// ---- stacked composition bar ----
export function stack(parts) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  return `<div class="su-stack">${parts.map((p, i) => `<span class="grow" style="--i:${i};flex:${Math.max(0, p.value) / total};background:${p.color}"
    data-tip="${tipRows(p.label, [['Amount', money(p.value)], ['Share', pct(p.value / total)]])}"></span>`).join('')}</div>`;
}

// ---- tiny sparkline ----
export function sparkline(points, color = 'var(--accent)') {
  if (points.length < 2) return '';
  const ys = points.map((p) => p.y), max = Math.max(...ys, 1);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i / (points.length - 1)) * 100},${28 - (p.y / max) * 26}`).join('');
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" pathLength="1" class="draw"/></svg>`;
}
