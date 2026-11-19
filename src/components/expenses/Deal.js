"use client";
// One deal's workspace: header, stage stepper, headline figures, and a
// sub-tab per part of the job.
import * as S from "@/lib/expenses/store";
import { calc } from "@/lib/expenses/calc";
import { alertsFor, maxLoanForDscr } from "@/lib/expenses/alerts";
import { money, compact, pct, fmtDate, relDays, today, addDays, daysBetween, num, sum, uid } from "@/lib/expenses/util";
import {
  B, SERIES, labelStyle, subStyle, Stat, StatRow, Panel, Grid, SectionLabel, Row, MiniFigure, Pill, Bar, Btn, LinkBtn, Segmented,
  Icon, Empty, CheckRow, AlertList, Waterfall, SpendChart, StackBar, CategoryBars, Meter, Field, FormGrid, Input, Check, Table,
  openForm, openModal, closeModal, toast, ModalHead, ModalFoot, tone,
} from "./kit";
import { fresh, getPath, setField, crud, openExpenseForm, UNIT_FIELDS } from "./actions";
import { BudgetTab, ExpensesTab, SubsTab, MaterialsTab, DrawsTab, HoldingTab, TimelineTab } from "./Ledgers";

export const dealTabs = (p) => [
  { key: "overview", label: "Overview" },
  { key: "budget", label: "Budget" },
  { key: "expenses", label: "Expenses", count: p.expenses.length },
  { key: "subs", label: "Subs", count: p.subs.length },
  { key: "materials", label: "Materials", count: p.materials.length },
  { key: "draws", label: "Draws", count: p.draws.length },
  { key: "holding", label: "Holding" },
  { key: "timeline", label: "Timeline" },
  ...(p.type === "flip"
    ? [{ key: "sale", label: "Sale & profit" }]
    : [{ key: "rent", label: "Rent roll", count: p.rental.units.length }, { key: "refi", label: "Refinance" }]),
  { key: "inputs", label: "Deal inputs" },
];

// Input wired straight to a field on the deal; edits save as you type.
function Bound({ p, path, label, hint, full, type, prefix, suffix }) {
  return (
    <Field label={label} hint={hint} full={full}>
      <Input value={getPath(p, path)} type={type || "money"} prefix={prefix} suffix={suffix} onChange={function (v) { setField(p, path, v); }} />
    </Field>
  );
}

