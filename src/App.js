/* eslint-disable react/jsx-no-undef */
import { useState, useEffect } from "react";

// ============================================
// CONFIG — Update these for your deployment
// ============================================
// Zapier webhook URL: Create a Zap with "Webhooks by Zapier" trigger → paste URL here
// The form will POST { name, email, phone, interests[], timestamp, source } to this URL
const WEBHOOK_URL = ""; // e.g. "https://hooks.zapier.com/hooks/catch/XXXXX/XXXXX/"

// Persistent lead storage (works in artifact preview + deployed site)
const STORAGE_KEY = "crih_lead";
const saveLead = async (lead) => {
  try {
    if (window.storage) { await window.storage.set(STORAGE_KEY, JSON.stringify(lead)); }
    else if (typeof localStorage !== "undefined") { localStorage.setItem(STORAGE_KEY, JSON.stringify(lead)); }
  } catch (e) { /* silent fail */ }
};
const loadLead = async () => {
  try {
    if (window.storage) { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : null; }
    else if (typeof localStorage !== "undefined") { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; }
  } catch (e) { /* silent fail */ }
  return null;
};
const sendToWebhook = async (lead) => {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, interests: Array.isArray(lead.interests) ? lead.interests.join(", ") : lead.interests, timestamp: new Date().toISOString(), source: "Capital Region Investor Hub" })
    });
  } catch (e) { /* silent fail — don't block user experience */ }
};

const B = { green: "#1b4812", greenLight: "#2a6b1a", greenDark: "#143a0d", navy: "#1c2b3d", navyDeep: "#141f2e", navyLight: "#243447", charcoal: "#272727", black: "#000000", white: "#ffffff", grayText: "#8a9bb0", grayMuted: "#5a6d82", grayBorder: "rgba(255,255,255,0.08)", greenGlow: "rgba(27,72,18,0.25)" };

