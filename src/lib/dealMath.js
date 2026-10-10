// ============================================
// DEAL MATH
// Pure functions, no React. Mirrors the formulas inside DealAnalyzer so
// the Advertise studio presents exactly the numbers the calculator shows.
// scripts/verify-deal-math.mjs asserts the two agree.
// ============================================

export function computeRental(d, strategy) {
  var dp = d.purchasePrice * (d.downPct / 100);
  var loan = d.purchasePrice - dp;
  var mr = d.rate / 100 / 12;
  var tp = d.term * 12;
  var mtg = mr > 0 ? loan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : loan / tp;
  var annMtg = mtg * 12;
  var furnishing = (strategy === "str" || strategy === "mtr") ? d.furnishingTotal : 0;
  var lenderFeeDollars = loan * (d.lenderFees / 100);
  var closingCosts = lenderFeeDollars + d.attorneyFees + d.titleFees + d.appraisal;
  var rehabUpfront = d.rehabUpfront || 0;
  var totalCashInvested = dp + furnishing + closingCosts + rehabUpfront - d.sellerConcession;

  var gri = 0, egi = 0;
  if (strategy === "str") {
    var bookingRev = d.adr * (d.occupancy / 100) * 365;
    var cleanRev = d.cleaningFee * d.turnoversPerMonth * 12;
    gri = bookingRev + cleanRev + d.strOtherIncome * 12;
    egi = gri * (1 - d.platformFeePct / 100);
  } else if (strategy === "mtr") {
    var occMonths = 12 - (d.mtrVacancyWeeks / 4.33);
    gri = (d.mtrMonthlyRent * d.mtrUnits * occMonths) + d.mtrOtherIncome * 12;
    egi = gri * (1 - d.mtrPlatformPct / 100);
  } else {
    gri = (d.grossRent + d.otherIncome) * 12;
    egi = gri * (1 - d.vacancy / 100);
  }

  var deductionDollar = gri - egi;
  var deductionLabel = strategy === "str" ? "Platform Fees (" + d.platformFeePct + "%)"
    : strategy === "mtr" ? "Platform Fees (" + d.mtrPlatformPct + "%)"
    : "Vacancy (" + d.vacancy + "%)";

  var maintenanceDollar = gri * (d.maintenancePct / 100);
  var capexDollar = gri * (d.capexPct / 100);
  var mgmtDollar = egi * (d.management / 100);
  var hoaDollar = (d.hoa || 0) * 12;
  var totExp = d.taxes + d.insurance + maintenanceDollar + capexDollar + mgmtDollar + d.utilities * 12 + d.otherExp * 12 + hoaDollar;
  var noi = egi - totExp;
  var cf = noi - annMtg;

  return {
    dp: dp, loan: loan, mtg: mtg, annMtg: annMtg,
    lenderFeeDollars: lenderFeeDollars, closingCosts: closingCosts,
    furnishing: furnishing, rehabUpfront: rehabUpfront, totalCashInvested: totalCashInvested, hoaDollar: hoaDollar,
    gri: gri, egi: egi, deductionDollar: deductionDollar, deductionLabel: deductionLabel,
    maintenanceDollar: maintenanceDollar, capexDollar: capexDollar, mgmtDollar: mgmtDollar,
    totExp: totExp, noi: noi, cf: cf,
    cfDoor: d.units > 0 ? cf / d.units / 12 : 0,
    cap: d.purchasePrice > 0 ? (noi / d.purchasePrice) * 100 : 0,
    coc: totalCashInvested > 0 ? (cf / totalCashInvested) * 100 : 0,
    dscr: annMtg > 0 ? noi / annMtg : Infinity,
    grm: gri > 0 ? d.purchasePrice / gri : 0,
    expR: egi > 0 ? (totExp / egi) * 100 : 0,
  };
}

