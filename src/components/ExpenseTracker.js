"use client";
// Expenses tab: a flip & BRRRR rehab ledger, rendered with the hub's own
// components. Deals live in this browser's localStorage (see
// src/lib/expenses/store.js); export a backup to move them.
import { useState } from "react";
import * as S from "@/lib/expenses/store";
import { today } from "@/lib/expenses/util";
import { B, SERIES, subStyle, Btn, Icon, Field, FormGrid, Input, openModal, closeModal, toast, ModalHead, ModalFoot, OverlayHost } from "./expenses/kit";
import Overview from "./expenses/Overview";
import Deal from "./expenses/Deal";

export default function ExpenseTracker() {
  var st = S.useExpenseStore();
  var [view, setView] = useState({ id: null, tab: "overview" });

  if (!st) return <div style={{ color: B.grayMuted, padding: 20 }}>Loading expenses…</div>;

  var deal = view.id ? st.projects.find(function (p) { return p.id === view.id; }) : null;
  var open = function (id, tab) {
    setView({ id: id, tab: tab || "overview" });
    var el = document.getElementById("xt-top");
    var header = document.querySelector(".app-header");
    if (el) {
      var top = el.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 24;
      if (window.scrollY > top) window.scrollTo({ top: top });
    }
  };
  var newDeal = function (type) { openNewDeal(type, function (id) { open(id, "inputs"); }); };

  return (
    <div id="xt-top">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid " + B.grayBorder }}>
        <div className="nav-scroll" style={{ minWidth: 0, flex: "1 1 320px" }}>
          <div style={{ display: "flex", gap: 6, width: "max-content" }}>
            <button type="button" className="chip" data-active={!deal} onClick={function () { setView({ id: null, tab: "overview" }); }} style={{ padding: "7px 12px", fontSize: 13 }}>All deals</button>
            {st.projects.map(function (p, i) {
              return (
                <button key={p.id} type="button" className="chip" data-active={deal && deal.id === p.id} onClick={function () { open(p.id); }} style={{ padding: "7px 12px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <i style={{ width: 8, height: 8, borderRadius: 2, background: SERIES[i % SERIES.length], border: "1px solid " + B.grayBorder }} />{p.name}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="icon-btn xt-x" title="Backup & settings" aria-label="Backup & settings" onClick={openSettings}><Icon name="download" size={16} /></button>
          <Btn primary icon="plus" onClick={function () { newDeal("flip"); }}>New deal</Btn>
        </div>
      </div>

      {deal
        ? <Deal key={deal.id} p={deal} tab={view.tab} setTab={function (t) { setView({ id: deal.id, tab: t }); }} onBack={function () { setView({ id: null, tab: "overview" }); }} onOpen={open} />
        : <Overview onOpen={open} onNewDeal={newDeal} />}

      <OverlayHost />
    </div>
  );
}

// ---------- new deal ----------
function NewDealForm({ initialType, onCreated }) {
  var [t, setT] = useState(initialType || "flip");
  var [v, setV] = useState({ name: "", address: "", city: "", price: "", arv: "", date: today() });
  var set = function (k) { return function (x) { setV(function (cur) { return { ...cur, [k]: x }; }); }; };
  var types = [
    { k: "flip", icon: "hammer", title: "Fix & flip", text: "Buy, renovate, sell. Track rehab, holding costs and projected profit." },
    { k: "brrrr", icon: "repeat", title: "BRRRR rental", text: "Buy, rehab, rent, refinance, repeat. Track rent roll and cash left in." },
  ];
  return (
    <form onSubmit={function (e) {
      e.preventDefault();
      var p = S.newProject({ type: t, name: v.name.trim(), address: v.address.trim(), city: v.city.trim(), price: v.price, arv: v.arv, date: v.date || today() });
      S.update(function (s) { s.projects.push(p); });
      closeModal();
      toast("Deal created — set up financing and budget next");
      onCreated(p.id);
    }}>
      <ModalHead title="Start a new deal" sub="You can fill in financing, budget and the rest after it’s created." />
      <div style={{ padding: "20px 24px 0" }}>
        <div className="xt-mini2" style={{ marginBottom: 18 }}>
          {types.map(function (o) {
            var on = t === o.k;
            return (
              <button key={o.k} type="button" className="card" onClick={function () { setT(o.k); }}
                style={{ textAlign: "left", padding: 16, cursor: "pointer", font: "inherit", color: "inherit", borderColor: on ? "var(--b-white)" : undefined, boxShadow: on ? "0 0 0 3px var(--b-green-glow)" : undefined }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: on ? B.solar : B.subtle, color: on ? "#0c0a08" : B.white, marginBottom: 10 }}><Icon name={o.icon} size={16} /></span>
                <span style={{ display: "block", fontSize: 15, color: B.white }}>{o.title}</span>
                <span style={{ display: "block", ...subStyle, marginTop: 2 }}>{o.text}</span>
              </button>
            );
          })}
        </div>
        <FormGrid>
          <Field label="Deal name" full><Input value={v.name} onChange={set("name")} required placeholder="e.g. Oak Street Ranch" autoFocus /></Field>
          <Field label="Street address"><Input value={v.address} onChange={set("address")} placeholder="123 Main St" /></Field>
          <Field label="City, state ZIP"><Input value={v.city} onChange={set("city")} placeholder="Albany, NY 12203" /></Field>
          <Field label="Purchase price"><Input value={v.price} onChange={set("price")} type="money" prefix="$" required /></Field>
          <Field label="After-repair value (ARV)"><Input value={v.arv} onChange={set("arv")} type="money" prefix="$" /></Field>
          <Field label="Purchase / closing date"><Input value={v.date} onChange={set("date")} type="date" /></Field>
        </FormGrid>
      </div>
      <ModalFoot>
        <Btn onClick={closeModal}>Cancel</Btn>
        <Btn primary type="submit" icon="arrow">Create deal</Btn>
      </ModalFoot>
    </form>
  );
}
function openNewDeal(type, onCreated) {
  openModal(function () { return <NewDealForm initialType={type} onCreated={onCreated} />; }, { wide: true });
}

// ---------- backup & settings ----------
function exportBackup() {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S.getState(), null, 2)], { type: "application/json" }));
  a.download = "investor-hub-expenses-" + today() + ".json";
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast("Backup downloaded");
}
function importBackup() {
  var inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json,.json";
  inp.onchange = async function () {
    try {
      var data = JSON.parse(await inp.files[0].text());
      if (!Array.isArray(data.projects)) throw new Error("bad file");
      var before = S.snapshot();
      S.replaceState(data);
      toast("Imported " + data.projects.length + " deals", { undo: function () { S.restore(before); } });
    } catch (e) { toast("That file isn’t an expense tracker backup"); }
  };
  inp.click();
}
function openSettings() {
  var destructive = function (fn, msg) {
    return function () { var before = S.snapshot(); fn(); closeModal(); toast(msg, { undo: function () { S.restore(before); } }); };
  };
  openModal(function () {
    return (
      <div>
        <ModalHead title="Backup & settings" sub="Deals are stored in this browser only. Export a backup to move them to another device." />
        <div style={{ padding: "20px 24px 0", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn icon="download" onClick={function () { exportBackup(); closeModal(); }}>Export backup</Btn>
            <Btn icon="upload" onClick={function () { closeModal(); importBackup(); }}>Import backup</Btn>
          </div>
          <div className="xt-callout" style={{ marginTop: 10 }}>
            <div style={{ color: B.white, marginBottom: 2 }}>Danger zone</div>
            Reset restores the two sample deals. Clear removes every deal. Both can be undone right after.
          </div>
        </div>
        <ModalFoot>
          <button type="button" className="xt-link xt-danger" style={{ marginRight: "auto" }} onClick={destructive(S.clearAll, "All deals cleared")}><Icon name="trash" size={13} />Clear all deals</button>
          <Btn icon="refresh" onClick={destructive(S.resetDemo, "Demo data restored")}>Reset demo data</Btn>
        </ModalFoot>
      </div>
    );
  });
}
