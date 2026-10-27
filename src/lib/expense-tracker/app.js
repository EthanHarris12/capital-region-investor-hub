// App shell: router, sidebar, topbar, global actions. The hub mounts this
// into its Expenses tab with mount(root) and tears it down with unmount().
import * as S from './store.js';
import { calc } from './calc.js';
import { esc, compact, runCounters, today } from './util.js';
import { icon, tip, bindUI, toast, openModal, closeModal, openPalette } from './ui.js';
import { bindLineCharts } from './charts.js';
import { overviewView } from './overview.js';
import { projectView, PROJECT_TABS, openExpenseForm } from './project.js';

let root = null;
let $view = null;
let ac = null;
let unsubscribe = null;
let handlers = {};
let lastRoute = [];

export const nav = (hash) => { if (location.hash === hash) render('data'); else location.hash = hash; };
export const ctx = {
  setHandlers: (h) => { handlers = h; },
  rerender: () => render('data'),
  chromeRefresh: () => { const r = route(); renderSidebar(r); renderTopbar(r, r[0] === 'p' ? S.getProject(r[1]) : null); },
  nav,
};

const route = () => (location.hash.slice(1) || '/').split('/').filter(Boolean);

function render(mode = 'nav') {
  const r = route();
  const project = r[0] === 'p' ? S.getProject(r[1]) : null;
  if (r[0] === 'p' && !project) { location.hash = '#/'; return; }
  if (mode === 'nav' && project && lastRoute[0] === 'p' && lastRoute[1] === r[1]) mode = 'tab';
  const prevInk = document.querySelector('.tab-ink');
  const inkFrom = prevInk ? { left: prevInk.style.left, width: prevInk.style.width } : null;

  handlers = {};
  renderSidebar(r);
  renderTopbar(r, project);
  $view.className = mode === 'nav' ? 'animate' : '';
  $view.innerHTML = project ? projectView(project, r[2] || 'overview', ctx) : overviewView(ctx);

  runCounters($view, mode === 'nav');
  const body = document.getElementById('tab-body');
  if (mode === 'tab' && body) { body.classList.add('animate'); runCounters(body, true); }
  bindLineCharts($view, tip);
  placeInk(mode === 'tab' ? inkFrom : null);
  handlers.mounted?.($view);
  if (mode === 'nav') scrollToTop();
  lastRoute = r;
  root.classList.remove('nav-open');
}

// Bring the tracker's top edge back under the hub's sticky header, but only
// when the reader has scrolled past it.
function scrollToTop() {
  const header = document.querySelector('.app-header');
  const top = root.getBoundingClientRect().top + scrollY - (header ? header.offsetHeight : 0) - 16;
  if (scrollY > top) window.scrollTo({ top, behavior: 'auto' });
}

function placeInk(from) {
  const tabs = document.querySelector('.tabs');
  const active = tabs?.querySelector('.tab.active');
  const ink = tabs?.querySelector('.tab-ink');
  if (!active || !ink) return;
  const to = { left: `${active.offsetLeft}px`, width: `${active.offsetWidth}px` };
  if (from) {
    ink.style.transition = 'none';
    Object.assign(ink.style, from);
    ink.offsetWidth; // reflow so the transition runs from the old tab
    ink.style.transition = '';
  }
  requestAnimationFrame(() => Object.assign(ink.style, to));
  // horizontal only, so switching tabs never scrolls the hub page
  tabs.scrollTo({ left: Math.max(0, active.offsetLeft - 24), behavior: 'smooth' });
}

// ---- sidebar ----
function renderSidebar(r) {
  const st = S.getState();
  const item = (p) => {
    const stages = p.type === 'flip' ? S.FLIP_STAGES : S.BRRRR_STAGES;
    return `<a class="nav-item ${r[1] === p.id ? 'active' : ''}" href="#/p/${p.id}">
      <span class="dot" style="background:${p.color}"></span><span class="nav-name">${esc(p.name)}</span><span class="nav-meta">${stages[p.stage] || ''}</span></a>`;
  };
  const flips = st.projects.filter((p) => p.type === 'flip');
  const rentals = st.projects.filter((p) => p.type === 'brrrr');
  document.getElementById('xt-sidebar').innerHTML = `
    <a class="nav-item ${!r.length ? 'active' : ''}" href="#/">${icon('home')} Overview <span class="nav-meta">${st.projects.length}</span></a>
    <div class="nav-label">Flips <button class="icon-btn-sm" data-action="new-deal" data-type="flip" title="New flip">${icon('plus', 14)}</button></div>
    ${flips.map(item).join('') || '<div class="nav-item muted" style="cursor:default;font-size:12.5px">No flips yet</div>'}
    <div class="nav-label">Rentals · BRRRR <button class="icon-btn-sm" data-action="new-deal" data-type="brrrr" title="New BRRRR">${icon('plus', 14)}</button></div>
    ${rentals.map(item).join('') || '<div class="nav-item muted" style="cursor:default;font-size:12.5px">No rentals yet</div>'}
    <div class="sidebar-foot">
      <button class="nav-item" data-action="settings">${icon('sliders')} Settings</button>
      <button class="nav-item" data-action="export">${icon('download')} Export backup</button>
      <button class="nav-item" data-action="import">${icon('upload')} Import backup</button>
    </div>`;
}