// Niche.com 2026 Overall District Grades (verified from niche.com/k12)
const MARKET_DATA = {
  "Albany": { medianPrice: 245000, avgRent2Bed: 1500, avgRent3Bed: 1800, capRate: 7.8, daysOnMarket: 18, inventoryCount: 31, yoyAppreciation: 7.1, vacancyRate: 4.8, popGrowth: 0.3, medianHHIncome: 48200, walkScore: 68, schoolDistrict: "Albany City", schoolRating: "B-", description: "State capital with deep institutional tenant base. Government, healthcare, and university employment." },
  "Bethlehem": { medianPrice: 350000, avgRent2Bed: 1575, avgRent3Bed: 1925, capRate: 6.0, daysOnMarket: 25, inventoryCount: 12, yoyAppreciation: 5.2, vacancyRate: 3.1, popGrowth: 0.7, medianHHIncome: 89000, walkScore: 34, schoolDistrict: "Bethlehem Central", schoolRating: "A+", description: "Established suburban town south of Albany with low vacancy and consistent appreciation. Limited multifamily inventory trades at a premium." },
  "Clifton Park": { medianPrice: 385000, avgRent2Bed: 1650, avgRent3Bed: 2050, capRate: 5.7, daysOnMarket: 19, inventoryCount: 22, yoyAppreciation: 5.1, vacancyRate: 3.0, popGrowth: 1.8, medianHHIncome: 98500, walkScore: 28, schoolDistrict: "Shenendehowa", schoolRating: "A", description: "Suburban market with low vacancy and strong appreciation. Lower cap rates offset by high rent stability and consistent demand." },
  "Cohoes": { medianPrice: 185000, avgRent2Bed: 1200, avgRent3Bed: 1450, capRate: 8.9, daysOnMarket: 20, inventoryCount: 8, yoyAppreciation: 10.2, vacancyRate: 5.1, popGrowth: 0.5, medianHHIncome: 46500, walkScore: 64, schoolDistrict: "Cohoes City", schoolRating: "C+", description: "Emerging market with highest appreciation rate in the region. Walkable downtown revitalization." },
  "Colonie": { medianPrice: 305000, avgRent2Bed: 1500, avgRent3Bed: 1850, capRate: 6.8, daysOnMarket: 21, inventoryCount: 16, yoyAppreciation: 5.9, vacancyRate: 3.8, popGrowth: 0.9, medianHHIncome: 72000, walkScore: 45, schoolDistrict: "South Colonie", schoolRating: "A", description: "Retail and commercial corridor with stable residential demand. Strong suburban rental market with consistent occupancy." },
  "Delmar": { medianPrice: 365000, avgRent2Bed: 1600, avgRent3Bed: 1950, capRate: 5.8, daysOnMarket: 24, inventoryCount: 10, yoyAppreciation: 4.9, vacancyRate: 2.9, popGrowth: 0.6, medianHHIncome: 95000, walkScore: 38, schoolDistrict: "Bethlehem Central", schoolRating: "A+", description: "Bethlehem hamlet with limited but stable multifamily stock. Low vacancy and consistent appreciation." },
  "East Greenbush": { medianPrice: 285000, avgRent2Bed: 1450, avgRent3Bed: 1750, capRate: 7.2, daysOnMarket: 28, inventoryCount: 14, yoyAppreciation: 6.8, vacancyRate: 4.1, popGrowth: 1.2, medianHHIncome: 78500, walkScore: 42, schoolDistrict: "East Greenbush Central", schoolRating: "A", description: "Strong suburban demand, growing rental market with proximity to Albany employment centers." },
  "Guilderland": { medianPrice: 340000, avgRent2Bed: 1550, avgRent3Bed: 1900, capRate: 6.1, daysOnMarket: 22, inventoryCount: 13, yoyAppreciation: 5.5, vacancyRate: 3.4, popGrowth: 1.0, medianHHIncome: 86000, walkScore: 32, schoolDistrict: "Guilderland Central", schoolRating: "A", description: "Crossgates-adjacent suburb with strong retail employment base. Steady appreciation and low turnover." },
  "Latham": { medianPrice: 295000, avgRent2Bed: 1475, avgRent3Bed: 1800, capRate: 7.0, daysOnMarket: 20, inventoryCount: 11, yoyAppreciation: 6.2, vacancyRate: 3.6, popGrowth: 0.8, medianHHIncome: 74000, walkScore: 40, schoolDistrict: "North Colonie", schoolRating: "A-", description: "North Colonie hamlet with Route 9 commercial corridor. Strong rental demand from nearby employers and retail centers." },
  "Malta": { medianPrice: 395000, avgRent2Bed: 1700, avgRent3Bed: 2100, capRate: 5.5, daysOnMarket: 21, inventoryCount: 9, yoyAppreciation: 5.8, vacancyRate: 2.8, popGrowth: 2.4, medianHHIncome: 96000, walkScore: 24, schoolDistrict: "Ballston Spa", schoolRating: "B", description: "Fastest-growing town in the region with GlobalFoundries employment anchor. Low vacancy, newer housing stock, strong rent growth." },
  "Mechanicville": { medianPrice: 195000, avgRent2Bed: 1250, avgRent3Bed: 1500, capRate: 8.4, daysOnMarket: 19, inventoryCount: 6, yoyAppreciation: 9.4, vacancyRate: 4.6, popGrowth: 0.2, medianHHIncome: 49000, walkScore: 72, schoolDistrict: "Mechanicville", schoolRating: "C", description: "Compact walkable city with strong cashflow properties. Low entry point with rapid appreciation trajectory." },
  "Niskayuna": { medianPrice: 330000, avgRent2Bed: 1525, avgRent3Bed: 1875, capRate: 6.2, daysOnMarket: 23, inventoryCount: 8, yoyAppreciation: 5.3, vacancyRate: 3.2, popGrowth: 0.5, medianHHIncome: 88000, walkScore: 30, schoolDistrict: "Niskayuna Central", schoolRating: "A", description: "Suburban Schenectady County town with GE/Knolls employment proximity. Low vacancy and steady demand with limited multifamily supply." },
  "Rensselaer": { medianPrice: 195000, avgRent2Bed: 1300, avgRent3Bed: 1550, capRate: 8.3, daysOnMarket: 24, inventoryCount: 7, yoyAppreciation: 7.8, vacancyRate: 4.9, popGrowth: 0.4, medianHHIncome: 50200, walkScore: 55, schoolDistrict: "Rensselaer City", schoolRating: "C-", description: "Waterfront adjacency to Albany with Amtrak access. Under-the-radar investor market." },
  "Rotterdam": { medianPrice: 225000, avgRent2Bed: 1300, avgRent3Bed: 1550, capRate: 7.9, daysOnMarket: 23, inventoryCount: 15, yoyAppreciation: 7.3, vacancyRate: 4.5, popGrowth: 0.3, medianHHIncome: 58000, walkScore: 35, schoolDistrict: "Mohonasen", schoolRating: "C", description: "Schenectady suburb with affordable entry and solid rent-to-price ratios. Steady tenant demand." },
  "Saratoga Springs": { medianPrice: 425000, avgRent2Bed: 1800, avgRent3Bed: 2200, capRate: 5.9, daysOnMarket: 32, inventoryCount: 11, yoyAppreciation: 5.4, vacancyRate: 3.2, popGrowth: 2.1, medianHHIncome: 92000, walkScore: 58, schoolDistrict: "Saratoga Springs", schoolRating: "A", description: "Premium market with tourism overlay. Low vacancy, high rents, strong long-term appreciation play." },
  "Schenectady": { medianPrice: 195000, avgRent2Bed: 1250, avgRent3Bed: 1500, capRate: 8.6, daysOnMarket: 25, inventoryCount: 19, yoyAppreciation: 9.1, vacancyRate: 5.8, popGrowth: 0.1, medianHHIncome: 44800, walkScore: 62, schoolDistrict: "Schenectady City", schoolRating: "C", description: "Highest cap rates in the metro. Strong value-add opportunity market with rapid appreciation." },
  "Scotia": { medianPrice: 210000, avgRent2Bed: 1275, avgRent3Bed: 1525, capRate: 8.1, daysOnMarket: 21, inventoryCount: 5, yoyAppreciation: 8.0, vacancyRate: 4.3, popGrowth: 0.4, medianHHIncome: 53000, walkScore: 60, schoolDistrict: "Scotia-Glenville", schoolRating: "B-", description: "Village market with tight inventory and walkable core. Small multifamily stock trades quickly." },
  "Troy": { medianPrice: 215000, avgRent2Bed: 1350, avgRent3Bed: 1600, capRate: 8.1, daysOnMarket: 22, inventoryCount: 23, yoyAppreciation: 8.2, vacancyRate: 5.3, popGrowth: 0.8, medianHHIncome: 52000, walkScore: 71, schoolDistrict: "Troy City", schoolRating: "B", description: "Revitalizing urban core with strong multifamily density. RPI and Russell Sage drive rental demand." },
  "Waterford": { medianPrice: 220000, avgRent2Bed: 1275, avgRent3Bed: 1525, capRate: 7.8, daysOnMarket: 26, inventoryCount: 4, yoyAppreciation: 6.9, vacancyRate: 3.9, popGrowth: 0.3, medianHHIncome: 62000, walkScore: 45, schoolDistrict: "Waterford-Halfmoon", schoolRating: "C+", description: "Historic canal town with limited inventory. Stable rental demand supported by owner-occupant base." },
  "Watervliet": { medianPrice: 175000, avgRent2Bed: 1200, avgRent3Bed: 1400, capRate: 9.1, daysOnMarket: 18, inventoryCount: 9, yoyAppreciation: 10.5, vacancyRate: 5.4, popGrowth: -0.1, medianHHIncome: 43500, walkScore: 66, schoolDistrict: "Watervliet City", schoolRating: "C", description: "Lowest entry point in the metro with highest cap rates. Arsenal employment base. Strong cashflow market." },
};