export default function Deal({ p, tab: requested, setTab, onBack, onOpen }) {
  var c = calc(p);
  var flip = p.type === "flip";
  var stages = flip ? S.FLIP_STAGES : S.BRRRR_STAGES;
  var tabs = dealTabs(p);
  var tab = tabs.some(function (t) { return t.key === requested; }) ? requested : "overview";

  var setStage = function (n) { S.update(function () { fresh(p.id).stage = n; }); toast("Stage set to " + stages[n]); };
  var rehabSub = pct(c.budgetUsed, 0) + " of " + money(c.rehabBudget) + (c.pending ? " · " + money(c.pending) + " pending" : "");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div className="reveal" style={{ minWidth: 0 }}>
          <button type="button" className="xt-link" onClick={onBack} style={{ marginBottom: 14 }}><Icon name="back" size={13} />All deals</button>
          <div style={{ ...labelStyle, display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ color: B.white }}>{flip ? "Fix & flip" : "BRRRR"}</span><span>·</span><span>{p.address}{p.city ? ", " + p.city : ""}</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.05, fontWeight: 400, margin: "0 0 8px", color: B.white }}>{p.name}</h2>
          <div style={{ fontSize: 14, color: B.grayText }}>
            Purchased {fmtDate(p.purchase.date)} · {c.daysHeld} days held · {flip
              ? (p.sale.closed ? "sold " + fmtDate(p.sale.saleDate) : "target sale " + relDays(p.sale.targetDate))
              : (p.refi.done ? "refinanced " + fmtDate(p.refi.date) : "refi " + relDays(p.refi.date))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn icon="printer" onClick={function () { window.print(); }}>Report</Btn>
          <Btn primary icon="plus" onClick={function () { openExpenseForm(p, {}); }}>Log expense</Btn>
        </div>
      </div>

      <div className="nav-scroll" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, width: "max-content" }}>
          {stages.map(function (s, i) {
            var done = i < p.stage, cur = i === p.stage;
            return (
              <button key={s} type="button" className="chip" data-active={cur} onClick={function () { setStage(i); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", fontSize: 13 }}>
                <span className="num" style={{ width: 18, height: 18, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 10, background: done ? B.solar : cur ? "transparent" : B.subtle, color: done ? "#0c0a08" : "inherit", border: cur ? "1px solid currentColor" : "none" }}>
                  {done ? <Icon name="check" size={11} /> : i + 1}
                </span>{s}
              </button>
            );
          })}
        </div>
      </div>

      <StatRow style={{ marginBottom: 24 }}>
        {flip ? (
          <>
            <Stat i={1} label="All-in acquisition" value={money(c.acquisition + c.loanCosts)} sub={money(+p.purchase.price || 0) + " price + closing & points"} />
            <Stat i={2} label="Rehab spent" value={money(c.rehabSpent)} sub={rehabSub}><div style={{ marginTop: 10 }}><Bar value={c.budgetUsed} /></div></Stat>
            <Stat i={3} label="Funds remaining" value={money(c.fundsRemaining)} color={c.fundsRemaining < 0 ? B.neg : undefined} sub={c.fundingGap < 0 ? money(-c.fundingGap) + " short at completion" : money(c.holdbackRemaining) + " undrawn holdback"} />
            <Stat i={4} label="Projected profit" value={money(c.profit)} color={c.profit >= 0 ? B.pos : B.neg} sub={pct(c.roi) + " ROI · " + pct(c.annualized, 0) + " annualized"} />
          </>
        ) : (
          <>
            <Stat i={1} label="All-in cost" value={money(c.allIn)} sub={pct(c.rule75, 0) + " of " + compact(c.arv) + " ARV"} />
            <Stat i={2} label="Rehab spent" value={money(c.rehabSpent)} sub={rehabSub}><div style={{ marginTop: 10 }}><Bar value={c.budgetUsed} /></div></Stat>
            <Stat i={3} label="Cash left in after refi" value={money(Math.max(0, c.cashLeftIn))} sub={pct(c.recovered, 0) + " recovered" + (c.cashLeftIn < 0 ? " · +" + money(-c.cashLeftIn) + " pulled out" : "")} />
            <Stat i={4} label="Monthly cash flow" value={money(c.cashflow)} color={c.cashflow >= 0 ? B.pos : B.neg} sub={c.dscr.toFixed(2) + "x DSCR · " + (Number.isFinite(c.coc) ? pct(c.coc) : "∞") + " CoC"} />
          </>
        )}
      </StatRow>

      <div style={{ marginBottom: 20 }}><Segmented value={tab} onChange={setTab} options={tabs} /></div>

      <div key={tab} className="tab-panel">
        {tab === "overview" && (flip ? <FlipOverview p={p} c={c} setTab={setTab} onOpen={onOpen} /> : <BrrrrOverview p={p} c={c} setTab={setTab} onOpen={onOpen} />)}
        {tab === "budget" && <BudgetTab p={p} c={c} />}
        {tab === "expenses" && <ExpensesTab p={p} c={c} />}
        {tab === "subs" && <SubsTab p={p} c={c} />}
        {tab === "materials" && <MaterialsTab p={p} />}
        {tab === "draws" && <DrawsTab p={p} c={c} />}
        {tab === "holding" && <HoldingTab p={p} c={c} />}
        {tab === "timeline" && <TimelineTab p={p} c={c} />}
        {tab === "sale" && <SaleTab p={p} c={c} />}
        {tab === "rent" && <RentTab p={p} c={c} />}
        {tab === "refi" && <RefiTab p={p} c={c} />}
        {tab === "inputs" && <InputsTab p={p} c={c} onBack={onBack} />}
      </div>
    </div>
  );
}

// ====================================================================
function SpendPanel({ p, c, i }) {
  var end = c.plannedEnd && c.plannedEnd > p.purchase.date ? c.plannedEnd : addDays(120, p.purchase.date);
  return (
    <Panel i={i} title="Rehab spend over time" sub={"Cumulative vs. a straight-line budget pace to " + (p.type === "flip" ? "sale" : "refi")}
      action={<div style={{ display: "flex", gap: 14, fontSize: 11, color: B.grayMuted, alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 14, height: 2, background: B.accent }} />Spent</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 14, borderTop: "2px dashed " + B.grayMuted }} />Budget pace</span>
      </div>}>
      <SpendChart series={c.series} pace={[{ x: p.purchase.date, y: 0 }, { x: end, y: c.rehabBudget }]} />
    </Panel>
  );
}

function SourcesUses({ p, c, i }) {
  var uses = [
    { label: "Purchase & closing", value: c.acquisition, color: SERIES[0] },
    { label: "Loan points & fees", value: c.loanCosts, color: SERIES[2] },
    { label: "Rehab paid", value: c.paid, color: SERIES[1] },
    { label: "Holding to date", value: c.holdingToDate, color: SERIES[3] },
    { label: "Remaining", value: Math.max(0, c.fundsRemaining), color: "var(--b-subtle)" },
  ];
  return (
    <Panel i={i} title="Sources & uses" sub="Cash basis, to date">
      <div style={labelStyle}>Funds remaining</div>
      <div className="num" style={{ fontSize: 32, lineHeight: "38px", margin: "4px 0 14px", color: c.fundsRemaining < 0 ? B.neg : B.white }}>{money(c.fundsRemaining)}</div>
      <StackBar segs={uses} legend={false} />
      <div style={{ marginTop: 14 }}>
        <Row label="Your cash allocated" value={money(+p.cashReserves || 0)} />
        <Row label="Acquisition loan" value={money(+p.financing.loanAmount || 0)} />
        <Row label="Draws funded" value={money(c.drawsFunded)} />
        <Row total label="Total sources" value={money(c.sources)} />
        {uses.slice(0, 4).map(function (u) {
          return <Row key={u.label} label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: u.color }} />{u.label}</span>} value={"−" + money(u.value)} />;
        })}
        <Row total label="Still to fund (plan)" value={money(c.futureNeeds)} />
        <Row label="Undrawn holdback" value={money(c.holdbackRemaining)} />
        <Row label={c.fundingGap >= 0 ? "Cushion at completion" : "Shortfall at completion"} value={money(c.fundingGap)} color={c.fundingGap >= 0 ? B.pos : B.neg} />
      </div>
    </Panel>
  );
}

