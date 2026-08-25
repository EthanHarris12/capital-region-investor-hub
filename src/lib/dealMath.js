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
  var totalCashInvested = dp + furnishing + closingCosts - d.sellerConcession;

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
  var totExp = d.taxes + d.insurance + maintenanceDollar + capexDollar + mgmtDollar + d.utilities * 12 + d.otherExp * 12;
  var noi = egi - totExp;
  var cf = noi - annMtg;

  return {
    dp: dp, loan: loan, mtg: mtg, annMtg: annMtg,
    lenderFeeDollars: lenderFeeDollars, closingCosts: closingCosts,
    furnishing: furnishing, totalCashInvested: totalCashInvested,
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
  var totalInvested = d.purchasePrice + d.flipRehab + d.flipClosing + totalHolding;
  var sellingCosts = d.flipArv * (d.flipSellingPct / 100);
  var netProceeds = d.flipArv - sellingCosts;
  var profit = netProceeds - totalInvested;
  var roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    mao: mao, totalHolding: totalHolding, totalInvested: totalInvested,
    sellingCosts: sellingCosts, netProceeds: netProceeds, profit: profit, roi: roi,
    annRoi: d.flipHoldingMonths > 0 ? roi * (12 / d.flipHoldingMonths) : 0,
  };
}

export function computeBrrrr(d) {
  var totalAllIn = d.purchasePrice + d.brrrrRehab + d.brrrrClosing + d.brrrrHoldInterest - d.brrrrHoldRentCollected;
  var refiLoan = d.brrrrArv * (d.brrrrRefiLtv / 100);
  var cashLeftIn = totalAllIn - refiLoan;
  var mr = (d.brrrrRefiRate / 100) / 12;
  var tp = d.brrrrRefiTerm * 12;
  var mtg = mr > 0 ? refiLoan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : refiLoan / tp;
  var gri = d.brrrrGrossRent * 12;
  var egi = gri - gri * (d.brrrrVacancy / 100);
  var maint = gri * (d.brrrrMaintPct / 100);
  var capx = gri * (d.brrrrCapxPct / 100);
  var totOpex = d.brrrrInsurance + d.brrrrTaxes + d.brrrrWaterSewer + maint + capx + d.brrrrTrash + d.brrrrLawn;
  var noi = egi - totOpex;
  var annDebt = mtg * 12;
  var cf = noi - annDebt;
  return {
    totalAllIn: totalAllIn, refiLoan: refiLoan, cashLeftIn: cashLeftIn, mtg: mtg,
    gri: gri, egi: egi, totOpex: totOpex, noi: noi, annDebt: annDebt, cf: cf,
    dscr: annDebt > 0 ? noi / annDebt : Infinity,
    capRate: d.brrrrArv > 0 ? (noi / d.brrrrArv) * 100 : 0,
    coc: cashLeftIn > 0 ? (cf / cashLeftIn) * 100 : Infinity,
  };
}
