// "Needs attention" items for a deal. Each one names the deal tab it links to.
import { money, today, addDays, relDays, daysBetween, fmtDate } from './util';

export function alertsFor(p, c) {
  const out = [];
  const now = today();
  const a = (level, title, text, tab) => out.push({ level, title, text, tab, dealId: p.id });
  for (const cat of c.overBudget) a('bad', `${cat.category} is over budget by ${money(cat.spent - cat.budget)}`, p.name, 'budget');
  if (c.fundingGap < 0) a('bad', `Projected funding shortfall of ${money(-c.fundingGap)}`, `${p.name} · remaining cash + undrawn holdback won’t cover the plan`, 'overview');
  for (const s of c.subs) {
    if (s.paid > 0 && !s.lienWaiver) a('warn', `Collect lien waiver from ${s.name}`, `${p.name} · ${money(s.paid)} paid to date`, 'subs');
    if (s.insuranceExp && s.insuranceExp < addDays(30) && s.status !== 'Complete') a(s.insuranceExp < now ? 'bad' : 'warn', `${s.name} insurance ${s.insuranceExp < now ? 'expired' : 'expires'} ${relDays(s.insuranceExp)}`, `${p.name} · request an updated COI`, 'subs');
    if (!s.w9 && s.paid > 0) a('info', `Missing W-9 from ${s.name}`, `${p.name} · needed for 1099 filing`, 'subs');
  }
  for (const d of p.draws.filter((x) => x.status !== 'Funded')) a('info', `Draw #${d.num} · ${money(d.requested)} ${d.status.toLowerCase()}`, `${p.name} · requested ${relDays(d.date)}`, 'draws');
  for (const m of c.overdue) a('warn', `“${m.name}” is ${daysBetween(m.date, now)} days overdue`, p.name, 'timeline');
  const noReceipt = p.expenses.filter((e) => !e.receipt);
  if (noReceipt.length) a('info', `${noReceipt.length} expense${noReceipt.length > 1 ? 's' : ''} missing a receipt`, `${p.name} · ${money(noReceipt.reduce((t, e) => t + e.amount, 0))} undocumented`, 'expenses');
  if (p.type === 'brrrr') {
    for (const u of p.rental.units) if (u.leaseEnd && u.leaseEnd >= now && u.leaseEnd < addDays(60)) a('warn', `${u.name} lease ends ${relDays(u.leaseEnd)}`, `${p.name} · ${u.tenant || 'tenant'} — send renewal`, 'rent');
    if (!p.refi.done && p.refi.date && p.refi.date < c.seasoningDate) a('warn', `Refi date is before ${p.refi.seasoningMonths}-month seasoning`, `${p.name} · lender seasoning clears ${fmtDate(c.seasoningDate)}`, 'refi');
    if (c.dscr && c.dscr < 1.2) a('warn', `DSCR of ${c.dscr.toFixed(2)}x is below 1.20x`, `${p.name} · most DSCR lenders want 1.2x+`, 'refi');
  }
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((x, y) => rank[x.level] - rank[y.level]);
}

export function maxLoanForDscr(noi, rate, years, target) {
  const r = rate / 100 / 12, n = years * 12;
  const perDollar = r ? r / (1 - Math.pow(1 + r, -n)) : 1 / n;
  return noi > 0 ? noi / target / perDollar : 0;
}
