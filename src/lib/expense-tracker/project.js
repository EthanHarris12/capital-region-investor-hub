// Single deal workspace — shared rehab tabs plus flip- and BRRRR-specific ones.
import * as S from './store.js';
import { calc } from './calc.js';
import { esc, money, compact, pct, num, counter, fmtDate, relDays, today, uid, sum, runCounters, csvDownload, daysBetween, addDays } from './util.js';
import { icon, toast, openForm, openModal, closeModal, emptyState } from './ui.js';
import { donut, budgetBars, lineChart, waterfall, gauge, stack, tipRows } from './charts.js';
import { alertsFor, alertList } from './overview.js';

export const PROJECT_TABS = (p) => [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'budget', label: 'Budget', icon: 'dollar' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt', count: p.expenses.length },
  { id: 'subs', label: 'Subcontractors', icon: 'users', count: p.subs.length },
  { id: 'materials', label: 'Materials', icon: 'box', count: p.materials.length },
  { id: 'draws', label: 'Draws', icon: 'bank', count: p.draws.length },
  { id: 'holding', label: 'Holding costs', icon: 'clock' },
  { id: 'timeline', label: 'Timeline', icon: 'calendar' },
  ...(p.type === 'flip'
    ? [{ id: 'sale', label: 'Sale & profit', icon: 'flame' }]
    : [{ id: 'rent', label: 'Rent roll', icon: 'key', count: p.rental.units.length }, { id: 'refi', label: 'Refinance', icon: 'repeat' }]),
  { id: 'inputs', label: 'Deal inputs', icon: 'sliders' },
];

const PILL = {
  Paid: 'good', Pending: 'warn',
  Scheduled: 'blue', 'In progress': 'accent', Complete: 'good', 'On hold': 'warn',
  Quoted: '', Ordered: 'blue', Delivered: 'accent', Installed: 'good',
  Requested: 'warn', Inspection: 'blue', Funded: 'good',
  Occupied: 'good', Vacant: 'bad', Notice: 'warn', 'Make-ready': 'blue',
};
const pill = (s) => `<span class="pill ${PILL[s] ?? ''}">${esc(s)}</span>`;
const fresh = (id) => S.getProject(id);

// ---------- path helpers for live-bound inputs ----------
const getPath = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const listOf = (p, key) => getPath(p, key);

function crud(p, key, label) {
  return {
    add: (item) => { S.update(() => listOf(fresh(p.id), key).push({ id: uid(), ...item })); toast(`${label} added`); },
    edit: (id, vals) => { S.update(() => Object.assign(listOf(fresh(p.id), key).find((x) => x.id === id), vals)); toast(`${label} updated`); },
    del: (id) => {
      const before = S.snapshot();
      S.update(() => { const l = listOf(fresh(p.id), key); l.splice(l.findIndex((x) => x.id === id), 1); });
      toast(`${label} deleted`, { undo: () => S.restore(before) });
    },
  };
}

// ---------- form schemas ----------
const categories = (p) => [...new Set([...p.budget.map((b) => b.category), ...S.DEFAULT_CATEGORIES])];
const vendors = (p) => [...new Set([...p.subs.map((s) => s.name), ...S.getState().projects.flatMap((x) => x.expenses.map((e) => e.vendor))])];

export function openExpenseForm(p, values, id, after) {
  const c = crud(p, 'expenses', 'Expense');
  openForm({
    title: id ? 'Edit expense' : 'Log an expense', subtitle: p.name,
    values: { date: today(), status: 'Paid', method: 'Card', type: 'Materials', receipt: true, category: p.budget[0]?.category, ...values },
    fields: [
      { k: 'vendor', label: 'Paid to', type: 'text', list: vendors(p), required: true, placeholder: 'Vendor or sub' },
      { k: 'amount', label: 'Amount', type: 'money', required: true },
      { k: 'date', label: 'Date', type: 'date', required: true },
      { k: 'category', label: 'Budget category', type: 'select', options: categories(p) },
      { k: 'type', label: 'Type', type: 'select', options: S.EXPENSE_TYPES },
      { k: 'subId', label: 'Subcontractor (optional)', type: 'select', options: [{ value: '', label: '— None —' }, ...p.subs.map((s) => ({ value: s.id, label: `${s.name} · ${s.trade}` }))], hint: 'Links the payment to their contract balance' },
      { k: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] },
      { k: 'method', label: 'Payment method', type: 'select', options: S.PAY_METHODS },
      { k: 'note', label: 'Note', type: 'text', full: true, placeholder: 'Invoice #, what it covered…' },
      { k: 'receipt', label: 'Receipt / invoice on file', type: 'checkbox' },
    ],
    submit: id ? 'Save changes' : 'Log expense',
    onSubmit: (v) => {
      if (!v.amount) return false;
      v.subId = v.subId || null;
      if (v.subId && v.type === 'Materials') v.type = 'Subcontractor';
      const pp = fresh(p.id);
      if (pp.budget.every((b) => b.category !== v.category)) S.update(() => pp.budget.push({ id: uid(), category: v.category, amount: 0 }), false);
      if (after) S.update(after, false);
      id ? c.edit(id, v) : c.add(v);
    },
    onDelete: id ? () => c.del(id) : null,
  });
}

const SUB_FIELDS = [
  { k: 'name', label: 'Company / name', required: true },
  { k: 'trade', label: 'Trade', list: ['General contractor', 'Demolition', 'Roofing', 'Plumbing', 'Electrical', 'HVAC', 'Drywall / Paint', 'Flooring', 'Carpentry', 'Masonry', 'Landscaping', 'Cleaning'] },
  { k: 'contract', label: 'Contract amount', type: 'money' },
  { k: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'In progress', 'Complete', 'On hold'] },
  { k: 'phone', label: 'Phone' },
  { k: 'email', label: 'Email' },
  { k: 'insuranceExp', label: 'Insurance (COI) expires', type: 'date' },
  { k: 'lienWaiver', label: 'Lien waiver received', type: 'checkbox' },
  { k: 'w9', label: 'W-9 on file', type: 'checkbox' },
];
const MAT_FIELDS = (p) => [
  { k: 'item', label: 'Item', required: true, full: true },
  { k: 'room', label: 'Room / area', list: ['Kitchen', 'Bathrooms', 'Whole house', 'Exterior', 'Basement', 'Bedrooms', 'Living areas'] },
  { k: 'supplier', label: 'Supplier', list: vendors(p) },
  { k: 'qty', label: 'Quantity', type: 'number' },
  { k: 'unitCost', label: 'Unit cost', type: 'money' },
  { k: 'status', label: 'Status', type: 'select', options: ['Quoted', 'Ordered', 'Delivered', 'Installed'] },
  { k: 'date', label: 'Date', type: 'date' },
];
const DRAW_FIELDS = [
  { k: 'num', label: 'Draw #', type: 'number' },
  { k: 'date', label: 'Date requested', type: 'date' },
  { k: 'requested', label: 'Amount requested', type: 'money', required: true },
  { k: 'funded', label: 'Amount funded', type: 'money' },
  { k: 'status', label: 'Status', type: 'select', options: ['Requested', 'Inspection', 'Funded'] },
  { k: 'note', label: 'Scope / note', full: true },
];
const UNIT_FIELDS = [
  { k: 'name', label: 'Unit', required: true, placeholder: 'Unit 1' },
  { k: 'status', label: 'Status', type: 'select', options: ['Occupied', 'Vacant', 'Notice', 'Make-ready'] },
  { k: 'beds', label: 'Beds', type: 'number' },
  { k: 'baths', label: 'Baths', type: 'number' },
  { k: 'sqft', label: 'Sq ft', type: 'number' },
  { k: 'rent', label: 'Monthly rent', type: 'money', required: true },
  { k: 'tenant', label: 'Tenant' },
  { k: 'deposit', label: 'Security deposit', type: 'money' },
  { k: 'leaseStart', label: 'Lease start', type: 'date' },
  { k: 'leaseEnd', label: 'Lease end', type: 'date' },
];

// ---------- live regions ----------
// Inputs bound with data-bind update state without a full re-render (so focus
// is kept); any [data-live] region is then redrawn from fresh numbers.
let live = {};
const liveBox = (name, fn, cls = '') => { live[name] = fn; return `<div data-live="${name}" class="${cls}">${fn(null)}</div>`; };
function refreshLive(id) {
  const c = calc(fresh(id));
  document.querySelectorAll('[data-live]').forEach((el) => {
    const fn = live[el.dataset.live];
    if (fn) { el.innerHTML = fn(c); runCounters(el, false); }
  });
}
const bindInput = (path, value, { type = 'num', pre = '', post = '', step = 'any', attrs = '' } = {}) => {
  const affix = pre ? 'affix has-pre' : post ? 'affix has-post' : '';
  const input = type === 'text'
    ? `<input class="input" data-bind="${path}" data-type="text" value="${esc(value ?? '')}" ${attrs}>`
    : type === 'date'
      ? `<input class="input" type="date" data-bind="${path}" data-type="text" value="${esc(value ?? '')}" ${attrs}>`
      : `<input class="input" type="number" step="${step}" data-bind="${path}" data-type="num" value="${esc(value ?? '')}" ${attrs}>`;
  return affix ? `<div class="${affix}">${pre ? `<span class="pre">${pre}</span>` : ''}${input}${post ? `<span class="post">${post}</span>` : ''}</div>` : input;
};
const bf = (label, path, p, opts = {}) => `<div class="field ${opts.full ? 'full' : ''}"><label>${esc(label)}</label>${bindInput(path, getPath(p, path), opts)}${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</div>`;