const LAST_UPDATED = "March 2026";
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Bebas+Neue&display=swap');`;

const EMPIRE_LOGO = "data:image/png;base64,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";

function EmpireLogo({ size = 40 }) {
  return <img src={EMPIRE_LOGO} alt="Empire Real Estate Firm" style={{ height: size, width: "auto", display: "block" }} />;
}

const fmtC = (n) => { if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"; if (n >= 1e3) return "$" + (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + "k"; return "$" + n.toLocaleString(); };
const fmtP = (n) => n.toFixed(1) + "%";
const fmtD = (n) => "$" + Math.round(n).toLocaleString();

function StatCard({ label, value, sub, accent }) {
  return (<div style={{ background: B.navyLight, border: `1px solid ${B.grayBorder}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 400, color: accent || B.white, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0.5 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: B.grayMuted, marginTop: 2 }}>{sub}</div>}
  </div>);
}

function Field({ label, value, onChange, prefix, suffix, type = "number", placeholder, small, step }) {
  return (<div style={{ marginBottom: small ? 10 : 14, flex: small ? 1 : undefined, minWidth: small ? 120 : undefined }}>
    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{label}</label>
    <div style={{ position: "relative" }}>
      {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, fontSize: 13, fontWeight: 600 }}>{prefix}</span>}
      <input type={type} placeholder={placeholder} value={value} step={step}
        onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        style={{ width: "100%", padding: prefix ? "10px 12px 10px 26px" : suffix ? "10px 38px 10px 12px" : "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 8, color: B.white, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border 0.2s" }}
        onFocus={e => e.target.style.borderColor = B.green} onBlur={e => e.target.style.borderColor = "rgba(27,72,18,0.25)"} />
      {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, fontSize: 11, fontWeight: 600 }}>{suffix}</span>}
    </div>
  </div>);
}

const sLabel = (t) => <div style={{ fontSize: 11, fontWeight: 800, color: B.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>{t}</div>;
const pStyle = { background: B.navyLight, border: `1px solid ${B.grayBorder}`, borderRadius: 10, padding: 16, marginBottom: 14 };
const pH = (t) => <div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>{t}</div>;
const rw = (l, v, bold, pos) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: bold ? "1px solid rgba(27,72,18,0.2)" : "none", marginTop: bold ? 4 : 0, paddingTop: bold ? 6 : 4 }}>
  <span style={{ fontSize: 12, color: bold ? B.greenLight : B.grayText, fontWeight: bold ? 700 : 400 }}>{l}</span>
  <span style={{ fontSize: 12, fontWeight: bold ? 800 : 500, color: bold ? (pos !== undefined ? (pos ? "#4ade80" : "#ef4444") : B.white) : B.white }}>{v}</span>
</div>);

function StrategyToggle({ value, onChange }) {
  return (<div style={{ display: "flex", gap: 4, marginBottom: 18, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3 }}>
    {[["ltr", "Long-Term"], ["str", "Short-Term"], ["mtr", "Mid-Term"]].map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} style={{ flex: 1, padding: "8px 12px", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: "none", background: value === k ? B.green : "transparent", color: value === k ? B.white : B.grayMuted, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, transition: "all 0.2s" }}>{l}</button>
    ))}
  </div>);
}

// ============================================
// LEAD GATE
// ============================================
function LeadGate({ onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interests: [] });
  const [errors, setErrors] = useState({});
  const [vis, setVis] = useState(0);
  const validate = () => { const e = {}; if (!form.name.trim()) e.name = true; if (!form.email.includes("@")) e.email = true; if (form.phone.replace(/\D/g, "").length < 10) e.phone = true; if (form.interests.length === 0) e.interests = true; setErrors(e); return Object.keys(e).length === 0; };
  const toggleInterest = (v) => { setForm(prev => ({ ...prev, interests: prev.interests.includes(v) ? prev.interests.filter(i => i !== v) : [...prev.interests, v] })); };
  useEffect(() => { const t = setTimeout(() => setVis(1), 200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(170deg, ${B.navyDeep} 0%, ${B.navy} 40%, ${B.navyLight} 100%)`, fontFamily: "'DM Sans', sans-serif", padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 500, height: 500, background: `radial-gradient(circle, ${B.greenGlow} 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ maxWidth: 460, width: "100%", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}><EmpireLogo size={44} /></div>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: B.green, marginBottom: 8, fontWeight: 800 }}>Empire Real Estate Firm</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, fontWeight: 400, color: B.white, margin: 0, lineHeight: 1.05, letterSpacing: 2.5, marginBottom: 10 }}>CAPITAL REGION<br/>INVESTOR HUB</h1>
          <p style={{ color: B.grayText, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Multifamily deal analysis, market intelligence, and equity insights for the Capital District.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(27,72,18,0.2)", borderRadius: 14, padding: 28 }}>
          {[{ key: "name", label: "Full Name", type: "text", placeholder: "Your name" }, { key: "email", label: "Email", type: "email", placeholder: "you@email.com" }, { key: "phone", label: "Phone", type: "tel", placeholder: "(518) 555-0000" }].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ width: "100%", padding: "11px 14px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: errors[f.key] ? "1px solid #e74c3c" : "1px solid rgba(27,72,18,0.2)", borderRadius: 8, color: B.white, outline: "none", transition: "border 0.2s", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} onFocus={e => e.target.style.borderColor = B.green} onBlur={e => e.target.style.borderColor = errors[f.key] ? "#e74c3c" : "rgba(27,72,18,0.2)"} />
            </div>
          ))}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>I'm interested in... <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.7 }}>(select all that apply)</span></label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["exploring", "Exploring"], ["buying", "Buying"], ["scaling", "Scaling"], ["1031", "1031 Exchange"], ["portfolio", "Evaluating My Portfolio"]].map(([v, l]) => {
                const sel = form.interests.includes(v);
                return <button key={v} onClick={() => toggleInterest(v)} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: sel ? `1px solid ${B.green}` : errors.interests ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(27,72,18,0.15)", background: sel ? "rgba(27,72,18,0.2)" : "transparent", color: sel ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: "all 0.2s" }}>{sel ? "✓ " : ""}{l}</button>;
              })}
            </div>
          </div>
          <button onClick={() => { if (validate()) onSubmit(form); }} style={{ width: "100%", padding: "13px 24px", fontSize: 14, fontWeight: 700, background: B.green, color: B.white, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.8, textTransform: "uppercase", boxShadow: `0 4px 20px ${B.greenGlow}` }} onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.background = B.greenLight; }} onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.background = B.green; }}>Access Free Tools →</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}><p style={{ color: B.grayMuted, fontSize: 11, margin: 0 }}>Ethan Harris · Real Estate Salesperson · (518) 588-1122</p></div>
      </div>
    </div>
  );
}

// ============================================
// DEAL ANALYZER (LTR / STR / MTR)
// ============================================
function DealAnalyzer() {
  const [strategy, setStrategy] = useState("ltr");
  const [d, setD] = useState({
    address: "", units: 4, purchasePrice: 400000, downPct: 25, rate: 7.0, term: 30,
    grossRent: 5200, otherIncome: 0, vacancy: 5,
    adr: 150, occupancy: 65, cleaningFee: 85, turnoversPerMonth: 8, platformFeePct: 15, strOtherIncome: 0,
    mtrMonthlyRent: 2200, mtrUnits: 4, mtrVacancyWeeks: 2, mtrPlatformPct: 3, mtrOtherIncome: 0,
    furnishingTotal: 15000,
    maintenancePct: 5, capexPct: 5, management: 0,
    taxes: 6000, insurance: 2400, utilities: 0, otherExp: 0,
    lenderFees: 1, attorneyFees: 2000, titleFees: 3000
  });
  const u = (k) => (v) => setD({ ...d, [k]: v });

  const dp = d.purchasePrice * (d.downPct / 100);
  const loan = d.purchasePrice - dp;
  const mr = d.rate / 100 / 12;
  const tp = d.term * 12;
  const mtg = mr > 0 ? loan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : loan / tp;
  const annMtg = mtg * 12;

  const furnishing = strategy !== "ltr" ? d.furnishingTotal : 0;
  const lenderFeeDollars = loan * (d.lenderFees / 100);
  const closingCosts = lenderFeeDollars + d.attorneyFees + d.titleFees;
  const totalCashInvested = dp + furnishing + closingCosts;

  let gri, egi;
  if (strategy === "str") {
    const bookingRev = d.adr * (d.occupancy / 100) * 365;
    const cleanRev = d.cleaningFee * d.turnoversPerMonth * 12;
    gri = bookingRev + cleanRev + d.strOtherIncome * 12;
    egi = gri * (1 - d.platformFeePct / 100);
  } else if (strategy === "mtr") {
    const occMonths = 12 - (d.mtrVacancyWeeks / 4.33);
    gri = (d.mtrMonthlyRent * d.mtrUnits * occMonths) + d.mtrOtherIncome * 12;
    egi = gri * (1 - d.mtrPlatformPct / 100);
  } else {
    gri = (d.grossRent + d.otherIncome) * 12;
    egi = gri * (1 - d.vacancy / 100);
  }

  const maintenanceDollar = gri * (d.maintenancePct / 100);
  const capexDollar = gri * (d.capexPct / 100);
  const mgmtDollar = egi * (d.management / 100);
  const totExp = d.taxes + d.insurance + maintenanceDollar + capexDollar + mgmtDollar + d.utilities * 12 + d.otherExp * 12;
  const noi = egi - totExp;
  const cf = noi - annMtg;
  const cfDoor = cf / d.units / 12;
  const cap = (noi / d.purchasePrice) * 100;
  const coc = totalCashInvested > 0 ? (cf / totalCashInvested) * 100 : 0;
  const dscr = annMtg > 0 ? noi / annMtg : Infinity;
  const grm = gri > 0 ? d.purchasePrice / gri : 0;
  const expR = egi > 0 ? (totExp / egi) * 100 : 0;

  const gc = (m, v) => { if (m === "cap") return v >= 8 ? "#4ade80" : v >= 6 ? B.greenLight : "#ef4444"; if (m === "coc") return v >= 10 ? "#4ade80" : v >= 6 ? B.greenLight : "#ef4444"; if (m === "dscr") return v >= 1.25 ? "#4ade80" : v >= 1.0 ? B.greenLight : "#ef4444"; if (m === "cf") return v >= 200 ? "#4ade80" : v >= 100 ? B.greenLight : "#ef4444"; return B.white; };
  const proj = Array.from({ length: 5 }, (_, i) => { const y = i + 1; return { y, v: d.purchasePrice * Math.pow(1.04, y), n: noi * Math.pow(1.03, y), c: noi * Math.pow(1.03, y) - annMtg }; });

  return (
    <div>
      <StrategyToggle value={strategy} onChange={setStrategy} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ marginBottom: 18 }}>
            {sLabel("Property")}
            <Field label="Address" value={d.address} onChange={u("address")} type="text" placeholder="123 Main St, Troy NY" />
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Units" value={d.units} onChange={u("units")} small />
              <Field label="Purchase Price" value={d.purchasePrice} onChange={u("purchasePrice")} prefix="$" small step={1000} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            {sLabel("Financing")}
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Down %" value={d.downPct} onChange={u("downPct")} suffix="%" small />
              <Field label="Rate" value={d.rate} onChange={u("rate")} suffix="%" small step={0.1} />
              <Field label="Term" value={d.term} onChange={u("term")} suffix="yr" small />
            </div>
          </div>

          {strategy === "ltr" && <div style={{ marginBottom: 18 }}>{sLabel("Income (Monthly)")}<div style={{ display: "flex", gap: 10 }}><Field label="Gross Rent" value={d.grossRent} onChange={u("grossRent")} prefix="$" small /><Field label="Other" value={d.otherIncome} onChange={u("otherIncome")} prefix="$" small /><Field label="Vacancy" value={d.vacancy} onChange={u("vacancy")} suffix="%" small /></div></div>}

          {strategy === "str" && <div style={{ marginBottom: 18 }}>{sLabel("STR Revenue")}<div style={{ display: "flex", gap: 10 }}><Field label="Avg Daily Rate" value={d.adr} onChange={u("adr")} prefix="$" small /><Field label="Occupancy" value={d.occupancy} onChange={u("occupancy")} suffix="%" small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Cleaning Fee" value={d.cleaningFee} onChange={u("cleaningFee")} prefix="$" small /><Field label="Turnovers/mo" value={d.turnoversPerMonth} onChange={u("turnoversPerMonth")} small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Platform Fee" value={d.platformFeePct} onChange={u("platformFeePct")} suffix="%" small /><Field label="Other/mo" value={d.strOtherIncome} onChange={u("strOtherIncome")} prefix="$" small /></div><div style={{ fontSize: 9, color: B.grayMuted, marginTop: 2 }}>Revenue estimates comparable to AirDNA / Awning market data</div></div>}

          {strategy === "mtr" && <div style={{ marginBottom: 18 }}>{sLabel("MTR Revenue")}<div style={{ display: "flex", gap: 10 }}><Field label="Furnished Rent/Unit" value={d.mtrMonthlyRent} onChange={u("mtrMonthlyRent")} prefix="$" small /><Field label="# Units" value={d.mtrUnits} onChange={u("mtrUnits")} small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Vacancy Wks/Yr" value={d.mtrVacancyWeeks} onChange={u("mtrVacancyWeeks")} small /><Field label="Platform Fee" value={d.mtrPlatformPct} onChange={u("mtrPlatformPct")} suffix="%" small /></div><Field label="Other Income/mo" value={d.mtrOtherIncome} onChange={u("mtrOtherIncome")} prefix="$" /><div style={{ fontSize: 9, color: B.grayMuted, marginTop: 2 }}>Rates based on Furnished Finder, Airbnb 30+ day, and traveling professional demand</div></div>}

          {strategy !== "ltr" && <div style={{ marginBottom: 18 }}>{sLabel("Furnishing Costs")}<Field label="Total Furnishing Budget" value={d.furnishingTotal} onChange={u("furnishingTotal")} prefix="$" /><div style={{ fontSize: 9, color: B.grayMuted, marginTop: -8, marginBottom: 8 }}>One-time upfront cost included in total cash invested</div></div>}

          <div style={{ marginBottom: 18 }}>
            {sLabel("Expenses (Annual)")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Field label="Taxes" value={d.taxes} onChange={u("taxes")} prefix="$" small step={100} />
              <Field label="Insurance" value={d.insurance} onChange={u("insurance")} prefix="$" small step={100} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Field label="Maintenance %" value={d.maintenancePct} onChange={u("maintenancePct")} suffix="%" small />
              <Field label="CapEx %" value={d.capexPct} onChange={u("capexPct")} suffix="%" small />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Field label="Mgmt %" value={d.management} onChange={u("management")} suffix="%" small />
              <Field label="Utilities/mo" value={d.utilities} onChange={u("utilities")} prefix="$" small />
            </div>
            <Field label="Other Expenses/mo" value={d.otherExp} onChange={u("otherExp")} prefix="$" />
            <div style={{ fontSize: 9, color: B.grayMuted }}>Maintenance & CapEx calculated as % of gross income</div>
          </div>

          <div>
            {sLabel("Closing Costs")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Field label="Lender Fees %" value={d.lenderFees} onChange={u("lenderFees")} suffix="%" small step={0.1} />
              <Field label="Attorney" value={d.attorneyFees} onChange={u("attorneyFees")} prefix="$" small step={100} />
              <Field label="Title Fees" value={d.titleFees} onChange={u("titleFees")} prefix="$" small step={100} />
            </div>
            <div style={{ fontSize: 9, color: B.grayMuted }}>Included in total cash-to-close for CoC calculation</div>
          </div>
        </div>

        <div>
          {sLabel("Key Metrics")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <StatCard label="Cap Rate" value={fmtP(cap)} accent={gc("cap", cap)} />
            <StatCard label="Cash-on-Cash" value={fmtP(coc)} accent={gc("coc", coc)} sub="all-in basis" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <StatCard label="DSCR" value={dscr === Infinity ? "∞" : dscr.toFixed(2) + "x"} accent={gc("dscr", dscr)} />
            <StatCard label="$/Door/Mo" value={fmtD(cfDoor)} accent={gc("cf", cfDoor)} />
          </div>

          <div style={pStyle}>
            {pH("P&L — " + (strategy === "ltr" ? "Long-Term" : strategy === "str" ? "Short-Term" : "Mid-Term"))}
            {rw("Gross Revenue", fmtD(gri))}
            {strategy === "str" && rw("Platform Fees (" + d.platformFeePct + "%)", "(" + fmtD(gri * d.platformFeePct / 100) + ")")}
            {strategy === "mtr" && rw("Platform Fees (" + d.mtrPlatformPct + "%)", "(" + fmtD(gri * d.mtrPlatformPct / 100) + ")")}
            {strategy === "ltr" && rw("Vacancy (" + d.vacancy + "%)", "(" + fmtD(gri - egi) + ")")}
            {rw("Effective Gross Income", fmtD(egi))}
            {rw("Maintenance (" + d.maintenancePct + "%)", "(" + fmtD(maintenanceDollar) + ")")}
            {rw("CapEx (" + d.capexPct + "%)", "(" + fmtD(capexDollar) + ")")}
            {rw("Taxes + Insurance", "(" + fmtD(d.taxes + d.insurance) + ")")}
            {d.management > 0 && rw("Management (" + d.management + "%)", "(" + fmtD(mgmtDollar) + ")")}
            {(d.utilities > 0 || d.otherExp > 0) && rw("Utilities + Other", "(" + fmtD(d.utilities * 12 + d.otherExp * 12) + ")")}
            {rw("NOI", fmtD(noi), true)}
            {rw("Annual Debt Service", "(" + fmtD(annMtg) + ")")}
            {rw("Annual Cashflow", fmtD(cf), true, cf >= 0)}
          </div>

          <div style={pStyle}>
            {pH("Cash to Close")}
            {rw("Down Payment", fmtD(dp))}
            {rw("Lender Fees (" + d.lenderFees + "%)", fmtD(lenderFeeDollars))}
            {rw("Attorney Fees", fmtD(d.attorneyFees))}
            {rw("Title Fees", fmtD(d.titleFees))}
            {strategy !== "ltr" && rw("Furnishing", fmtD(furnishing))}
            {rw("Total Cash Invested", fmtD(totalCashInvested), true)}
          </div>

          <div style={pStyle}>
            {pH("Quick Stats")}
            {rw("Monthly Mortgage", fmtD(mtg))}
            {rw("GRM", grm.toFixed(1) + "x")}
            {rw("Expense Ratio", fmtP(expR))}
            {strategy !== "ltr" && rw("Monthly Revenue", fmtD(gri / 12))}
          </div>

          <div style={pStyle}>
            {pH("5-Year Projection")}
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 1fr", gap: "3px 10px", fontSize: 11 }}>
              <span style={{ color: B.grayMuted, fontWeight: 700 }}>Yr</span><span style={{ color: B.grayMuted, fontWeight: 700 }}>Value</span><span style={{ color: B.grayMuted, fontWeight: 700 }}>NOI</span><span style={{ color: B.grayMuted, fontWeight: 700 }}>Cashflow</span>
              {proj.map(p => (<React.Fragment key={p.y}><span style={{ color: B.grayText }}>{p.y}</span><span style={{ color: B.white }}>{fmtC(p.v)}</span><span style={{ color: B.greenLight }}>{fmtC(p.n)}</span><span style={{ color: p.c >= 0 ? "#4ade80" : "#ef4444" }}>{fmtC(p.c)}</span></React.Fragment>))}
            </div>
            <div style={{ fontSize: 9, color: B.grayMuted, marginTop: 6 }}>Assumes 4% appreciation, 3% rent growth</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MARKET SNAPSHOTS
// ============================================
function MarketSnapshots() {
  const [sel, setSel] = useState("Albany");
  const towns = Object.keys(MARKET_DATA).sort();
  const m = MARKET_DATA[sel];
  const rc = (r) => { if (r.startsWith("A")) return "#4ade80"; if (r.startsWith("B")) return B.greenLight; if (r.startsWith("C")) return "#f59e0b"; return "#ef4444"; };

  return (
    <div>
      <div style={{ background: "rgba(27,72,18,0.08)", border: "1px solid rgba(27,72,18,0.2)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: B.greenLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>Data Sources</div>
        <p style={{ fontSize: 12, color: B.grayText, margin: 0, lineHeight: 1.6 }}>Market data compiled from the Global MLS (GCAR/CRMLS), U.S. Census Bureau (ACS), Zillow Observed Rent Index (ZORI), CoStar rental analytics, and local assessor records. Cap rates estimated from active and recently sold multifamily listings. Walk Scores via walkscore.com. School district overall grades sourced from Niche.com (niche.com/k12), based on state test scores, graduation rates, teacher quality, and student/teacher ratios. All figures are approximations updated monthly — contact Ethan for current deal-specific data.</p>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {towns.map(t => (<button key={t} onClick={() => setSel(t)} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: sel === t ? `1px solid ${B.green}` : "1px solid rgba(27,72,18,0.12)", background: sel === t ? "rgba(27,72,18,0.2)" : "transparent", color: sel === t ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{t}</button>))}
      </div>

      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, fontWeight: 400, color: B.white, margin: "0 0 6px 0", letterSpacing: 1.5 }}>{sel.toUpperCase()}</h2>
        <p style={{ color: B.grayText, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{m.description}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <StatCard label="Median Price" value={fmtC(m.medianPrice)} />
        <StatCard label="Avg Cap Rate" value={fmtP(m.capRate)} accent={m.capRate >= 8 ? "#4ade80" : m.capRate >= 6 ? B.greenLight : "#ef4444"} />
        <StatCard label="Days on Market" value={m.daysOnMarket} />
        <StatCard label="Active Listings" value={m.inventoryCount} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <StatCard label="Avg 2BR Rent" value={fmtD(m.avgRent2Bed)} sub="/month" />
        <StatCard label="Avg 3BR Rent" value={fmtD(m.avgRent3Bed)} sub="/month" />
        <StatCard label="Vacancy Rate" value={fmtP(m.vacancyRate)} accent={m.vacancyRate <= 5 ? "#4ade80" : B.greenLight} />
        <StatCard label="YoY Growth" value={"+" + fmtP(m.yoyAppreciation)} accent="#4ade80" />
      </div>

      <div style={pStyle}>
        {pH("Demographics & Schools")}
        {[["Median HH Income", fmtD(m.medianHHIncome)], ["Pop. Growth", (m.popGrowth >= 0 ? "+" : "") + fmtP(m.popGrowth) + " /yr"], ["Walk Score", m.walkScore + " / 100"]].map(([l, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>{l}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{v}</span></div>
        ))}
        <div style={{ borderTop: "1px solid rgba(27,72,18,0.15)", marginTop: 6, paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>School District</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{m.schoolDistrict}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>Overall Grade</span><span style={{ fontSize: 12, color: rc(m.schoolRating), fontWeight: 700 }}>{m.schoolRating}</span></div>
          <div style={{ fontSize: 9, color: B.grayMuted, marginTop: 4 }}>Overall grade from Niche.com. Verify independently at niche.com/k12.</div>
        </div>
      </div>

      <div style={pStyle}>
        {pH("Cap Rate Comparison")}
        {[...towns].sort((a, b) => MARKET_DATA[b].capRate - MARKET_DATA[a].capRate).map(t => {
          const cr = MARKET_DATA[t].capRate; const mx = Math.max(...towns.map(x => MARKET_DATA[x].capRate));
          return (<div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: t === sel ? B.greenLight : B.grayText, width: 130, fontWeight: t === sel ? 700 : 400, flexShrink: 0 }}>{t}</span>
            <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: (cr / mx * 100) + "%", height: "100%", background: t === sel ? B.green : "rgba(27,72,18,0.35)", borderRadius: 4, transition: "width 0.5s ease" }} /></div>
            <span style={{ fontSize: 11, color: t === sel ? B.greenLight : B.grayText, width: 40, textAlign: "right", fontWeight: 700 }}>{fmtP(cr)}</span>
          </div>);
        })}
      </div>
      <div style={{ fontSize: 9, color: B.grayMuted, marginTop: 8 }}>Data last updated: {LAST_UPDATED}. Contact Ethan for current figures.</div>
    </div>
  );
}

// ============================================
// EQUITY ESTIMATOR
// ============================================
function EquityEstimator() {
  const [d, setD] = useState({ address: "", purchasePrice: 300000, purchaseYear: 2022, bal: 225000, rent: 3200, exp: 1800, rate: 6.5 });
  const u = (k) => (v) => setD({ ...d, [k]: v });
  const yrs = 2026 - d.purchaseYear; const estVal = d.purchasePrice * Math.pow(1.055, yrs); const eq = estVal - d.bal; const eqPct = (eq / estVal) * 100;
  const annCF = (d.rent - d.exp) * 12; const totRet = eq - (d.purchasePrice - d.bal) + annCF * yrs;
  const refiLoan = estVal * 0.75; const cashOut = refiLoan - d.bal; const rmr = d.rate / 100 / 12;
  const refiPmt = rmr > 0 ? refiLoan * (rmr * Math.pow(1 + rmr, 360)) / (Math.pow(1 + rmr, 360) - 1) : refiLoan / 360;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div>
        {sLabel("Your Property")}
        <Field label="Address" value={d.address} onChange={u("address")} type="text" placeholder="Your investment property" />
        <div style={{ display: "flex", gap: 10 }}><Field label="Purchase Price" value={d.purchasePrice} onChange={u("purchasePrice")} prefix="$" small step={1000} /><Field label="Year Purchased" value={d.purchaseYear} onChange={u("purchaseYear")} small /></div>
        <Field label="Current Mortgage Balance" value={d.bal} onChange={u("bal")} prefix="$" />
        <div style={{ display: "flex", gap: 10 }}><Field label="Monthly Rent" value={d.rent} onChange={u("rent")} prefix="$" small /><Field label="Monthly Expenses" value={d.exp} onChange={u("exp")} prefix="$" small /></div>
        <Field label="Current Rate (for refi)" value={d.rate} onChange={u("rate")} suffix="%" step={0.1} />
      </div>
      <div>
        {sLabel("Equity Position")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}><StatCard label="Est. Value" value={fmtC(estVal)} /><StatCard label="Total Equity" value={fmtC(eq)} accent="#4ade80" /></div>
        <div style={pStyle}>{pH("Equity vs. Debt")}<div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 7, overflow: "hidden", marginBottom: 6 }}><div style={{ width: Math.max(0, Math.min(100, eqPct)) + "%", height: "100%", background: `linear-gradient(90deg, ${B.green}, #4ade80)`, borderRadius: 7, transition: "width 0.5s" }} /></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: "#4ade80" }}>Equity: {fmtP(eqPct)}</span><span style={{ color: B.grayText }}>Debt: {fmtP(100 - eqPct)}</span></div></div>
        <div style={pStyle}>{pH("Performance")}{[["Years Owned", yrs], ["Annual Cashflow", fmtD(annCF)], ["Total Appreciation", fmtD(estVal - d.purchasePrice)], ["Total Return (est.)", fmtD(totRet)]].map(([l, v], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>{l}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{v}</span></div>))}</div>
        <div style={{ background: "rgba(27,72,18,0.1)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: B.greenLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>Cash-Out Refi (75% LTV)</div>
          {[["New Loan", fmtD(refiLoan)], ["Cash Out", fmtD(Math.max(0, cashOut))], ["New Payment", fmtD(refiPmt) + "/mo"], ["Net CF After Refi", fmtD(d.rent - d.exp - refiPmt) + "/mo"]].map(([l, v], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.greenLight }}>{l}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 700 }}>{v}</span></div>))}
        </div>
        {eq > 100000 && <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>1031 Exchange Opportunity</div><p style={{ fontSize: 12, color: B.grayText, margin: 0, lineHeight: 1.5 }}>With {fmtC(eq)} in equity, you may qualify for a 1031 exchange into a larger property. Let's talk strategy.</p></div>}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("analyzer");

  // Load saved lead on mount
  useEffect(() => {
    loadLead().then(saved => {
      if (saved && saved.email) setLead(saved);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLeadSubmit = async (formData) => {
    setLead(formData);
    await saveLead(formData);
    await sendToWebhook(formData);
  };

  if (loading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(170deg, ${B.navyDeep} 0%, ${B.navy} 40%, ${B.navyLight} 100%)`, fontFamily: "'DM Sans', sans-serif" }}><div style={{ color: B.grayMuted, fontSize: 14 }}>Loading...</div></div>);
  if (!lead) return (<><style>{fonts}</style><LeadGate onSubmit={handleLeadSubmit} /></>);
  const tabs = [{ key: "analyzer", label: "Deal Analyzer", icon: "📊" }, { key: "markets", label: "Market Intel", icon: "🏘️" }, { key: "equity", label: "Equity Estimator", icon: "💰" }];
  return (
    <><style>{fonts}</style>
      <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: `linear-gradient(170deg, ${B.navyDeep} 0%, ${B.navy} 40%, ${B.navyLight} 100%)`, color: B.white }}>
        <div style={{ borderBottom: `1px solid ${B.grayBorder}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}><EmpireLogo size={32} /><div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, lineHeight: 1 }}>CAPITAL REGION INVESTOR HUB</div><div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: B.green, fontWeight: 700 }}>Empire Real Estate Firm</div></div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>Ethan Harris</div><div style={{ fontSize: 10, color: B.grayMuted }}>Real Estate Salesperson · (518) 588-1122</div></div>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "10px 24px", borderBottom: `1px solid ${B.grayBorder}` }}>
          {tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "9px 18px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: "none", background: tab === t.key ? "rgba(27,72,18,0.18)" : "transparent", color: tab === t.key ? B.greenLight : B.grayMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}</button>))}
        </div>
        <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
          {tab === "analyzer" && <DealAnalyzer />}
          {tab === "markets" && <MarketSnapshots />}
          {tab === "equity" && <EquityEstimator />}
        </div>
        <div style={{ borderTop: `1px solid ${B.grayBorder}`, padding: "18px 24px", textAlign: "center", marginTop: 30 }}>
          <p style={{ color: B.grayMuted, fontSize: 11, margin: "0 0 3px 0" }}>Ready to make a move? Let's underwrite your next deal together.</p>
          <p style={{ color: B.white, fontSize: 12, fontWeight: 700, margin: 0 }}>Ethan Harris · Empire Real Estate Firm · (518) 588-1122 · Ethan@EmpireRealEstateFirm.com</p>
        </div>
      </div>
    </>
  );
}
