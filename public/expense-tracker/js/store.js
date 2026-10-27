// Persistence (localStorage) and demo seed data.
import { uid, addDays } from './util.js';

const KEY = 'groundwork.v1';
let state = null;
const listeners = new Set();

export const DEFAULT_CATEGORIES = [
  'Demo & Dumpsters', 'Roofing', 'Framing & Structural', 'Plumbing', 'Electrical', 'HVAC',
  'Kitchen', 'Bathrooms', 'Flooring', 'Paint & Drywall', 'Exterior & Landscaping', 'Permits & Fees', 'Contingency',
];
export const EXPENSE_TYPES = ['Materials', 'Labor', 'Subcontractor', 'Permit / Fee', 'Equipment', 'Other'];
export const PAY_METHODS = ['Check', 'ACH', 'Card', 'Zelle', 'Cash', 'Wire'];
export const PROJECT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const FLIP_STAGES = ['Acquire', 'Rehab', 'List', 'Under contract', 'Sold'];
export const BRRRR_STAGES = ['Buy', 'Rehab', 'Rent', 'Refinance', 'Repeat'];

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || !Array.isArray(state.projects)) { state = seed(); save(false); }
  return state;
}
export const getState = () => state;
export const getProject = (id) => state.projects.find((p) => p.id === id);

export function save(notify = true) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  if (notify) listeners.forEach((f) => f());
}
export const subscribe = (f) => listeners.add(f);
export function update(fn, notify = true) { fn(state); save(notify); }
export const snapshot = () => JSON.stringify(state);
export function restore(json) { state = JSON.parse(json); save(); }
export function replaceState(s) { state = s; save(); }
export function resetDemo() { state = seed(); save(); }
export function clearAll() { state = { settings: state.settings, projects: [] }; save(); }

// ---- project factory ----
export function newProject({ type, name, address, city, price, date, arv }) {
  const p = {
    id: uid(), type, name, address, city, color: PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length],
    stage: 0, created: date,
    purchase: { price: +price || 0, closingCosts: Math.round((+price || 0) * 0.025), date, arv: +arv || 0 },
    financing: { lender: '', loanAmount: 0, rate: 11, points: 2, fees: 0, holdback: 0 },
    cashReserves: 0,
    budget: DEFAULT_CATEGORIES.map((category) => ({ id: uid(), category, amount: 0 })),
    expenses: [], subs: [], materials: [], draws: [],
    holding: [
      { id: uid(), name: 'Property taxes', monthly: 0 },
      { id: uid(), name: 'Insurance', monthly: 0 },
      { id: uid(), name: 'Utilities', monthly: 0 },
    ],
    milestones: (type === 'flip'
      ? ['Close on purchase', 'Demo complete', 'Rough-ins complete', 'Rough inspection', 'Drywall & paint', 'Finishes installed', 'Final inspection / CO', 'List property', 'Close sale']
      : ['Close on purchase', 'Demo complete', 'Rough-ins complete', 'Finishes installed', 'Certificate of occupancy', 'Units leased', 'Appraisal', 'Refinance closed']
    ).map((n, i) => ({ id: uid(), name: n, date: addDays(i * 10, date), done: i === 0 })),
    notes: '',
  };
  if (type === 'flip') p.sale = { targetPrice: +arv || 0, targetDate: addDays(150, date), commissionPct: 5, closingPct: 1.5, concessions: 0, closed: false, actualPrice: 0, saleDate: '' };
  else {
    p.rental = { units: [], income: [], opex: { taxes: 0, insurance: 0, hoa: 0, utilities: 0, mgmtPct: 8, vacancyPct: 5, capexPct: 5, repairsPct: 5 } };
    p.refi = { lender: '', appraisal: +arv || 0, ltv: 75, rate: 7, termYears: 30, closingCosts: 4500, date: addDays(180, date), done: false, seasoningMonths: 6 };
  }
  return p;
}