// ====================================================================
export function projectView(p, tab, ctx) {
  live = {};
  const c = calc(p);
  const flip = p.type === 'flip';
  const stages = flip ? S.FLIP_STAGES : S.BRRRR_STAGES;
  const tabs = PROJECT_TABS(p);
  if (!tabs.some((t) => t.id === tab)) tab = 'overview';
  const C = (cc) => cc || c;

  const handlers = {
    stage: (el) => { S.update(() => { fresh(p.id).stage = +el.dataset.n; }); toast(`Stage set to ${stages[+el.dataset.n]}`); },
    bind: (el) => {
      const pp = fresh(p.id);
      const v = el.dataset.type === 'num' ? (el.value === '' ? 0 : +el.value) : el.type === 'checkbox' ? el.checked : el.value;
      setPath(pp, el.dataset.bind, v);
      if (el.type === 'range') {
        el.style.setProperty('--p', `${((+el.value - +el.min) / (+el.max - +el.min)) * 100}%`);
        const out = document.querySelector(`[data-out="${el.dataset.bind}"]`);
        if (out) out.textContent = el.dataset.fmt === 'money' ? money(+el.value) : `${+el.value}%`;
        document.querySelectorAll(`[data-bind="${el.dataset.bind}"]:not([type=range])`).forEach((o) => { o.value = el.value; });
      }
      S.save(false);
      refreshLive(p.id);
      if (/^(name|address)$/.test(el.dataset.bind)) ctx.chromeRefresh?.();
    },
    'bind-check': (el) => { setPath(fresh(p.id), el.dataset.path, el.checked); S.save(); },
    'del-project': () => {
      const m = openModal(`<div class="modal-head"><div><h3>Delete ${esc(p.name)}?</h3><p>This removes the deal and all of its expenses, subs, draws and notes.</p></div></div>
        <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn primary" style="background:var(--bad);border-color:var(--bad)" data-x>Delete deal</button></div>`);
      m.querySelector('[data-x]').onclick = () => {
        const before = S.snapshot();
        closeModal();
        S.update((s) => { s.projects = s.projects.filter((x) => x.id !== p.id); }, false);
        ctx.nav('#/');
        toast('Deal deleted', { undo: () => { S.restore(before); ctx.nav(`#/p/${p.id}`); } });
      };
    },
    // expenses
    'add-expense': () => openExpenseForm(p, {}),
    'edit-expense': (el) => openExpenseForm(p, p.expenses.find((e) => e.id === el.dataset.id), el.dataset.id),
    'del-expense': (el) => crud(p, 'expenses', 'Expense').del(el.dataset.id),
    'toggle-receipt': (el) => { S.update(() => { const e = fresh(p.id).expenses.find((x) => x.id === el.dataset.id); e.receipt = !e.receipt; }); },
    'mark-paid': (el) => { S.update(() => { fresh(p.id).expenses.find((x) => x.id === el.dataset.id).status = 'Paid'; }); toast('Marked as paid'); },
    'export-expenses': () => {
      csvDownload(`${p.name.replace(/\W+/g, '-')}-expenses.csv`, [
        ['Date', 'Vendor', 'Category', 'Type', 'Subcontractor', 'Method', 'Status', 'Receipt', 'Amount', 'Note'],
        ...[...p.expenses].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.vendor, e.category, e.type, p.subs.find((s) => s.id === e.subId)?.name || '', e.method, e.status, e.receipt ? 'Yes' : 'No', e.amount, e.note]),
      ]);
      toast('Expenses exported to CSV');
    },
    'filter-expenses': () => filterExpenses(),
    // budget
    'add-budget': () => openForm({ title: 'Add budget line', fields: [{ k: 'category', label: 'Category', required: true, list: S.DEFAULT_CATEGORIES }, { k: 'amount', label: 'Budget', type: 'money' }], onSubmit: (v) => crud(p, 'budget', 'Budget line').add(v) }),
    'del-budget': (el) => crud(p, 'budget', 'Budget line').del(el.dataset.id),
    'budget-amt': (el) => { S.update(() => { fresh(p.id).budget.find((b) => b.id === el.dataset.id).amount = +el.value || 0; }); },
    'apply-template': () => applyTemplate(p),
    // subs
    'add-sub': () => openForm({ title: 'Add subcontractor', fields: SUB_FIELDS, values: { status: 'Scheduled', w9: false, lienWaiver: false }, onSubmit: (v) => crud(p, 'subs', 'Subcontractor').add(v) }),
    'edit-sub': (el) => openForm({ title: 'Edit subcontractor', fields: SUB_FIELDS, values: p.subs.find((s) => s.id === el.dataset.id), onSubmit: (v) => crud(p, 'subs', 'Subcontractor').edit(el.dataset.id, v), onDelete: () => crud(p, 'subs', 'Subcontractor').del(el.dataset.id) }),
    'pay-sub': (el) => {
      const s = c.subs.find((x) => x.id === el.dataset.id);
      openExpenseForm(p, { vendor: s.name, subId: s.id, type: 'Subcontractor', method: 'Check', amount: Math.max(0, s.balance) || '', category: p.budget.find((b) => b.category.toLowerCase().includes(s.trade.split(/[\s/]/)[0].toLowerCase()))?.category || p.budget[0]?.category, receipt: false });
    },
    'toggle-sub': (el) => { S.update(() => { const s = fresh(p.id).subs.find((x) => x.id === el.dataset.id); s[el.dataset.f] = !s[el.dataset.f]; }); },
    // materials
    'add-mat': () => openForm({ title: 'Add material', fields: MAT_FIELDS(p), values: { qty: 1, status: 'Quoted', date: today() }, onSubmit: (v) => crud(p, 'materials', 'Material').add({ ...v, expensed: false }) }),
    'edit-mat': (el) => openForm({ title: 'Edit material', fields: MAT_FIELDS(p), values: p.materials.find((m) => m.id === el.dataset.id), onSubmit: (v) => crud(p, 'materials', 'Material').edit(el.dataset.id, v), onDelete: () => crud(p, 'materials', 'Material').del(el.dataset.id) }),
    'mat-status': (el) => { S.update(() => { fresh(p.id).materials.find((m) => m.id === el.dataset.id).status = el.value; }); },
    'expense-mat': (el) => {
      const m = p.materials.find((x) => x.id === el.dataset.id);
      openExpenseForm(p, { vendor: m.supplier, amount: Math.round(m.qty * m.unitCost * 100) / 100, type: 'Materials', note: m.item, category: p.budget.find((b) => b.category.toLowerCase().includes((m.room || '').toLowerCase().slice(0, 5)))?.category || p.budget[0]?.category },
        null, () => { fresh(p.id).materials.find((x) => x.id === m.id).expensed = true; });
    },
    // draws
    'add-draw': () => openForm({ title: 'Request a draw', fields: DRAW_FIELDS, values: { num: p.draws.length + 1, date: today(), status: 'Requested', funded: 0 }, onSubmit: (v) => crud(p, 'draws', 'Draw').add(v) }),
    'edit-draw': (el) => openForm({ title: 'Edit draw', fields: DRAW_FIELDS, values: p.draws.find((d) => d.id === el.dataset.id), onSubmit: (v) => crud(p, 'draws', 'Draw').edit(el.dataset.id, v), onDelete: () => crud(p, 'draws', 'Draw').del(el.dataset.id) }),
    'fund-draw': (el) => { S.update(() => { const d = fresh(p.id).draws.find((x) => x.id === el.dataset.id); d.status = 'Funded'; d.funded = d.funded || d.requested; }); toast('Draw marked funded'); },
    // holding
    'add-hold': () => openForm({ title: 'Add holding cost', subtitle: 'Recurring monthly carrying cost', fields: [{ k: 'name', label: 'Name', required: true, list: ['Property taxes', 'Insurance', 'Utilities', 'HOA', 'Lawn / snow', 'Security / monitoring', 'Storage / POD'] }, { k: 'monthly', label: 'Per month', type: 'money' }], onSubmit: (v) => crud(p, 'holding', 'Holding cost').add(v) }),
    'edit-hold': (el) => openForm({ title: 'Edit holding cost', fields: [{ k: 'name', label: 'Name', required: true }, { k: 'monthly', label: 'Per month', type: 'money' }], values: p.holding.find((h) => h.id === el.dataset.id), onSubmit: (v) => crud(p, 'holding', 'Holding cost').edit(el.dataset.id, v), onDelete: () => crud(p, 'holding', 'Holding cost').del(el.dataset.id) }),
    // milestones
    'toggle-ms': (el) => { S.update(() => { const m = fresh(p.id).milestones.find((x) => x.id === el.dataset.id); m.done = !m.done; }); },
    'add-ms': () => openForm({ title: 'Add milestone', fields: [{ k: 'name', label: 'Milestone', required: true, full: true }, { k: 'date', label: 'Target date', type: 'date' }, { k: 'done', label: 'Completed', type: 'checkbox' }], values: { date: addDays(7) }, onSubmit: (v) => { crud(p, 'milestones', 'Milestone').add(v); S.update(() => fresh(p.id).milestones.sort((a, b) => (a.date || '').localeCompare(b.date || '')), false); } }),
    'edit-ms': (el) => openForm({ title: 'Edit milestone', fields: [{ k: 'name', label: 'Milestone', required: true, full: true }, { k: 'date', label: 'Target date', type: 'date' }, { k: 'done', label: 'Completed', type: 'checkbox' }], values: p.milestones.find((m) => m.id === el.dataset.id), onSubmit: (v) => crud(p, 'milestones', 'Milestone').edit(el.dataset.id, v), onDelete: () => crud(p, 'milestones', 'Milestone').del(el.dataset.id) }),
    // rental
    'add-unit': () => openForm({ title: 'Add unit', fields: UNIT_FIELDS, values: { status: 'Vacant', name: `Unit ${p.rental.units.length + 1}` }, onSubmit: (v) => crud(p, 'rental.units', 'Unit').add(v) }),
    'edit-unit': (el) => openForm({ title: 'Edit unit', fields: UNIT_FIELDS, values: p.rental.units.find((u) => u.id === el.dataset.id), onSubmit: (v) => crud(p, 'rental.units', 'Unit').edit(el.dataset.id, v), onDelete: () => crud(p, 'rental.units', 'Unit').del(el.dataset.id) }),
    'add-income': (el) => {
      const u = el.dataset.unit ? p.rental.units.find((x) => x.id === el.dataset.unit) : p.rental.units[0];
      openForm({
        title: 'Record income', fields: [
          { k: 'unitId', label: 'Unit', type: 'select', options: p.rental.units.map((x) => ({ value: x.id, label: `${x.name}${x.tenant ? ` · ${x.tenant}` : ''}` })) },
          { k: 'type', label: 'Type', type: 'select', options: ['Rent', 'Late fee', 'Pet fee', 'Utility reimbursement', 'Other'] },
          { k: 'amount', label: 'Amount', type: 'money', required: true }, { k: 'date', label: 'Date received', type: 'date' },
          { k: 'note', label: 'Note', full: true }],
        values: { unitId: u?.id, type: 'Rent', amount: u?.rent, date: today() },
        onSubmit: (v) => crud(p, 'rental.income', 'Payment').add(v),
      });
    },
    'del-income': (el) => crud(p, 'rental.income', 'Payment').del(el.dataset.id),
    'record-all-rent': () => {
      const occ = p.rental.units.filter((u) => u.status === 'Occupied');
      S.update(() => occ.forEach((u) => fresh(p.id).rental.income.push({ id: uid(), date: today(), unitId: u.id, amount: u.rent, type: 'Rent', note: '' })));
      toast(`Recorded ${occ.length} rent payment${occ.length === 1 ? '' : 's'} · ${money(sum(occ, 'rent'))}`);
    },
    'refi-done': (el) => { S.update(() => { const pp = fresh(p.id); pp.refi.done = el.checked; if (el.checked) pp.stage = Math.max(pp.stage, 3); }); toast(el.checked ? 'Refinance marked closed — nice work' : 'Refinance reopened'); },
    'sale-closed': (el) => { S.update(() => { const pp = fresh(p.id); pp.sale.closed = el.checked; if (el.checked) { pp.stage = 4; pp.sale.saleDate ||= today(); pp.sale.actualPrice ||= pp.sale.targetPrice; } }); toast(el.checked ? 'Sale recorded — congrats!' : 'Sale reopened'); },
    mounted: () => { filterExpenses(); },
  };
  ctx.setHandlers(handlers);

  // ---------- header ----------
  const kpis = (cc) => {
    const k = C(cc);
    const card = (i, label, val, fmt, key, foot, extra = '') => `<div class="card stat ${cc ? '' : 'rise'}" style="--i:${i}"><div class="label">${label}</div><div class="value">${counter(val, fmt, `${p.id}-${key}`)}</div>${extra}<div class="foot">${foot}</div></div>`;
    const rehab = card(2, 'Rehab spent', k.rehabSpent, 'money', 'rehab', `<span>${pct(k.budgetUsed, 0)} of ${money(k.rehabBudget)}</span>${k.pending ? `<span>· ${money(k.pending)} pending</span>` : ''}`,
      `<div class="bar thin" style="margin-top:10px"><span class="${cc ? '' : 'grow'} ${k.budgetUsed > 1 ? 'over' : ''}" style="width:${Math.min(100, k.budgetUsed * 100)}%"></span></div>`);
    if (flip) return [
      card(1, 'All-in acquisition', k.acquisition + k.loanCosts, 'money', 'acq', `<span>${money(p.purchase.price)} price + closing &amp; points</span>`),
      rehab,
      card(3, 'Funds remaining', k.fundsRemaining, 'money', 'funds', `<span class="${k.fundingGap < 0 ? 'bad-ink' : ''}">${k.fundingGap < 0 ? `${money(-k.fundingGap)} short at completion` : `${money(k.holdbackRemaining)} undrawn holdback`}</span>`),
      card(4, 'Projected profit', k.profit, 'money', 'profit', `<span class="delta ${k.profit >= 0 ? 'up' : 'down'}">${pct(k.roi)} ROI</span><span>${pct(k.annualized, 0)} annualized</span>`),
    ].join('');
    return [
      card(1, 'All-in cost', k.allIn, 'money', 'allin', `<span class="${k.rule75 > 0.75 ? 'warn-ink' : ''}">${pct(k.rule75, 0)} of ${compact(k.arv)} ARV</span>`),
      rehab,
      card(3, 'Cash left in after refi', Math.max(0, k.cashLeftIn), 'money', 'left', `<span class="delta ${k.recovered >= 0.9 ? 'up' : 'flat'}">${pct(k.recovered, 0)} recovered</span>${k.cashLeftIn < 0 ? `<span>+${money(-k.cashLeftIn)} pulled out</span>` : ''}`),
      card(4, 'Monthly cash flow', k.cashflow, 'money', 'cf', `<span class="delta ${k.dscr >= 1.2 ? 'up' : 'down'}">${k.dscr.toFixed(2)}x DSCR</span><span>${Number.isFinite(k.coc) ? pct(k.coc) : '∞'} CoC</span>`),
    ].join('');
  };

  const header = `
  <section class="hero compact">
    <div class="hero-row">
      <div class="rise">
        <div class="eyebrow"><span class="tag ${p.type}">${flip ? 'Fix & flip' : 'BRRRR'}</span> ${esc(p.address)}${p.city ? ` · ${esc(p.city)}` : ''}</div>
        <h1>${esc(p.name)}</h1>
        <div class="sub">Purchased ${fmtDate(p.purchase.date)} · ${c.daysHeld} days held · ${flip
          ? (p.sale.closed ? `sold ${fmtDate(p.sale.saleDate)}` : `target sale ${relDays(p.sale.targetDate)}`)
          : (p.refi.done ? `refinanced ${fmtDate(p.refi.date)}` : `refi ${relDays(p.refi.date)}`)}</div>
      </div>
      <div class="card-actions rise" style="--i:1">
        <button class="btn" data-action="print">${icon('printer')} Report</button>
        <button class="btn" data-action="add-expense">${icon('plus')} Expense</button>
      </div>
    </div>
    <div class="stepper rise" style="--i:2">${stages.map((s, i) => `<button class="step ${i < p.stage ? 'done' : i === p.stage ? 'current' : ''}" data-action="stage" data-n="${i}">
      <span class="n">${i < p.stage ? icon('check', 12, 3) : i + 1}</span>${s}</button>`).join('')}</div>
  </section>
  ${liveBox('kpis', kpis, 'lift grid g-4')}
  <nav class="tabs">${tabs.map((t) => `<a class="tab ${t.id === tab ? 'active' : ''}" href="#/p/${p.id}/${t.id}">${t.label}${t.count != null ? `<span class="count">${t.count}</span>` : ''}</a>`).join('')}<span class="tab-ink"></span></nav>`;

  const body = ({
    overview: () => (flip ? flipOverview(p, c) : brrrrOverview(p, c)),
    budget: () => budgetTab(p, c),
    expenses: () => expensesTab(p, c),
    subs: () => subsTab(p, c),
    materials: () => materialsTab(p),
    draws: () => drawsTab(p, c),
    holding: () => holdingTab(p, c),
    timeline: () => timelineTab(p, c),
    sale: () => saleTab(p, c),
    rent: () => rentTab(p, c),
    refi: () => refiTab(p, c),
    inputs: () => inputsTab(p, c),
  })[tab]();

  return `${header}<div id="tab-body">${body}</div>`;
}

