// Modals, forms, toasts, tooltip, command palette and icons.
import { esc } from './util.js';

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  hammer: '<path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25a2 2 0 0 1-.6-1.43v-.85L16.2 5.3a4.5 4.5 0 0 0-6.37 0l-.3.3 3.17 3.17a2 2 0 0 1 .59 1.42v.86l1.54 1.54"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
};
export const icon = (name, size = 16, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// ---- tooltip ----
const tipEl = () => document.getElementById('tip');
export const tip = {
  show(html, x, y) {
    const el = tipEl();
    el.innerHTML = html;
    el.classList.add('on');
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = x + 14, top = y - h - 12;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (top < 8) top = y + 16;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  },
  hide() { tipEl().classList.remove('on'); },
};
export function bindTooltips() {
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t) tip.show(t.getAttribute('data-tip'), e.clientX, e.clientY);
    else if (!e.target.closest?.('.line-chart .plot')) tip.hide();
  });
}

// ---- toasts ----
export function toast(msg, { undo } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="ok">${icon('check', 11, 3)}</span><span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
  document.getElementById('toasts').appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  if (undo) el.querySelector('button').onclick = () => { undo(); kill(); };
  setTimeout(kill, undo ? 6000 : 2800);
}

// ---- modal ----
let current = null;
export function openModal(inner, { wide = false, cls = '', onClose } = {}) {
  closeModal(true);
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">${inner}</div>`;
  document.getElementById('modal-root').appendChild(back);
  back.addEventListener('mousedown', (e) => { if (e.target === back) closeModal(); });
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal()));
  current = { back, onClose };
  return back.querySelector('.modal');
}
export function closeModal(instant = false) {
  if (!current) return;
  const { back, onClose } = current;
  current = null;
  onClose?.();
  if (instant) return back.remove();
  back.classList.add('closing');
  setTimeout(() => back.remove(), 180);
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ---- forms ----
function fieldHTML(f, v) {
  const val = v ?? f.default ?? '';
  const id = `f_${f.k}`;
  const full = f.full || f.type === 'textarea' ? 'full' : '';
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  let control;
  switch (f.type) {
    case 'money':
      control = `<div class="affix has-pre"><span class="pre">$</span><input class="input" id="${id}" name="${f.k}" type="number" step="any" inputmode="decimal" value="${esc(val)}" ${f.required ? 'required' : ''}></div>`; break;
    case 'pct':
      control = `<div class="affix has-post"><input class="input" id="${id}" name="${f.k}" type="number" step="any" value="${esc(val)}"><span class="post">%</span></div>`; break;
    case 'number':
      control = `<input class="input" id="${id}" name="${f.k}" type="number" step="any" value="${esc(val)}" ${f.required ? 'required' : ''}>`; break;
    case 'date':
      control = `<input class="input" id="${id}" name="${f.k}" type="date" value="${esc(val)}" ${f.required ? 'required' : ''}>`; break;
    case 'select':
      control = `<select class="input" id="${id}" name="${f.k}">${f.options.map((o) => {
        const ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`;
      }).join('')}</select>`; break;
    case 'textarea':
      control = `<textarea class="input" id="${id}" name="${f.k}">${esc(val)}</textarea>`; break;
    case 'checkbox':
      return `<div class="field ${full}" style="align-self:end;padding-bottom:6px"><label class="check"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>${hint}</div>`;
    default:
      control = `<input class="input" id="${id}" name="${f.k}" type="text" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''} ${f.list ? `list="${id}_l"` : ''}>
        ${f.list ? `<datalist id="${id}_l">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}`;
  }
  return `<div class="field ${full}"><label for="${id}">${esc(f.label)}</label>${control}${hint}</div>`;
}

export function openForm({ title, subtitle = '', fields, values = {}, submit = 'Save', onSubmit, onDelete, wide = false }) {
  const m = openModal(`
    <form>
      <div class="modal-head"><div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
        <button type="button" class="btn ghost icon sm" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body"><div class="form-grid">${fields.map((f) => fieldHTML(f, values[f.k])).join('')}</div></div>
      <div class="modal-foot">
        ${onDelete ? `<button type="button" class="btn danger left" data-del>${icon('trash')} Delete</button>` : ''}
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">${esc(submit)}</button>
      </div>
    </form>`, { wide });
  const form = m.querySelector('form');
  setTimeout(() => form.querySelector('input:not([type=checkbox]),select,textarea')?.focus(), 60);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.k];
      if (f.type === 'checkbox') out[f.k] = el.checked;
      else if (['money', 'pct', 'number'].includes(f.type)) out[f.k] = el.value === '' ? 0 : +el.value;
      else out[f.k] = el.value.trim();
    }
    if (onSubmit(out) !== false) closeModal();
  });
  m.querySelector('[data-del]')?.addEventListener('click', () => { closeModal(); onDelete(); });
  return m;
}

// ---- command palette ----
export function openPalette(items) {
  const m = openModal(`
    <div class="p-input">${icon('search')}<input placeholder="Search deals, jump to a tab, or run an action…" autocomplete="off"><kbd>esc</kbd></div>
    <div class="p-list"></div>`, { cls: 'palette' });
  const input = m.querySelector('input'), list = m.querySelector('.p-list');
  let sel = 0, shown = [];
  const render = () => {
    const q = input.value.toLowerCase().trim();
    shown = items.filter((i) => !q || `${i.label} ${i.meta || ''} ${i.group}`.toLowerCase().includes(q)).slice(0, 40);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    let g = '';
    list.innerHTML = shown.length ? shown.map((it, idx) => {
      const head = it.group !== g ? `<div class="p-group">${esc((g = it.group))}</div>` : '';
      return `${head}<div class="p-item ${idx === sel ? 'on' : ''}" data-i="${idx}">${icon(it.icon || 'arrowRight')}<span>${esc(it.label)}</span><span class="p-meta">${esc(it.meta || '')}</span></div>`;
    }).join('') : `<div class="empty">No results for “${esc(input.value)}”</div>`;
  };
  const run = (i) => { const it = shown[i]; if (!it) return; closeModal(true); it.run(); };
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); render(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    if (e.key === 'Enter') run(sel);
  });
  list.addEventListener('mousemove', (e) => { const it = e.target.closest('.p-item'); if (it && +it.dataset.i !== sel) { sel = +it.dataset.i; render(); } });
  list.addEventListener('click', (e) => { const it = e.target.closest('.p-item'); if (it) run(+it.dataset.i); });
  render();
  setTimeout(() => input.focus(), 30);
}

export const emptyState = (title, text, ico = 'file', action = '') =>
  `<div class="empty"><div class="em-icon">${icon(ico, 20)}</div><b>${esc(title)}</b>${esc(text)}${action ? `<div style="margin-top:14px">${action}</div>` : ''}</div>`;
