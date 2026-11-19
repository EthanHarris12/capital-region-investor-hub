"use client";
import { useState } from "react";
import { getState, FLIP_STAGES, BRRRR_STAGES } from "@/lib/expenses/store";
import { portfolio } from "@/lib/expenses/calc";
import { alertsFor } from "@/lib/expenses/alerts";
import { money, compact, pct, fmtDate, relDays, today, addDays } from "@/lib/expenses/util";
import { B, SERIES, labelStyle, subStyle, Stat, StatRow, Panel, Grid, SectionLabel, Pill, Bar, Segmented, Icon, AlertList, Empty } from "./kit";

export default function Overview({ onOpen, onNewDeal }) {
  var st = getState();
  var [filter, setFilter] = useState("all");
  var pf = portfolio(st.projects);
  var equity = pf.value - pf.debt;
  var alerts = pf.rows.flatMap(function (r) { return alertsFor(r.p, r.c); });
  var shown = pf.rows.filter(function (r) { return filter === "all" || r.p.type === filter; });
  var colorOf = function (p) { return SERIES[st.projects.indexOf(p) % SERIES.length]; };

  var feed = st.projects.flatMap(function (p) { return p.expenses.map(function (e) { return { e: e, p: p }; }); })
    .sort(function (a, b) { return b.e.date.localeCompare(a.e.date); }).slice(0, 8);
  var upcoming = st.projects.flatMap(function (p) { return p.milestones.filter(function (m) { return !m.done && m.date >= today() && m.date <= addDays(45); }).map(function (m) { return { m: m, p: p }; }); })
    .sort(function (a, b) { return a.m.date.localeCompare(b.m.date); }).slice(0, 6);
  var stackMax = Math.max.apply(null, pf.rows.map(function (r) { return r.c.cashInvested + r.c.loanBalance; }).concat([1]));

  return (
    <div>
      <SectionLabel>Portfolio summary · {pf.flips.length} flip{pf.flips.length === 1 ? "" : "s"}, {pf.rentals.length} rental{pf.rentals.length === 1 ? "" : "s"}</SectionLabel>
      <StatRow style={{ marginBottom: 32 }}>
        <Stat i={1} label="Capital deployed" value={money(pf.cashInvested)} sub={"Your cash across " + st.projects.length + " deals"} />
        <Stat i={2} label="Portfolio equity" value={money(equity)} sub={compact(pf.value) + " value · " + compact(pf.debt) + " debt"} color={B.pos} />
        <Stat i={3} label="Projected flip profit" value={money(pf.projProfit)} sub="Net of all costs" color={pf.projProfit >= 0 ? B.pos : B.neg} />
        <Stat i={4} label="Rental cash flow" value={money(pf.monthlyCashflow)} sub="Per month after refi debt service" color={pf.monthlyCashflow >= 0 ? B.pos : B.neg} />
      </StatRow>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 10, lineHeight: "22px", color: B.white, textTransform: "uppercase", letterSpacing: 0.18 }}>Deals ({shown.length})</div>
        <Segmented value={filter} onChange={setFilter} options={[{ key: "all", label: "All" }, { key: "flip", label: "Flips" }, { key: "brrrr", label: "BRRRR" }]} />
      </div>
      <div className="xt-cards" style={{ marginBottom: 32 }}>
        {shown.map(function (r, i) { return <DealCard key={r.p.id} p={r.p} c={r.c} i={i} color={colorOf(r.p)} onOpen={onOpen} />; })}
        <button type="button" className="card card-hover reveal xt-new-card" style={{ "--i": shown.length }} onClick={function () { onNewDeal(filter === "brrrr" ? "brrrr" : "flip"); }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, display: "grid", placeItems: "center", background: B.solar, color: "#0c0a08" }}><Icon name="plus" size={18} /></span>
          <span style={{ fontSize: 14, color: B.white }}>Add a deal</span>
          <span style={subStyle}>Fix &amp; flip or BRRRR rental</span>
        </button>
      </div>

      <Grid cols="21">
        <Panel title="Capital stack by deal" sub="Your cash vs. borrowed funds deployed to date" i={2}>
          {pf.rows.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {pf.rows.map(function (r, i) {
                return (
                  <div key={r.p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: B.white }}>{r.p.name}</span>
                      <span className="num" style={{ color: B.grayText }}>{money(r.c.cashInvested + r.c.loanBalance)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 2, height: 10 }}>
                      <div className="bar-grow" title={"Your cash · " + money(r.c.cashInvested)} style={{ "--i": i, width: (r.c.cashInvested / stackMax) * 100 + "%", background: B.accent, borderRadius: 99 }} />
                      <div className="bar-grow" title={"Loan + draws · " + money(r.c.loanBalance)} style={{ "--i": i, width: (r.c.loanBalance / stackMax) * 100 + "%", background: "var(--x-cost)", borderRadius: 99 }} />
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 11, color: B.grayMuted, marginTop: 5 }}>
                      <span>Cash {money(r.c.cashInvested)}</span><span>Loan + draws {money(r.c.loanBalance)}</span><span>Funds remaining {money(r.c.fundsRemaining)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty title="No deals yet" text="Add a flip or BRRRR to start tracking." />}
        </Panel>
        <Panel title={<span>Needs attention <span className="num" style={{ color: alerts.some(function (a) { return a.level === "bad"; }) ? B.neg : B.grayMuted, fontSize: 13 }}>{alerts.length}</span></span>} i={3}>
          <AlertList alerts={alerts} limit={7} onOpen={function (a) { onOpen(a.dealId, a.tab); }} />
        </Panel>
      </Grid>

      <Grid cols="21">
        <Panel title="Recent spend" sub="Across all deals" i={4}>
          {feed.length ? feed.map(function (f) {
            return (
              <button key={f.e.id} type="button" className="xt-row-btn" onClick={function () { onOpen(f.p.id, "expenses"); }} style={{ gridTemplateColumns: "10px minmax(0,1fr) auto" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, marginTop: 7, background: colorOf(f.p), border: "1px solid " + B.grayBorder }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, color: B.white }}>{f.e.vendor}</span>
                  <span style={{ display: "block", ...subStyle }}>{f.e.category} · {f.p.name} · {fmtDate(f.e.date, false)}</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className="num" style={{ display: "block", fontSize: 14, color: B.white }}>{money(f.e.amount)}</span>
                  {f.e.status !== "Paid" && <Pill>Pending</Pill>}
                </span>
              </button>
            );
          }) : <Empty title="No expenses yet" text="Logged expenses show up here." />}
        </Panel>
        <Panel title="Coming up" sub="Next 45 days" i={5}>
          {upcoming.length ? upcoming.map(function (u) {
            return (
              <button key={u.m.id} type="button" className="xt-row-btn" onClick={function () { onOpen(u.p.id, "timeline"); }} style={{ gridTemplateColumns: "40px minmax(0,1fr)" }}>
                <span style={{ border: "1px solid " + B.grayBorder, borderRadius: 6, textAlign: "center", padding: "3px 0", lineHeight: "13px" }}>
                  <span style={{ display: "block", ...labelStyle, fontSize: 9 }}>{new Date(u.m.date + "T00:00").toLocaleDateString("en-US", { month: "short" })}</span>
                  <span className="num" style={{ display: "block", fontSize: 15, lineHeight: "18px", color: B.white }}>{+u.m.date.slice(8)}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, color: B.white }}>{u.m.name}</span>
                  <span style={{ display: "block", ...subStyle }}>{u.p.name} · {relDays(u.m.date)}</span>
                </span>
              </button>
            );
          }) : <Empty title="Nothing scheduled" text="Upcoming milestones appear here." />}
        </Panel>
      </Grid>
    </div>
  );
}