// ====================================================================
// Overview tabs
function spendChart(p, c) {
  const pace = [{ x: p.purchase.date, y: 0 }, { x: c.plannedEnd && c.plannedEnd > p.purchase.date ? c.plannedEnd : addDays(120, p.purchase.date), y: c.rehabBudget }];
  return `<div class="card rise" style="--i:6">
    <div class="card-head"><div><div class="card-title">Rehab spend over time</div><div class="card-sub">Cumulative vs. a straight-line budget pace to ${p.type === 'flip' ? 'sale' : 'refi'}</div></div>
      <div class="legend"><span><i class="line" style="background:var(--accent)"></i>Spent</span><span><i class="dash"></i>Budget pace</span></div></div>
    ${lineChart([{ name: 'Spent', color: 'var(--accent)', points: c.series, step: true, area: true }, { name: 'Budget pace', color: 'var(--muted)', points: pace, dashed: true }])}
  </div>`;
}

const checkItem = (level, title, sub, value) => `<div class="check-item"><span class="ci ${level}">${icon(level === 'good' ? 'check' : 'alert', 14, 2.5)}</span><div><b>${title}</b><small>${sub}</small></div><span class="cv">${value}</span></div>`;

function flipOverview(p, c) {
  const segs = [
    { label: 'Purchase & closing', value: c.acquisition, color: 'var(--s1)' },
    { label: 'Rehab', value: c.projRehab, color: 'var(--s2)' },
    { label: 'Holding & interest', value: c.projHolding, color: 'var(--s3)' },
    { label: 'Loan points & fees', value: c.loanCosts, color: 'var(--s4)' },
    { label: 'Selling costs', value: c.sellingCosts, color: 'var(--s5)' },
  ];
  const alerts = alertsFor(p, c);
  return `
  <div class="grid g-21">
    <div class="card rise wf-card" style="--i:3">
      <div class="card-head"><div><div class="card-title">Projected profit</div><div class="card-sub">From ${p.sale.closed ? 'actual' : 'target'} sale price down to net — hover any bar</div></div>
        <a class="btn sm" href="#/p/${p.id}/sale">Sensitivity ${icon('arrowRight', 13)}</a></div>
      ${waterfall([
        { label: 'Sale price', value: c.salePrice, kind: 'start' },
        { label: 'Selling costs', value: c.sellingCosts, kind: 'cost' },
        { label: 'Purchase', value: c.acquisition, kind: 'cost' },
        { label: 'Rehab', value: c.projRehab, kind: 'cost' },
        { label: 'Holding', value: c.projHolding, kind: 'cost' },
        { label: 'Financing', value: c.loanCosts, kind: 'cost' },
        { label: 'Net profit', value: c.profit, kind: 'total' },
      ])}
      <div class="grid g-4 mt" style="gap:10px">
        ${[['ROI on cash', pct(c.roi)], ['Annualized', pct(c.annualized)], ['Margin', pct(c.margin)], ['Profit / month', money(c.profitPerMonth)]].map(([l, v]) => `<div style="background:var(--surface-2);border-radius:10px;padding:10px 12px"><div class="note">${l}</div><b>${v}</b></div>`).join('')}
      </div>
    </div>
    ${sourcesUses(p, c)}
  </div>
  <div class="grid g-2 mt">
    ${spendChart(p, c)}
    <div class="card rise" style="--i:7"><div class="card-head"><div><div class="card-title">Where the money goes</div><div class="card-sub">Projected total cost to sell</div></div></div>
      ${donut(segs, { center: compact(c.totalCost), centerLabel: 'total cost' })}</div>
  </div>
  <div class="grid g-21 mt">
    <div class="card rise" style="--i:8"><div class="card-head"><div class="card-title">Budget vs. actual</div><a class="btn sm ghost" href="#/p/${p.id}/budget">All categories ${icon('arrowRight', 13)}</a></div>${budgetBars(c.cats, { limit: 6 })}</div>
    <div class="card rise" style="--i:9"><div class="card-head"><div class="card-title">Deal checks</div></div>
      <div class="checks">
        ${checkItem(p.purchase.price <= c.mao ? 'good' : 'warn', '70% rule', `MAO = 70% × ARV − rehab`, money(c.mao))}
        ${checkItem(c.budgetUsed <= c.progress + 0.1 ? 'good' : 'warn', 'Budget pace', `${pct(c.budgetUsed, 0)} spent · ${pct(c.progress, 0)} of milestones done`, pct(c.budgetUsed, 0))}
        ${checkItem(c.profit >= 25000 ? 'good' : c.profit > 0 ? 'warn' : 'bad', 'Breakeven sale price', `Below this you lose money`, money(c.breakeven))}
        ${checkItem('good', 'Daily carry', `Holding + interest · ${money(c.burnPerDay)}/day rehab burn`, money(c.holdingMonthly / 30.4))}
      </div>
      ${alerts.length ? `<div class="card-title" style="margin:18px 0 4px">Needs attention</div>${alertList(alerts, 4)}` : ''}
    </div>
  </div>`;
}