function FlipOverview({ p, c, setTab, onOpen }) {
  var alerts = alertsFor(p, c);
  var segs = [
    { label: "Purchase & closing", value: c.acquisition, color: SERIES[0] },
    { label: "Rehab", value: c.projRehab, color: SERIES[1] },
    { label: "Holding & interest", value: c.projHolding, color: SERIES[3] },
    { label: "Loan points & fees", value: c.loanCosts, color: SERIES[2] },
    { label: "Selling costs", value: c.sellingCosts, color: SERIES[4] },
  ];
  return (
    <>
      <Grid cols="21">
        <Panel i={1} title="Projected profit" sub={"From " + (p.sale.closed ? "actual" : "target") + " sale price down to net — hover any bar"} action={<LinkBtn icon="arrow" onClick={function () { setTab("sale"); }}>Sensitivity</LinkBtn>}>
          <Waterfall steps={[
            { label: "Sale price", value: c.salePrice, kind: "start" },
            { label: "Selling costs", value: c.sellingCosts, kind: "cost" },
            { label: "Purchase", value: c.acquisition, kind: "cost" },
            { label: "Rehab", value: c.projRehab, kind: "cost" },
            { label: "Holding", value: c.projHolding, kind: "cost" },
            { label: "Financing", value: c.loanCosts, kind: "cost" },
            { label: "Net profit", value: c.profit, kind: "total" },
          ]} />
          <div className="xt-mini4" style={{ marginTop: 16 }}>
            <MiniFigure label="ROI on cash" value={pct(c.roi)} />
            <MiniFigure label="Annualized" value={pct(c.annualized)} />
            <MiniFigure label="Margin" value={pct(c.margin)} />
            <MiniFigure label="Profit / month" value={money(c.profitPerMonth)} />
          </div>
        </Panel>
        <SourcesUses p={p} c={c} i={2} />
      </Grid>
      <Grid>
        <SpendPanel p={p} c={c} i={3} />
        <Panel i={4} title="Where the money goes" sub={"Projected total cost to sell · " + money(c.totalCost)}><StackBar segs={segs} /></Panel>
      </Grid>
      <Grid cols="21">
        <Panel i={5} title="Budget vs. actual" action={<LinkBtn icon="arrow" onClick={function () { setTab("budget"); }}>All categories</LinkBtn>}><CategoryBars cats={c.cats} limit={6} /></Panel>
        <Panel i={6} title="Deal checks">
          <CheckRow level={+p.purchase.price <= c.mao ? "good" : "warn"} title="70% rule" sub="MAO = 70% × ARV − rehab" value={money(c.mao)} />
          <CheckRow level={c.budgetUsed <= c.progress + 0.1 ? "good" : "warn"} title="Budget pace" sub={pct(c.budgetUsed, 0) + " spent · " + pct(c.progress, 0) + " of milestones done"} value={pct(c.budgetUsed, 0)} />
          <CheckRow level={c.profit >= 25000 ? "good" : c.profit > 0 ? "warn" : "bad"} title="Breakeven sale price" sub="Below this you lose money" value={money(c.breakeven)} />
          <CheckRow level="good" title="Daily carry" sub={"Holding + interest · " + money(c.burnPerDay) + "/day rehab burn"} value={money(c.holdingMonthly / 30.4)} />
          {alerts.length > 0 && <><div style={{ ...labelStyle, margin: "18px 0 4px" }}>Needs attention</div><AlertList alerts={alerts} limit={4} onOpen={function (a) { onOpen(a.dealId, a.tab); }} /></>}
        </Panel>
      </Grid>
    </>
  );
}