// ---- seed ----
function seed() {
  const D = addDays;
  const b = (category, amount) => ({ id: uid(), category, amount });

  // ---------- FLIP ----------
  const fsubs = {
    demo: { id: uid(), name: 'JR Demo & Hauling', trade: 'Demolition', contract: 4200, phone: '(518) 555-0142', email: 'jr@jrdemo.co', lienWaiver: true, w9: true, insuranceExp: D(210), status: 'Complete' },
    roof: { id: uid(), name: 'Capital Roofing Co.', trade: 'Roofing', contract: 10800, phone: '(518) 555-0198', email: 'office@capitalroofing.com', lienWaiver: true, w9: true, insuranceExp: D(120), status: 'Complete' },
    plumb: { id: uid(), name: 'Mohawk Plumbing', trade: 'Plumbing', contract: 9200, phone: '(518) 555-0117', email: 'dispatch@mohawkplumb.com', lienWaiver: false, w9: true, insuranceExp: D(24), status: 'In progress' },
    elec: { id: uid(), name: 'Bright Line Electric', trade: 'Electrical', contract: 8400, phone: '(518) 555-0163', email: 'bids@brightline.com', lienWaiver: false, w9: true, insuranceExp: D(300), status: 'In progress' },
    hvac: { id: uid(), name: 'Precision HVAC', trade: 'HVAC', contract: 7600, phone: '(518) 555-0184', email: 'service@precisionhvac.com', lienWaiver: false, w9: false, insuranceExp: D(160), status: 'In progress' },
    paint: { id: uid(), name: 'Northway Drywall & Paint', trade: 'Drywall / Paint', contract: 6500, phone: '(518) 555-0129', email: 'northwaydp@gmail.com', lienWaiver: false, w9: true, insuranceExp: D(95), status: 'Scheduled' },
  };
  const fe = (date, category, vendor, type, amount, status = 'Paid', subId = null, method = 'Check', note = '', receipt = true) =>
    ({ id: uid(), date, category, vendor, type, amount, status, subId, method, note, receipt });

  const flip = {
    id: uid(), type: 'flip', name: 'Union Street Colonial', address: '412 Union St', city: 'Schenectady, NY 12305',
    color: '#eb6834', stage: 1, created: D(-64),
    purchase: { price: 132000, closingCosts: 4000, date: D(-62), arv: 315000 },
    financing: { lender: 'Hudson Bridge Capital', loanAmount: 105600, rate: 11, points: 2, fees: 1495, holdback: 85000 },
    cashReserves: 85000,
    budget: [
      b('Demo & Dumpsters', 4500), b('Roofing', 11000), b('Framing & Structural', 6000), b('Plumbing', 9500),
      b('Electrical', 8500), b('HVAC', 7800), b('Kitchen', 18500), b('Bathrooms', 12000), b('Flooring', 7200),
      b('Paint & Drywall', 6800), b('Exterior & Landscaping', 4200), b('Permits & Fees', 1800), b('Contingency', 6000),
    ],
    subs: Object.values(fsubs),
    expenses: [
      fe(D(-58), 'Permits & Fees', 'City of Schenectady', 'Permit / Fee', 1240, 'Paid', null, 'Card', 'Building + electrical permits'),
      fe(D(-56), 'Demo & Dumpsters', 'JR Demo & Hauling', 'Subcontractor', 2100, 'Paid', fsubs.demo.id, 'Check', '50% deposit'),
      fe(D(-55), 'Demo & Dumpsters', 'County Waste', 'Equipment', 685, 'Paid', null, 'Card', '30yd dumpster x1'),
      fe(D(-49), 'Demo & Dumpsters', 'JR Demo & Hauling', 'Subcontractor', 2100, 'Paid', fsubs.demo.id, 'Check', 'Final'),
      fe(D(-47), 'Roofing', 'Capital Roofing Co.', 'Subcontractor', 5400, 'Paid', fsubs.roof.id, 'ACH', 'Deposit — tear-off + architectural shingle'),
      fe(D(-44), 'Framing & Structural', 'Curtis Lumber', 'Materials', 2380, 'Paid', null, 'Card', 'Sistered joists, LVL beam'),
      fe(D(-42), 'Framing & Structural', 'Day labor — R. Diaz', 'Labor', 1600, 'Paid', null, 'Zelle', '4 days framing'),
      fe(D(-38), 'Roofing', 'Capital Roofing Co.', 'Subcontractor', 5400, 'Paid', fsubs.roof.id, 'ACH', 'Final — warranty on file'),
      fe(D(-36), 'Plumbing', 'Mohawk Plumbing', 'Subcontractor', 4600, 'Paid', fsubs.plumb.id, 'Check', 'Rough-in'),
      fe(D(-35), 'Electrical', 'Bright Line Electric', 'Subcontractor', 4200, 'Paid', fsubs.elec.id, 'Check', '200A service + rough'),
      fe(D(-31), 'HVAC', 'Precision HVAC', 'Subcontractor', 3800, 'Paid', fsubs.hvac.id, 'ACH', 'Furnace + ductwork deposit'),
      fe(D(-29), 'Kitchen', 'Home Depot Pro', 'Materials', 7420, 'Paid', null, 'Card', 'Shaker cabinets — white'),
      fe(D(-24), 'Bathrooms', 'Ferguson', 'Materials', 3150, 'Paid', null, 'Card', 'Vanities, tub, valves'),
      fe(D(-21), 'Flooring', 'Floor & Decor', 'Materials', 4046, 'Paid', null, 'Card', 'LVP 1,400 sqft @ $2.89'),
      fe(D(-17), 'Paint & Drywall', 'Northway Drywall & Paint', 'Subcontractor', 2500, 'Paid', fsubs.paint.id, 'Check', 'Deposit'),
      fe(D(-14), 'Kitchen', 'Stone Works of Albany', 'Materials', 3600, 'Paid', null, 'Check', 'Quartz countertops — templated', false),
      fe(D(-9), 'Bathrooms', 'Tile Shop', 'Materials', 1890, 'Paid', null, 'Card', 'Porcelain tile + setting materials'),
      fe(D(-6), 'Exterior & Landscaping', 'Day labor — R. Diaz', 'Labor', 900, 'Paid', null, 'Zelle', 'Porch repair'),
      fe(D(-3), 'Kitchen', 'Lowe\'s', 'Materials', 4380, 'Pending', null, 'Card', 'Appliance package — delivery next week', false),
      fe(D(-1), 'Plumbing', 'Mohawk Plumbing', 'Subcontractor', 2300, 'Pending', fsubs.plumb.id, 'Check', 'Trim-out progress payment', false),
    ],
    materials: [
      { id: uid(), item: 'Shaker cabinets (white) — full kitchen', room: 'Kitchen', qty: 1, unitCost: 7420, supplier: 'Home Depot Pro', status: 'Installed', date: D(-29), expensed: true },
      { id: uid(), item: 'Quartz countertops — Calacatta look', room: 'Kitchen', qty: 42, unitCost: 85.7, supplier: 'Stone Works of Albany', status: 'Ordered', date: D(-14), expensed: true },
      { id: uid(), item: 'Stainless appliance package', room: 'Kitchen', qty: 1, unitCost: 4380, supplier: 'Lowe\'s', status: 'Ordered', date: D(-3), expensed: true },
      { id: uid(), item: 'LVP flooring — Driftwood oak', room: 'Whole house', qty: 1400, unitCost: 2.89, supplier: 'Floor & Decor', status: 'Delivered', date: D(-21), expensed: true },
      { id: uid(), item: '36" vanity w/ top', room: 'Bathrooms', qty: 2, unitCost: 640, supplier: 'Ferguson', status: 'Delivered', date: D(-24), expensed: true },
      { id: uid(), item: 'Porcelain tile 12x24', room: 'Bathrooms', qty: 180, unitCost: 4.2, supplier: 'Tile Shop', status: 'Delivered', date: D(-9), expensed: true },
      { id: uid(), item: 'Interior doors (6-panel)', room: 'Whole house', qty: 9, unitCost: 118, supplier: 'Curtis Lumber', status: 'Quoted', date: D(0), expensed: false },
      { id: uid(), item: 'Light fixture package', room: 'Whole house', qty: 1, unitCost: 1150, supplier: 'Build.com', status: 'Quoted', date: D(0), expensed: false },
    ],
    draws: [
      { id: uid(), num: 1, date: D(-40), requested: 22000, funded: 22000, status: 'Funded', note: 'Demo, roof, framing' },
      { id: uid(), num: 2, date: D(-18), requested: 27500, funded: 26500, status: 'Funded', note: 'Rough-ins — $1k held for permit sign-off' },
      { id: uid(), num: 3, date: D(-2), requested: 18000, funded: 0, status: 'Inspection', note: 'Cabinets, flooring, drywall' },
    ],
    holding: [
      { id: uid(), name: 'Property taxes', monthly: 410 },
      { id: uid(), name: 'Builder\'s risk insurance', monthly: 145 },
      { id: uid(), name: 'Utilities (gas/electric/water)', monthly: 180 },
      { id: uid(), name: 'Lawn / snow', monthly: 60 },
    ],
    milestones: [
      { id: uid(), name: 'Close on purchase', date: D(-62), done: true },
      { id: uid(), name: 'Demo complete', date: D(-49), done: true },
      { id: uid(), name: 'New roof', date: D(-38), done: true },
      { id: uid(), name: 'Rough-ins complete', date: D(-28), done: true },
      { id: uid(), name: 'Rough inspection', date: D(-20), done: true },
      { id: uid(), name: 'Drywall & paint', date: D(-4), done: false },
      { id: uid(), name: 'Kitchen & baths installed', date: D(14), done: false },
      { id: uid(), name: 'Final inspection / CO', date: D(28), done: false },
      { id: uid(), name: 'List property', date: D(35), done: false },
      { id: uid(), name: 'Close sale', date: D(80), done: false },
    ],
    sale: { targetPrice: 315000, targetDate: D(80), commissionPct: 5, closingPct: 1.5, concessions: 3000, closed: false, actualPrice: 0, saleDate: '' },
    notes: 'Comps: 418 Union ($319k, 3/2, 21 DOM), 37 Elm ($308k). Stage with neutral palette. Ask agent about pre-listing photos at drywall.',
  };

  // ---------- BRRRR ----------
  const bsubs = {
    gc: { id: uid(), name: 'Troy Restoration LLC', trade: 'General contractor', contract: 31500, phone: '(518) 555-0110', email: 'pm@troyrestoration.com', lienWaiver: true, w9: true, insuranceExp: D(45), status: 'Complete' },
    elec: { id: uid(), name: 'Bright Line Electric', trade: 'Electrical', contract: 5600, phone: '(518) 555-0163', email: 'bids@brightline.com', lienWaiver: true, w9: true, insuranceExp: D(300), status: 'Complete' },
    floor: { id: uid(), name: 'Collar City Floors', trade: 'Flooring', contract: 3900, phone: '(518) 555-0175', email: 'ccfloors@outlook.com', lienWaiver: true, w9: true, insuranceExp: D(200), status: 'Complete' },
  };
  const brrrr = {
    id: uid(), type: 'brrrr', name: 'Elm Street Duplex', address: '88 Elm St', city: 'Troy, NY 12180',
    color: '#1baf7a', stage: 3, created: D(-150),
    purchase: { price: 128000, closingCosts: 4200, date: D(-146), arv: 285000 },
    financing: { lender: 'Northeast Private Lending', loanAmount: 102400, rate: 10.5, points: 1.5, fees: 1200, holdback: 50000 },
    cashReserves: 85000,
    budget: [
      b('Demo & Dumpsters', 3000), b('Plumbing', 4000), b('Electrical', 5600), b('Kitchen', 16500), b('Bathrooms', 9000),
      b('Flooring', 8700), b('Paint & Drywall', 6000), b('Exterior & Landscaping', 3500), b('Appliances', 4800),
      b('Permits & Fees', 1200), b('Contingency', 4000),
    ],
    subs: Object.values(bsubs),
    expenses: [
      fe(D(-140), 'Permits & Fees', 'City of Troy', 'Permit / Fee', 980, 'Paid', null, 'Card', 'Building permit'),
      fe(D(-138), 'Demo & Dumpsters', 'Troy Restoration LLC', 'Subcontractor', 2850, 'Paid', bsubs.gc.id, 'Check', 'Demo both units'),
      fe(D(-128), 'Plumbing', 'Troy Restoration LLC', 'Subcontractor', 3900, 'Paid', bsubs.gc.id, 'Check', 'Supply lines, 2 water heaters'),
      fe(D(-122), 'Electrical', 'Bright Line Electric', 'Subcontractor', 5600, 'Paid', bsubs.elec.id, 'ACH', 'Separate meters + panels'),
      fe(D(-114), 'Kitchen', 'Home Depot Pro', 'Materials', 9850, 'Paid', null, 'Card', 'Cabinets x2 kitchens'),
      fe(D(-108), 'Kitchen', 'Troy Restoration LLC', 'Subcontractor', 6400, 'Paid', bsubs.gc.id, 'Check', 'Kitchen install x2'),
      fe(D(-101), 'Bathrooms', 'Troy Restoration LLC', 'Subcontractor', 8750, 'Paid', bsubs.gc.id, 'Check', 'Both baths — tub surrounds'),
      fe(D(-95), 'Flooring', 'Collar City Floors', 'Subcontractor', 3900, 'Paid', bsubs.floor.id, 'Check', 'Install'),
      fe(D(-95), 'Flooring', 'Floor & Decor', 'Materials', 4720, 'Paid', null, 'Card', 'LVP 1,900 sqft'),
      fe(D(-88), 'Paint & Drywall', 'Troy Restoration LLC', 'Subcontractor', 5900, 'Paid', bsubs.gc.id, 'Check', 'Patch + paint both units'),
      fe(D(-84), 'Appliances', 'AJ Madison', 'Materials', 4960, 'Paid', null, 'Card', '2x fridge/range/dishwasher'),
      fe(D(-80), 'Exterior & Landscaping', 'Troy Restoration LLC', 'Subcontractor', 3700, 'Paid', bsubs.gc.id, 'Check', 'Porch, paint trim, cleanup'),
      fe(D(-76), 'Contingency', 'Troy Restoration LLC', 'Subcontractor', 2100, 'Paid', null, 'Check', 'Rotted sill plate — change order'),
    ],
    materials: [
      { id: uid(), item: 'Kitchen cabinets — 2 sets', room: 'Kitchen', qty: 2, unitCost: 4925, supplier: 'Home Depot Pro', status: 'Installed', date: D(-114), expensed: true },
      { id: uid(), item: 'LVP flooring', room: 'Both units', qty: 1900, unitCost: 2.48, supplier: 'Floor & Decor', status: 'Installed', date: D(-95), expensed: true },
      { id: uid(), item: 'Appliance packages', room: 'Kitchen', qty: 2, unitCost: 2480, supplier: 'AJ Madison', status: 'Installed', date: D(-84), expensed: true },
    ],
    draws: [
      { id: uid(), num: 1, date: D(-120), requested: 18000, funded: 18000, status: 'Funded', note: 'Demo, MEP' },
      { id: uid(), num: 2, date: D(-98), requested: 20000, funded: 20000, status: 'Funded', note: 'Kitchens, baths' },
      { id: uid(), num: 3, date: D(-78), requested: 12000, funded: 12000, status: 'Funded', note: 'Final — CO issued' },
    ],
    holding: [
      { id: uid(), name: 'Property taxes', monthly: 520 },
      { id: uid(), name: 'Insurance', monthly: 165 },
      { id: uid(), name: 'Utilities (vacant period)', monthly: 140 },
    ],
    milestones: [
      { id: uid(), name: 'Close on purchase', date: D(-146), done: true },
      { id: uid(), name: 'Demo complete', date: D(-136), done: true },
      { id: uid(), name: 'Rough-ins complete', date: D(-118), done: true },
      { id: uid(), name: 'Finishes installed', date: D(-82), done: true },
      { id: uid(), name: 'Certificate of occupancy', date: D(-77), done: true },
      { id: uid(), name: 'Units leased', date: D(-60), done: true },
      { id: uid(), name: 'Appraisal ordered', date: D(-5), done: true },
      { id: uid(), name: 'Refinance closed', date: D(12), done: false },
    ],
    rental: {
      units: [
        { id: uid(), name: 'Unit 1 (down)', beds: 2, baths: 1, sqft: 950, rent: 1650, tenant: 'M. Alvarez', leaseStart: D(-62), leaseEnd: D(303), deposit: 1650, status: 'Occupied' },
        { id: uid(), name: 'Unit 2 (up)', beds: 2, baths: 1, sqft: 950, rent: 1595, tenant: 'K. Okafor', leaseStart: D(-55), leaseEnd: D(48), deposit: 1595, status: 'Occupied' },
      ],
      income: [],
      opex: { taxes: 520, insurance: 165, hoa: 0, utilities: 110, mgmtPct: 8, vacancyPct: 5, capexPct: 5, repairsPct: 5 },
    },
    refi: { lender: 'Pioneer Community Bank', appraisal: 285000, ltv: 75, rate: 6.875, termYears: 30, closingCosts: 4800, date: D(12), done: false, seasoningMonths: 6 },
    notes: 'DSCR lender requires 6-month seasoning from purchase — confirm appraisal uses after-repair comps (104 & 112 Elm).',
  };
  // two months of collected rent
  brrrr.rental.income = [-45, -15].flatMap((off) =>
    brrrr.rental.units.map((u) => ({ id: uid(), date: D(off), unitId: u.id, amount: u.rent, type: 'Rent', note: '' })));
  brrrr.rental.income.push({ id: uid(), date: D(-15), unitId: brrrr.rental.units[1].id, amount: 50, type: 'Late fee', note: '' });

  return { settings: { investor: 'My Portfolio' }, projects: [flip, brrrr] };
}