// ---- topbar ----
function renderTopbar(r, project) {
  const tabLabel = project && r[2] ? (PROJECT_TABS(project).find((t) => t.id === r[2])?.label || '') : '';
  document.getElementById('xt-topbar').innerHTML = `
    <button class="btn ghost icon menu-btn" data-action="toggle-nav" aria-label="Menu">${icon('menu')}</button>
    <div class="crumbs">${project
      ? `<a href="#/" style="color:inherit">Overview</a><span>/</span><b>${esc(project.name)}</b>${tabLabel ? `<span>/</span><span>${esc(tabLabel)}</span>` : ''}`
      : '<b>Portfolio</b>'}</div>
    <button class="search-btn" data-action="palette">${icon('search', 15)}<span class="lbl">Search or jump to…</span><kbd>⌘K</kbd></button>
    ${project ? `<button class="btn" data-action="quick-expense">${icon('receipt')} <span class="hide-sm">Log expense</span></button>` : ''}
    <button class="btn primary" data-action="new-deal">${icon('plus')} New deal</button>`;
}

// ---- global actions ----
const global = {
  'toggle-nav': () => root.classList.toggle('nav-open'),
  'close-nav': () => root.classList.remove('nav-open'),
  palette: () => palette(),
  'new-deal': (el) => newDeal(el?.dataset.type || 'flip'),
  'quick-expense': () => { const p = S.getProject(route()[1]); if (p) openExpenseForm(p, {}); },
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S.getState(), null, 2)], { type: 'application/json' }));
    a.download = `investor-hub-expenses-${today()}.json`;
    a.click();
    toast('Backup downloaded');
  },
  import: () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        if (!Array.isArray(data.projects)) throw new Error('bad file');
        const before = S.snapshot();
        S.replaceState(data);
        toast(`Imported ${data.projects.length} deals`, { undo: () => S.restore(before) });
        nav('#/');
      } catch { toast('That file isn’t an expense tracker backup'); }
    };
    inp.click();
  },
  settings: () => settings(),
  print: () => window.print(),
};

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const fn = handlers[a] || global[a];
  if (fn) { e.preventDefault(); fn(el, e); }
}
function onInput(e) {
  const el = e.target.closest('[data-bind]');
  if (el) return handlers.bind?.(el, e);
  const f = e.target.closest('[data-input]');
  if (f) handlers[f.dataset.input]?.(f, e);
}
function onChange(e) { const el = e.target.closest('[data-change]'); if (el) handlers[el.dataset.change]?.(el, e); }
function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
}
// cursor-follow glow on deal cards
function onPointer(e) {
  const c = e.target.closest?.('.deal-card');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', `${e.clientX - r.left}px`);
  c.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function mount(el) {
  if (ac) unmount();
  root = el;
  S.load();
  $view = document.getElementById('xt-view');
  ac = new AbortController();
  const opts = { signal: ac.signal };
  root.addEventListener('click', onClick, opts);
  root.addEventListener('input', onInput, opts);
  root.addEventListener('change', onChange, opts);
  root.addEventListener('pointermove', onPointer, opts);
  document.addEventListener('keydown', onKey, opts);
  addEventListener('hashchange', () => render('nav'), opts);
  unsubscribe = S.subscribe(() => render('data'));
  bindUI(root, opts);
  lastRoute = [];
  render('nav');
}

export function unmount() {
  closeModal(true);
  ac?.abort();
  unsubscribe?.();
  ac = null;
  unsubscribe = null;
  root = null;
  $view = null;
}

// ---- palette ----
function palette() {
  const st = S.getState();
  const r = route();
  const cur = r[0] === 'p' ? S.getProject(r[1]) : null;
  const items = [];
  if (cur) {
    items.push({ group: `In ${cur.name}`, label: 'Log an expense', icon: 'receipt', run: () => openExpenseForm(cur, {}) });
    PROJECT_TABS(cur).forEach((t) => items.push({ group: `In ${cur.name}`, label: `Go to ${t.label}`, icon: t.icon, run: () => nav(`#/p/${cur.id}/${t.id}`) }));
  }
  st.projects.forEach((p) => {
    const c = calc(p);
    items.push({ group: 'Deals', label: p.name, meta: `${p.address} · ${p.type === 'flip' ? `profit ${compact(c.profit)}` : `${compact(c.cashflow)}/mo`}`, icon: p.type === 'flip' ? 'hammer' : 'building', run: () => nav(`#/p/${p.id}`) });
  });
  items.push(
    { group: 'Actions', label: 'New flip', icon: 'plus', run: () => newDeal('flip') },
    { group: 'Actions', label: 'New BRRRR rental', icon: 'plus', run: () => newDeal('brrrr') },
    { group: 'Actions', label: 'Go to overview', icon: 'home', run: () => nav('#/') },
    { group: 'Actions', label: 'Print / save as PDF', icon: 'printer', run: () => window.print() },
    { group: 'Actions', label: 'Export backup', icon: 'download', run: global.export },
    { group: 'Actions', label: 'Settings', icon: 'sliders', run: settings },
  );
  openPalette(items);
}

// ---- new deal ----
function newDeal(type) {
  let t = type;
  const m = openModal(`
    <form>
      <div class="modal-head"><div><h3>Start a new deal</h3><p>You can fill in financing, budget and the rest after it’s created.</p></div>
        <button type="button" class="btn ghost icon sm" data-close>${icon('x')}</button></div>
      <div class="modal-body">
        <div class="type-pick">
          <button type="button" class="type-card" data-t="flip"><div class="type-ico flip">${icon('hammer', 18)}</div><b>Fix &amp; flip</b><span>Buy, renovate, sell. Track rehab, holding costs and projected profit.</span></button>
          <button type="button" class="type-card" data-t="brrrr"><div class="type-ico brrrr">${icon('repeat', 18)}</div><b>BRRRR rental</b><span>Buy, rehab, rent, refinance, repeat. Track rent roll and cash left in.</span></button>
        </div>
        <div class="form-grid" style="margin-top:18px">
          <div class="field full"><label>Deal name</label><input class="input" name="name" required placeholder="e.g. Oak Street Ranch"></div>
          <div class="field"><label>Street address</label><input class="input" name="address" placeholder="123 Main St"></div>
          <div class="field"><label>City, state ZIP</label><input class="input" name="city" placeholder="Albany, NY 12203"></div>
          <div class="field"><label>Purchase price</label><div class="affix has-pre"><span class="pre">$</span><input class="input" name="price" type="number" step="any" required></div></div>
          <div class="field"><label>After-repair value (ARV)</label><div class="affix has-pre"><span class="pre">$</span><input class="input" name="arv" type="number" step="any"></div></div>
          <div class="field"><label>Purchase / closing date</label><input class="input" name="date" type="date" value="${today()}"></div>
        </div>
      </div>
      <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Create deal ${icon('arrowRight')}</button></div>
    </form>`, { wide: true });
  const sync = () => m.querySelectorAll('.type-card').forEach((c) => c.classList.toggle('on', c.dataset.t === t));
  m.querySelectorAll('.type-card').forEach((c) => c.addEventListener('click', () => { t = c.dataset.t; sync(); }));
  sync();
  setTimeout(() => m.querySelector('[name=name]').focus(), 60);
  m.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const p = S.newProject({ type: t, name: f.name.value.trim(), address: f.address.value.trim(), city: f.city.value.trim(), price: f.price.value, arv: f.arv.value, date: f.date.value || today() });
    S.update((s) => s.projects.push(p), false);
    closeModal();
    toast('Deal created — set up financing and budget next');
    nav(`#/p/${p.id}/inputs`);
  });
}

