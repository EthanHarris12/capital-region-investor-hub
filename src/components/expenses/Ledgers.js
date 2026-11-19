"use client";
// The record-keeping tabs of a deal: budget, expenses, subs, materials,
// draws, holding costs and the timeline.
import { useState } from "react";
import * as S from "@/lib/expenses/store";
import { money, compact, pct, num, fmtDate, relDays, today, addDays, sum, csvDownload } from "@/lib/expenses/util";
import {
  B, SERIES, subStyle, Stat, StatRow, Panel, Grid, Row, Pill, Bar, Btn, LinkBtn, Icon, Empty, Meter, Input, Select, Table, StackBar,
  openForm, toast,
} from "./kit";
import { fresh, crud, openExpenseForm, SUB_FIELDS, MAT_FIELDS, DRAW_FIELDS, MS_FIELDS, HOLD_FIELDS } from "./actions";

const stop = (e) => e.stopPropagation();
const TrashBtn = ({ onClick }) => <button type="button" className="xt-icon-btn" title="Delete" onClick={(e) => { e.stopPropagation(); onClick(); }}><Icon name="trash" size={14} /></button>;
const Toggle = ({ on, onClick, yes, no }) => <button type="button" className={"xt-toggle" + (on ? " on" : "")} onClick={(e) => { e.stopPropagation(); onClick(); }}>{on ? yes : no}</button>;