export function computeFlip(d) {
  var mao = (d.flipMaoPct / 100) * d.flipArv - d.flipRehab;
  var totalHolding = d.flipHoldingPerMonth * d.flipHoldingMonths;
  var contingency = d.flipRehab * ((d.flipContingencyPct || 0) / 100);
  var totalInvested = d.purchasePrice + d.flipRehab + contingency + d.flipClosing + totalHolding;
  var sellingCosts = d.flipArv * (d.flipSellingPct / 100);
  var netProceeds = d.flipArv - sellingCosts;
  var profit = netProceeds - totalInvested;
  var roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    mao: mao, totalHolding: totalHolding, contingency: contingency, totalInvested: totalInvested,
    sellingCosts: sellingCosts, netProceeds: netProceeds, profit: profit, roi: roi,
    annRoi: d.flipHoldingMonths > 0 ? roi * (12 / d.flipHoldingMonths) : 0,
  };
}

export function computeBrrrr(d) {
  var totalAllIn = d.purchasePrice + d.brrrrRehab + d.brrrrClosing + d.brrrrHoldInterest - d.brrrrHoldRentCollected;
  var refiLoan = d.brrrrArv * (d.brrrrRefiLtv / 100);
  var refiClosing = d.brrrrRefiClosing || 0;
  var cashLeftIn = totalAllIn - refiLoan + refiClosing;
  var mr = (d.brrrrRefiRate / 100) / 12;
  var tp = d.brrrrRefiTerm * 12;
  var mtg = mr > 0 ? refiLoan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : refiLoan / tp;
  var gri = d.brrrrGrossRent * 12;
  var egi = gri - gri * (d.brrrrVacancy / 100);
  var maint = gri * (d.brrrrMaintPct / 100);
  var capx = gri * (d.brrrrCapxPct / 100);
  var mgmt = egi * ((d.brrrrMgmtPct || 0) / 100);
  var totOpex = d.brrrrInsurance + d.brrrrTaxes + d.brrrrWaterSewer + maint + capx + d.brrrrTrash + d.brrrrLawn + mgmt;
  var noi = egi - totOpex;
  var annDebt = mtg * 12;
  var cf = noi - annDebt;
  return {
    totalAllIn: totalAllIn, refiLoan: refiLoan, refiClosing: refiClosing, cashLeftIn: cashLeftIn, mgmt: mgmt, mtg: mtg,
    gri: gri, egi: egi, totOpex: totOpex, noi: noi, annDebt: annDebt, cf: cf,
    dscr: annDebt > 0 ? noi / annDebt : Infinity,
    capRate: d.brrrrArv > 0 ? (noi / d.brrrrArv) * 100 : 0,
    coc: cashLeftIn > 0 ? (cf / cashLeftIn) * 100 : Infinity,
  };
}

// ============================================
// HOLD PERIOD / EXIT
// Year 1 uses today's income and expenses; growth applies from year 2.
// Value compounds from the purchase price every year (year 1 included).
// ============================================

// Remaining principal after k monthly payments.
export function loanBalance(principal, annualRatePct, termYears, months) {
  var n = termYears * 12;
  if (principal <= 0 || n <= 0) return 0;
  var k = Math.min(Math.max(months, 0), n);
  var r = annualRatePct / 100 / 12;
  if (r === 0) return principal * (1 - k / n);
  var pmt = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return principal * Math.pow(1 + r, k) - pmt * (Math.pow(1 + r, k) - 1) / r;
}