function settings() {
  const st = S.getState();
  const m = openModal(`
    <div class="modal-head"><div><h3>Settings</h3><p>Everything is stored locally in this browser. Export a backup to move it.</p></div>
      <button class="btn ghost icon sm" data-close>${icon('x')}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="field full"><label>Portfolio / investor name</label><input class="input" name="investor" value="${esc(st.settings.investor || '')}"></div>
    </div>
    <div class="callout warn" style="margin-top:18px">${icon('alert')}<div><b>Danger zone</b><br>Reset restores the two sample deals. Clear removes every deal. Both can be undone right after.</div></div>
    </div>
    <div class="modal-foot"><button class="btn danger left" data-x="clear">Clear all deals</button><button class="btn" data-x="reset">${icon('refresh')} Reset demo data</button><button class="btn primary" data-x="save">Save</button></div>`);
  m.querySelector('[data-x=save]').onclick = () => { S.update((s) => { s.settings.investor = m.querySelector('[name=investor]').value.trim(); }); closeModal(); toast('Settings saved'); };
  const destructive = (fn, msg) => () => { const before = S.snapshot(); fn(); closeModal(); nav('#/'); toast(msg, { undo: () => S.restore(before) }); };
  m.querySelector('[data-x=reset]').onclick = destructive(S.resetDemo, 'Demo data restored');
  m.querySelector('[data-x=clear]').onclick = destructive(S.clearAll, 'All deals cleared');
}

