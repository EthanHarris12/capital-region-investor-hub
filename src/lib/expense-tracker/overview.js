// Portfolio overview: rollup KPIs, deal cards, alerts and activity.
import { getState, FLIP_STAGES, BRRRR_STAGES } from './store.js';
import { portfolio } from './calc.js';
import { esc, money, compact, pct, counter, fmtDate, relDays, today, addDays, initials, daysBetween } from './util.js';
import { icon } from './ui.js';
import { tipRows } from './charts.js';

let filter = 'all';

export function alertsFor(p, c) {
  const out = [];
  const base = `#/p/${p.id}`;
  const now = today();
  for (const cat of c.overBudget) out.push({ level: 'bad', ico: 'alert', title: `${cat.category} is over budget by ${money(cat.spent - cat.budget)}`, text: p.name, href: `${base}/budget` });
  if (c.fundingGap < 0) out.push({ level: 'bad', ico: 'dollar', title: `Projected funding shortfall of ${money(-c.fundingGap)}`, text: `${p.name} · remaining cash + undrawn holdback won’t cover the plan`, href: `${base}/overview` });
  for (const s of c.subs) {
    if (s.paid > 0 && !s.lienWaiver) out.push({ level: 'warn', ico: 'shield', title: `Collect lien waiver from ${s.name}`, text: `${p.name} · ${money(s.paid)} paid to date`, href: `${base}/subs` });
    if (s.insuranceExp && s.insuranceExp < addDays(30) && s.status !== 'Complete') out.push({ level: s.insuranceExp < now ? 'bad' : 'warn', ico: 'shield', title: `${s.name} insurance ${s.insuranceExp < now ? 'expired' : 'expires'} ${relDays(s.insuranceExp)}`, text: `${p.name} · request an updated COI`, href: `${base}/subs` });
    if (!s.w9 && s.paid > 0) out.push({ level: 'info', ico: 'file', title: `Missing W-9 from ${s.name}`, text: `${p.name} · needed for 1099 filing`, href: `${base}/subs` });
  }
  for (const d of p.draws.filter((x) => x.status !== 'Funded')) out.push({ level: 'info', ico: 'bank', title: `Draw #${d.num} · ${money(d.requested)} ${d.status.toLowerCase()}`, text: `${p.name} · requested ${relDays(d.date)}`, href: `${base}/draws` });
  for (const m of c.overdue) out.push({ level: 'warn', ico: 'clock', title: `“${m.name}” is ${daysBetween(m.date, now)} days overdue`, text: p.name, href: `${base}/timeline` });
  const noReceipt = p.expenses.filter((e) => !e.receipt);
  if (noReceipt.length) out.push({ level: 'info', ico: 'receipt', title: `${noReceipt.length} expense${noReceipt.length > 1 ? 's' : ''} missing a receipt`, text: `${p.name} · ${money(noReceipt.reduce((a, e) => a + e.amount, 0))} undocumented`, href: `${base}/expenses` });
  if (p.type === 'brrrr') {
    for (const u of p.rental.units) if (u.leaseEnd && u.leaseEnd >= now && u.leaseEnd < addDays(60)) out.push({ level: 'warn', ico: 'key', title: `${u.name} lease ends ${relDays(u.leaseEnd)}`, text: `${p.name} · ${u.tenant || 'tenant'} — send renewal`, href: `${base}/rent` });
    if (!p.refi.done && p.refi.date && p.refi.date < c.seasoningDate) out.push({ level: 'warn', ico: 'calendar', title: `Refi date is before ${p.refi.seasoningMonths}-month seasoning`, text: `${p.name} · lender seasoning clears ${fmtDate(c.seasoningDate)}`, href: `${base}/refi` });
    if (c.dscr && c.dscr < 1.2) out.push({ level: 'warn', ico: 'chart', title: `DSCR of ${c.dscr.toFixed(2)}x is below 1.20x`, text: `${p.name} · most DSCR lenders want 1.2x+`, href: `${base}/refi` });
  }
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export const alertList = (alerts, limit = 8) => alerts.length
  ? alerts.slice(0, limit).map((a, i) => `<a class="alert-item rise" style="--i:${i + 4}" href="${a.href}"><span class="alert-ico ${a.level}">${icon(a.ico, 14)}</span><div><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div></a>`).join('')
  : `<div class="empty"><div class="em-icon">${icon('check', 20)}</div><b>All clear</b>Nothing needs your attention.</div>`;

export function dealCard(p, c, i) {
  const stages = p.type === 'flip' ? FLIP_STAGES : BRRRR_STAGES;
  const stage = stages[p.stage] || stages[0];
  const nums = p.type === 'flip'
    ? [['Projected profit', compact(c.profit), c.profit >= 0 ? 'good-ink' : 'bad-ink'], ['Cash in', compact(c.cashInvested)], ['ROI', pct(c.roi, 0)]]
    : [['Cash flow / mo', compact(c.cashflow), c.cashflow >= 0 ? 'good-ink' : 'bad-ink'], ['Cash left in', compact(Math.max(0, c.cashLeftIn))], ['Recovered', pct(c.recovered, 0)]];
  return `<a class="card hover deal-card rise" style="--i:${i}" href="#/p/${p.id}">
    <span class="glow"></span>
    <div class="dc-top"><span class="tag ${p.type}">${p.type === 'flip' ? 'Flip' : 'BRRRR'}</span><span class="pill ${p.stage >= stages.length - 1 ? 'good' : 'accent'}">${stage}</span></div>
    <h3>${esc(p.name)}</h3><div class="addr">${esc(p.address)}${p.city ? `, ${esc(p.city)}` : ''}</div>
    <div class="dc-nums">${nums.map(([l, v, cl]) => `<div><span>${l}</span><b class="${cl || ''}">${v}</b></div>`).join('')}</div>
    <div class="dc-foot"><span>Rehab ${money(c.rehabSpent)} of ${money(c.rehabBudget)}</span><span>${pct(c.budgetUsed, 0)}</span></div>
    <div class="bar thin"><span class="grow ${c.budgetUsed > 1 ? 'over' : ''}" style="--i:${i};width:${Math.min(100, c.budgetUsed * 100)}%;background:${c.budgetUsed > 1 ? '' : p.color}"></span></div>
  </a>`;
}

export function overviewView(ctx) {
  const st = getState();
  const pf = portfolio(st.projects);
  const equity = pf.value - pf.debt;
  const alerts = pf.rows.flatMap(({ p, c }) => alertsFor(p, c));
  const shown = pf.rows.filter((r) => filter === 'all' || r.p.type === filter);

  const feed = st.projects.flatMap((p) => p.expenses.map((e) => ({ e, p }))).sort((a, b) => b.e.date.localeCompare(a.e.date)).slice(0, 8);
  const upcoming = st.projects.flatMap((p) => p.milestones.filter((m) => !m.done && m.date >= today() && m.date <= addDays(45)).map((m) => ({ m, p })))
    .sort((a, b) => a.m.date.localeCompare(b.m.date)).slice(0, 6);

  ctx.setHandlers({
    filter: (el) => { filter = el.dataset.f; ctx.rerender(); },
  });

  const kpi = (label, value, fmt, key, foot, i, tipText) => `
    <div class="card stat rise" style="--i:${i}">
      <div class="label">${label} ${tipText ? `<span class="info" data-tip="${esc(tipText)}">i</span>` : ''}</div>
      <div class="value">${counter(value, fmt, key)}</div><div class="foot">${foot}</div></div>`;

  return `
  <section class="hero">
    <div class="hero-row">
      <div class="rise"><div class="eyebrow">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>${st.settings.investor && st.settings.investor !== 'My Portfolio' ? esc(st.settings.investor) : 'Your deals'}</h1>
        <div class="sub">${pf.flips.length} flip${pf.flips.length === 1 ? '' : 's'} and ${pf.rentals.length} rental${pf.rentals.length === 1 ? '' : 's'} · ${compact(pf.rehabSpent)} of rehab spend tracked</div></div>
      <div class="card-actions rise" style="--i:1"><button class="btn" data-action="palette">${icon('search')} Jump to deal</button></div>
    </div>
  </section>
  <div class="lift grid g-4">
    ${kpi('Capital deployed', pf.cashInvested, 'money', 'pf-cash', `<span>Your cash across ${st.projects.length} deals</span>`, 1, 'Cash out of pocket to date: purchase, closing, loan costs, paid rehab and holding, minus loan proceeds and funded draws.')}
    ${kpi('Portfolio equity', equity, 'money', 'pf-eq', `<span>${compact(pf.value)} value</span><span>·</span><span>${compact(pf.debt)} debt</span>`, 2, 'Target sale price (flips) or appraisal (rentals), minus current loan balances.')}
    ${kpi('Projected flip profit', pf.projProfit, 'money', 'pf-profit', `<span class="delta ${pf.projProfit >= 0 ? 'up' : 'down'}">${pf.projProfit >= 0 ? '▲' : '▼'} net of all costs</span>`, 3)}
    ${kpi('Rental cash flow', pf.monthlyCashflow, 'money', 'pf-cf', `<span>per month after refi debt service</span>`, 4)}
  </div>

  <div class="split mt-lg rise" style="--i:5">
    <div class="card-title" style="font-size:16px">Deals</div>
    <div class="seg">${[['all', 'All'], ['flip', 'Flips'], ['brrrr', 'BRRRR']].map(([k, l]) => `<button class="${filter === k ? 'on' : ''}" data-action="filter" data-f="${k}">${l}</button>`).join('')}</div>
  </div>
  <div class="grid g-3 mt">
    ${shown.map(({ p, c }, i) => dealCard(p, c, i + 5)).join('')}
    <button class="card hover new-card rise" style="--i:${shown.length + 5}" data-action="new-deal" data-type="${filter === 'brrrr' ? 'brrrr' : 'flip'}">
      <div><div class="plus">${icon('plus', 20)}</div><b>Add a deal</b><div class="note">Flip or BRRRR</div></div></button>
  </div>

  <div class="grid g-21 mt-lg">
    <div class="card rise" style="--i:8">
      <div class="card-head"><div><div class="card-title">Capital stack by deal</div><div class="card-sub">Your cash vs. borrowed funds deployed to date</div></div>
        <div class="legend"><span><i style="background:var(--s7)"></i>Your cash</span><span><i style="background:var(--muted-2)"></i>Loan + draws</span></div></div>
      <div class="hbars">${pf.rows.map(({ p, c }, i) => {
        const max = Math.max(...pf.rows.map((r) => r.c.cashInvested + r.c.loanBalance), 1);
        const tip = tipRows(p.name, [['Your cash', money(c.cashInvested), 'var(--s7)'], ['Loan + draws', money(c.loanBalance), 'var(--muted-2)'], ['Funds remaining', money(c.fundsRemaining)]]);
        return `<div class="hbar" data-tip="${tip}"><div class="top"><span>${esc(p.name)}</span><span class="v">${money(c.cashInvested + c.loanBalance)}</span></div>
          <div class="track" style="display:flex;gap:2px;background:none">
            <span class="grow" style="--i:${i};flex:none;width:${(c.cashInvested / max) * 100}%;background:var(--s7);border-radius:99px"></span>
            <span class="grow" style="--i:${i};flex:none;width:${(c.loanBalance / max) * 100}%;background:var(--muted-2);border-radius:99px"></span></div></div>`;
      }).join('') || '<div class="empty">No deals yet</div>'}</div>
    </div>
    <div class="card rise" style="--i:9">
      <div class="card-head"><div class="card-title">Needs attention <span class="pill ${alerts.some((a) => a.level === 'bad') ? 'bad' : alerts.length ? 'warn' : 'good'} plain">${alerts.length}</span></div></div>
      <div>${alertList(alerts, 7)}</div>
    </div>
  </div>

  <div class="grid g-21 mt">
    <div class="card rise" style="--i:10">
      <div class="card-head"><div class="card-title">Recent spend</div><span class="card-sub">Across all deals</span></div>
      <div class="feed">${feed.map(({ e, p }) => `
        <a class="feed-item" href="#/p/${p.id}/expenses" style="color:inherit"><span class="avatar" style="background:${p.color}">${initials(e.vendor)}</span>
          <div><b>${esc(e.vendor)}</b><small>${esc(e.category)} · ${esc(p.name)} · ${fmtDate(e.date, false)}</small></div>
          <div class="amt">${money(e.amount)}<br>${e.status === 'Paid' ? '' : '<span class="pill warn" style="font-size:11px">Pending</span>'}</div></a>`).join('') || '<div class="empty">No expenses yet</div>'}</div>
    </div>
    <div class="card rise" style="--i:11">
      <div class="card-head"><div class="card-title">Coming up</div><span class="card-sub">Next 45 days</span></div>
      <div class="feed">${upcoming.map(({ m, p }) => `
        <a class="feed-item" href="#/p/${p.id}/timeline" style="color:inherit;grid-template-columns:34px 1fr">
          <span class="avatar" style="background:var(--accent-soft);color:var(--ink);font-size:10px;line-height:1.1;text-align:center">${new Date(m.date + 'T00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}<br>${+m.date.slice(8)}</span>
          <div><b>${esc(m.name)}</b><small>${esc(p.name)} · ${relDays(m.date)}</small></div></a>`).join('') || '<div class="empty">Nothing scheduled</div>'}</div>
    </div>
  </div>`;
}