function DealCard({ p, c, i, color, onOpen }) {
  var stages = p.type === "flip" ? FLIP_STAGES : BRRRR_STAGES;
  var nums = p.type === "flip"
    ? [["Projected profit", compact(c.profit), c.profit >= 0 ? B.pos : B.neg], ["Cash in", compact(c.cashInvested)], ["ROI", pct(c.roi, 0)]]
    : [["Cash flow / mo", compact(c.cashflow), c.cashflow >= 0 ? B.pos : B.neg], ["Cash left in", compact(Math.max(0, c.cashLeftIn))], ["Recovered", pct(c.recovered, 0)]];
  return (
    <button type="button" className="card card-hover reveal xt-deal-card" style={{ "--i": i }} onClick={function () { onOpen(p.id); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: color, border: "1px solid " + B.grayBorder }} />
          <span style={labelStyle}>{p.type === "flip" ? "Fix & flip" : "BRRRR"}</span>
        </span>
        <Pill t={p.stage >= stages.length - 1 ? "good" : "ink"}>{stages[p.stage] || stages[0]}</Pill>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 18, lineHeight: "24px", color: B.white }}>{p.name}</div>
        <div style={subStyle}>{p.address}{p.city ? ", " + p.city : ""}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, margin: "16px 0" }}>
        {nums.map(function (n) {
          return <div key={n[0]}><div style={{ ...labelStyle, fontSize: 9.5 }}>{n[0]}</div><div className="num" style={{ fontSize: 16, color: n[2] || B.white, marginTop: 2 }}>{n[1]}</div></div>;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: B.grayMuted, marginBottom: 6 }}>
        <span>Rehab {money(c.rehabSpent)} of {money(c.rehabBudget)}</span><span className="num">{pct(c.budgetUsed, 0)}</span>
      </div>
      <Bar value={c.budgetUsed} i={i} />
    </button>
  );
}
