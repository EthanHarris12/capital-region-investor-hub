"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { computeRental, computeFlip, computeBrrrr } from "@/lib/dealMath";

// ============================================
// ADVERTISE STUDIO
// A 9:16 stage for recording vertical talking-head walkthroughs of a deal.
// Everything outside the stage (controls, script notes) is off-camera, so
// the screen recording captures only the stage.
// ============================================

const DEALS_KEY = "crih_deals";
const PREFS_KEY = "crih_studio_prefs";

const fmtD = (n) => "$" + Math.round(n).toLocaleString();
const fmtP = (n) => (isFinite(n) ? n.toFixed(1) + "%" : "∞");
const fmtX = (n) => (isFinite(n) ? n.toFixed(2) + "x" : "∞");

const STRATEGY_LABEL = { ltr: "Long-Term Rental", str: "Short-Term Rental", mtr: "Mid-Term Rental", flip: "Flip", brrrr: "BRRRR" };

// ---- beat construction -------------------------------------------------

function rentalBeats(d, strategy, m) {
  var addr = d.address || "This Property";
  var beats = [
    {
      key: "hook", kicker: "The Deal",
      headline: addr,
      hero: fmtD(d.purchasePrice), heroLabel: "Purchase price",
      rows: [["Units", String(d.units)], ["Strategy", STRATEGY_LABEL[strategy]], ["Price / unit", fmtD(d.units > 0 ? d.purchasePrice / d.units : 0)]],
      say: "Hook them fast. Name the property and the price, then promise the answer: “Let’s find out if this actually cash flows.”",
    },
    {
      key: "financing", kicker: "Getting In",
      headline: "What it takes to buy",
      hero: fmtD(m.totalCashInvested), heroLabel: "Total cash to close",
      rows: [["Down payment (" + d.downPct + "%)", fmtD(m.dp)], ["Loan amount", fmtD(m.loan)], ["Closing costs", fmtD(m.closingCosts)], ["Rate / term", d.rate + "% / " + d.term + " yr"], ["Monthly payment", fmtD(m.mtg)]],
      say: "This is the number people care about most — what’s actually coming out of pocket. Say it plainly, then move on.",
    },
    {
      key: "income", kicker: "Money In",
      headline: "What it collects",
      hero: fmtD(m.egi), heroLabel: "Effective gross income / yr",
      rows: [["Gross revenue", fmtD(m.gri)], [m.deductionLabel, "− " + fmtD(m.deductionDollar)], ["Effective gross income", fmtD(m.egi)]],
      say: "Call out that you are not using the gross number. Underwriting to full occupancy is the classic beginner mistake — this is where you show you don’t.",
    },
    {
      key: "expenses", kicker: "Money Out",
      headline: "What it costs to run",
      hero: fmtD(m.totExp), heroLabel: "Operating expenses / yr",
      rows: [["Taxes", fmtD(d.taxes)], ["Insurance", fmtD(d.insurance)], ["Maintenance (" + d.maintenancePct + "%)", fmtD(m.maintenanceDollar)], ["CapEx (" + d.capexPct + "%)", fmtD(m.capexDollar)]].concat(
        d.management > 0 ? [["Management (" + d.management + "%)", fmtD(m.mgmtDollar)]] : []
      ).concat(
        (d.utilities > 0 || d.otherExp > 0) ? [["Utilities + other", fmtD(d.utilities * 12 + d.otherExp * 12)]] : []
      ),
      say: "CapEx is the line most people skip. Roofs and boilers are not optional — reserving for them is what separates a real proforma from a fantasy.",
    },
    {
      key: "noi", kicker: "The Engine", headline: "Net operating income",
      hero: fmtD(m.noi), heroLabel: "NOI / yr", tone: m.noi >= 0 ? "pos" : "neg",
      rows: [["Effective gross income", fmtD(m.egi)], ["Operating expenses", "− " + fmtD(m.totExp)], ["NOI", fmtD(m.noi)]],
      say: "NOI is the property’s income before the bank gets paid. It’s the number that drives value — mention that NOI divided by cap rate is what an appraiser is doing.",
    },
    {
      key: "cashflow", kicker: "The Answer", headline: "What lands in your pocket",
      hero: fmtD(m.cf), heroLabel: "Annual cash flow", tone: m.cf >= 0 ? "pos" : "neg",
      rows: [["NOI", fmtD(m.noi)], ["Debt service", "− " + fmtD(m.annMtg)], ["Cash flow", fmtD(m.cf)], ["Per unit / month", fmtD(m.cfDoor)]],
      say: "This is the payoff of the whole video. Pause here. Let the number sit before you say whether it’s good.",
    },
    {
      key: "returns", kicker: "The Verdict", headline: "Does it work?",
      grid: [["Cap rate", fmtP(m.cap), m.cap >= 7], ["Cash-on-cash", fmtP(m.coc), m.coc >= 8], ["DSCR", fmtX(m.dscr), m.dscr >= 1.25], ["Per door / mo", fmtD(m.cfDoor), m.cfDoor >= 100]],
      rows: [["GRM", m.grm.toFixed(1) + "x"], ["Expense ratio", fmtP(m.expR)]],
      say: "Give your actual opinion. DSCR under 1.25 means most lenders get uncomfortable — say what you’d do: renegotiate, walk, or buy it.",
    },
  ];
  return beats;
}