// ---------- budget ----------
export function BudgetTab({ p, c }) {
  const cont = c.cats.find((x) => /contingency/i.test(x.category));
  const lines = crud(p, "budget", "Budget line");
  const setAmt = (id, v) => S.update(() => { fresh(p.id).budget.find((b) => b.id === id).amount = v; });
  const add = () => openForm({ title: "Add budget line", fields: [{ k: "category", label: "Category", required: true, list: S.DEFAULT_CATEGORIES }, { k: "amount", label: "Budget", type: "money" }], onSubmit: lines.add });
  const template = () => {
    const sqft = 1500;
    const tpl = { "Demo & Dumpsters": 3500, Roofing: 0, "Framing & Structural": 2500, Plumbing: 6000, Electrical: 6000, HVAC: 5500, Kitchen: 16000, Bathrooms: 9000, Flooring: sqft * 4.5, "Paint & Drywall": sqft * 3.5, "Exterior & Landscaping": 3500, "Permits & Fees": 1500 };
    S.update(() => {
      const pp = fresh(p.id);
      pp.budget.forEach((b) => { if (tpl[b.category] != null) b.amount = tpl[b.category]; });
      const subtotal = sum(pp.budget.filter((b) => !/contingency/i.test(b.category)), "amount");
      const ct = pp.budget.find((b) => /contingency/i.test(b.category));
      if (ct) ct.amount = Math.round(subtotal * 0.1);
    });
    toast("Applied a mid-grade 1,500 sqft template with 10% contingency");
  };
  const sorted = p.budget.filter((b) => +b.amount > 0).sort((a, b) => b.amount - a.amount);
  const segs = sorted.slice(0, 7).map((b, i) => ({ label: b.category, value: +b.amount, color: SERIES[i] }));
  if (sorted.length > 7) segs.push({ label: `Other (${sorted.length - 7})`, value: sum(sorted.slice(7), "amount"), color: "var(--b-subtle)" });
  return (
    <>
      <StatRow>
        <Stat label="Total budget" value={money(c.rehabBudget)} />
        <Stat label="Spent + pending" value={money(c.rehabSpent)} sub={`${pct(c.budgetUsed, 0)} used`} />
        <Stat label="Remaining" value={money(c.budgetRemaining)} color={c.budgetRemaining < 0 ? B.neg : undefined} sub={c.budgetRemaining < 0 ? "Over budget" : `${money(c.subCommitted)} still owed to subs`} />
        <Stat label="Contingency used" value={cont ? pct(cont.budget ? cont.spent / cont.budget : 0, 0) : "—"} sub={cont ? `${money(cont.spent)} of ${money(cont.budget)}` : "No contingency line"} />
      </StatRow>
      <Grid cols="21">
        <Panel flush title="Rehab budget" sub="Edit amounts inline — changes save automatically"
          action={<>{!c.rehabBudget && <Btn small onClick={template}>Starter template</Btn>}<Btn small primary icon="plus" onClick={add}>Add line</Btn></>}>
          <Table minWidth={720} head={["Category", { t: "Budget", r: true, w: 150 }, { t: "Paid", r: true }, { t: "Pending", r: true }, { t: "Remaining", r: true }, { t: "Used", w: 120 }, ""]}
            foot={<tr><td>Total</td><td className="r num">{money(c.rehabBudget)}</td><td className="r num">{money(c.paid)}</td><td className="r num">{money(c.pending)}</td><td className="r num">{money(c.budgetRemaining)}</td><td colSpan={2} /></tr>}>
            {c.cats.length ? c.cats.map((r) => {
              const b = p.budget.find((x) => x.category === r.category);
              const used = r.budget ? r.spent / r.budget : r.spent ? 1.01 : 0;
              return (
                <tr key={r.category}>
                  <td style={{ color: B.white }}>{r.category}</td>
                  <td className="r">{b ? <div style={{ maxWidth: 130, marginLeft: "auto" }}><Input value={b.amount} type="money" prefix="$" onChange={(v) => setAmt(b.id, v)} style={{ padding: "6px 10px 6px 24px", textAlign: "right" }} /></div> : <span style={{ color: B.grayMuted }}>{money(0)}</span>}</td>
                  <td className="r num">{money(r.paid)}</td>
                  <td className="r num" style={{ color: B.grayMuted }}>{r.pending ? money(r.pending) : "—"}</td>
                  <td className="r num" style={{ color: r.remaining < 0 ? B.neg : B.white }}>{money(r.remaining)}</td>
                  <td><Bar value={used} /></td>
                  <td className="r">{b && <TrashBtn onClick={() => lines.del(b.id)} />}</td>
                </tr>
              );
            }) : <tr><td colSpan={7}><Empty title="No budget lines" text="Add categories or start from the template." /></td></tr>}
          </Table>
        </Panel>
        <Panel title="Budget by category" sub={`${money(c.rehabBudget)} total`}>
          {segs.length ? <StackBar segs={segs} /> : <Empty title="Nothing budgeted" text="Amounts you enter show up here." />}
        </Panel>
      </Grid>
    </>
  );
}
// ---------- expenses ----------
export function ExpensesTab({ p, c }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");
  const ex = crud(p, "expenses", "Expense");
  const rows = [...p.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  const subName = (e) => p.subs.find((s) => s.id === e.subId)?.name || "";
  const shown = rows.filter((e) => {
    const hay = `${e.vendor} ${e.note} ${e.category} ${e.type} ${subName(e)}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!cat || e.category === cat) && (!st || e.status === st);
  });
  const byType = S.EXPENSE_TYPES.map((t, i) => ({ label: t, value: sum(p.expenses.filter((e) => e.type === t), "amount"), color: SERIES[i] })).filter((x) => x.value > 0);
  const noReceipt = p.expenses.filter((e) => !e.receipt);
  const flip = (id, f) => S.update(() => { const e = fresh(p.id).expenses.find((x) => x.id === id); f(e); });
  const exportCsv = () => {
    csvDownload(`${p.name.replace(/\W+/g, "-")}-expenses.csv`, [
      ["Date", "Vendor", "Category", "Type", "Subcontractor", "Method", "Status", "Receipt", "Amount", "Note"],
      ...[...p.expenses].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.vendor, e.category, e.type, subName(e), e.method, e.status, e.receipt ? "Yes" : "No", e.amount, e.note]),
    ]);
    toast("Expenses exported to CSV");
  };
  const filtered = q || cat || st;
  return (
    <>
      <StatRow>
        <Stat label="Paid" value={money(c.paid)} sub={`${p.expenses.filter((e) => e.status === "Paid").length} payments`} />
        <Stat label="Pending" value={money(c.pending)} color={c.pending ? B.warn : undefined} sub={`${p.expenses.filter((e) => e.status !== "Paid").length} awaiting payment`} />
        <Stat label="Avg daily burn" value={money(c.burnPerDay)} sub="Since first expense" />
        <Stat label="Missing receipts" value={String(noReceipt.length)} color={noReceipt.length ? B.warn : B.pos} sub={noReceipt.length ? `${money(sum(noReceipt, "amount"))} undocumented` : "All documented"} />
      </StatRow>
      {byType.length > 0 && (
        <Panel title="Spend by type" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 2, height: 12, borderRadius: 6, overflow: "hidden", background: B.subtle }}>
            {byType.map((b, i) => <div key={b.label} className="bar-grow" title={`${b.label} · ${money(b.value)}`} style={{ "--i": i, width: `${(b.value / (c.rehabSpent || 1)) * 100}%`, background: b.color }} />)}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
            {byType.map((b) => <span key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: B.grayText }}><i style={{ width: 10, height: 10, borderRadius: 3, background: b.color, border: "1px solid " + B.grayBorder }} />{b.label} <span className="num" style={{ color: B.white }}>{compact(b.value)}</span></span>)}
          </div>
        </Panel>
      )}
      <Panel flush>
        <div className="xt-toolbar">
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, display: "flex" }}><Icon name="search" size={14} /></span>
            <input className="field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor, note, category…" style={{ padding: "10px 12px 10px 34px" }} />
          </div>
          <Select value={cat} onChange={setCat} style={{ width: "auto" }} options={[{ value: "", label: "All categories" }, ...[...new Set(p.expenses.map((e) => e.category))].sort()]} />
          <Select value={st} onChange={setSt} style={{ width: "auto" }} options={[{ value: "", label: "Any status" }, "Paid", "Pending"]} />
          <Btn icon="download" onClick={exportCsv}>CSV</Btn>
          <Btn primary icon="plus" onClick={() => openExpenseForm(p, {})}>Log expense</Btn>
        </div>
        <Table minWidth={860} head={["Date", "Paid to", "Category", "Type", "Method", "Status", "Receipt", { t: "Amount", r: true }, ""]}
          foot={<tr><td colSpan={7}>{shown.length} expense{shown.length === 1 ? "" : "s"}{filtered ? " (filtered)" : ""}</td><td className="r num">{money(sum(shown, "amount"))}</td><td /></tr>}>
          {shown.length ? shown.map((e) => (
            <tr key={e.id} className="xt-click" onClick={() => openExpenseForm(p, e, e.id)}>
              <td style={{ color: B.grayMuted, whiteSpace: "nowrap" }}>{fmtDate(e.date, false)}</td>
              <td><span style={{ color: B.white }}>{e.vendor}</span>{e.subId && <> <Pill>Sub</Pill></>}{e.note && <div style={{ ...subStyle, fontSize: 11.5 }}>{e.note}</div>}</td>
              <td>{e.category}</td>
              <td style={{ color: B.grayMuted }}>{e.type}</td>
              <td style={{ color: B.grayMuted }}>{e.method || ""}</td>
              <td onClick={stop}>{e.status === "Paid" ? <Pill>Paid</Pill> : <Pill title="Click to mark paid" onClick={() => { flip(e.id, (x) => { x.status = "Paid"; }); toast("Marked as paid"); }}>Pending</Pill>}</td>
              <td><Toggle on={e.receipt} yes="✓ On file" no="None" onClick={() => flip(e.id, (x) => { x.receipt = !x.receipt; })} /></td>
              <td className="r num" style={{ color: B.white }}>{money(e.amount, true)}</td>
              <td className="r"><TrashBtn onClick={() => ex.del(e.id)} /></td>
            </tr>
          )) : <tr><td colSpan={9}><Empty title={filtered ? "No matches" : "No expenses yet"} text={filtered ? "Try a different search or filter." : "Log your first receipt, invoice or sub payment."} /></td></tr>}
        </Table>
      </Panel>
    </>
  );
}

// ---------- subs ----------
export function SubsTab({ p, c }) {
  const now = today();
  const subs = crud(p, "subs", "Subcontractor");
  const contracted = sum(c.subs, "contract");
  const missing = c.subs.filter((s) => s.paid > 0 && !s.lienWaiver).length;
  const toggle = (id, f) => S.update(() => { const s = fresh(p.id).subs.find((x) => x.id === id); s[f] = !s[f]; });
  const pay = (s) => openExpenseForm(p, {
    vendor: s.name, subId: s.id, type: "Subcontractor", method: "Check", amount: Math.max(0, s.balance) || "", receipt: false,
    category: p.budget.find((b) => b.category.toLowerCase().includes((s.trade || "").split(/[\s/]/)[0].toLowerCase()))?.category || p.budget[0]?.category,
  });
  return (
    <>
      <StatRow>
        <Stat label="Contracted" value={money(contracted)} sub={`${c.subs.length} subcontractors`} />
        <Stat label="Paid to subs" value={money(c.subPaid)} sub={`${pct(contracted ? c.subPaid / contracted : 0, 0)} of contracts`} />
        <Stat label="Still owed" value={money(c.subCommitted)} sub="Remaining contract balances" />
        <Stat label="Lien waivers" value={missing ? `${missing} missing` : "All in"} color={missing ? B.warn : B.pos} sub="Collect before final payment" />
      </StatRow>
      <Panel flush title="Subcontractors" sub="Payments logged in Expenses with a sub attached roll up here"
        action={<Btn small primary icon="plus" onClick={() => openForm({ title: "Add subcontractor", fields: SUB_FIELDS, values: { status: "Scheduled", w9: false, lienWaiver: false }, onSubmit: subs.add })}>Add sub</Btn>}>
        <Table minWidth={980} head={["Sub", "Status", { t: "Contract", r: true }, { t: "Paid", r: true }, { t: "Balance", r: true }, { t: "Progress", w: 110 }, "Lien waiver", "W-9", "COI expires", ""]}>
          {c.subs.length ? c.subs.map((s) => {
            const prog = s.contract ? (s.paid + s.pending) / s.contract : 0;
            const insColor = s.insuranceExp ? (s.insuranceExp < now ? B.neg : s.insuranceExp < addDays(30) ? B.warn : B.grayText) : B.grayMuted;
            return (
              <tr key={s.id} className="xt-click" onClick={() => openForm({ title: "Edit subcontractor", fields: SUB_FIELDS, values: p.subs.find((x) => x.id === s.id), onSubmit: (v) => subs.edit(s.id, v), onDelete: () => subs.del(s.id) })}>
                <td><span style={{ color: B.white }}>{s.name}</span><div style={{ ...subStyle, fontSize: 11.5 }}>{s.trade}{s.phone ? ` · ${s.phone}` : ""}</div></td>
                <td><Pill>{s.status}</Pill></td>
                <td className="r num">{money(+s.contract || 0)}</td>
                <td className="r num">{money(s.paid)}{s.pending > 0 && <div style={{ fontSize: 11, color: B.grayMuted }}>+{money(s.pending)} pending</div>}</td>
                <td className="r num" style={{ color: s.balance < 0 ? B.neg : B.white }}>{money(s.balance)}</td>
                <td><Bar value={prog} /></td>
                <td><Toggle on={s.lienWaiver} yes="✓ Received" no="Missing" onClick={() => toggle(s.id, "lienWaiver")} /></td>
                <td><Toggle on={s.w9} yes="✓" no="Need" onClick={() => toggle(s.id, "w9")} /></td>
                <td style={{ color: insColor, whiteSpace: "nowrap" }}>{s.insuranceExp ? fmtDate(s.insuranceExp) : "—"}</td>
                <td className="r" onClick={stop}><LinkBtn icon="dollar" onClick={() => pay(s)}>Pay</LinkBtn></td>
              </tr>
            );
          }) : <tr><td colSpan={10}><Empty title="No subcontractors" text="Add your crew to track contracts, payments, waivers and insurance." /></td></tr>}
        </Table>
      </Panel>
      <div style={{ ...subStyle, marginTop: 12 }}>Tip: anyone you pay $600+ in a year needs a 1099-NEC — the W-9 column keeps you ready for tax season.</div>
    </>
  );
}

// ---------- materials ----------
export function MaterialsTab({ p }) {
  const mats = crud(p, "materials", "Material");
  const total = sum(p.materials, (m) => m.qty * m.unitCost);
  const by = (s) => p.materials.filter((m) => m.status === s);
  const setStatus = (id, v) => S.update(() => { fresh(p.id).materials.find((m) => m.id === id).status = v; });
  const logIt = (m) => openExpenseForm(p,
    { vendor: m.supplier, amount: Math.round(m.qty * m.unitCost * 100) / 100, type: "Materials", note: m.item, category: p.budget.find((b) => b.category.toLowerCase().includes((m.room || "").toLowerCase().slice(0, 5)))?.category || p.budget[0]?.category },
    null, () => { fresh(p.id).materials.find((x) => x.id === m.id).expensed = true; });
  return (
    <>
      <StatRow>
        <Stat label="Materials value" value={money(total)} sub={`${p.materials.length} line items`} />
        <Stat label="On order" value={String(by("Ordered").length)} sub={money(sum(by("Ordered"), (m) => m.qty * m.unitCost))} />
        <Stat label="Delivered / on site" value={String(by("Delivered").length)} sub="Check for damage & count" />
        <Stat label="Installed" value={String(by("Installed").length)} sub={`${by("Quoted").length} still quoted`} />
      </StatRow>
      <Panel flush title="Materials & orders" sub="Track quotes through install. “Log expense” posts it to the ledger once you pay."
        action={<Btn small primary icon="plus" onClick={() => openForm({ title: "Add material", fields: MAT_FIELDS(p), values: { qty: 1, status: "Quoted", date: today() }, onSubmit: (v) => mats.add({ ...v, expensed: false }) })}>Add item</Btn>}>
        <Table minWidth={860} head={["Item", "Room", "Supplier", { t: "Qty", r: true }, { t: "Unit", r: true }, { t: "Total", r: true }, "Status", ""]}>
          {p.materials.length ? p.materials.map((m) => (
            <tr key={m.id} className="xt-click" onClick={() => openForm({ title: "Edit material", fields: MAT_FIELDS(p), values: m, onSubmit: (v) => mats.edit(m.id, v), onDelete: () => mats.del(m.id) })}>
              <td style={{ color: B.white }}>{m.item}</td>
              <td style={{ color: B.grayMuted }}>{m.room || ""}</td>
              <td>{m.supplier || ""}</td>
              <td className="r num">{num(+m.qty || 0, m.qty % 1 ? 1 : 0)}</td>
              <td className="r num" style={{ color: B.grayMuted }}>{money(+m.unitCost || 0, m.unitCost < 100)}</td>
              <td className="r num" style={{ color: B.white }}>{money(m.qty * m.unitCost)}</td>
              <td onClick={stop}><Select value={m.status} onChange={(v) => setStatus(m.id, v)} options={["Quoted", "Ordered", "Delivered", "Installed"]} style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} /></td>
              <td className="r" onClick={stop}>{m.expensed ? <Pill>Logged</Pill> : <LinkBtn onClick={() => logIt(m)}>Log expense</LinkBtn>}</td>
            </tr>
          )) : <tr><td colSpan={8}><Empty title="No materials tracked" text="Add cabinets, flooring, fixtures and track them from quote to install." /></td></tr>}
        </Table>
      </Panel>
    </>
  );
}

// ---------- draws ----------
export function DrawsTab({ p, c }) {
  const hb = +p.financing.holdback || 0;
  const draws = crud(p, "draws", "Draw");
  const unreimbursed = c.paid - c.drawsFunded - c.drawsPending;
  const fund = (id) => { S.update(() => { const d = fresh(p.id).draws.find((x) => x.id === id); d.status = "Funded"; d.funded = d.funded || d.requested; }); toast("Draw marked funded"); };
  return (
    <Grid cols="12">
      <Panel title="Rehab holdback" sub={p.financing.lender || "Lender"}>
        <Meter value={hb ? c.drawsFunded / hb : 0} figure={pct(hb ? c.drawsFunded / hb : 0, 0)} label="of holdback drawn" />
        <div style={{ marginTop: 14 }}>
          <Row label="Total holdback" value={money(hb)} />
          <Row label="Funded" value={money(c.drawsFunded)} />
          <Row label="In process" value={money(c.drawsPending)} color={c.drawsPending ? B.warn : undefined} />
          <Row label="Available to draw" value={money(c.holdbackRemaining)} color={B.pos} />
          <Row total label="Paid rehab not yet reimbursed" value={money(Math.max(0, c.paid - c.drawsFunded))} />
        </div>
        {unreimbursed > 5000 && c.holdbackRemaining > 0 && (
          <div className="xt-callout">You’ve paid {money(unreimbursed)} of rehab beyond what’s been drawn. Consider requesting a draw.</div>
        )}
      </Panel>
      <Panel flush title="Draw schedule" sub="Funded draws accrue interest from the funding date"
        action={<Btn small primary icon="plus" onClick={() => openForm({ title: "Request a draw", fields: DRAW_FIELDS, values: { num: p.draws.length + 1, date: today(), status: "Requested", funded: 0 }, onSubmit: draws.add })}>Request draw</Btn>}>
        <Table minWidth={640} head={["#", "Date", "Scope", { t: "Requested", r: true }, { t: "Funded", r: true }, "Status", ""]}>
          {p.draws.length ? p.draws.map((d) => (
            <tr key={d.id} className="xt-click" onClick={() => openForm({ title: "Edit draw", fields: DRAW_FIELDS, values: d, onSubmit: (v) => draws.edit(d.id, v), onDelete: () => draws.del(d.id) })}>
              <td className="num" style={{ color: B.white }}>{d.num}</td>
              <td style={{ color: B.grayMuted, whiteSpace: "nowrap" }}>{fmtDate(d.date)}</td>
              <td>{d.note || ""}</td>
              <td className="r num">{money(+d.requested || 0)}</td>
              <td className="r num" style={{ color: B.white }}>{d.funded ? money(+d.funded) : "—"}</td>
              <td><Pill>{d.status}</Pill></td>
              <td className="r" onClick={stop}>{d.status !== "Funded" && <LinkBtn icon="check" onClick={() => fund(d.id)}>Funded</LinkBtn>}</td>
            </tr>
          )) : <tr><td colSpan={7}><Empty title="No draws yet" text="Request reimbursement from your lender’s rehab holdback." /></td></tr>}
        </Table>
      </Panel>
    </Grid>
  );
}

// ---------- holding ----------
export function HoldingTab({ p, c }) {
  const hold = crud(p, "holding", "Holding cost");
  const rows = [...p.holding.map((h) => ({ ...h, editable: true })), { id: "_int", name: `Loan interest (${p.financing.rate}% on ${compact(c.loanBalance)})`, monthly: c.monthlyInterest }];
  const exit = p.type === "flip" ? "sale" : "refi";
  return (
    <>
      <StatRow>
        <Stat label="Monthly carry" value={money(c.holdingMonthly)} sub="Fixed costs + interest" />
        <Stat label="Per day" value={money(c.holdingMonthly / 30.4375)} sub="Every day of delay" />
        <Stat label="Accrued to date" value={money(c.holdingToDate)} sub={`${c.monthsHeld.toFixed(1)} months held`} />
        <Stat label={`Projected through ${exit}`} value={money(c.projHolding)} sub={`${c.plannedMonths.toFixed(1)} months planned`} />
      </StatRow>
      <Grid cols="21">
        <Panel flush title="Carrying costs" sub="Accrued automatically by days held — no need to log each bill"
          action={<Btn small primary icon="plus" onClick={() => openForm({ title: "Add holding cost", subtitle: "Recurring monthly carrying cost", fields: HOLD_FIELDS, onSubmit: hold.add })}>Add cost</Btn>}>
          <Table minWidth={600} head={["Cost", { t: "Monthly", r: true }, { t: "Daily", r: true }, { t: "To date", r: true }, { t: "Projected", r: true }]}
            foot={<tr><td>Total</td><td className="r num">{money(c.holdingMonthly)}</td><td className="r num">{money(c.holdingMonthly / 30.4375, true)}</td><td className="r num">{money(c.holdingToDate)}</td><td className="r num">{money(c.projHolding)}</td></tr>}>
            {rows.map((h) => (
              <tr key={h.id} className={h.editable ? "xt-click" : undefined} onClick={h.editable ? () => openForm({ title: "Edit holding cost", fields: HOLD_FIELDS, values: p.holding.find((x) => x.id === h.id), onSubmit: (v) => hold.edit(h.id, v), onDelete: () => hold.del(h.id) }) : undefined}>
                <td style={{ color: B.white }}>{h.name}{!h.editable && <> <Pill>Auto</Pill></>}</td>
                <td className="r num">{money(+h.monthly || 0)}</td>
                <td className="r num" style={{ color: B.grayMuted }}>{money((+h.monthly || 0) / 30.4375, true)}</td>
                <td className="r num">{money((+h.monthly || 0) * c.monthsHeld)}</td>
                <td className="r num" style={{ color: B.white }}>{money((+h.monthly || 0) * c.plannedMonths)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Cost of delay" sub={`What slipping the ${exit} date costs you in carry alone`}>
          {[1, 2, 3, 6].map((m) => <Row key={m} label={`+${m} month${m > 1 ? "s" : ""}`} value={`−${money(c.holdingMonthly * m)}`} color={B.neg} />)}
          <div className="xt-callout">Interest is {pct(c.holdingMonthly ? c.monthlyInterest / c.holdingMonthly : 0, 0)} of your monthly carry.</div>
        </Panel>
      </Grid>
    </>
  );
}

// ---------- timeline ----------
export function TimelineTab({ p, c }) {
  const now = today();
  const ms = crud(p, "milestones", "Milestone");
  const toggle = (id) => S.update(() => { const m = fresh(p.id).milestones.find((x) => x.id === id); m.done = !m.done; });
  const add = () => openForm({ title: "Add milestone", fields: MS_FIELDS, values: { date: addDays(7) }, onSubmit: (v) => { ms.add(v); S.update(() => fresh(p.id).milestones.sort((a, b) => (a.date || "").localeCompare(b.date || "")), false); } });
  return (
    <Grid cols="21">
      <Panel title="Project timeline" sub="Click a circle to mark complete" action={<Btn small primary icon="plus" onClick={add}>Milestone</Btn>}>
        {p.milestones.length ? (
          <div style={{ position: "relative" }}>
            {p.milestones.map((m, i) => {
              const overdue = !m.done && m.date && m.date < now;
              const last = i === p.milestones.length - 1;
              return (
                <div key={m.id} className="reveal" style={{ "--i": i, display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 14, alignItems: "start", position: "relative", paddingBottom: last ? 0 : 18 }}>
                  {!last && <span style={{ position: "absolute", left: 13, top: 28, bottom: 0, width: 2, background: m.done ? B.accent : B.grayBorder }} />}
                  <button type="button" aria-label={m.done ? "Mark not done" : "Mark done"} onClick={() => toggle(m.id)}
                    style={{ width: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center", cursor: "pointer", background: m.done ? B.solar : B.navyLight, color: "#0c0a08", border: "1.5px solid " + (m.done ? B.solar : overdue ? B.neg : B.strong) }}>
                    {m.done && <Icon name="check" size={14} />}
                  </button>
                  <div style={{ cursor: "pointer", minWidth: 0, paddingTop: 3 }} onClick={() => openForm({ title: "Edit milestone", fields: MS_FIELDS, values: m, onSubmit: (v) => ms.edit(m.id, v), onDelete: () => ms.del(m.id) })}>
                    <div style={{ fontSize: 14, color: m.done ? B.grayText : B.white, textDecoration: m.done ? "line-through" : "none" }}>{m.name}</div>
                    <div style={subStyle}>{fmtDate(m.date)}{m.date ? ` · ${relDays(m.date)}` : ""}</div>
                  </div>
                  <div style={{ paddingTop: 3 }}>{m.done ? <Pill>Complete</Pill> : overdue ? <Pill>Overdue</Pill> : null}</div>
                </div>
              );
            })}
          </div>
        ) : <Empty title="No milestones" text="Add closing, inspections, listing and other key dates." />}
      </Panel>
      <Panel title="Progress">
        <Meter value={c.progress} figure={pct(c.progress, 0)} label={`${c.milestonesDone} of ${p.milestones.length} milestones`} color={B.pos} />
        <div style={{ marginTop: 14 }}>
          <Row label="Days since purchase" value={String(c.daysHeld)} />
          <Row label={`Target ${p.type === "flip" ? "sale" : "refi"} date`} value={fmtDate(c.plannedEnd)} />
          <Row label="Days remaining" value={String(c.daysToTarget)} color={c.daysToTarget < 0 ? B.neg : undefined} />
          <Row label="Overdue milestones" value={String(c.overdue.length)} color={c.overdue.length ? B.neg : B.pos} />
        </div>
      </Panel>
    </Grid>
  );
}