function sourcesUses(p, c) {
  const uses = [
    { label: 'Purchase & closing', value: c.acquisition, color: 'var(--s1)' },
    { label: 'Loan points & fees', value: c.loanCosts, color: 'var(--s4)' },
    { label: 'Rehab paid', value: c.paid, color: 'var(--s2)' },
    { label: 'Holding to date', value: c.holdingToDate, color: 'var(--s3)' },
    { label: 'Remaining', value: Math.max(0, c.fundsRemaining), color: 'var(--line)' },
  ];
  return `<div class="card rise" style="--i:4">
    <div class="card-head"><div><div class="card-title">Sources &amp; uses</div><div class="card-sub">Cash basis, to date</div></div></div>
    <div class="note">Funds remaining</div>
    <div class="big-num ${c.fundsRemaining < 0 ? 'bad-ink' : ''}">${counter(c.fundsRemaining, 'money', `${p.id}-su`)}</div>
    ${stack(uses)}
    <div class="su">
      <div class="su-row"><span>Your cash allocated</span><b>${money(p.cashReserves)}</b></div>
      <div class="su-row"><span>Acquisition loan</span><b>${money(p.financing.loanAmount)}</b></div>
      <div class="su-row"><span>Draws funded</span><b>${money(c.drawsFunded)}</b></div>
      <div class="su-row total"><span>Total sources</span><b>${money(c.sources)}</b></div>
      ${uses.slice(0, 4).map((u) => `<div class="su-row"><span><i style="background:${u.color}"></i>${u.label}</span><b>−${money(u.value)}</b></div>`).join('')}
      <div class="su-row total"><span>Still to fund (plan)</span><b>${money(c.futureNeeds)}</b></div>
      <div class="su-row"><span>Undrawn holdback</span><b>${money(c.holdbackRemaining)}</b></div>
      <div class="su-row"><span>${c.fundingGap >= 0 ? 'Cushion at completion' : 'Shortfall at completion'}</span><b class="${c.fundingGap >= 0 ? 'good-ink' : 'bad-ink'}">${money(c.fundingGap)}</b></div>
    </div></div>`;
}

function brrrrOverview(p, c) {
  const alerts = alertsFor(p, c);
  const metric = (l, v, sub, good) => `<div style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px;padding:14px">
    <div class="note">${l}</div><div style="font-size:20px;font-weight:700;letter-spacing:-.02em" class="${good === true ? 'good-ink' : good === false ? 'warn-ink' : ''}">${v}</div><div class="note">${sub}</div></div>`;
  return `
  <div class="grid g-21">
    <div class="card rise wf-card" style="--i:3">
      <div class="card-head"><div><div class="card-title">Monthly cash flow</div><div class="card-sub">Gross rent down to what lands in your account after the refi loan</div></div>
        <a class="btn sm" href="#/p/${p.id}/rent">Rent roll ${icon('arrowRight', 13)}</a></div>
      ${waterfall([
        { label: 'Gross rent', value: c.gross, kind: 'start' },
        { label: 'Vacancy', value: c.vacancy, kind: 'cost' },
        { label: 'Taxes & ins.', value: (+p.rental.opex.taxes || 0) + (+p.rental.opex.insurance || 0), kind: 'cost' },
        { label: 'Mgmt', value: c.mgmt, kind: 'cost' },
        { label: 'CapEx & repairs', value: c.capex + c.repairs, kind: 'cost' },
        { label: 'Utilities & HOA', value: (+p.rental.opex.utilities || 0) + (+p.rental.opex.hoa || 0), kind: 'cost' },
        { label: 'Mortgage P&I', value: c.payment, kind: 'cost' },
        { label: 'Cash flow', value: c.cashflow, kind: 'total' },
      ])}
    </div>
    <div class="card rise" style="--i:4">
      <div class="card-head"><div><div class="card-title">Capital recovery</div><div class="card-sub">How much of your cash the refi returns</div></div></div>
      ${gauge(c.recovered, { value: pct(Math.max(0, c.recovered), 0), label: 'of cash recovered', color: c.recovered >= 1 ? 'var(--good)' : 'var(--accent)' })}
      <div class="kv mt">
        <div class="kv-row"><span>Cash in before refi</span><b>${money(c.totalCashIn)}</b></div>
        <div class="kv-row"><span>New loan (${p.refi.ltv}% of ${compact(p.refi.appraisal)})</span><b>${money(c.newLoan)}</b></div>
        <div class="kv-row"><span>Pays off hard money</span><b>−${money(c.payoff)}</b></div>
        <div class="kv-row"><span>Refi closing costs</span><b>−${money(p.refi.closingCosts)}</b></div>
        <div class="kv-row"><span>Cash back to you</span><b class="${c.cashOut >= 0 ? 'good-ink' : 'bad-ink'}">${money(c.cashOut)}</b></div>
        <div class="kv-row"><span><b>Cash left in deal</b></span><b>${money(Math.max(0, c.cashLeftIn))}</b></div>
      </div>
    </div>
  </div>
  <div class="grid g-2 mt">
    ${spendChart(p, c)}
    <div class="card rise" style="--i:7"><div class="card-head"><div class="card-title">Rental metrics</div><a class="btn sm ghost" href="#/p/${p.id}/refi">Model refi ${icon('arrowRight', 13)}</a></div>
      <div class="grid g-3" style="gap:10px">
        ${metric('NOI / mo', money(c.noi), `${money(c.noi * 12)} / yr`)}
        ${metric('Cap rate', pct(c.capRate), 'on appraisal')}
        ${metric('Cash-on-cash', Number.isFinite(c.coc) ? pct(c.coc) : '∞', Number.isFinite(c.coc) ? 'on cash left in' : 'no cash left in', Number.isFinite(c.coc) ? c.coc >= 0.1 : true)}
        ${metric('DSCR', `${c.dscr.toFixed(2)}x`, 'lenders want 1.20x+', c.dscr >= 1.2)}
        ${metric('Equity', compact(c.equity), `${pct(1 - p.refi.ltv / 100, 0)} of value`)}
        ${metric('Rent-to-cost', pct(c.onePct, 2), '1% rule target', c.onePct >= 0.01)}
      </div>
      <div class="checks mt">
        ${checkItem(c.rule75 <= 0.75 ? 'good' : 'warn', '75% rule', 'All-in cost should be ≤ 75% of ARV to pull most cash out', pct(c.rule75, 0))}
        ${checkItem(p.refi.date >= c.seasoningDate ? 'good' : 'warn', 'Seasoning', `${p.refi.seasoningMonths}-month seasoning clears ${fmtDate(c.seasoningDate)}`, fmtDate(p.refi.date, false))}
      </div>
    </div>
  </div>
  <div class="grid g-21 mt">
    <div class="card rise" style="--i:8"><div class="card-head"><div class="card-title">Rehab budget vs. actual</div><a class="btn sm ghost" href="#/p/${p.id}/budget">All categories ${icon('arrowRight', 13)}</a></div>${budgetBars(c.cats, { limit: 6 })}</div>
    <div class="card rise" style="--i:9"><div class="card-head"><div class="card-title">Needs attention</div></div>${alertList(alerts, 6)}</div>
  </div>`;
}

// ====================================================================
function miniStats(items) {
  return `<div class="grid g-4" style="margin-bottom:16px">${items.map(([l, v, sub, cls], i) => `<div class="card stat rise" style="--i:${i};padding:16px 18px"><div class="label">${l}</div><div class="value ${cls || ''}" style="font-size:22px">${v}</div>${sub ? `<div class="foot">${sub}</div>` : ''}</div>`).join('')}</div>`;
}

