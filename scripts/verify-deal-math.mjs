// Asserts src/lib/dealMath.js reproduces the formulas written inline in
// DealAnalyzer. The inline versions below are transcribed from
// src/components/App.js — if that file's math changes, this fails.
// Run: node scripts/verify-deal-math.mjs

import { computeRental, computeFlip, computeBrrrr, computeHold, loanBalance, irr } from "../src/lib/dealMath.js";

const base = {
  units: 4, purchasePrice: 400000, downPct: 25, rate: 7.0, term: 30,
  grossRent: 5200, otherIncome: 0, vacancy: 5,
  adr: 150, occupancy: 65, cleaningFee: 85, turnoversPerMonth: 8, platformFeePct: 15, strOtherIncome: 0,
  mtrMonthlyRent: 2200, mtrUnits: 4, mtrVacancyWeeks: 2, mtrPlatformPct: 3, mtrOtherIncome: 0,
  furnishingTotal: 15000, maintenancePct: 5, capexPct: 5, management: 0,
  taxes: 6000, insurance: 2400, utilities: 0, otherExp: 0,
  lenderFees: 1, attorneyFees: 1000, titleFees: 2200, appraisal: 660, sellerConcession: 0,
  flipArv: 350000, flipMaoPct: 70, flipRehab: 50000, flipClosing: 12000,
  flipHoldingMonths: 4, flipHoldingPerMonth: 1500, flipSellingPct: 6,
  brrrrRehab: 40000, brrrrClosing: 15000, brrrrHoldInterest: 0, brrrrHoldRentCollected: 0,
  brrrrArv: 325000, brrrrRefiLtv: 75, brrrrRefiRate: 7.25, brrrrRefiTerm: 30,
  brrrrGrossRent: 3250, brrrrVacancy: 5, brrrrInsurance: 900, brrrrTaxes: 3767,
  brrrrWaterSewer: 1176, brrrrMaintPct: 5, brrrrCapxPct: 5, brrrrTrash: 0, brrrrLawn: 600,
};

// A second, more aggressive scenario to catch branch-specific mistakes.
// It also exercises the optional fields (HOA, rehab, contingency, refi
// closing, BRRRR management) that older saved deals don't carry.
const alt = { ...base, units: 8, purchasePrice: 725000, downPct: 20, rate: 6.125, term: 25,
  grossRent: 9400, otherIncome: 250, vacancy: 7, management: 8, utilities: 320, otherExp: 90,
  sellerConcession: 5000, taxes: 14200, insurance: 5100,
  hoa: 120, rehabUpfront: 18000, flipContingencyPct: 10, brrrrRefiClosing: 4500, brrrrMgmtPct: 8 };

let failures = 0;
const near = (a, b) => (a === b) || (Math.abs(a - b) < 1e-9) || (Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < 1e-12);

function check(label, mine, theirs) {
  for (const k of Object.keys(theirs)) {
    if (!near(mine[k], theirs[k])) {
      console.error(`  MISMATCH ${label}.${k}: module=${mine[k]} inline=${theirs[k]}`);
      failures++;
    }
  }
}

// ---- inline transcription from DealAnalyzer ----
function inlineRental(d, strategy) {
  var dp = d.purchasePrice * (d.downPct / 100);
  var loan = d.purchasePrice - dp;
  var mr = d.rate / 100 / 12;
  var tp = d.term * 12;
  var mtg = mr > 0 ? loan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : loan / tp;
  var annMtg = mtg * 12;
  var furnishing = (strategy === "str" || strategy === "mtr") ? d.furnishingTotal : 0;
  var lenderFeeDollars = loan * (d.lenderFees / 100);
  var closingCosts = lenderFeeDollars + d.attorneyFees + d.titleFees + d.appraisal;
  var totalCashInvested = dp + furnishing + closingCosts + (d.rehabUpfront || 0) - d.sellerConcession;
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
  } else if (strategy === "ltr") {
    gri = (d.grossRent + d.otherIncome) * 12;
    egi = gri * (1 - d.vacancy / 100);
  }
  var maintenanceDollar = gri * (d.maintenancePct / 100);
  var capexDollar = gri * (d.capexPct / 100);
  var mgmtDollar = egi * (d.management / 100);
  var totExp = d.taxes + d.insurance + maintenanceDollar + capexDollar + mgmtDollar + d.utilities * 12 + d.otherExp * 12 + (d.hoa || 0) * 12;
  var noi = egi - totExp;
  var cf = noi - annMtg;
  return { dp, loan, mtg, annMtg, closingCosts, totalCashInvested, gri, egi,
    maintenanceDollar, capexDollar, mgmtDollar, totExp, noi, cf,
    cfDoor: d.units > 0 ? cf / d.units / 12 : 0,
    cap: d.purchasePrice > 0 ? (noi / d.purchasePrice) * 100 : 0,
    coc: totalCashInvested > 0 ? (cf / totalCashInvested) * 100 : 0,
    dscr: annMtg > 0 ? noi / annMtg : Infinity,
    grm: gri > 0 ? d.purchasePrice / gri : 0,
    expR: egi > 0 ? (totExp / egi) * 100 : 0 };
}

