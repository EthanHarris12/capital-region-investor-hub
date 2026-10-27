// App shell: router, sidebar, topbar, global actions.
import * as S from './store.js';
import { calc } from './calc.js';
import { esc, compact, runCounters, today } from './util.js';
import { icon, tip, bindTooltips, toast, openModal, closeModal, openPalette } from './ui.js';
import { bindLineCharts } from './charts.js';
import { overviewView } from './overview.js';
import { projectView, PROJECT_TABS, openExpenseForm } from './project.js';

S.load();
const $view = document.getElementById('view');
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
  if (mode !== 'data') window.scrollTo({ top: mode === 'tab' ? Math.min(scrollY, 300) : 0, behavior: mode === 'tab' ? 'smooth' : 'auto' });
  lastRoute = r;
  document.body.classList.remove('nav-open');
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
  active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
  document.getElementById('sidebar').innerHTML = `
    <div class="brand"><div class="brand-mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l8-11 8 11"/></svg></div>
      <div>Groundwork<small>${esc(st.settings.investor || 'Deal ledger')}</small></div></div>
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
  document.getElementById('topbar').innerHTML = `
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
  'toggle-nav': () => document.body.classList.toggle('nav-open'),
  'close-nav': () => document.body.classList.remove('nav-open'),
  palette: () => palette(),
  'new-deal': (el) => newDeal(el?.dataset.type || 'flip'),
  'quick-expense': () => { const p = S.getProject(route()[1]); if (p) openExpenseForm(p, {}); },
  export: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S.getState(), null, 2)], { type: 'application/json' }));
    a.download = `groundwork-backup-${today()}.json`;
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
      } catch { toast('That file isn’t a Groundwork backup'); }
    };
    inp.click();
  },
  settings: () => settings(),
  print: () => window.print(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const fn = handlers[a] || global[a];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-bind]');
  if (el) return handlers.bind?.(el, e);
  const f = e.target.closest('[data-input]');
  if (f) handlers[f.dataset.input]?.(f, e);
});
document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el) handlers[el.dataset.change]?.(el, e); });
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
});
// cursor-follow glow on deal cards
document.addEventListener('pointermove', (e) => {
  const c = e.target.closest?.('.deal-card');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', `${e.clientX - r.left}px`);
  c.style.setProperty('--my', `${e.clientY - r.top}px`);
});
addEventListener('scroll', () => document.getElementById('topbar').classList.toggle('scrolled', scrollY > 8), { passive: true });
addEventListener('hashchange', () => render('nav'));
S.subscribe(() => render('data'));
bindTooltips();

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
          <button type="button" class="type-card" data-t="flip"><div class="type-ico" style="background:#fff0e8;color:#b5461a">${icon('hammer', 18)}</div><b>Fix &amp; flip</b><span>Buy, renovate, sell. Track rehab, holding costs and projected profit.</span></button>
          <button type="button" class="type-card" data-t="brrrr"><div class="type-ico" style="background:#e6f7f0;color:#0f7a54">${icon('repeat', 18)}</div><b>BRRRR rental</b><span>Buy, rehab, rent, refinance, repeat. Track rent roll and cash left in.</span></button>
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

render('nav');
