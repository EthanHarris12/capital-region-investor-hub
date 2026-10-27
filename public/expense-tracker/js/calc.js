// All deal math lives here so every view reads from one set of numbers.
import { sum, today, daysBetween, parseD, iso } from './util.js';

const MONTH = 30.4375;

export const amortPayment = (principal, ratePct, years) => {
  const r = ratePct / 100 / 12, n = years * 12;
  if (!principal || !n) return 0;
  if (!r) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

export function calc(p) {
  const pu = p.purchase, f = p.financing;
  const now = today();
  const acquisition = (+pu.price || 0) + (+pu.closingCosts || 0);
  const loanCosts = (+f.loanAmount || 0) * (+f.points || 0) / 100 + (+f.fees || 0);

  // draws
  const drawsFunded = sum(p.draws.filter((d) => d.status === 'Funded'), 'funded');
  const drawsPending = sum(p.draws.filter((d) => d.status !== 'Funded'), 'requested');
  const holdbackRemaining = Math.max(0, (+f.holdback || 0) - drawsFunded);
  const loanBalance = (+f.loanAmount || 0) + drawsFunded;
  const monthlyInterest = loanBalance * (+f.rate || 0) / 100 / 12;

  // time
  const isFlip = p.type === 'flip';
  const endDate = isFlip
    ? (p.sale.closed && p.sale.saleDate ? p.sale.saleDate : now)
    : (p.refi.done && p.refi.date ? p.refi.date : now);
  const daysHeld = Math.max(0, daysBetween(pu.date, endDate < pu.date ? pu.date : endDate));
  const monthsHeld = daysHeld / MONTH;
  const plannedEnd = isFlip ? (p.sale.closed ? p.sale.saleDate : p.sale.targetDate) : p.refi.date;
  const plannedMonths = Math.max(monthsHeld, daysBetween(pu.date, plannedEnd) / MONTH || 0);
  const daysToTarget = daysBetween(now, plannedEnd);

  // holding
  const holdingFixed = sum(p.holding, 'monthly');
  const holdingMonthly = holdingFixed + monthlyInterest;
  const interestToDate = monthlyInterest * monthsHeld;
  const holdingToDate = holdingMonthly * monthsHeld;
  const projHolding = holdingMonthly * plannedMonths;

  // rehab
  const rehabBudget = sum(p.budget, 'amount');
  const paid = sum(p.expenses.filter((e) => e.status === 'Paid'), 'amount');
  const pending = sum(p.expenses.filter((e) => e.status !== 'Paid'), 'amount');
  const rehabSpent = paid + pending;
  const budgetRemaining = rehabBudget - rehabSpent;
  const projRehab = Math.max(rehabBudget, rehabSpent);

  const cats = p.budget.map((bg) => ({ category: bg.category, budget: +bg.amount || 0, paid: 0, pending: 0 }));
  for (const e of p.expenses) {
    let c = cats.find((x) => x.category === e.category);
    if (!c) { c = { category: e.category || 'Uncategorized', budget: 0, paid: 0, pending: 0 }; cats.push(c); }
    if (e.status === 'Paid') c.paid += +e.amount || 0; else c.pending += +e.amount || 0;
  }
  cats.forEach((c) => { c.spent = c.paid + c.pending; c.remaining = c.budget - c.spent; c.over = c.spent > c.budget; });
  const overBudget = cats.filter((c) => c.over && c.spent > 0);

  // subs
  const subs = p.subs.map((s) => {
    const sp = sum(p.expenses.filter((e) => e.subId === s.id && e.status === 'Paid'), 'amount');
    const spend = sum(p.expenses.filter((e) => e.subId === s.id && e.status !== 'Paid'), 'amount');
    return { ...s, paid: sp, pending: spend, balance: (+s.contract || 0) - sp - spend };
  });
  const subCommitted = sum(subs, (s) => Math.max(0, s.balance));
  const subPaid = sum(subs, 'paid');

  // sources & uses (cash-basis, to date)
  const sources = (+p.cashReserves || 0) + (+f.loanAmount || 0) + drawsFunded;
  const uses = acquisition + loanCosts + paid + holdingToDate;
  const fundsRemaining = sources - uses;
  const cashInvested = Math.max(0, uses - (+f.loanAmount || 0) - drawsFunded);
  const futureNeeds = Math.max(0, projRehab - paid) + Math.max(0, projHolding - holdingToDate);
  const futureFunding = holdbackRemaining;
  const fundingGap = fundsRemaining + futureFunding - futureNeeds;

  // burn
  const firstExp = p.expenses.map((e) => e.date).sort()[0];
  const spendDays = firstExp ? Math.max(1, daysBetween(firstExp, now)) : 0;
  const burnPerDay = spendDays ? rehabSpent / spendDays : 0;
  const series = spendSeries(p);

  const allIn = acquisition + projRehab + projHolding + loanCosts;
  const arv = +pu.arv || 0;

  const base = {
    acquisition, loanCosts, drawsFunded, drawsPending, holdbackRemaining, loanBalance, monthlyInterest,
    daysHeld, monthsHeld, plannedMonths, daysToTarget, plannedEnd,
    holdingFixed, holdingMonthly, interestToDate, holdingToDate, projHolding,
    rehabBudget, paid, pending, rehabSpent, budgetRemaining, projRehab, cats, overBudget,
    subs, subCommitted, subPaid,
    sources, uses, fundsRemaining, cashInvested, futureNeeds, futureFunding, fundingGap,
    burnPerDay, series, allIn, arv,
    budgetUsed: rehabBudget ? rehabSpent / rehabBudget : 0,
    milestonesDone: p.milestones.filter((m) => m.done).length,
    progress: p.milestones.length ? p.milestones.filter((m) => m.done).length / p.milestones.length : 0,
    overdue: p.milestones.filter((m) => !m.done && m.date && m.date < now),
  };
  return isFlip ? { ...base, ...flipCalc(p, base) } : { ...base, ...brrrrCalc(p, base) };
}

function flipCalc(p, c) {
  const s = p.sale;
  const salePrice = s.closed && s.actualPrice ? +s.actualPrice : +s.targetPrice || c.arv;
  const sellPct = ((+s.commissionPct || 0) + (+s.closingPct || 0)) / 100;
  const sellingCosts = salePrice * sellPct + (+s.concessions || 0);
  const totalCost = c.allIn + sellingCosts;
  const profit = salePrice - totalCost;
  const loanUsed = (+p.financing.loanAmount || 0) + Math.min(+p.financing.holdback || 0, c.projRehab);
  const projCash = Math.max(1, c.allIn - loanUsed);
  const roi = profit / projCash;
  const annualized = c.plannedMonths > 0 ? roi * (12 / c.plannedMonths) : 0;
  const margin = salePrice ? profit / salePrice : 0;
  const mao = c.arv * 0.7 - c.rehabBudget;
  const breakeven = (c.allIn + (+s.concessions || 0)) / (1 - sellPct);
  return { salePrice, sellingCosts, totalCost, profit, projCash, roi, annualized, margin, mao, breakeven, profitPerMonth: c.plannedMonths ? profit / c.plannedMonths : 0 };
}

export function rentMath(p, refi = p.refi) {
  const r = p.rental, o = r.opex;
  const gross = sum(r.units, 'rent');
  const occupiedRent = sum(r.units.filter((u) => u.status === 'Occupied'), 'rent');
  const vacancy = gross * (+o.vacancyPct || 0) / 100;
  const egi = gross - vacancy;
  const fixedOpex = (+o.taxes || 0) + (+o.insurance || 0) + (+o.hoa || 0) + (+o.utilities || 0);
  const mgmt = egi * (+o.mgmtPct || 0) / 100;
  const capex = gross * (+o.capexPct || 0) / 100;
  const repairs = gross * (+o.repairsPct || 0) / 100;
  const opex = fixedOpex + mgmt + capex + repairs;
  const noi = egi - opex;
  const newLoan = (+refi.appraisal || 0) * (+refi.ltv || 0) / 100;
  const payment = amortPayment(newLoan, +refi.rate || 0, +refi.termYears || 30);
  const cashflow = noi - payment;
  return { gross, occupiedRent, vacancy, egi, fixedOpex, mgmt, capex, repairs, opex, noi, newLoan, payment, cashflow };
}

function brrrrCalc(p, c) {
  const refi = p.refi;
  const rm = rentMath(p);
  const payoff = c.loanBalance;
  const cashOut = rm.newLoan - payoff - (+refi.closingCosts || 0);
  const totalCashIn = Math.max(1, c.allIn - c.loanBalance);
  const cashLeftIn = c.allIn + (+refi.closingCosts || 0) - rm.newLoan;
  const recovered = Math.min(1.5, (totalCashIn - Math.max(0, cashLeftIn)) / totalCashIn);
  const coc = cashLeftIn > 0 ? (rm.cashflow * 12) / cashLeftIn : Infinity;
  const dscr = rm.payment ? rm.noi / rm.payment : 0;
  const capRate = refi.appraisal ? (rm.noi * 12) / refi.appraisal : 0;
  const equity = (+refi.appraisal || 0) - rm.newLoan;
  const rule75 = c.arv ? c.allIn / c.arv : 0;
  const occupancy = p.rental.units.length ? p.rental.units.filter((u) => u.status === 'Occupied').length / p.rental.units.length : 0;
  const collected = sum(p.rental.income, 'amount');
  const thisMonth = today().slice(0, 7);
  const collectedMonth = sum(p.rental.income.filter((i) => i.date.slice(0, 7) === thisMonth), 'amount');
  const seasoningDate = (() => { const d = parseD(p.purchase.date); d.setMonth(d.getMonth() + (+refi.seasoningMonths || 0)); return iso(d); })();
  const onePct = p.purchase.price ? rm.gross / c.allIn : 0;
  return { ...rm, payoff, cashOut, totalCashIn, cashLeftIn, recovered, coc, dscr, capRate, equity, rule75, occupancy, collected, collectedMonth, seasoningDate, onePct };
}

// cumulative spend by date, plus a straight-line budget pace for comparison
function spendSeries(p) {
  const ex = [...p.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const pts = [];
  let run = 0;
  const start = p.purchase.date;
  pts.push({ x: start, y: 0 });
  for (const e of ex) {
    run += +e.amount || 0;
    const last = pts[pts.length - 1];
    if (last.x === e.date) last.y = run; else pts.push({ x: e.date, y: run });
  }
  const end = today() > (pts[pts.length - 1]?.x || start) ? today() : pts[pts.length - 1].x;
  if (pts[pts.length - 1].x !== end) pts.push({ x: end, y: run });
  return pts;
}

// portfolio rollup for the overview
export function portfolio(projects) {
  const rows = projects.map((p) => ({ p, c: calc(p) }));
  const flips = rows.filter((r) => r.p.type === 'flip');
  const rentals = rows.filter((r) => r.p.type === 'brrrr');
  return {
    rows, flips, rentals,
    cashInvested: sum(rows, (r) => r.c.cashInvested),
    debt: sum(rows, (r) => (r.p.type === 'brrrr' && r.p.refi.done ? r.c.newLoan : r.c.loanBalance)),
    value: sum(rows, (r) => (r.p.type === 'flip' ? r.c.salePrice : +r.p.refi.appraisal || r.c.arv)),
    projProfit: sum(flips, (r) => r.c.profit),
    monthlyCashflow: sum(rentals, (r) => r.c.cashflow),
    rehabSpent: sum(rows, (r) => r.c.rehabSpent),
    rehabBudget: sum(rows, (r) => r.c.rehabBudget),
    fundsRemaining: sum(rows, (r) => r.c.fundsRemaining),
  };
}