function flipBeats(d, m) {
  return [
    { key: "hook", kicker: "The Flip", headline: d.address || "This Property", hero: fmtD(d.purchasePrice), heroLabel: "Purchase price",
      rows: [["ARV", fmtD(d.flipArv)], ["Rehab budget", fmtD(d.flipRehab)], ["Timeline", d.flipHoldingMonths + " months"]],
      say: "Open with the spread: bought here, worth this after. That gap is the whole story." },
    { key: "in", kicker: "All In", headline: "What it costs you", hero: fmtD(m.totalInvested), heroLabel: "Total invested",
      rows: [["Purchase", fmtD(d.purchasePrice)], ["Rehab", fmtD(d.flipRehab)], ["Closing", fmtD(d.flipClosing)], ["Holding (" + d.flipHoldingMonths + " mo)", fmtD(m.totalHolding)]],
      say: "Holding costs are what kill flips. Every month it sits, that number grows and your profit shrinks." },
    { key: "out", kicker: "The Exit", headline: "What you walk away with", hero: fmtD(m.profit), heroLabel: "Estimated profit", tone: m.profit >= 0 ? "pos" : "neg",
      rows: [["ARV", fmtD(d.flipArv)], ["Selling costs (" + d.flipSellingPct + "%)", "− " + fmtD(m.sellingCosts)], ["Net proceeds", fmtD(m.netProceeds)], ["Total invested", "− " + fmtD(m.totalInvested)]],
      say: "People forget selling costs. Six percent of ARV disappears at the closing table." },
    { key: "verdict", kicker: "The Verdict", headline: "Is the juice worth the squeeze?",
      grid: [["ROI", fmtP(m.roi), m.roi >= 15], ["Annualized", fmtP(m.annRoi), m.annRoi >= 25], ["Max offer", fmtD(m.mao), true], ["Timeline", d.flipHoldingMonths + " mo", true]],
      rows: [["MAO = " + d.flipMaoPct + "% of ARV − rehab", fmtD(m.mao)]],
      say: "End on the max allowable offer. That’s the actionable number — what you’d actually write on the contract." },
  ];
}