function BrrrrOverview({ p, c, setTab, onOpen }) {
  var alerts = alertsFor(p, c);
  var o = p.rental.opex;
  return (
    <>
      <Grid cols="21">
        <Panel i={1} title="Monthly cash flow" sub="Gross rent down to what lands in your account after the refi loan" action={<LinkBtn icon="arrow" onClick={function () { setTab("rent"); }}>Rent roll</LinkBtn>}>
          <Waterfall steps={[
            { label: "Gross rent", value: c.gross, kind: "start" },
            { label: "Vacancy", value: c.vacancy, kind: "cost" },
            { label: "Taxes & ins.", value: (+o.taxes || 0) + (+o.insurance || 0), kind: "cost" },
            { label: "Mgmt", value: c.mgmt, kind: "cost" },
            { label: "CapEx & repairs", value: c.capex + c.repairs, kind: "cost" },
            { label: "Utilities & HOA", value: (+o.utilities || 0) + (+o.hoa || 0), kind: "cost" },
            { label: "Mortgage P&I", value: c.payment, kind: "cost" },
            { label: "Cash flow", value: c.cashflow, kind: "total" },
          ]} />
        </Panel>
        <Panel i={2} title="Capital recovery" sub="How much of your cash the refi returns">
          <Meter value={c.recovered} figure={pct(Math.max(0, c.recovered), 0)} label="of cash recovered" color={c.recovered >= 1 ? B.pos : undefined} />
          <div style={{ marginTop: 14 }}>
            <Row label="Cash in before refi" value={money(c.totalCashIn)} />
            <Row label={"New loan (" + p.refi.ltv + "% of " + compact(+p.refi.appraisal || 0) + ")"} value={money(c.newLoan)} />
            <Row label="Pays off hard money" value={"−" + money(c.payoff)} />
            <Row label="Refi closing costs" value={"−" + money(+p.refi.closingCosts || 0)} />
            <Row label="Cash back to you" value={money(c.cashOut)} color={c.cashOut >= 0 ? B.pos : B.neg} />
            <Row total label="Cash left in deal" value={money(Math.max(0, c.cashLeftIn))} />
          </div>
        </Panel>
      </Grid>
      <Grid>
        <SpendPanel p={p} c={c} i={3} />
        <Panel i={4} title="Rental metrics" action={<LinkBtn icon="arrow" onClick={function () { setTab("refi"); }}>Model refi</LinkBtn>}>
          <div className="xt-mini3">
            <MiniFigure label="NOI / mo" value={money(c.noi)} sub={money(c.noi * 12) + " / yr"} />
            <MiniFigure label="Cap rate" value={pct(c.capRate)} sub="on appraisal" />
            <MiniFigure label="Cash-on-cash" value={Number.isFinite(c.coc) ? pct(c.coc) : "∞"} sub={Number.isFinite(c.coc) ? "on cash left in" : "no cash left in"} color={tone(Number.isFinite(c.coc) ? c.coc >= 0.1 : true)} />
            <MiniFigure label="DSCR" value={c.dscr.toFixed(2) + "x"} sub="lenders want 1.20x+" color={tone(c.dscr >= 1.2)} />
            <MiniFigure label="Equity" value={compact(c.equity)} sub={pct(1 - p.refi.ltv / 100, 0) + " of value"} />
            <MiniFigure label="Rent-to-cost" value={pct(c.onePct, 2)} sub="1% rule target" color={tone(c.onePct >= 0.01)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <CheckRow level={c.rule75 <= 0.75 ? "good" : "warn"} title="75% rule" sub="All-in cost should be ≤ 75% of ARV to pull most cash out" value={pct(c.rule75, 0)} />
            <CheckRow level={p.refi.date >= c.seasoningDate ? "good" : "warn"} title="Seasoning" sub={p.refi.seasoningMonths + "-month seasoning clears " + fmtDate(c.seasoningDate)} value={fmtDate(p.refi.date, false)} />
          </div>
        </Panel>
      </Grid>
      <Grid cols="21">
        <Panel i={5} title="Rehab budget vs. actual" action={<LinkBtn icon="arrow" onClick={function () { setTab("budget"); }}>All categories</LinkBtn>}><CategoryBars cats={c.cats} limit={6} /></Panel>
        <Panel i={6} title="Needs attention"><AlertList alerts={alerts} limit={6} onOpen={function (a) { onOpen(a.dealId, a.tab); }} /></Panel>
      </Grid>
    </>
  );
}

// ====================================================================
function SaleTab({ p, c }) {
  var s = p.sale;
  var sellPct = ((+s.commissionPct || 0) + (+s.closingPct || 0)) / 100;
  var prices = [-0.1, -0.05, 0, 0.05].map(function (d) { return c.salePrice * (1 + d); });
  var months = [0, 1, 2, 3];
  var closeSale = function (on) {
    S.update(function () { var pp = fresh(p.id); pp.sale.closed = on; if (on) { pp.stage = 4; pp.sale.saleDate = pp.sale.saleDate || today(); pp.sale.actualPrice = pp.sale.actualPrice || pp.sale.targetPrice; } });
    toast(on ? "Sale recorded — congrats!" : "Sale reopened");
  };
  return (
    <Grid cols="12">
      <Panel i={1} title="Exit plan">
        <FormGrid>
          <Bound p={p} path="sale.targetPrice" label="Target sale price" prefix="$" />
          <Bound p={p} path="sale.targetDate" label="Target sale date" type="date" />
          <Bound p={p} path="sale.commissionPct" label="Agent commission" type="number" suffix="%" />
          <Bound p={p} path="sale.closingPct" label="Seller closing costs" type="number" suffix="%" hint="Transfer tax, attorney, title" />
          <Bound p={p} path="sale.concessions" label="Seller concessions" prefix="$" full />
        </FormGrid>
        <div style={{ borderTop: "1px solid " + B.grayBorder, marginTop: 20, paddingTop: 18 }}>
          <Check checked={s.closed} onChange={closeSale}>Property sold</Check>
          {s.closed && <div style={{ marginTop: 14 }}><FormGrid>
            <Bound p={p} path="sale.actualPrice" label="Actual sale price" prefix="$" />
            <Bound p={p} path="sale.saleDate" label="Closing date" type="date" />
          </FormGrid></div>}
        </div>
      </Panel>
      <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
        <Panel i={2} title="Net profit">
          <div className="num" style={{ fontSize: 40, lineHeight: "44px", color: c.profit >= 0 ? B.pos : B.neg, marginBottom: 12 }}>{money(c.profit)}</div>
          <Row label="Sale price" value={money(c.salePrice)} />
          <Row label={"Commission + closing (" + Math.round(sellPct * 1000) / 10 + "%)"} value={"−" + money(c.salePrice * sellPct)} />
          <Row label="Seller concessions" value={"−" + money(+s.concessions || 0)} />
          <Row label="All-in project cost" value={"−" + money(c.allIn)} />
          <Row total label="Hard money payoff at close" value={money(c.loanBalance)} />
          <Row label="Cash to you at closing" value={money(c.salePrice - c.sellingCosts - c.loanBalance)} />
          <Row label="ROI · annualized" value={pct(c.roi) + " · " + pct(c.annualized)} />
          <Row label="Breakeven price" value={money(c.breakeven)} />
        </Panel>
        <Panel i={3} flush title="Profit sensitivity" sub="Sale price vs. extra months of holding">
          <Table minWidth={460} head={["Sale price"].concat(months.map(function (m) { return { t: m ? "+" + m + " mo" : "On time", r: true }; }))}>
            {prices.map(function (pr, i) {
              return (
                <tr key={i}>
                  <td>{money(pr)} <span style={{ color: B.grayMuted }}>{["−10%", "−5%", "Target", "+5%"][i]}</span></td>
                  {months.map(function (m) {
                    var prof = pr - pr * sellPct - (+s.concessions || 0) - c.allIn - c.holdingMonthly * m;
                    var col = prof < 0 ? B.neg : prof < 15000 ? B.warn : B.pos;
                    var base = m === 0 && i === 2;
                    return <td key={m} className="r num" style={{ color: col, background: base ? "var(--b-green-glow)" : undefined }}>{compact(prof)}</td>;
                  })}
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>
    </Grid>
  );
}

// ====================================================================
function RentTab({ p, c }) {
  var r = p.rental;
  var units = crud(p, "rental.units", "Unit");
  var income = crud(p, "rental.income", "Payment");
  var ledger = r.income.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var addUnit = function () { openForm({ title: "Add unit", fields: UNIT_FIELDS, values: { status: "Vacant", name: "Unit " + (r.units.length + 1) }, onSubmit: units.add }); };
  var editUnit = function (u) { openForm({ title: "Edit unit", fields: UNIT_FIELDS, values: u, onSubmit: function (v) { units.edit(u.id, v); }, onDelete: function () { units.del(u.id); } }); };
  var addIncome = function (u) {
    u = u || r.units[0];
    openForm({
      title: "Record income",
      fields: [
        { k: "unitId", label: "Unit", type: "select", options: r.units.map(function (x) { return { value: x.id, label: x.name + (x.tenant ? " · " + x.tenant : "") }; }) },
        { k: "type", label: "Type", type: "select", options: ["Rent", "Late fee", "Pet fee", "Utility reimbursement", "Other"] },
        { k: "amount", label: "Amount", type: "money", required: true },
        { k: "date", label: "Date received", type: "date" },
        { k: "note", label: "Note", full: true },
      ],
      values: { unitId: u && u.id, type: "Rent", amount: u && u.rent, date: today() },
      onSubmit: income.add,
    });
  };
  var recordAll = function () {
    var occ = r.units.filter(function (u) { return u.status === "Occupied"; });
    S.update(function () { occ.forEach(function (u) { fresh(p.id).rental.income.push({ id: uid(), date: today(), unitId: u.id, amount: u.rent, type: "Rent", note: "" }); }); });
    toast("Recorded " + occ.length + " rent payment" + (occ.length === 1 ? "" : "s") + " · " + money(sum(occ, "rent")));
  };
  return (
    <>
      <StatRow>
        <Stat label="Gross rent / mo" value={money(c.gross)} sub={r.units.length + " unit" + (r.units.length === 1 ? "" : "s")} />
        <Stat label="Occupancy" value={pct(c.occupancy, 0)} sub={money(c.occupiedRent) + " in place"} color={c.occupancy < 1 ? B.warn : B.pos} />
        <Stat label="Collected this month" value={money(c.collectedMonth)} sub={money(c.collected) + " lifetime"} />
        <Stat label="Deposits held" value={money(sum(r.units, "deposit"))} sub="Keep in separate account" />
      </StatRow>
      <SectionLabel action={<><Btn small icon="check" onClick={recordAll}>Record this month’s rent</Btn><Btn small primary icon="plus" onClick={addUnit}>Add unit</Btn></>}>Units ({r.units.length})</SectionLabel>
      <div className="xt-cards" style={{ marginBottom: 12 }}>
        {r.units.map(function (u, i) {
          var lease = u.leaseEnd ? daysBetween(today(), u.leaseEnd) : null;
          return (
            <div key={u.id} className="card card-hover reveal" style={{ "--i": i, padding: 20, cursor: "pointer" }} onClick={function () { editUnit(u); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 15, color: B.white }}>{u.name}</span><Pill>{u.status}</Pill></div>
              <div className="num" style={{ fontSize: 28, lineHeight: "34px", color: B.white, marginTop: 10 }}>{money(+u.rent || 0)}<span style={{ fontSize: 13, color: B.grayMuted }}> /mo</span></div>
              <div style={subStyle}>{u.beds || 0} bd · {u.baths || 0} ba{u.sqft ? " · " + num(u.sqft) + " sqft · " + money(u.rent / u.sqft, true) + "/sqft" : ""}</div>
              <div style={{ marginTop: 10 }}>
                <Row label="Tenant" value={u.tenant || "—"} />
                <Row label="Lease ends" value={u.leaseEnd ? fmtDate(u.leaseEnd) : "—"} color={lease != null && lease < 60 ? B.warn : undefined} />
              </div>
              {lease != null && <div style={{ marginTop: 6 }}><Bar value={1 - lease / Math.max(1, daysBetween(u.leaseStart, u.leaseEnd))} color={lease < 60 ? B.warn : undefined} /></div>}
              <div style={{ marginTop: 14 }} onClick={function (e) { e.stopPropagation(); }}><Btn small icon="dollar" style={{ width: "100%" }} onClick={function () { addIncome(u); }}>Record payment</Btn></div>
            </div>
          );
        })}
        <button type="button" className="card card-hover reveal xt-new-card" style={{ "--i": r.units.length, minHeight: 220 }} onClick={addUnit}>
          <span style={{ width: 36, height: 36, borderRadius: 8, display: "grid", placeItems: "center", background: B.solar, color: "#0c0a08" }}><Icon name="plus" size={18} /></span>
          <span style={{ fontSize: 14, color: B.white }}>Add a unit</span>
        </button>
      </div>
      <Grid cols="21">
        <Panel flush title="Income ledger" action={<Btn small icon="plus" onClick={function () { addIncome(); }}>Record income</Btn>}>
          <Table minWidth={480} head={["Date", "Unit", "Type", { t: "Amount", r: true }, ""]}>
            {ledger.length ? ledger.map(function (x) {
              var u = r.units.find(function (y) { return y.id === x.unitId; });
              return (
                <tr key={x.id}>
                  <td style={{ color: B.grayMuted }}>{fmtDate(x.date)}</td>
                  <td>{u ? u.name : "—"}{u && u.tenant ? <span style={{ color: B.grayMuted }}> · {u.tenant}</span> : null}</td>
                  <td>{x.type}</td>
                  <td className="r num">{money(x.amount)}</td>
                  <td className="r"><button type="button" className="xt-icon-btn" title="Delete" onClick={function () { income.del(x.id); }}><Icon name="trash" size={14} /></button></td>
                </tr>
              );
            }) : <tr><td colSpan={5}><Empty title="No income recorded" text="Record rent as it comes in to track collections." /></td></tr>}
          </Table>
        </Panel>
        <Panel title="Operating expenses" sub="Monthly">
          <FormGrid>
            <Bound p={p} path="rental.opex.taxes" label="Property taxes" prefix="$" />
            <Bound p={p} path="rental.opex.insurance" label="Insurance" prefix="$" />
            <Bound p={p} path="rental.opex.utilities" label="Owner utilities" prefix="$" />
            <Bound p={p} path="rental.opex.hoa" label="HOA" prefix="$" />
            <Bound p={p} path="rental.opex.mgmtPct" label="Management" type="number" suffix="%" />
            <Bound p={p} path="rental.opex.vacancyPct" label="Vacancy" type="number" suffix="%" />
            <Bound p={p} path="rental.opex.capexPct" label="CapEx reserve" type="number" suffix="%" />
            <Bound p={p} path="rental.opex.repairsPct" label="Repairs" type="number" suffix="%" />
          </FormGrid>
          <div style={{ marginTop: 18 }}>
            <Row label="Gross scheduled rent" value={money(c.gross)} />
            <Row label="Vacancy allowance" value={"−" + money(c.vacancy)} />
            <Row label="Operating expenses" value={"−" + money(c.opex)} />
            <Row total label="NOI" value={money(c.noi)} />
            <Row label="Debt service (refi)" value={"−" + money(c.payment)} />
            <Row total label="Cash flow" value={money(c.cashflow)} color={c.cashflow >= 0 ? B.pos : B.neg} />
            <Row label="Expense ratio" value={pct(c.gross ? c.opex / c.gross : 0, 0)} />
          </div>
        </Panel>
      </Grid>
    </>
  );
}

// ====================================================================
function Slider({ p, path, label, min, max, step, fmt }) {
  var v = +getPath(p, path) || 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, color: B.grayText, letterSpacing: 0.18, textTransform: "uppercase" }}>{label}</span>
        <span className="num" style={{ fontSize: 14, color: B.white }}>{fmt === "money" ? money(v) : v + "%"}</span>
      </div>
      <input type="range" className="xt-range" min={min} max={max} step={step} value={v} onChange={function (e) { setField(p, path, +e.target.value); }} style={{ "--p": ((v - min) / (max - min)) * 100 + "%" }} />
    </div>
  );
}

function RefiTab({ p, c }) {
  var rf = p.refi;
  var arv = +p.purchase.arv || +rf.appraisal || 200000;
  var setDone = function (on) {
    S.update(function () { var pp = fresh(p.id); pp.refi.done = on; if (on) pp.stage = Math.max(pp.stage, 3); });
    toast(on ? "Refinance marked closed — nice work" : "Refinance reopened");
  };
  return (
    <Grid>
      <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
        <Panel i={1} title="Model the refinance" sub="Drag to see the outcome update">
          <div style={{ display: "grid", gap: 22 }}>
            <Slider p={p} path="refi.appraisal" label="Appraised value" min={Math.round((arv * 0.8) / 1000) * 1000} max={Math.round((arv * 1.2) / 1000) * 1000} step={1000} fmt="money" />
            <Slider p={p} path="refi.ltv" label="Loan-to-value" min={50} max={85} step={1} />
            <Slider p={p} path="refi.rate" label="Interest rate" min={4} max={11} step={0.125} />
          </div>
        </Panel>
        <Panel i={2} title="Loan details">
          <FormGrid>
            <Bound p={p} path="refi.lender" label="Lender" type="text" />
            <Bound p={p} path="refi.termYears" label="Term" type="number" suffix="yrs" />
            <Bound p={p} path="refi.closingCosts" label="Refi closing costs" prefix="$" />
            <Bound p={p} path="refi.date" label="Target closing date" type="date" />
            <Bound p={p} path="refi.seasoningMonths" label="Seasoning required" type="number" suffix="mo" hint="Months from purchase before lender uses appraised value" />
            <div style={{ alignSelf: "center" }}><Check checked={rf.done} onChange={setDone}>Refinance closed</Check></div>
          </FormGrid>
        </Panel>
      </div>
      <Panel i={3} title="Refi outcome" sub="Updates as you drag">
        <div className="xt-mini2">
          <div><div style={labelStyle}>Cash back to you at refi</div><div className="num" style={{ fontSize: 32, lineHeight: "38px", marginTop: 4, color: c.cashOut >= 0 ? B.pos : B.neg }}>{money(c.cashOut)}</div></div>
          <div><div style={labelStyle}>Cash left in deal</div><div className="num" style={{ fontSize: 32, lineHeight: "38px", marginTop: 4, color: B.white }}>{money(Math.max(0, c.cashLeftIn))}</div></div>
        </div>
        <div style={{ marginTop: 16 }}><Bar value={c.recovered} height={12} color={c.recovered >= 1 ? B.pos : undefined} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: B.grayMuted, marginTop: 6 }}>
          <span>{pct(Math.max(0, c.recovered), 0)} of {money(c.totalCashIn)} recovered</span>
          <span>{c.recovered >= 1 ? "Infinite return" : money(Math.max(0, c.cashLeftIn)) + " still working"}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <Row label="New loan amount" value={money(c.newLoan)} />
          <Row label="Monthly P&I" value={money(c.payment)} />
          <Row label="Hard money payoff" value={money(c.payoff)} />
          <Row total label="Monthly cash flow" value={money(c.cashflow)} color={c.cashflow >= 0 ? B.pos : B.neg} />
          <Row label="DSCR" value={c.dscr.toFixed(2) + "x"} color={c.dscr >= 1.2 ? B.pos : B.warn} />
          <Row label="Cash-on-cash" value={Number.isFinite(c.coc) ? pct(c.coc) : "∞"} />
          <Row label="Equity left in property" value={money(c.equity)} />
          <Row label="Max loan for 1.20x DSCR" value={money(maxLoanForDscr(c.noi, +rf.rate || 0, +rf.termYears || 30, 1.2))} />
        </div>
      </Panel>
    </Grid>
  );
}