function inlineFlip(d) {
  var mao = (d.flipMaoPct / 100) * d.flipArv - d.flipRehab;
  var totalHolding = d.flipHoldingPerMonth * d.flipHoldingMonths;
  var totalInvested = d.purchasePrice + d.flipRehab + d.flipRehab * ((d.flipContingencyPct || 0) / 100) + d.flipClosing + totalHolding;
  var sellingCosts = d.flipArv * (d.flipSellingPct / 100);
  var netProceeds = d.flipArv - sellingCosts;
  var profit = netProceeds - totalInvested;
  var roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return { mao, totalHolding, totalInvested, sellingCosts, netProceeds, profit, roi,
    annRoi: d.flipHoldingMonths > 0 ? roi * (12 / d.flipHoldingMonths) : 0 };
}

function inlineBrrrr(d) {
  var totalAllIn = d.purchasePrice + d.brrrrRehab + d.brrrrClosing + d.brrrrHoldInterest - d.brrrrHoldRentCollected;
  var refiLoan = d.brrrrArv * (d.brrrrRefiLtv / 100);
  var cashLeftIn = totalAllIn - refiLoan + (d.brrrrRefiClosing || 0);
  var mr = (d.brrrrRefiRate / 100) / 12;
  var tp = d.brrrrRefiTerm * 12;
  var mtg = mr > 0 ? refiLoan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : refiLoan / tp;
  var gri = d.brrrrGrossRent * 12;
  var vacDollar = gri * (d.brrrrVacancy / 100);
  var egi = gri - vacDollar;
  var maint = gri * (d.brrrrMaintPct / 100);
  var capx = gri * (d.brrrrCapxPct / 100);
  var totOpex = d.brrrrInsurance + d.brrrrTaxes + d.brrrrWaterSewer + maint + capx + d.brrrrTrash + d.brrrrLawn + egi * ((d.brrrrMgmtPct || 0) / 100);
  var noi = egi - totOpex;
  var annDebt = mtg * 12;
  var cf = noi - annDebt;
  return { totalAllIn, refiLoan, cashLeftIn, mtg, gri, egi, totOpex, noi, annDebt, cf,
    dscr: annDebt > 0 ? noi / annDebt : Infinity,
    capRate: d.brrrrArv > 0 ? (noi / d.brrrrArv) * 100 : 0,
    coc: cashLeftIn > 0 ? (cf / cashLeftIn) * 100 : Infinity };
}

for (const [name, d] of [["base", base], ["alt", alt]]) {
  for (const s of ["ltr", "str", "mtr"]) check(`${name}/${s}`, computeRental(d, s), inlineRental(d, s));
  check(`${name}/flip`, computeFlip(d), inlineFlip(d));
  check(`${name}/brrrr`, computeBrrrr(d), inlineBrrrr(d));
}

// Spot-check a couple of absolute values so a matching-but-wrong pair is caught.
const r = computeRental(base, "ltr");
const expect = { gri: 62400, egi: 59280, noi: 44640, cfDoor: (44640 - r.annMtg) / 4 / 12 };
for (const [k, v] of Object.entries(expect)) {
  if (!near(r[k], v)) { console.error(`  ABSOLUTE ${k}: got ${r[k]}, expected ${v}`); failures++; }
}

// Hold-period sanity checks.
if (!near(loanBalance(300000, 7, 30, 360), 0) && Math.abs(loanBalance(300000, 7, 30, 360)) > 1e-6) { console.error("  loanBalance should hit 0 at term end"); failures++; }
if (Math.abs(loanBalance(300000, 0, 30, 180) - 150000) > 1e-6) { console.error("  zero-rate balance should be linear"); failures++; }
if (Math.abs(irr([-100, 110]) - 0.10) > 1e-6) { console.error(`  irr([-100,110]) = ${irr([-100, 110])}, expected 0.10`); failures++; }
const h = computeHold({ ...base, holdYears: 5, appreciationPct: 3, rentGrowthPct: 3, expenseGrowthPct: 3, sellingCostPct: 6 }, r);
if (h.rows.length !== 5 || !near(h.rows[0].noi, r.noi)) { console.error("  hold year 1 NOI should equal current NOI"); failures++; }
const flows = [-r.totalCashInvested].concat(h.rows.map((row, i) => row.cf + (i === 4 ? h.netSale : 0)));
const npvAtIrr = flows.reduce((a, f, t) => a + f / Math.pow(1 + h.irr, t), 0);
if (Math.abs(npvAtIrr) > 1e-3) { console.error(`  NPV at IRR = ${npvAtIrr}, expected ~0`); failures++; }

if (failures) { console.error(`\n${failures} mismatch(es) — dealMath.js has drifted from DealAnalyzer.`); process.exit(1); }
console.log("All deal math matches DealAnalyzer across ltr/str/mtr/flip/brrrr on 2 scenarios.");
