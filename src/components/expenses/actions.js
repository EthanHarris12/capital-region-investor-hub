"use client";
// Mutations shared by the deal views: list CRUD with undo, and the
// schema-driven forms for each record type.
import * as S from "@/lib/expenses/store";
import { uid, today } from "@/lib/expenses/util";
import { openForm, toast } from "./kit";

export const fresh = (id) => S.getProject(id);
export const getPath = (o, path) => path.split(".").reduce((a, k) => a?.[k], o);
export const setPath = (o, path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

export function crud(p, key, label) {
  const list = () => getPath(fresh(p.id), key);
  return {
    add: (item) => { S.update(() => list().push({ id: uid(), ...item })); toast(`${label} added`); },
    edit: (id, vals) => { S.update(() => Object.assign(list().find((x) => x.id === id), vals)); toast(`${label} updated`); },
    del: (id) => {
      const before = S.snapshot();
      S.update(() => { const l = list(); l.splice(l.findIndex((x) => x.id === id), 1); });
      toast(`${label} deleted`, { undo: () => S.restore(before) });
    },
  };
}

// Edit one field of a deal in place (used by the always-visible inputs).
export const setField = (p, path, v) => S.update(() => setPath(fresh(p.id), path, v));

const categories = (p) => [...new Set([...p.budget.map((b) => b.category), ...S.DEFAULT_CATEGORIES])];
export const vendors = (p) => [...new Set([...p.subs.map((s) => s.name), ...S.getState().projects.flatMap((x) => x.expenses.map((e) => e.vendor))])];

export function openExpenseForm(p, values, id, after) {
  const c = crud(p, "expenses", "Expense");
  openForm({
    title: id ? "Edit expense" : "Log an expense", subtitle: p.name,
    values: { date: today(), status: "Paid", method: "Card", type: "Materials", receipt: true, category: p.budget[0]?.category, subId: "", ...values },
    fields: [
      { k: "vendor", label: "Paid to", list: vendors(p), required: true, placeholder: "Vendor or sub" },
      { k: "amount", label: "Amount", type: "money", required: true },
      { k: "date", label: "Date", type: "date", required: true },
      { k: "category", label: "Budget category", type: "select", options: categories(p) },
      { k: "type", label: "Type", type: "select", options: S.EXPENSE_TYPES },
      { k: "subId", label: "Subcontractor (optional)", type: "select", options: [{ value: "", label: "— None —" }, ...p.subs.map((s) => ({ value: s.id, label: `${s.name} · ${s.trade}` }))], hint: "Links the payment to their contract balance" },
      { k: "status", label: "Status", type: "select", options: ["Paid", "Pending"] },
      { k: "method", label: "Payment method", type: "select", options: S.PAY_METHODS },
      { k: "note", label: "Note", full: true, placeholder: "Invoice #, what it covered…" },
      { k: "receipt", label: "Receipt / invoice on file", type: "checkbox" },
    ],
    submit: id ? "Save changes" : "Log expense",
    onSubmit: (v) => {
      if (!v.amount) return false;
      v.subId = v.subId || null;
      if (v.subId && v.type === "Materials") v.type = "Subcontractor";
      const pp = fresh(p.id);
      if (pp.budget.every((b) => b.category !== v.category)) S.update(() => pp.budget.push({ id: uid(), category: v.category, amount: 0 }), false);
      if (after) S.update(after, false);
      if (id) c.edit(id, v); else c.add(v);
    },
    onDelete: id ? () => c.del(id) : null,
  });
}

export const SUB_FIELDS = [
  { k: "name", label: "Company / name", required: true },
  { k: "trade", label: "Trade", list: ["General contractor", "Demolition", "Roofing", "Plumbing", "Electrical", "HVAC", "Drywall / Paint", "Flooring", "Carpentry", "Masonry", "Landscaping", "Cleaning"] },
  { k: "contract", label: "Contract amount", type: "money" },
  { k: "status", label: "Status", type: "select", options: ["Scheduled", "In progress", "Complete", "On hold"] },
  { k: "phone", label: "Phone" },
  { k: "email", label: "Email" },
  { k: "insuranceExp", label: "Insurance (COI) expires", type: "date" },
  { k: "lienWaiver", label: "Lien waiver received", type: "checkbox" },
  { k: "w9", label: "W-9 on file", type: "checkbox" },
];
export const MAT_FIELDS = (p) => [
  { k: "item", label: "Item", required: true, full: true },
  { k: "room", label: "Room / area", list: ["Kitchen", "Bathrooms", "Whole house", "Exterior", "Basement", "Bedrooms", "Living areas"] },
  { k: "supplier", label: "Supplier", list: vendors(p) },
  { k: "qty", label: "Quantity", type: "number" },
  { k: "unitCost", label: "Unit cost", type: "money" },
  { k: "status", label: "Status", type: "select", options: ["Quoted", "Ordered", "Delivered", "Installed"] },
  { k: "date", label: "Date", type: "date" },
];
export const DRAW_FIELDS = [
  { k: "num", label: "Draw #", type: "number" },
  { k: "date", label: "Date requested", type: "date" },
  { k: "requested", label: "Amount requested", type: "money", required: true },
  { k: "funded", label: "Amount funded", type: "money" },
  { k: "status", label: "Status", type: "select", options: ["Requested", "Inspection", "Funded"] },
  { k: "note", label: "Scope / note", full: true },
];
export const UNIT_FIELDS = [
  { k: "name", label: "Unit", required: true, placeholder: "Unit 1" },
  { k: "status", label: "Status", type: "select", options: ["Occupied", "Vacant", "Notice", "Make-ready"] },
  { k: "beds", label: "Beds", type: "number" },
  { k: "baths", label: "Baths", type: "number" },
  { k: "sqft", label: "Sq ft", type: "number" },
  { k: "rent", label: "Monthly rent", type: "money", required: true },
  { k: "tenant", label: "Tenant" },
  { k: "deposit", label: "Security deposit", type: "money" },
  { k: "leaseStart", label: "Lease start", type: "date" },
  { k: "leaseEnd", label: "Lease end", type: "date" },
];
export const MS_FIELDS = [
  { k: "name", label: "Milestone", required: true, full: true },
  { k: "date", label: "Target date", type: "date" },
  { k: "done", label: "Completed", type: "checkbox" },
];
export const HOLD_FIELDS = [
  { k: "name", label: "Name", required: true, list: ["Property taxes", "Insurance", "Utilities", "HOA", "Lawn / snow", "Security / monitoring", "Storage / POD"] },
  { k: "monthly", label: "Per month", type: "money" },
];