// ====================================================================
function InputsTab({ p, c, onBack }) {
  var flip = p.type === "flip";
  var rows = flip
    ? [["All-in cost", money(c.allIn)], ["Cash needed (after loan)", money(c.projCash)], ["Projected profit", money(c.profit), tone(c.profit >= 0)], ["ROI", pct(c.roi)], ["70% rule MAO", money(c.mao), +p.purchase.price <= c.mao ? B.pos : B.warn], ["Monthly carry", money(c.holdingMonthly)]]
    : [["All-in cost", money(c.allIn)], ["% of ARV", pct(c.rule75), c.rule75 <= 0.75 ? B.pos : B.warn], ["Cash left in after refi", money(Math.max(0, c.cashLeftIn))], ["Monthly cash flow", money(c.cashflow), tone(c.cashflow >= 0)], ["Cash-on-cash", Number.isFinite(c.coc) ? pct(c.coc) : "∞"], ["Monthly carry (pre-refi)", money(c.holdingMonthly)]];
  var del = function () {
    openModal(function () {
      return (
        <div>
          <ModalHead title={"Delete " + p.name + "?"} sub="This removes the deal and all of its expenses, subs, draws and notes." />
          <ModalFoot>
            <Btn onClick={closeModal}>Cancel</Btn>
            <button type="button" className="btn" style={{ background: B.neg, color: "#fff", border: "1px solid transparent" }} onClick={function () {
              var before = S.snapshot();
              closeModal();
              onBack();
              S.update(function (s) { s.projects = s.projects.filter(function (x) { return x.id !== p.id; }); });
              toast("Deal deleted", { undo: function () { S.restore(before); } });
            }}>Delete deal</button>
          </ModalFoot>
        </div>
      );
    });
  };
  return (
    <div className="xt-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <Panel i={1} title="Property">
          <FormGrid>
            <Bound p={p} path="name" label="Deal name" type="text" full />
            <Bound p={p} path="address" label="Street address" type="text" />
            <Bound p={p} path="city" label="City, state ZIP" type="text" />
          </FormGrid>
        </Panel>
        <Panel i={2} title="Purchase">
          <FormGrid cols={3}>
            <Bound p={p} path="purchase.price" label="Purchase price" prefix="$" />
            <Bound p={p} path="purchase.closingCosts" label="Buyer closing costs" prefix="$" />
            <Bound p={p} path="purchase.date" label="Closing date" type="date" />
            <Bound p={p} path="purchase.arv" label="After-repair value" prefix="$" hint="From comps — drives the 70% / 75% rules" />
          </FormGrid>
        </Panel>
        <Panel i={3} title={flip ? "Financing" : "Acquisition financing"} sub={flip ? undefined : "Hard money / private"}>
          <FormGrid cols={3}>
            <Bound p={p} path="financing.lender" label="Lender" type="text" />
            <Bound p={p} path="financing.loanAmount" label="Loan at closing" prefix="$" />
            <Bound p={p} path="financing.holdback" label="Rehab holdback" prefix="$" hint="Drawn in stages" />
            <Bound p={p} path="financing.rate" label="Interest rate" type="number" suffix="%" hint="Interest-only on drawn balance" />
            <Bound p={p} path="financing.points" label="Points" type="number" suffix="pts" />
            <Bound p={p} path="financing.fees" label="Lender & doc fees" prefix="$" />
          </FormGrid>
        </Panel>
        <Panel i={4} title="Your capital">
          <FormGrid>
            <Bound p={p} path="cashReserves" label="Cash allocated to this deal" prefix="$" hint="Your down payment + reserves. Drives “funds remaining”." />
          </FormGrid>
        </Panel>
        <Panel i={5} title="Notes">
          <textarea className="field-input" value={p.notes || ""} placeholder="Comps, lender contacts, scope notes…" onChange={function (e) { setField(p, "notes", e.target.value); }} style={{ padding: "10px 12px", minHeight: 110, resize: "vertical", lineHeight: "20px" }} />
        </Panel>
        <Panel i={6}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 15, color: B.white }}>Delete this deal</div><div style={subStyle}>Removes all of its data. You can undo right after.</div></div>
            <button type="button" className="xt-link xt-danger" onClick={del}><Icon name="trash" size={13} />Delete deal</button>
          </div>
        </Panel>
      </div>
      <div className="sticky-col">
        <Panel i={2} title="Live summary">
          {rows.map(function (r) { return <Row key={r[0]} label={r[0]} value={r[1]} color={r[2]} />; })}
          <Row total label="Sources − uses today" value={money(c.fundsRemaining)} color={c.fundsRemaining < 0 ? B.neg : undefined} />
          <div style={{ ...subStyle, marginTop: 12 }}>{flip ? "Exit assumptions live on the Sale & profit tab." : "Rent and refi assumptions live on the Rent roll and Refinance tabs."}</div>
        </Panel>
      </div>
    </div>
  );
}