function budgetTab(p, c) {
  const cont = c.cats.find((x) => /contingency/i.test(x.category));
  const rows = c.cats;
  return `
  ${miniStats([
    ['Total budget', counter(c.rehabBudget, 'money', `${p.id}-bt`)],
    ['Spent + pending', counter(c.rehabSpent, 'money', `${p.id}-bs`), `${pct(c.budgetUsed, 0)} used`],
    ['Remaining', counter(c.budgetRemaining, 'money', `${p.id}-br`), c.budgetRemaining < 0 ? 'Over budget' : `${money(c.subCommitted)} still owed to subs`, c.budgetRemaining < 0 ? 'bad-ink' : ''],
    ['Contingency used', cont ? pct(cont.budget ? cont.spent / cont.budget : 0, 0) : '—', cont ? `${money(cont.spent)} of ${money(cont.budget)}` : 'No contingency line'],
  ])}
  <div class="grid g-21">
    <div class="card flush rise" style="--i:4">
      <div class="card-head pad"><div><div class="card-title">Rehab budget</div><div class="card-sub">Edit amounts inline — changes save automatically</div></div>
        <div class="card-actions">${!c.rehabBudget ? `<button class="btn sm" data-action="apply-template">${icon('sliders')} Starter template</button>` : ''}<button class="btn sm primary" data-action="add-budget">${icon('plus')} Add line</button></div></div>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Category</th><th class="r" style="width:140px">Budget</th><th class="r">Paid</th><th class="r">Pending</th><th class="r">Remaining</th><th style="width:140px">Used</th><th></th></tr></thead>
        <tbody>${rows.map((r) => {
          const b = p.budget.find((x) => x.category === r.category);
          const used = r.budget ? r.spent / r.budget : r.spent ? 1.01 : 0;
          return `<tr><td class="strong">${esc(r.category)}</td>
            <td class="r">${b ? `<div class="affix has-pre" style="max-width:130px;margin-left:auto"><span class="pre">$</span><input class="input" style="height:30px;text-align:right" type="number" value="${b.amount}" data-change="budget-amt" data-id="${b.id}"></div>` : `<span class="muted">${money(0)}</span>`}</td>
            <td class="r">${money(r.paid)}</td><td class="r muted">${r.pending ? money(r.pending) : '—'}</td>
            <td class="r ${r.remaining < 0 ? 'bad-ink' : ''}" style="font-weight:600">${money(r.remaining)}</td>
            <td><div class="bar thin"><span class="${used > 1 ? 'over' : ''}" style="width:${Math.min(100, used * 100)}%"></span></div></td>
            <td class="r"><span class="row-actions">${b ? `<button class="btn ghost sm icon" data-action="del-budget" data-id="${b.id}" title="Remove">${icon('trash', 14)}</button>` : ''}</span></td></tr>`;
        }).join('') || `<tr><td colspan="7">${emptyState('No budget lines', 'Add categories or start from the template.', 'dollar')}</td></tr>`}</tbody>
        <tfoot><tr><td>Total</td><td class="r">${money(c.rehabBudget)}</td><td class="r">${money(c.paid)}</td><td class="r">${money(c.pending)}</td><td class="r">${money(c.budgetRemaining)}</td><td colspan="2"></td></tr></tfoot>
      </table></div>
    </div>
    <div class="card rise" style="--i:5"><div class="card-head"><div class="card-title">Budget by category</div></div>
      ${donut(p.budget.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 7).map((b, i) => ({ label: b.category, value: b.amount, color: `var(--s${i + 1})` }))
        .concat((() => { const rest = p.budget.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount).slice(7); return rest.length ? [{ label: `Other (${rest.length})`, value: sum(rest, 'amount'), color: 'var(--muted-2)' }] : []; })()),
        { center: compact(c.rehabBudget), centerLabel: 'budget' })}
    </div>
  </div>`;
}
function applyTemplate(p) {
  const sqft = 1500;
  const tpl = { 'Demo & Dumpsters': 3500, Roofing: 0, 'Framing & Structural': 2500, Plumbing: 6000, Electrical: 6000, HVAC: 5500, Kitchen: 16000, Bathrooms: 9000, Flooring: sqft * 4.5, 'Paint & Drywall': sqft * 3.5, 'Exterior & Landscaping': 3500, 'Permits & Fees': 1500 };
  S.update(() => {
    const pp = fresh(p.id);
    pp.budget.forEach((b) => { if (tpl[b.category] != null) b.amount = tpl[b.category]; });
    const subtotal = sum(pp.budget.filter((b) => !/contingency/i.test(b.category)), 'amount');
    const cont = pp.budget.find((b) => /contingency/i.test(b.category));
    if (cont) cont.amount = Math.round(subtotal * 0.1);
  });
  toast('Applied a mid-grade 1,500 sqft template with 10% contingency');
}