function brrrrBeats(d, m) {
  return [
    { key: "hook", kicker: "BRRRR", headline: d.address || "This Property", hero: fmtD(m.totalAllIn), heroLabel: "All-in cost",
      rows: [["Purchase", fmtD(d.purchasePrice)], ["Rehab", fmtD(d.brrrrRehab)], ["Closing + holding", fmtD(d.brrrrClosing + d.brrrrHoldInterest)]],
      say: "Buy, rehab, rent, refinance, repeat. Set up the goal: get your money back out and keep the property." },
    { key: "refi", kicker: "The Refinance", headline: "Pulling your money back out", hero: fmtD(m.cashLeftIn), heroLabel: m.cashLeftIn <= 0 ? "Cash pulled out" : "Cash left in", tone: m.cashLeftIn <= 0 ? "pos" : undefined,
      rows: [["ARV", fmtD(d.brrrrArv)], ["Refi at " + d.brrrrRefiLtv + "% LTV", fmtD(m.refiLoan)], ["All-in", "− " + fmtD(m.totalAllIn)], ["New payment", fmtD(m.mtg) + "/mo"]],
      say: "This is the moment BRRRR lives or dies. If the appraisal comes in low, the whole model breaks — say what your backup plan is." },
    { key: "cashflow", kicker: "After the Refi", headline: "Does it still cash flow?", hero: fmtD(m.cf), heroLabel: "Annual cash flow", tone: m.cf >= 0 ? "pos" : "neg",
      rows: [["Effective gross income", fmtD(m.egi)], ["Operating expenses", "− " + fmtD(m.totOpex)], ["NOI", fmtD(m.noi)], ["Debt service", "− " + fmtD(m.annDebt)]],
      say: "A bigger loan means a bigger payment. Plenty of BRRRRs pull all the cash out and leave you with a property that barely breaks even." },
    { key: "verdict", kicker: "The Verdict", headline: "Infinite return?",
      grid: [["Cash-on-cash", fmtP(m.coc), m.coc >= 8], ["DSCR", fmtX(m.dscr), m.dscr >= 1.25], ["Cap rate", fmtP(m.capRate), m.capRate >= 7], ["Cash left in", fmtD(m.cashLeftIn), m.cashLeftIn <= 0]],
      say: m.cashLeftIn <= 0 ? "Zero left in means the cash-on-cash is technically infinite. Say that — but be honest that it depends entirely on the appraisal holding." : "Money is still tied up here. That’s fine — just don’t call it an infinite return.",
    },
  ];
}

const CTA_BEAT = {
  key: "cta", kicker: "Your Turn", headline: "Run your own numbers",
  hero: "investcapitalregion.com", heroSmall: true, heroLabel: "Free deal analyzer",
  rows: [["Ethan Harris", "Empire Real Estate Firm"], ["Call or text", "(518) 588-1122"], ["Email", "Ethan@EmpireRealEstateFirm.com"]],
  say: "One clear ask. Tell them to comment a town name, or send you a listing and you’ll underwrite it on camera.",
};

// ---- localStorage as an external store ---------------------------------
// Read through useSyncExternalStore so the values stay correct without a
// setState inside an effect, and without a hydration mismatch.

const listeners = new Set();
const cache = {};

function subscribeStore(cb) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return function () { listeners.delete(cb); window.removeEventListener("storage", cb); };
}

function readJSON(key, fallback) {
  var raw = null;
  try { raw = localStorage.getItem(key); } catch (e) { /* silent fail */ }
  var entry = cache[key];
  if (entry && entry.raw === raw) return entry.value;   // referentially stable
  var value = fallback;
  try { value = raw ? JSON.parse(raw) : fallback; } catch (e) { value = fallback; }
  cache[key] = { raw: raw, value: value };
  return value;
}

function writeJSON(key, value) {
  var raw = JSON.stringify(value);
  try { localStorage.setItem(key, raw); } catch (e) { /* silent fail */ }
  cache[key] = { raw: raw, value: value };
  listeners.forEach(function (l) { l(); });
}

const EMPTY_DEALS = [];
const DEFAULT_PREFS = { camCorner: "br", camSize: "md", camRound: true, camMirror: true };

// ---- component ---------------------------------------------------------