// IRR of a cash-flow series (t0 first) by bisection. Returns NaN when the
// series never changes sign, since there is no meaningful rate then.
export function irr(flows) {
  var hasNeg = flows.some(function (f) { return f < 0; });
  var hasPos = flows.some(function (f) { return f > 0; });
  if (!hasNeg || !hasPos) return NaN;
  var npv = function (rate) { return flows.reduce(function (acc, f, t) { return acc + f / Math.pow(1 + rate, t); }, 0); };
  var lo = -0.99, hi = 10;
  var fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return NaN;
  for (var i = 0; i < 200; i++) {
    var mid = (lo + hi) / 2;
    var fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

export function computeHold(d, r) {
  var years = Math.max(1, Math.min(30, Math.round(d.holdYears || 5)));
  var app = (d.appreciationPct != null ? d.appreciationPct : 3) / 100;
  var rg = (d.rentGrowthPct != null ? d.rentGrowthPct : 3) / 100;
  var eg = (d.expenseGrowthPct != null ? d.expenseGrowthPct : 3) / 100;
  var sell = (d.sellingCostPct != null ? d.sellingCostPct : 6) / 100;
  var rows = [];
  var cumCf = 0;
  for (var y = 1; y <= years; y++) {
    var egiY = r.egi * Math.pow(1 + rg, y - 1);
    var expY = r.totExp * Math.pow(1 + eg, y - 1);
    var noiY = egiY - expY;
    var cfY = noiY - r.annMtg;
    cumCf += cfY;
    var value = d.purchasePrice * Math.pow(1 + app, y);
    var bal = loanBalance(r.loan, d.rate, d.term, y * 12);
    rows.push({ y: y, value: value, noi: noiY, cf: cfY, cumCf: cumCf, balance: bal, equity: value - bal });
  }
  var last = rows[rows.length - 1];
  var salePrice = last.value;
  var saleCosts = salePrice * sell;
  var netSale = salePrice - saleCosts - last.balance;
  var totalProfit = cumCf + netSale - r.totalCashInvested;
  var flows = [-r.totalCashInvested].concat(rows.map(function (row, i) { return row.cf + (i === rows.length - 1 ? netSale : 0); }));
  return {
    years: years, rows: rows, salePrice: salePrice, saleCosts: saleCosts, payoff: last.balance,
    netSale: netSale, cumCf: cumCf, totalProfit: totalProfit,
    principalPaid: r.loan - last.balance,
    equityMultiple: r.totalCashInvested > 0 ? (cumCf + netSale) / r.totalCashInvested : Infinity,
    irr: irr(flows),
  };
}

// ============================================
// EQUITY ESTIMATE (shared by Equity, Portfolio, Compare)
// A known current value, when entered, replaces the appreciation estimate.
// Defaults reproduce the original 5.5% / 75% LTV assumptions so older
// saved properties keep their numbers.
// ============================================
export function computeEquity(p, currentYear) {
  var yrs = Math.max(0, currentYear - (p.purchaseYear || currentYear));
  var appPct = p.appreciationPct != null && p.appreciationPct !== "" ? p.appreciationPct : 5.5;
  var estimated = (p.purchasePrice || 0) * Math.pow(1 + appPct / 100, yrs);
  var value = p.currentValue > 0 ? p.currentValue : estimated;
  var bal = p.bal || 0;
  var monthlyExp = (p.taxes || 0) + (p.insurance || 0) + (p.maintenance || 0) + (p.utilities || 0) + (p.otherExp || 0) + (p.hoa || 0);
  var monthlyOut = monthlyExp + (p.mtgPayment || 0);
  if (p.exp !== undefined && p.taxes === undefined) { monthlyOut = p.exp || 0; monthlyExp = monthlyOut; }
  var monthlyCF = (p.rent || 0) - monthlyOut;
  var ltv = p.refiLtv > 0 ? p.refiLtv : 75;
  return {
    yrs: yrs, appPct: appPct, estimated: estimated, value: value, usingOverride: p.currentValue > 0,
    equity: value - bal, equityPct: value > 0 ? ((value - bal) / value) * 100 : 0,
    ltvNow: value > 0 ? (bal / value) * 100 : 0,
    monthlyExp: monthlyExp, monthlyOut: monthlyOut, monthlyCF: monthlyCF, annCF: monthlyCF * 12,
    refiLtv: ltv, refiLoan: value * ltv / 100, cashOut: value * ltv / 100 - bal,
    heloc: Math.max(0, value * 0.8 - bal),
  };
}