// ---------- expenses ----------
function filterExpenses() {
  const wrap = document.getElementById('exp-table');
  if (!wrap) return;
  const q = (document.getElementById('exp-q')?.value || '').toLowerCase();
  const cat = document.getElementById('exp-cat')?.value || '';
  const st = document.getElementById('exp-st')?.value || '';
  let n = 0, total = 0;
  wrap.querySelectorAll('tbody tr[data-s]').forEach((tr) => {
    const ok = (!q || tr.dataset.s.includes(q)) && (!cat || tr.dataset.cat === cat) && (!st || tr.dataset.st === st);
    tr.style.display = ok ? '' : 'none';
    if (ok) { n++; total += +tr.dataset.amt; }
  });
  const f = document.getElementById('exp-total');
  if (f) f.innerHTML = `<td colspan="7">${n} expense${n === 1 ? '' : 's'}${q || cat || st ? ' (filtered)' : ''}</td><td class="r">${money(total)}</td><td></td>`;
}
function expensesTab(p, c) {
  const rows = [...p.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  const byType = S.EXPENSE_TYPES.map((t, i) => ({ label: t, value: sum(p.expenses.filter((e) => e.type === t), 'amount'), color: `var(--s${i + 1})` })).filter((x) => x.value > 0);
  const noReceipt = p.expenses.filter((e) => !e.receipt);
  return `
  ${miniStats([
    ['Paid', counter(c.paid, 'money', `${p.id}-ep`), `${p.expenses.filter((e) => e.status === 'Paid').length} payments`],
    ['Pending', counter(c.pending, 'money', `${p.id}-epn`), `${p.expenses.filter((e) => e.status !== 'Paid').length} awaiting payment`, c.pending ? 'warn-ink' : ''],
    ['Avg daily burn', money(c.burnPerDay), 'since first expense'],
    ['Missing receipts', String(noReceipt.length), noReceipt.length ? `${money(sum(noReceipt, 'amount'))} undocumented` : 'All documented', noReceipt.length ? 'warn-ink' : 'good-ink'],
  ])}
  <div class="card rise" style="--i:4;margin-bottom:16px;padding:16px 20px">
    <div class="split" style="margin-bottom:4px"><div class="card-title">Spend by type</div><div class="legend">${byType.map((b) => `<span><i style="background:${b.color}"></i>${b.label} · ${compact(b.value)}</span>`).join('')}</div></div>
    ${stack(byType)}
  </div>
  <div class="card flush rise" style="--i:5" id="exp-table">
    <div class="toolbar">
      <div class="search-input grow">${icon('search')}<input class="input" id="exp-q" placeholder="Search vendor, note, category…" data-input="filter-expenses"></div>
      <select class="input" style="width:auto" id="exp-cat" data-change="filter-expenses"><option value="">All categories</option>${[...new Set(p.expenses.map((e) => e.category))].sort().map((x) => `<option>${esc(x)}</option>`).join('')}</select>
      <select class="input" style="width:auto" id="exp-st" data-change="filter-expenses"><option value="">Any status</option><option>Paid</option><option>Pending</option></select>
      <button class="btn" data-action="export-expenses">${icon('download')} CSV</button>
      <button class="btn primary" data-action="add-expense">${icon('plus')} Log expense</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Paid to</th><th>Category</th><th>Type</th><th>Method</th><th>Status</th><th title="Receipt on file">Rcpt</th><th class="r">Amount</th><th></th></tr></thead>
      <tbody>${rows.map((e) => {
        const sub = p.subs.find((s) => s.id === e.subId);
        return `<tr class="clickable" data-action="edit-expense" data-id="${e.id}" data-s="${esc(`${e.vendor} ${e.note} ${e.category} ${e.type} ${sub?.name || ''}`.toLowerCase())}" data-cat="${esc(e.category)}" data-st="${e.status}" data-amt="${e.amount}">
          <td class="muted" style="white-space:nowrap">${fmtDate(e.date, false)}</td>
          <td><b>${esc(e.vendor)}</b>${sub ? ' <span class="pill accent plain" style="font-size:11px;padding:0 7px">Sub</span>' : ''}<div class="muted" style="font-size:12px">${esc(e.note || '')}</div></td>
          <td>${esc(e.category)}</td><td class="muted">${esc(e.type)}</td><td class="muted">${esc(e.method || '')}</td>
          <td>${e.status === 'Paid' ? pill('Paid') : `<button class="pill warn" style="border:0;cursor:pointer" data-action="mark-paid" data-id="${e.id}" data-tip="${esc('Click to mark paid')}">Pending</button>`}</td>
          <td><button class="chip-toggle ${e.receipt ? 'on' : ''}" data-action="toggle-receipt" data-id="${e.id}">${e.receipt ? '✓' : 'None'}</button></td>
          <td class="r strong">${money(e.amount, true)}</td>
          <td class="r"><span class="row-actions"><button class="btn ghost sm icon" data-action="del-expense" data-id="${e.id}" title="Delete">${icon('trash', 14)}</button></span></td></tr>`;
      }).join('') || `<tr><td colspan="9">${emptyState('No expenses yet', 'Log your first receipt, invoice or sub payment.', 'receipt', `<button class="btn primary" data-action="add-expense">${icon('plus')} Log expense</button>`)}</td></tr>`}</tbody>
      <tfoot><tr id="exp-total"></tr></tfoot>
    </table></div>
  </div>`;
}

// ---------- subs ----------
function subsTab(p, c) {
  const now = today();
  const missingWaivers = c.subs.filter((s) => s.paid > 0 && !s.lienWaiver).length;
  return `
  ${miniStats([
    ['Contracted', money(sum(c.subs, 'contract')), `${c.subs.length} subcontractors`],
    ['Paid to subs', counter(c.subPaid, 'money', `${p.id}-sp`), `${pct(sum(c.subs, 'contract') ? c.subPaid / sum(c.subs, 'contract') : 0, 0)} of contracts`],
    ['Still owed', counter(c.subCommitted, 'money', `${p.id}-so`), 'Remaining contract balances'],
    ['Lien waivers', missingWaivers ? `${missingWaivers} missing` : 'All in', 'Collect before final payment', missingWaivers ? 'warn-ink' : 'good-ink'],
  ])}
  <div class="card flush rise" style="--i:4">
    <div class="card-head pad"><div><div class="card-title">Subcontractors</div><div class="card-sub">Payments logged in Expenses with a sub attached roll up here</div></div>
      <button class="btn sm primary" data-action="add-sub">${icon('plus')} Add sub</button></div>
    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>Sub</th><th>Status</th><th class="r">Contract</th><th class="r">Paid</th><th class="r">Balance</th><th style="width:120px">Progress</th><th>Lien waiver</th><th>W-9</th><th>COI expires</th><th></th></tr></thead>
      <tbody>${c.subs.map((s) => {
        const prog = s.contract ? (s.paid + s.pending) / s.contract : 0;
        const ins = s.insuranceExp ? (s.insuranceExp < now ? 'bad-ink' : s.insuranceExp < addDays(30) ? 'warn-ink' : '') : 'muted';
        return `<tr class="clickable" data-action="edit-sub" data-id="${s.id}">
          <td><b>${esc(s.name)}</b><div class="muted" style="font-size:12px">${esc(s.trade)}${s.phone ? ` · ${esc(s.phone)}` : ''}</div></td>
          <td>${pill(s.status)}</td><td class="r">${money(s.contract)}</td><td class="r">${money(s.paid)}${s.pending ? `<div class="muted" style="font-size:11.5px">+${money(s.pending)} pending</div>` : ''}</td>
          <td class="r strong ${s.balance < 0 ? 'bad-ink' : ''}">${money(s.balance)}</td>
          <td><div class="bar thin"><span class="${prog > 1 ? 'over' : ''}" style="width:${Math.min(100, prog * 100)}%"></span></div></td>
          <td><button class="chip-toggle ${s.lienWaiver ? 'on' : ''}" data-action="toggle-sub" data-f="lienWaiver" data-id="${s.id}">${s.lienWaiver ? '✓ Received' : 'Missing'}</button></td>
          <td><button class="chip-toggle ${s.w9 ? 'on' : ''}" data-action="toggle-sub" data-f="w9" data-id="${s.id}">${s.w9 ? '✓' : 'Need'}</button></td>
          <td class="${ins}" style="white-space:nowrap">${s.insuranceExp ? fmtDate(s.insuranceExp) : '—'}</td>
          <td class="r"><button class="btn sm" data-action="pay-sub" data-id="${s.id}">${icon('dollar', 13)} Pay</button></td></tr>`;
      }).join('') || `<tr><td colspan="10">${emptyState('No subcontractors', 'Add your crew to track contracts, payments, waivers and insurance.', 'users')}</td></tr>`}</tbody>
    </table></div>
  </div>
  <p class="note" style="margin-top:12px">Tip: anyone you pay $600+ in a year needs a 1099-NEC — the W-9 column keeps you ready for tax season.</p>`;
}

// ---------- materials ----------
function materialsTab(p) {
  const total = sum(p.materials, (m) => m.qty * m.unitCost);
  const by = (s) => p.materials.filter((m) => m.status === s);
  return `
  ${miniStats([
    ['Materials value', money(total), `${p.materials.length} line items`],
    ['On order', String(by('Ordered').length), money(sum(by('Ordered'), (m) => m.qty * m.unitCost))],
    ['Delivered / on site', String(by('Delivered').length), 'Check for damage & count'],
    ['Installed', String(by('Installed').length), `${by('Quoted').length} still quoted`],
  ])}
  <div class="card flush rise" style="--i:4">
    <div class="card-head pad"><div><div class="card-title">Materials & orders</div><div class="card-sub">Track quotes through install. “Log expense” posts it to the ledger once you pay.</div></div>
      <button class="btn sm primary" data-action="add-mat">${icon('plus')} Add item</button></div>
    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>Item</th><th>Room</th><th>Supplier</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Total</th><th>Status</th><th></th></tr></thead>
      <tbody>${p.materials.map((m) => `<tr class="clickable" data-action="edit-mat" data-id="${m.id}">
        <td class="strong">${esc(m.item)}</td><td class="muted">${esc(m.room || '')}</td><td>${esc(m.supplier || '')}</td>
        <td class="r">${num(m.qty, m.qty % 1 ? 1 : 0)}</td><td class="r muted">${money(m.unitCost, m.unitCost < 100)}</td><td class="r strong">${money(m.qty * m.unitCost)}</td>
        <td onclick="event.stopPropagation()"><select class="input" style="height:28px;width:auto;font-size:12.5px" data-change="mat-status" data-id="${m.id}">${['Quoted', 'Ordered', 'Delivered', 'Installed'].map((s) => `<option ${s === m.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td class="r">${m.expensed ? '<span class="pill good plain">Logged</span>' : `<button class="btn sm" data-action="expense-mat" data-id="${m.id}">Log expense</button>`}</td></tr>`).join('')
        || `<tr><td colspan="8">${emptyState('No materials tracked', 'Add cabinets, flooring, fixtures and track them from quote to install.', 'box')}</td></tr>`}</tbody>
    </table></div>
  </div>`;
}

// ---------- draws ----------
function drawsTab(p, c) {
  const hb = +p.financing.holdback || 0;
  return `
  <div class="grid g-12">
    <div class="card rise" style="--i:1">
      <div class="card-head"><div class="card-title">Rehab holdback</div><span class="card-sub">${esc(p.financing.lender || 'Lender')}</span></div>
      ${gauge(hb ? c.drawsFunded / hb : 0, { value: pct(hb ? c.drawsFunded / hb : 0, 0), label: 'of holdback drawn' })}
      <div class="kv mt">
        <div class="kv-row"><span>Total holdback</span><b>${money(hb)}</b></div>
        <div class="kv-row"><span>Funded</span><b>${money(c.drawsFunded)}</b></div>
        <div class="kv-row"><span>In process</span><b class="warn-ink">${money(c.drawsPending)}</b></div>
        <div class="kv-row"><span>Available to draw</span><b class="good-ink">${money(c.holdbackRemaining)}</b></div>
        <div class="kv-row"><span>Paid rehab not yet reimbursed</span><b>${money(Math.max(0, c.paid - c.drawsFunded))}</b></div>
      </div>
      ${c.paid - c.drawsFunded - c.drawsPending > 5000 && c.holdbackRemaining > 0 ? `<div class="callout mt">${icon('bank')}<div>You’ve paid ${money(c.paid - c.drawsFunded - c.drawsPending)} of rehab beyond what’s been drawn. Consider requesting a draw.</div></div>` : ''}
    </div>
    <div class="card flush rise" style="--i:2">
      <div class="card-head pad"><div><div class="card-title">Draw schedule</div><div class="card-sub">Funded draws accrue interest from the funding date</div></div>
        <button class="btn sm primary" data-action="add-draw">${icon('plus')} Request draw</button></div>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>#</th><th>Date</th><th>Scope</th><th class="r">Requested</th><th class="r">Funded</th><th>Status</th><th></th></tr></thead>
        <tbody>${p.draws.map((d) => `<tr class="clickable" data-action="edit-draw" data-id="${d.id}">
          <td class="strong">${d.num}</td><td class="muted">${fmtDate(d.date)}</td><td>${esc(d.note || '')}</td>
          <td class="r">${money(d.requested)}</td><td class="r strong">${d.funded ? money(d.funded) : '—'}</td><td>${pill(d.status)}</td>
          <td class="r">${d.status !== 'Funded' ? `<button class="btn sm" data-action="fund-draw" data-id="${d.id}">${icon('check', 13)} Funded</button>` : ''}</td></tr>`).join('')
          || `<tr><td colspan="7">${emptyState('No draws yet', 'Request reimbursement from your lender’s rehab holdback.', 'bank')}</td></tr>`}</tbody>
      </table></div>
    </div>
  </div>`;
}

// ---------- holding ----------
function holdingTab(p, c) {
  const rows = [...p.holding.map((h) => ({ ...h, editable: true })), { id: '_int', name: `Loan interest (${p.financing.rate}% on ${compact(c.loanBalance)})`, monthly: c.monthlyInterest }];
  return `
  ${miniStats([
    ['Monthly carry', counter(c.holdingMonthly, 'money', `${p.id}-hm`), 'Fixed costs + interest'],
    ['Per day', money(c.holdingMonthly / 30.4375), 'Every day of delay'],
    ['Accrued to date', counter(c.holdingToDate, 'money', `${p.id}-htd`), `${c.monthsHeld.toFixed(1)} months held`],
    ['Projected through ' + (p.type === 'flip' ? 'sale' : 'refi'), money(c.projHolding), `${c.plannedMonths.toFixed(1)} months planned`],
  ])}
  <div class="grid g-21">
    <div class="card flush rise" style="--i:4">
      <div class="card-head pad"><div><div class="card-title">Carrying costs</div><div class="card-sub">Accrued automatically by days held — no need to log each bill</div></div>
        <button class="btn sm primary" data-action="add-hold">${icon('plus')} Add cost</button></div>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Cost</th><th class="r">Monthly</th><th class="r">Daily</th><th class="r">To date</th><th class="r">Projected</th></tr></thead>
        <tbody>${rows.map((h) => `<tr class="${h.editable ? 'clickable' : ''}" ${h.editable ? `data-action="edit-hold" data-id="${h.id}"` : ''}>
          <td class="strong">${esc(h.name)}${h.editable ? '' : ' <span class="pill blue plain" style="font-size:11px">Auto</span>'}</td>
          <td class="r">${money(h.monthly)}</td><td class="r muted">${money(h.monthly / 30.4375, true)}</td>
          <td class="r">${money(h.monthly * c.monthsHeld)}</td><td class="r strong">${money(h.monthly * c.plannedMonths)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="r">${money(c.holdingMonthly)}</td><td class="r">${money(c.holdingMonthly / 30.4375, true)}</td><td class="r">${money(c.holdingToDate)}</td><td class="r">${money(c.projHolding)}</td></tr></tfoot>
      </table></div>
    </div>
    <div class="card rise" style="--i:5"><div class="card-head"><div class="card-title">Cost of delay</div></div>
      <p class="note" style="margin-top:-6px">What slipping the ${p.type === 'flip' ? 'sale' : 'refi'} date costs you in carry alone.</p>
      <div class="kv">${[1, 2, 3, 6].map((m) => `<div class="kv-row"><span>+${m} month${m > 1 ? 's' : ''}</span><b class="bad-ink">−${money(c.holdingMonthly * m)}</b></div>`).join('')}</div>
      <div class="callout mt">${icon('clock')}<div>Interest is ${pct(c.holdingMonthly ? c.monthlyInterest / c.holdingMonthly : 0, 0)} of your monthly carry.</div></div>
    </div>
  </div>`;
}

// ---------- timeline ----------
function timelineTab(p, c) {
  const now = today();
  return `
  <div class="grid g-21">
    <div class="card rise" style="--i:1">
      <div class="card-head"><div><div class="card-title">Project timeline</div><div class="card-sub">Click a circle to mark complete</div></div><button class="btn sm primary" data-action="add-ms">${icon('plus')} Milestone</button></div>
      <div class="timeline">${p.milestones.map((m, i) => {
        const overdue = !m.done && m.date && m.date < now;
        return `<div class="tl-item rise ${m.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" style="--i:${i + 2}">
          <button class="tl-dot" data-action="toggle-ms" data-id="${m.id}" aria-label="Toggle">${m.done ? icon('check', 14, 3) : ''}</button>
          <div class="tl-body" style="cursor:pointer" data-action="edit-ms" data-id="${m.id}"><b>${esc(m.name)}</b><small>${fmtDate(m.date)}${m.date ? ` · ${relDays(m.date)}` : ''}</small></div>
          <div>${m.done ? pill('Complete') : overdue ? '<span class="pill bad">Overdue</span>' : ''}</div></div>`;
      }).join('') || emptyState('No milestones', 'Add closing, inspections, listing and other key dates.', 'calendar')}</div>
    </div>
    <div class="card rise" style="--i:2"><div class="card-head"><div class="card-title">Progress</div></div>
      ${gauge(c.progress, { value: pct(c.progress, 0), label: `${c.milestonesDone} of ${p.milestones.length} milestones` , color: 'var(--good)' })}
      <div class="kv mt">
        <div class="kv-row"><span>Days since purchase</span><b>${c.daysHeld}</b></div>
        <div class="kv-row"><span>Target ${p.type === 'flip' ? 'sale' : 'refi'} date</span><b>${fmtDate(c.plannedEnd)}</b></div>
        <div class="kv-row"><span>Days remaining</span><b class="${c.daysToTarget < 0 ? 'bad-ink' : ''}">${c.daysToTarget}</b></div>
        <div class="kv-row"><span>Overdue milestones</span><b class="${c.overdue.length ? 'bad-ink' : 'good-ink'}">${c.overdue.length}</b></div>
      </div>
    </div>
  </div>`;
}

// ---------- sale (flip) ----------
function saleTab(p, c) {
  const s = p.sale;
  const sens = (cc) => {
    const k = C2(cc, c);
    const prices = [-0.1, -0.05, 0, 0.05].map((d) => k.salePrice * (1 + d));
    const months = [0, 1, 2, 3];
    const sellPct = ((+s.commissionPct || 0) + (+s.closingPct || 0)) / 100;
    const cell = (price, m) => {
      const prof = price - price * sellPct - (+s.concessions || 0) - k.allIn - k.holdingMonthly * m;
      const cls = prof < 0 ? 'bad-ink' : prof < 15000 ? 'warn-ink' : 'good-ink';
      return `<td class="r ${cls}" style="font-weight:${m === 0 && price === k.salePrice ? 700 : 500}">${compact(prof)}</td>`;
    };
    return `<table><thead><tr><th>Sale price</th>${months.map((m) => `<th class="r">${m ? `+${m} mo` : 'On time'}</th>`).join('')}</tr></thead>
      <tbody>${prices.map((pr, i) => `<tr><td class="strong">${money(pr)} <span class="muted">${['−10%', '−5%', 'Target', '+5%'][i]}</span></td>${months.map((m) => cell(pr, m)).join('')}</tr>`).join('')}</tbody></table>`;
  };
  const summary = (cc) => {
    const k = C2(cc, c);
    return `<div class="note">Net profit</div><div class="big-num ${k.profit >= 0 ? 'good-ink' : 'bad-ink'}">${counter(k.profit, 'money', `${p.id}-sp-profit`)}</div>
      <div class="kv mt">
        <div class="kv-row"><span>Sale price</span><b>${money(k.salePrice)}</b></div>
        <div class="kv-row"><span>Commission + closing (${(+s.commissionPct || 0) + (+s.closingPct || 0)}%)</span><b>−${money(k.salePrice * ((+s.commissionPct || 0) + (+s.closingPct || 0)) / 100)}</b></div>
        <div class="kv-row"><span>Seller concessions</span><b>−${money(+s.concessions || 0)}</b></div>
        <div class="kv-row"><span>All-in project cost</span><b>−${money(k.allIn)}</b></div>
        <div class="kv-row"><span>Hard money payoff at close</span><b>${money(k.loanBalance)}</b></div>
        <div class="kv-row"><span>Cash to you at closing</span><b>${money(k.salePrice - k.sellingCosts - k.loanBalance)}</b></div>
        <div class="kv-row"><span>ROI · annualized</span><b>${pct(k.roi)} · ${pct(k.annualized)}</b></div>
        <div class="kv-row"><span>Breakeven price</span><b>${money(k.breakeven)}</b></div>
      </div>`;
  };
  return `
  <div class="grid g-12">
    <div class="card flush rise" style="--i:1">
      <div class="inputs-section"><h4>${icon('flame', 15)} Exit plan</h4><div class="form-grid">
        ${bf('Target sale price', 'sale.targetPrice', p, { pre: '$' })}
        ${bf('Target sale date', 'sale.targetDate', p, { type: 'date' })}
        ${bf('Agent commission', 'sale.commissionPct', p, { post: '%' })}
        ${bf('Seller closing costs', 'sale.closingPct', p, { post: '%', hint: 'Transfer tax, attorney, title' })}
        ${bf('Seller concessions', 'sale.concessions', p, { pre: '$', full: true })}
      </div></div>
      <div class="inputs-section"><h4>${icon('check', 15)} Closed sale</h4>
        <label class="check"><input type="checkbox" ${s.closed ? 'checked' : ''} data-change="sale-closed"> Property sold</label>
        ${s.closed ? `<div class="form-grid mt">${bf('Actual sale price', 'sale.actualPrice', p, { pre: '$' })}${bf('Closing date', 'sale.saleDate', p, { type: 'date' })}</div>` : ''}
      </div>
    </div>
    <div class="grid" style="gap:16px">
      <div class="card rise" style="--i:2">${liveBox('sale-sum', summary)}</div>
      <div class="card flush rise" style="--i:3"><div class="card-head pad"><div><div class="card-title">Profit sensitivity</div><div class="card-sub">Sale price vs. extra months of holding</div></div></div>
        <div class="table-wrap" style="margin-top:8px">${liveBox('sens', sens)}</div></div>
    </div>
  </div>`;
}
const C2 = (cc, c) => cc || c;

// ---------- rent roll (BRRRR) ----------
function rentTab(p, c) {
  const r = p.rental;
  const deposits = sum(r.units, 'deposit');
  const income = [...r.income].sort((a, b) => b.date.localeCompare(a.date));
  const opexSum = (cc) => {
    const k = C2(cc, c);
    return `<div class="kv">
      <div class="kv-row"><span>Gross scheduled rent</span><b>${money(k.gross)}</b></div>
      <div class="kv-row"><span>Vacancy allowance</span><b>−${money(k.vacancy)}</b></div>
      <div class="kv-row"><span>Operating expenses</span><b>−${money(k.opex)}</b></div>
      <div class="kv-row"><span><b>NOI</b></span><b>${counter(k.noi, 'money', `${p.id}-rnoi`)}</b></div>
      <div class="kv-row"><span>Debt service (refi)</span><b>−${money(k.payment)}</b></div>
      <div class="kv-row"><span><b>Cash flow</b></span><b class="${k.cashflow >= 0 ? 'good-ink' : 'bad-ink'}">${counter(k.cashflow, 'money', `${p.id}-rcf`)}</b></div>
      <div class="kv-row"><span>Expense ratio</span><b>${pct(k.gross ? k.opex / k.gross : 0, 0)}</b></div></div>`;
  };
  return `
  ${miniStats([
    ['Gross rent / mo', counter(c.gross, 'money', `${p.id}-gr`), `${r.units.length} unit${r.units.length === 1 ? '' : 's'}`],
    ['Occupancy', pct(c.occupancy, 0), `${money(c.occupiedRent)} in place`, c.occupancy < 1 ? 'warn-ink' : 'good-ink'],
    ['Collected this month', money(c.collectedMonth), `${money(c.collected)} lifetime`],
    ['Deposits held', money(deposits), 'Keep in separate account'],
  ])}
  <div class="split" style="margin-bottom:12px"><div class="card-title" style="font-size:15px">Units</div>
    <div class="card-actions"><button class="btn sm" data-action="record-all-rent">${icon('check')} Record this month’s rent</button><button class="btn sm primary" data-action="add-unit">${icon('plus')} Add unit</button></div></div>
  <div class="grid g-3">${r.units.map((u, i) => {
    const lease = u.leaseEnd ? daysBetween(today(), u.leaseEnd) : null;
    return `<div class="unit-card rise" style="--i:${i + 4}" data-action="edit-unit" data-id="${u.id}">
      <div class="u-top"><b>${esc(u.name)}</b>${pill(u.status)}</div>
      <div class="u-rent">${money(u.rent)}<span class="muted" style="font-size:13px;font-weight:500"> /mo</span></div>
      <div class="u-meta">${u.beds || 0} bd · ${u.baths || 0} ba${u.sqft ? ` · ${num(u.sqft)} sqft · ${money(u.rent / u.sqft, true)}/sqft` : ''}</div>
      <div class="kv" style="margin-top:10px">
        <div class="kv-row"><span>Tenant</span><b>${esc(u.tenant || '—')}</b></div>
        <div class="kv-row"><span>Lease ends</span><b class="${lease != null && lease < 60 ? 'warn-ink' : ''}">${u.leaseEnd ? `${fmtDate(u.leaseEnd)}` : '—'}</b></div>
      </div>
      ${lease != null ? `<div class="bar thin" style="margin-top:6px"><span style="width:${Math.max(0, Math.min(100, (1 - lease / Math.max(1, daysBetween(u.leaseStart, u.leaseEnd))) * 100))}%;background:${lease < 60 ? 'var(--warn)' : 'var(--s3)'}"></span></div>` : ''}
      <button class="btn sm" style="margin-top:12px;width:100%" data-action="add-income" data-unit="${u.id}">${icon('dollar', 13)} Record payment</button>
    </div>`;
  }).join('')}
    <button class="card hover new-card rise" style="min-height:240px;--i:${r.units.length + 4}" data-action="add-unit"><div><div class="plus">${icon('plus', 20)}</div><b>Add a unit</b></div></button>
  </div>
  <div class="grid g-21 mt">
    <div class="card flush rise" style="--i:8">
      <div class="card-head pad"><div class="card-title">Income ledger</div><button class="btn sm" data-action="add-income">${icon('plus')} Record income</button></div>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Date</th><th>Unit</th><th>Type</th><th class="r">Amount</th><th></th></tr></thead>
        <tbody>${income.map((i) => { const u = r.units.find((x) => x.id === i.unitId); return `<tr><td class="muted">${fmtDate(i.date)}</td><td>${esc(u?.name || '—')}${u?.tenant ? ` <span class="muted">· ${esc(u.tenant)}</span>` : ''}</td><td>${esc(i.type)}</td><td class="r strong">${money(i.amount)}</td>
          <td class="r"><span class="row-actions"><button class="btn ghost sm icon" data-action="del-income" data-id="${i.id}">${icon('trash', 14)}</button></span></td></tr>`; }).join('')
          || `<tr><td colspan="5">${emptyState('No income recorded', 'Record rent as it comes in to track collections.', 'dollar')}</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card flush rise" style="--i:9">
      <div class="inputs-section"><h4>${icon('sliders', 15)} Operating expenses <span class="note" style="font-weight:500">monthly</span></h4>
        <div class="form-grid">
          ${bf('Property taxes', 'rental.opex.taxes', p, { pre: '$' })}${bf('Insurance', 'rental.opex.insurance', p, { pre: '$' })}
          ${bf('Owner-paid utilities', 'rental.opex.utilities', p, { pre: '$' })}${bf('HOA', 'rental.opex.hoa', p, { pre: '$' })}
          ${bf('Management', 'rental.opex.mgmtPct', p, { post: '%' })}${bf('Vacancy', 'rental.opex.vacancyPct', p, { post: '%' })}
          ${bf('CapEx reserve', 'rental.opex.capexPct', p, { post: '%' })}${bf('Repairs', 'rental.opex.repairsPct', p, { post: '%' })}
        </div></div>
      <div class="inputs-section">${liveBox('opex-sum', opexSum)}</div>
    </div>
  </div>`;
}

// ---------- refinance (BRRRR) ----------
function refiTab(p, c) {
  const rf = p.refi;
  const arv = +p.purchase.arv || +rf.appraisal || 200000;
  const slider = (label, path, min, max, step, fmt) => {
    const v = getPath(p, path);
    return `<div class="slider-row"><div class="top"><span>${label}</span><span data-out="${path}">${fmt === 'money' ? money(v) : `${v}%`}</span></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-type="num" data-fmt="${fmt}" style="--p:${((v - min) / (max - min)) * 100}%"></div>`;
  };
  const results = (cc) => {
    const k = C2(cc, c);
    return `<div class="grid g-2" style="gap:12px">
      <div><div class="note">Cash back to you at refi</div><div class="big-num ${k.cashOut >= 0 ? 'good-ink' : 'bad-ink'}">${counter(k.cashOut, 'money', `${p.id}-co`)}</div></div>
      <div><div class="note">Cash left in deal</div><div class="big-num">${counter(Math.max(0, k.cashLeftIn), 'money', `${p.id}-cli`)}</div></div></div>
      <div class="bar lg mt"><span style="width:${Math.max(0, Math.min(100, k.recovered * 100))}%;background:${k.recovered >= 1 ? 'var(--good)' : 'var(--accent)'};transition:width .4s var(--ease)"></span></div>
      <div class="split note" style="margin-top:6px"><span>${pct(Math.max(0, k.recovered), 0)} of ${money(k.totalCashIn)} recovered</span><span>${k.recovered >= 1 ? 'Infinite return 🎉' : `${money(Math.max(0, k.cashLeftIn))} still working`}</span></div>
      <div class="kv mt">
        <div class="kv-row"><span>New loan amount</span><b>${money(k.newLoan)}</b></div>
        <div class="kv-row"><span>Monthly P&amp;I</span><b>${money(k.payment)}</b></div>
        <div class="kv-row"><span>Hard money payoff</span><b>${money(k.payoff)}</b></div>
        <div class="kv-row"><span>Monthly cash flow</span><b class="${k.cashflow >= 0 ? 'good-ink' : 'bad-ink'}">${money(k.cashflow)}</b></div>
        <div class="kv-row"><span>DSCR</span><b class="${k.dscr >= 1.2 ? 'good-ink' : 'warn-ink'}">${k.dscr.toFixed(2)}x</b></div>
        <div class="kv-row"><span>Cash-on-cash</span><b>${Number.isFinite(k.coc) ? pct(k.coc) : '∞'}</b></div>
        <div class="kv-row"><span>Equity left in property</span><b>${money(k.equity)}</b></div>
        <div class="kv-row"><span>Max loan for 1.20x DSCR</span><b>${money(maxLoanForDscr(k.noi, rf.rate, rf.termYears, 1.2))}</b></div>
      </div>`;
  };
  return `
  <div class="grid g-2">
    <div class="card flush rise" style="--i:1">
      <div class="inputs-section"><h4>${icon('sliders', 15)} Model the refinance</h4>
        <div class="grid" style="gap:20px">
          ${slider('Appraised value', 'refi.appraisal', Math.round(arv * 0.8 / 1000) * 1000, Math.round(arv * 1.2 / 1000) * 1000, 1000, 'money')}
          ${slider('Loan-to-value', 'refi.ltv', 50, 85, 1, 'pct')}
          ${slider('Interest rate', 'refi.rate', 4, 11, 0.125, 'pct')}
        </div></div>
      <div class="inputs-section"><h4>${icon('bank', 15)} Loan details</h4><div class="form-grid">
        ${bf('Lender', 'refi.lender', p, { type: 'text' })}${bf('Term (years)', 'refi.termYears', p)}
        ${bf('Refi closing costs', 'refi.closingCosts', p, { pre: '$' })}${bf('Target closing date', 'refi.date', p, { type: 'date' })}
        ${bf('Seasoning required', 'refi.seasoningMonths', p, { post: 'mo', hint: 'Months from purchase before lender uses appraised value' })}
        <div class="field" style="align-self:center"><label class="check"><input type="checkbox" ${rf.done ? 'checked' : ''} data-change="refi-done"> Refinance closed</label></div>
      </div></div>
    </div>
    <div class="card rise" style="--i:2"><div class="card-head"><div class="card-title">Refi outcome</div><span class="card-sub">Updates as you drag</span></div>${liveBox('refi-res', results)}</div>
  </div>`;
}
function maxLoanForDscr(noi, rate, years, target) {
  const pmtPerDollar = (() => { const r = rate / 100 / 12, n = years * 12; return r ? r / (1 - Math.pow(1 + r, -n)) : 1 / n; })();
  return noi > 0 ? noi / target / pmtPerDollar : 0;
}

// ---------- deal inputs ----------
function inputsTab(p, c) {
  const flip = p.type === 'flip';
  const summary = (cc) => {
    const k = C2(cc, c);
    const rows = flip
      ? [['All-in cost', money(k.allIn)], ['Cash needed (after loan)', money(k.projCash)], ['Projected profit', money(k.profit), k.profit >= 0 ? 'good-ink' : 'bad-ink'], ['ROI', pct(k.roi)], ['70% rule MAO', money(k.mao), p.purchase.price <= k.mao ? 'good-ink' : 'warn-ink'], ['Monthly carry', money(k.holdingMonthly)]]
      : [['All-in cost', money(k.allIn)], ['% of ARV', pct(k.rule75), k.rule75 <= 0.75 ? 'good-ink' : 'warn-ink'], ['Cash left in after refi', money(Math.max(0, k.cashLeftIn))], ['Monthly cash flow', money(k.cashflow), k.cashflow >= 0 ? 'good-ink' : 'bad-ink'], ['Cash-on-cash', Number.isFinite(k.coc) ? pct(k.coc) : '∞'], ['Monthly carry (pre-refi)', money(k.holdingMonthly)]];
    return `<div class="card-title" style="margin-bottom:6px">Live summary</div><div class="kv">${rows.map(([l, v, cls]) => `<div class="kv-row"><span>${l}</span><b class="${cls || ''}">${v}</b></div>`).join('')}</div>
      <div class="kv-row" style="border:0"><span>Sources − uses today</span><b class="${k.fundsRemaining < 0 ? 'bad-ink' : ''}">${money(k.fundsRemaining)}</b></div>`;
  };
  return `
  <div class="grid g-21">
    <div class="card flush rise" style="--i:1">
      <div class="inputs-section"><h4>${icon('home', 15)} Property</h4><div class="form-grid">
        ${bf('Deal name', 'name', p, { type: 'text', full: true })}${bf('Street address', 'address', p, { type: 'text' })}${bf('City, state ZIP', 'city', p, { type: 'text' })}
      </div></div>
      <div class="inputs-section"><h4>${icon('key', 15)} Purchase</h4><div class="form-grid g3">
        ${bf('Purchase price', 'purchase.price', p, { pre: '$' })}${bf('Buyer closing costs', 'purchase.closingCosts', p, { pre: '$' })}${bf('Closing date', 'purchase.date', p, { type: 'date' })}
        ${bf('After-repair value (ARV)', 'purchase.arv', p, { pre: '$', hint: 'From comps — drives the 70% / 75% rules' })}
      </div></div>
      <div class="inputs-section"><h4>${icon('bank', 15)} ${flip ? 'Financing' : 'Acquisition financing (hard money / private)'}</h4><div class="form-grid g3">
        ${bf('Lender', 'financing.lender', p, { type: 'text' })}${bf('Loan at closing', 'financing.loanAmount', p, { pre: '$' })}${bf('Rehab holdback', 'financing.holdback', p, { pre: '$', hint: 'Drawn in stages' })}
        ${bf('Interest rate', 'financing.rate', p, { post: '%', hint: 'Interest-only on drawn balance' })}${bf('Points', 'financing.points', p, { post: 'pts' })}${bf('Lender & doc fees', 'financing.fees', p, { pre: '$' })}
      </div></div>
      <div class="inputs-section"><h4>${icon('dollar', 15)} Your capital</h4><div class="form-grid">
        ${bf('Cash allocated to this deal', 'cashReserves', p, { pre: '$', hint: 'Your down payment + reserves. Drives “funds remaining”.' })}
      </div></div>
      <div class="inputs-section"><h4>${icon('file', 15)} Notes</h4>
        <textarea class="input" data-bind="notes" data-type="text" placeholder="Comps, lender contacts, scope notes…">${esc(p.notes || '')}</textarea></div>
      <div class="inputs-section" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><b>Delete this deal</b><div class="note">Removes all of its data. You can undo right after.</div></div>
        <button class="btn danger" data-action="del-project">${icon('trash')} Delete deal</button></div>
    </div>
    <div><div class="card rise" style="--i:2;position:sticky;top:76px">${liveBox('inputs-sum', summary)}
      <p class="note" style="margin:12px 0 0">${flip ? 'Exit assumptions live on the Sale &amp; profit tab.' : 'Rent and refi assumptions live on the Rent roll and Refinance tabs.'}</p></div></div>
  </div>`;
}