export default function AdvertiseStudio() {
  const { user } = useUser();
  const deals = useSyncExternalStore(
    subscribeStore,
    function () { return readJSON(DEALS_KEY, EMPTY_DEALS); },
    function () { return EMPTY_DEALS; }
  );
  const prefs = useSyncExternalStore(
    subscribeStore,
    function () { return readJSON(PREFS_KEY, DEFAULT_PREFS); },
    function () { return DEFAULT_PREFS; }
  );

  const [dealIdx, setDealIdx] = useState(0);
  const [beatIdx, setBeatIdx] = useState(0);
  const [recordMode, setRecordMode] = useState(false);
  const [scrollMode, setScrollMode] = useState(false);

  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scrollRef = useRef(null);

  var camCorner = prefs.camCorner || DEFAULT_PREFS.camCorner;
  var camSize = prefs.camSize || DEFAULT_PREFS.camSize;
  var camRound = prefs.camRound !== false;
  var camMirror = prefs.camMirror !== false;
  var setPref = function (key, value) {
    var next = Object.assign({}, DEFAULT_PREFS, prefs);
    next[key] = value;
    writeJSON(PREFS_KEY, next);
  };

  var deal = deals[dealIdx] || null;
  var strategy = deal && deal.strategy ? deal.strategy : "ltr";

  var beats = [];
  if (deal) {
    if (strategy === "flip") beats = flipBeats(deal, computeFlip(deal));
    else if (strategy === "brrrr") beats = brrrrBeats(deal, computeBrrrr(deal));
    else beats = rentalBeats(deal, strategy, computeRental(deal, strategy));
    beats = beats.concat([CTA_BEAT]);
  }

  var maxBeat = Math.max(0, beats.length - 1);
  var beat = beats[Math.min(beatIdx, maxBeat)] || null;

  const go = useCallback(function (delta) {
    setBeatIdx(function (i) { return Math.max(0, Math.min(maxBeat, i + delta)); });
  }, [maxBeat]);

  // camera
  const stopCam = useCallback(function () {
    if (streamRef.current) { streamRef.current.getTracks().forEach(function (t) { t.stop(); }); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  const startCam = useCallback(async function () {
    setCamError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamError("This browser can’t open a camera. Try Chrome or Safari.");
      return;
    }
    try {
      var s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false });
      streamRef.current = s;
      setCamOn(true);   // the effect below attaches the stream once <video> mounts
    } catch (e) {
      var name = e && e.name;
      setCamError(
        name === "NotAllowedError" ? "Camera access was blocked. Click the camera icon in your browser’s address bar, allow it, then try again."
        : name === "NotFoundError" ? "No camera found on this Mac."
        : name === "NotReadableError" ? "Another app is already using the camera. Quit Zoom, Photo Booth, or FaceTime and try again."
        : "Could not start the camera" + (e && e.message ? ": " + e.message : ".")
      );
    }
  }, []);

  // Attach the stream after the <video> element is in the DOM. Re-runs on
  // corner/size/shape changes too, since those remount the container.
  useEffect(function () {
    var el = videoRef.current;
    if (!camOn || !el || !streamRef.current) return;
    if (el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
    var p = el.play();
    if (p && typeof p.catch === "function") p.catch(function () { /* autoplay guard */ });
  }, [camOn, camCorner, camSize, camRound]);

  useEffect(function () { return function () { if (streamRef.current) streamRef.current.getTracks().forEach(function (t) { t.stop(); }); }; }, []);

  // keyboard
  useEffect(function () {
    function onKey(e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      else if (e.key === "r" || e.key === "R") setRecordMode(function (v) { return !v; });
      else if (e.key === "Escape") setRecordMode(false);
    }
    window.addEventListener("keydown", onKey);
    return function () { window.removeEventListener("keydown", onKey); };
  }, [go]);

  // continuous scroll
  useEffect(function () {
    if (!scrollMode) return;
    var raf, last = performance.now();
    function tick(now) {
      var el = scrollRef.current;
      if (el) { el.scrollTop += (now - last) * 0.028; if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) el.scrollTop = 0; }
      last = now;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return function () { cancelAnimationFrame(raf); };
  }, [scrollMode]);

  var camSizePct = camSize === "sm" ? 16 : camSize === "lg" ? 30 : 22;
  var corner = { tl: { top: "4%", left: "5%" }, tr: { top: "4%", right: "5%" }, bl: { bottom: "12%", left: "5%" }, br: { bottom: "12%", right: "5%" } }[camCorner];

  return (
    <div className={"studio" + (recordMode ? " recording" : "")}>
      <style>{STUDIO_CSS}</style>

      {/* ---------------- left: controls ---------------- */}
      <aside className="panel">
        <div className="panel-head">
          <div className="panel-title">Advertise Studio</div>
          <div className="panel-sub">{user && user.firstName ? user.firstName : "Signed in"} · off-camera controls</div>
        </div>

        <section className="ctl">
          <label className="ctl-label" htmlFor="dealpick">Deal</label>
          {deals.length === 0 ? (
            <p className="empty">No saved deals yet. Open the <strong>Deal Analyzer</strong>, enter a property, and press <strong>Save</strong>. It shows up here.</p>
          ) : (
            <select id="dealpick" className="select" value={dealIdx} onChange={function (e) { setDealIdx(Number(e.target.value)); setBeatIdx(0); }}>
              {deals.map(function (dl, i) {
                return <option key={dl.id || i} value={i}>{(dl.label || "Untitled") + " — " + (STRATEGY_LABEL[dl.strategy] || "LTR")}</option>;
              })}
            </select>
          )}
        </section>

        <section className="ctl">
          <div className="ctl-label">Camera</div>
          {camOn ? (
            <button className="btn" onClick={stopCam}>Turn camera off</button>
          ) : (
            <button className="btn primary" onClick={startCam}>Turn camera on</button>
          )}
          {camError ? <p className="err">{camError}</p> : null}
          <div className="row">
            {[["tl", "↖"], ["tr", "↗"], ["bl", "↙"], ["br", "↘"]].map(function (c) {
              return <button key={c[0]} className={"chip" + (camCorner === c[0] ? " on" : "")} onClick={function () { setPref("camCorner", c[0]); }} title={"Move camera"}>{c[1]}</button>;
            })}
          </div>
          <div className="row">
            {[["sm", "S"], ["md", "M"], ["lg", "L"]].map(function (c) {
              return <button key={c[0]} className={"chip" + (camSize === c[0] ? " on" : "")} onClick={function () { setPref("camSize", c[0]); }}>{c[1]}</button>;
            })}
            <button className={"chip" + (camRound ? " on" : "")} onClick={function () { setPref("camRound", !camRound); }}>Round</button>
            <button className={"chip" + (camMirror ? " on" : "")} onClick={function () { setPref("camMirror", !camMirror); }}>Mirror</button>
          </div>
        </section>

        <section className="ctl">
          <div className="ctl-label">Playback</div>
          <div className="row">
            <button className="btn" onClick={function () { go(-1); }} disabled={beatIdx === 0}>← Back</button>
            <button className="btn" onClick={function () { go(1); }} disabled={beatIdx >= maxBeat}>Next →</button>
          </div>
          <button className={"btn" + (scrollMode ? " primary" : "")} onClick={function () { setScrollMode(!scrollMode); }}>
            {scrollMode ? "Stop auto-scroll" : "Auto-scroll this beat"}
          </button>
          <button className="btn" onClick={function () { setRecordMode(true); }}>Hide controls (R)</button>
        </section>

        <section className="ctl">
          <div className="ctl-label">Recording</div>
          <p className="hint">Press <kbd>⌘</kbd><kbd>⇧</kbd><kbd>5</kbd>, choose <strong>Record Selected Portion</strong>, and drag the box to the stage outline. Everything in this panel stays out of frame.</p>
          <p className="hint">The stage is <strong>9:16</strong> — the native shape for Reels, TikTok, and Facebook.</p>
          <p className="hint"><kbd>→</kbd> or <kbd>space</kbd> next beat · <kbd>←</kbd> back · <kbd>R</kbd> hide controls · <kbd>esc</kbd> bring them back</p>
        </section>
      </aside>

      {/* ---------------- center: the 9:16 stage ---------------- */}
      <div className="stage-wrap">
        <div className="stage-frame">
          <div className="stage" ref={scrollRef}>
            {!deal ? (
              <div className="stage-empty">
                <div className="se-mark">No deal loaded</div>
                <p>Save a deal in the Deal Analyzer, then pick it on the left.</p>
              </div>
            ) : (
              <div className="stage-inner">
                <div className="brandbar">
                  <span className="brand">Capital Region Investor Hub</span>
                  <span className="brand-sub">Empire Real Estate Firm</span>
                </div>

                <div className="beat">
                  <div className="kicker">{beat.kicker}</div>
                  <h1 className="headline">{beat.headline}</h1>

                  {beat.hero ? (
                    <div className={"hero" + (beat.tone === "pos" ? " pos" : beat.tone === "neg" ? " neg" : "") + (beat.heroSmall ? " small" : "")}>
                      <div className="hero-val">{beat.hero}</div>
                      <div className="hero-label">{beat.heroLabel}</div>
                    </div>
                  ) : null}

                  {beat.grid ? (
                    <div className="grid">
                      {beat.grid.map(function (g, i) {
                        return (
                          <div key={i} className={"gcell" + (g[2] ? " good" : "")}>
                            <div className="gval">{g[1]}</div>
                            <div className="glabel">{g[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {beat.rows ? (
                    <div className="rows">
                      {beat.rows.map(function (r, i) {
                        return (
                          <div key={i} className="rw">
                            <span className="rw-l">{r[0]}</span>
                            <span className="rw-v">{r[1]}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="dots">
                  {beats.map(function (b, i) { return <span key={b.key} className={"dot" + (i === beatIdx ? " on" : "")} />; })}
                </div>

                <div className="handle">investcapitalregion.com · (518) 588-1122</div>
              </div>
            )}

            {camOn ? (
              <div
                className={"cam" + (camRound ? " round" : "")}
                style={Object.assign({ width: camSizePct + "%" }, corner)}
              >
                <video ref={videoRef} autoPlay playsInline muted style={{ transform: camMirror ? "scaleX(-1)" : "none" }} />
              </div>
            ) : null}
          </div>
        </div>
        <div className="stage-cap">Record this area · 9:16 · beat {Math.min(beatIdx + 1, beats.length || 1)} of {beats.length || 1}</div>
      </div>

      {/* ---------------- right: teleprompter ---------------- */}
      <aside className="panel prompter">
        <div className="panel-head">
          <div className="panel-title">What to say</div>
          <div className="panel-sub">Only you can see this</div>
        </div>
        {beat ? (
          <>
            <div className="pr-kicker">{beat.kicker}</div>
            <p className="pr-say">{beat.say}</p>
            <div className="pr-next">
              {beatIdx < maxBeat ? <>Up next: <strong>{beats[beatIdx + 1].kicker}</strong></> : "Last beat — end on the ask."}
            </div>
          </>
        ) : (
          <p className="empty">Pick a deal to see the script.</p>
        )}
      </aside>

      {recordMode ? <button className="unhide" onClick={function () { setRecordMode(false); }}>Show controls (esc)</button> : null}
    </div>
  );
}

// ---- styles ------------------------------------------------------------

const STUDIO_CSS = `
.studio {
  --pad: 20px;
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr) 290px;
  gap: 20px;
  align-items: start;
  min-height: 100vh;
  padding: var(--pad);
  background: var(--b-navy-deep);
  color: var(--b-white);
  font-family: 'DM Sans', sans-serif;
  box-sizing: border-box;
}
.studio.recording { grid-template-columns: 1fr; background: #0b0f0a; }
.studio.recording .panel, .studio.recording .stage-cap { display: none; }

.panel {
  background: var(--b-navy-light);
  border: 1px solid var(--b-gray-border);
  border-radius: 12px;
  padding: 16px;
  position: sticky;
  top: var(--pad);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-head { display: flex; flex-direction: column; gap: 2px; }
.panel-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1.5px; }
.panel-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--b-gray-muted); font-weight: 700; }

.ctl { display: flex; flex-direction: column; gap: 8px; }
.ctl-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--b-green-light); }
.select { width: 100%; padding: 9px 10px; font-size: 13px; font-family: inherit; color: var(--b-white); background: var(--b-navy); border: 1px solid var(--b-gray-border); border-radius: 8px; }
.row { display: flex; gap: 6px; flex-wrap: wrap; }
.btn { flex: 1; min-width: 0; padding: 9px 12px; font-size: 12px; font-weight: 700; font-family: inherit; color: var(--b-gray-text); background: transparent; border: 1px solid var(--b-gray-border); border-radius: 8px; cursor: pointer; }
.btn:hover:not(:disabled) { border-color: var(--b-green-light); color: var(--b-green-light); }
.btn:disabled { opacity: .4; cursor: default; }
.btn.primary { background: var(--b-green); border-color: var(--b-green); color: #fff; }
.chip { padding: 6px 11px; font-size: 12px; font-weight: 700; font-family: inherit; color: var(--b-gray-muted); background: transparent; border: 1px solid var(--b-gray-border); border-radius: 7px; cursor: pointer; }
.chip.on { background: var(--b-green); border-color: var(--b-green); color: #fff; }
.empty, .hint { font-size: 11.5px; line-height: 1.6; color: var(--b-gray-muted); margin: 0; }
.err { font-size: 11.5px; line-height: 1.55; color: var(--b-neg); margin: 0; }
kbd { font-family: ui-monospace, Menlo, monospace; font-size: 10px; background: var(--b-subtle); border: 1px solid var(--b-gray-border); border-radius: 4px; padding: 1px 4px; margin: 0 1px; }

.stage-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.stage-frame { outline: 2px dashed var(--b-green-light); outline-offset: 8px; border-radius: 4px; }
.studio.recording .stage-frame { outline: none; }
.stage {
  position: relative;
  width: min(calc(100vw - 680px), calc((100vh - 90px) * 0.5625));
  aspect-ratio: 9 / 16;
  container-type: size;
  overflow: hidden;
  background: linear-gradient(168deg, var(--b-navy-deep) 0%, var(--b-navy) 45%, var(--b-navy-light) 100%);
  border-radius: 4px;
}
.studio.recording .stage { width: calc((100vh - 40px) * 0.5625); }
.stage-cap { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; color: var(--b-gray-muted); }

.stage-inner { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 6cqh 7cqw; box-sizing: border-box; }
.stage-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 8cqw; text-align: center; }
.se-mark { font-family: 'Bebas Neue', sans-serif; font-size: 5cqh; letter-spacing: 2px; color: var(--b-gray-muted); }
.stage-empty p { font-size: 2.1cqh; color: var(--b-gray-muted); margin: 0; }

.brandbar { display: flex; flex-direction: column; gap: 0.3cqh; flex-shrink: 0; }
.brand { font-family: 'Bebas Neue', sans-serif; font-size: 2.6cqh; letter-spacing: 2px; line-height: 1; }
.brand-sub { font-size: 1.25cqh; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 700; color: var(--b-green-light); }

.beat { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2.4cqh; min-height: 0; }
.kicker { font-size: 1.6cqh; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--b-green-light); }
.headline { font-family: 'Bebas Neue', sans-serif; font-size: 6.2cqh; line-height: .98; letter-spacing: 1px; margin: 0; text-wrap: balance; }

.hero { display: flex; flex-direction: column; gap: .6cqh; }
.hero-val { font-family: 'Bebas Neue', sans-serif; font-size: 13cqh; line-height: .86; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.hero.small .hero-val { font-size: 5.4cqh; letter-spacing: 0; }
.hero.pos .hero-val { color: var(--b-pos); }
.hero.neg .hero-val { color: var(--b-neg); }
.hero-label { font-size: 1.9cqh; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--b-gray-muted); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6cqh 1.6cqw; }
.gcell { background: var(--b-subtle); border: 1px solid var(--b-gray-border); border-radius: 1.4cqh; padding: 2cqh 2cqw; }
.gcell.good { border-color: var(--b-pos); }
.gval { font-family: 'Bebas Neue', sans-serif; font-size: 6cqh; line-height: 1; font-variant-numeric: tabular-nums; }
.gcell.good .gval { color: var(--b-pos); }
.glabel { font-size: 1.5cqh; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--b-gray-muted); margin-top: .5cqh; }

.rows { display: flex; flex-direction: column; }
.rw { display: flex; justify-content: space-between; align-items: baseline; gap: 2cqw; padding: 1.35cqh 0; border-bottom: 1px solid var(--b-gray-border); }
.rw:last-child { border-bottom: none; }
.rw-l { font-size: 2.1cqh; color: var(--b-gray-text); }
.rw-v { font-size: 2.3cqh; font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }

.dots { display: flex; gap: .9cqw; justify-content: center; padding: 1.4cqh 0; flex-shrink: 0; }
.dot { width: 1.1cqw; height: 1.1cqw; border-radius: 50%; background: var(--b-gray-border); }
.dot.on { background: var(--b-green-light); }
.handle { text-align: center; font-size: 1.5cqh; font-weight: 700; letter-spacing: 1.5px; color: var(--b-gray-muted); flex-shrink: 0; }

.cam { position: absolute; aspect-ratio: 1; overflow: hidden; border: 0.4cqh solid var(--b-green); box-shadow: 0 1cqh 3cqh rgba(0,0,0,.35); border-radius: 1.6cqh; }
.cam.round { border-radius: 50%; }
.cam video { width: 100%; height: 100%; object-fit: cover; display: block; }

.prompter .pr-kicker { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--b-green-light); }
.pr-say { font-size: 15px; line-height: 1.6; margin: 6px 0 0; }
.pr-next { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--b-gray-border); font-size: 12px; color: var(--b-gray-muted); }

.unhide { position: fixed; bottom: 16px; right: 16px; padding: 9px 16px; font-size: 12px; font-weight: 700; font-family: inherit; background: var(--b-green); color: #fff; border: none; border-radius: 8px; cursor: pointer; opacity: .35; }
.unhide:hover { opacity: 1; }

@media (max-width: 1180px) {
  .studio { grid-template-columns: 1fr; }
  .panel { position: static; }
  .stage { width: min(calc(100vw - 40px), calc((100vh - 90px) * 0.5625)); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
