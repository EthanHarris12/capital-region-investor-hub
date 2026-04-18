import React, { useState, useEffect } from "react";

// ============================================
// CONFIG — Update these for your deployment
// ============================================
const WEBHOOK_URL = "";

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
// ============================================
// UTM TRACKING — Captures attribution from URL and persists across session
// ============================================
const UTM_KEY = "crih_utm";
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

const captureUTMs = function() {
  if (typeof window === "undefined") return {};
  try {
    var params = new URLSearchParams(window.location.search);
    var captured = {};
    var hasAny = false;
    UTM_PARAMS.forEach(function(k) {
      var v = params.get(k);
      if (v) { captured[k] = v; hasAny = true; }
    });
    // Referrer fallback — if no UTM present but external referrer exists
    if (!hasAny && document.referrer) {
      try {
        var refHost = new URL(document.referrer).hostname;
        var currentHost = window.location.hostname;
        if (refHost && refHost !== currentHost) {
          captured.referrer = refHost;
          hasAny = true;
        }
      } catch (e) {}
    }
    if (hasAny) {
      captured.landing_page = window.location.pathname + window.location.search;
      captured.captured_at = new Date().toISOString();
      // Persist so attribution survives navigation within the site
      try {
        if (window.storage) { window.storage.set(UTM_KEY, JSON.stringify(captured)); }
        else if (typeof localStorage !== "undefined") { localStorage.setItem(UTM_KEY, JSON.stringify(captured)); }
      } catch (e) {}
      return captured;
    }
    // Fall back to previously stored UTMs (same session navigation)
    try {
      var stored = typeof localStorage !== "undefined" ? localStorage.getItem(UTM_KEY) : null;
      return stored ? JSON.parse(stored) : {};
    } catch (e) { return {}; }
  } catch (e) { return {}; }
};

const getStoredUTMs = function() {
  try {
    if (typeof localStorage !== "undefined") {
      var s = localStorage.getItem(UTM_KEY);
      return s ? JSON.parse(s) : {};
    }
  } catch (e) {}
  return {};
};

const sendToWebhook = async (lead) => {
  if (!WEBHOOK_URL) return;
  try {
    var utms = getStoredUTMs();
    var payload = {
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      interests: Array.isArray(lead.interests) ? lead.interests.join(", ") : (lead.interests || ""),
      timestamp: new Date().toISOString(),
      source: "Capital Region Investor Hub",
      page_url: (typeof window !== "undefined" ? window.location.href : ""),
      user_agent: (typeof navigator !== "undefined" ? navigator.userAgent : ""),
      // Attribution fields (always present, empty string if no UTMs captured)
      utm_source: utms.utm_source || "direct",
      utm_medium: utms.utm_medium || "",
      utm_campaign: utms.utm_campaign || "",
      utm_content: utms.utm_content || "",
      utm_term: utms.utm_term || "",
      gclid: utms.gclid || "",
      fbclid: utms.fbclid || "",
      referrer: utms.referrer || "",
      landing_page: utms.landing_page || ""
    };
    var formBody = Object.keys(payload).map(function(k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(payload[k]);
    }).join("&");
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody
    });
  } catch (e) { /* silent fail */ }
};

const DEALS_KEY = "crih_deals";
const EQUITIES_KEY = "crih_equities";

const saveAnalysis = async (key, analysis) => {
  try {
    let existing = [];
    if (window.storage) {
      try { const r = await window.storage.get(key); existing = r ? JSON.parse(r.value) : []; } catch(e) { existing = []; }
    } else if (typeof localStorage !== "undefined") {
      try { existing = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e) { existing = []; }
    }
    const entry = { ...analysis, id: Date.now(), savedAt: new Date().toISOString() };
    existing.unshift(entry);
    if (existing.length > 20) existing = existing.slice(0, 20);
    if (window.storage) { await window.storage.set(key, JSON.stringify(existing)); }
    else if (typeof localStorage !== "undefined") { localStorage.setItem(key, JSON.stringify(existing)); }
    return existing;
  } catch (e) { return []; }
};

const loadAnalyses = async (key) => {
  try {
    if (window.storage) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : []; }
    else if (typeof localStorage !== "undefined") { return JSON.parse(localStorage.getItem(key) || "[]"); }
  } catch (e) {}
  return [];
};

const deleteAnalysis = async (key, id) => {
  try {
    let existing = await loadAnalyses(key);
    existing = existing.filter(a => a.id !== id);
    if (window.storage) { await window.storage.set(key, JSON.stringify(existing)); }
    else if (typeof localStorage !== "undefined") { localStorage.setItem(key, JSON.stringify(existing)); }
    return existing;
  } catch (e) { return []; }
};

// ============================================
// PROSPECT ACTIVITY TRACKING
// ============================================
const ACTIVITY_KEY = "crih_activity";
const ACTIVITY_WEBHOOK_URL = ""; // Optional: separate Zapier webhook for activity alerts. If blank, uses main WEBHOOK_URL.

const logActivity = async function(lead, action, detail) {
  if (!lead || !lead.email) return;
  var utms = getStoredUTMs();
  var entry = {
    id: Date.now(),
    ts: new Date().toISOString(),
    name: lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    action: action,
    detail: detail || "",
    utm_source: utms.utm_source || "direct",
    utm_campaign: utms.utm_campaign || ""
  };
  try {
    var existing = [];
    if (window.storage) {
      try { var r = await window.storage.get(ACTIVITY_KEY); existing = r ? JSON.parse(r.value) : []; } catch(e) { existing = []; }
    } else if (typeof localStorage !== "undefined") {
      try { existing = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); } catch(e) { existing = []; }
    }
    existing.unshift(entry);
    if (existing.length > 500) existing = existing.slice(0, 500);
    if (window.storage) { await window.storage.set(ACTIVITY_KEY, JSON.stringify(existing)); }
    else if (typeof localStorage !== "undefined") { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(existing)); }
  } catch (e) { /* silent */ }
  // Fire webhook for high-intent actions
  var highIntent = ["deal_saved", "equity_saved", "pdf_exported", "comparison_run", "portfolio_viewed", "town_compared", "deal_loaded", "equity_loaded"];
  if (highIntent.indexOf(action) >= 0) {
    var hookUrl = ACTIVITY_WEBHOOK_URL || WEBHOOK_URL;
    if (!hookUrl) return;
    try {
      var actPayload = {
        type: "prospect_activity",
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        action: entry.action,
        detail: entry.detail,
        timestamp: entry.ts,
        source: "Capital Region Investor Hub",
        page_url: (typeof window !== "undefined" ? window.location.href : ""),
        utm_source: entry.utm_source,
        utm_campaign: entry.utm_campaign
      };
      var actBody = Object.keys(actPayload).map(function(k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(actPayload[k]);
      }).join("&");
      await fetch(hookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: actBody
      });
    } catch (e) { /* silent */ }
  }
};

const loadActivity = async function() {
  try {
    if (window.storage) { var r = await window.storage.get(ACTIVITY_KEY); return r ? JSON.parse(r.value) : []; }
    else if (typeof localStorage !== "undefined") { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); }
  } catch (e) {}
  return [];
};

const clearActivity = async function() {
  try {
    if (window.storage) { await window.storage.set(ACTIVITY_KEY, JSON.stringify([])); }
    else if (typeof localStorage !== "undefined") { localStorage.setItem(ACTIVITY_KEY, "[]"); }
  } catch (e) {}
};

const B = { green: "#1b4812", greenLight: "#2a6b1a", greenDark: "#143a0d", navy: "#1c2b3d", navyDeep: "#141f2e", navyLight: "#243447", charcoal: "#272727", black: "#000000", white: "#ffffff", grayText: "#8a9bb0", grayMuted: "#5a6d82", grayBorder: "rgba(255,255,255,0.08)", greenGlow: "rgba(27,72,18,0.25)" };

const MARKET_DATA = {
  "Albany": { medianPrice: 245000, avgRent2Bed: 1500, avgRent3Bed: 1800, capRate: 7.8, daysOnMarket: 18, inventoryCount: 31, yoyAppreciation: 7.1, vacancyRate: 4.8, popGrowth: 0.3, medianHHIncome: 48200, walkScore: 68, schoolDistrict: "Albany City", schoolRating: "B-", description: "New York's state capital and the economic center of the Capital Region. Major employers include the State of New York, Albany Medical Center, Albany NanoTech Complex, and the University at Albany (SUNY). The city features a walkable downtown with a growing restaurant and craft beverage scene along Lark Street and the Warehouse District. The Times Union Center hosts concerts and sporting events, Washington Park features an annual tulip festival, and the Empire State Plaza offers free summer concerts and winter ice skating. Additional amenities include the Palace Theatre, New York State Museum, and access to the Adirondacks via I-87. For investors, Albany offers strong multifamily density, consistent rental demand supported by institutional employment, and affordable entry relative to comparable northeast capitals." },
  "Amsterdam": { medianPrice: 145000, avgRent2Bed: 1050, avgRent3Bed: 1275, capRate: 9.8, daysOnMarket: 32, inventoryCount: 14, yoyAppreciation: 8.8, vacancyRate: 6.2, popGrowth: -0.3, medianHHIncome: 38500, walkScore: 58, schoolDistrict: "Amsterdam City", schoolRating: "C-", description: "Located along the Mohawk River in Montgomery County, Amsterdam has a manufacturing history rooted in the carpet and textile industries. Current employers include Walmart Distribution, Target Distribution, Dollar General, and St. Mary's Healthcare. The Mohawk Valley Health System and local government also contribute to the employment base. The downtown area has seen reinvestment with new restaurants and small businesses. Riverlink Park along the Mohawk River provides green space and water access, and the nearby Schoharie Crossing State Historic Site is a regional attraction. Amsterdam is approximately 35 minutes west of Albany via the I-90 Thruway, providing commuter access to Capital District employment centers. For investors, the low median price point combined with rising rents produces some of the strongest cap rates in the broader Capital Region, particularly in the multifamily value-add segment." },
  "Bethlehem": { medianPrice: 350000, avgRent2Bed: 1575, avgRent3Bed: 1925, capRate: 6.0, daysOnMarket: 25, inventoryCount: 12, yoyAppreciation: 5.2, vacancyRate: 3.1, popGrowth: 0.7, medianHHIncome: 89000, walkScore: 34, schoolDistrict: "Bethlehem Central", schoolRating: "A+", description: "A suburban town directly south of Albany served by the A+-rated Bethlehem Central School District. Major employers in the area include Albany Medical Center, the State of New York, and CSEA, with significant commuter traffic to downtown Albany. Public amenities include Elm Avenue Park, the Mohawk-Hudson Bike-Hike Trail, and a commercial center in the hamlet of Delmar along Delaware Avenue with shops and restaurants. Community events include Feestelijk and summer concerts at the park. For investors, Bethlehem has posted a 3.1% vacancy rate with consistent year-over-year appreciation. Limited multifamily inventory keeps supply constrained, and the A+-rated school district supports sustained rental demand." },
  "Clifton Park": { medianPrice: 385000, avgRent2Bed: 1650, avgRent3Bed: 2050, capRate: 5.7, daysOnMarket: 19, inventoryCount: 22, yoyAppreciation: 5.1, vacancyRate: 3.0, popGrowth: 1.8, medianHHIncome: 98500, walkScore: 28, schoolDistrict: "Shenendehowa", schoolRating: "A", description: "One of the fastest-growing municipalities in the Capital Region by population, Clifton Park is served by the A-rated Shenendehowa Central School District and features a commercial corridor along Route 146. Major employers in the area include GlobalFoundries (Malta), Regeneron Pharmaceuticals, and corporate offices along the I-87 Northway corridor. Public amenities include an extensive park system, the Clifton Common amphitheater, the Southern Saratoga YMCA, and proximity to Saratoga Springs. Retail is concentrated at Clifton Park Center. For investors, Clifton Park commands premium rents and posts a 3.0% vacancy rate — among the lowest in the metro. The 1.8% annual population growth supports long-term demand, though lower cap rates position this as an appreciation and stability play." },
  "Cohoes": { medianPrice: 185000, avgRent2Bed: 1200, avgRent3Bed: 1450, capRate: 8.9, daysOnMarket: 20, inventoryCount: 8, yoyAppreciation: 10.2, vacancyRate: 5.1, popGrowth: 0.5, medianHHIncome: 46500, walkScore: 64, schoolDistrict: "Cohoes City", schoolRating: "C+", description: "Located at the confluence of the Mohawk and Hudson Rivers, Cohoes has a manufacturing history in the textile industry. The downtown has undergone revitalization in recent years with new restaurants and retail. Major area employers include Momentive Performance Materials (Waterford), Norlite Corporation, and Albany International. Notable amenities include Cohoes Falls (one of the widest waterfalls in the eastern U.S.), the restored Cohoes Music Hall hosting live performances, and the Mohawk-Hudson Bike-Hike Trail. The city provides direct access to both Albany and Troy. For investors, Cohoes has posted the highest year-over-year appreciation rate in the region at 10.2%, with entry points below $200k producing an 8.9% average cap rate — a strong value-add market." },
  "Colonie": { medianPrice: 305000, avgRent2Bed: 1500, avgRent3Bed: 1850, capRate: 6.8, daysOnMarket: 21, inventoryCount: 16, yoyAppreciation: 5.9, vacancyRate: 3.8, popGrowth: 0.9, medianHHIncome: 72000, walkScore: 45, schoolDistrict: "South Colonie", schoolRating: "A", description: "The largest suburb in Albany County by population, Colonie is a major commercial and retail hub anchored by Colonie Center, Northway Mall, and the Wolf Road commercial corridor. Major employers include Albany International Airport, CDPHP, Ayco (a Goldman Sachs company), and numerous medical practices and corporate offices. The town is served by the A-rated South Colonie School District. Public amenities include The Crossings, a 130-acre park with walking trails and a lake, and the Shaker Heritage Site. The town has direct access to every major highway in the region (I-87, I-90, I-787). For investors, Colonie provides balanced risk and return with 5.9% annual appreciation, 3.8% vacancy, and consistent rental demand supported by the area's large and diversified employment base." },
  "Delmar": { medianPrice: 365000, avgRent2Bed: 1600, avgRent3Bed: 1950, capRate: 5.8, daysOnMarket: 24, inventoryCount: 10, yoyAppreciation: 4.9, vacancyRate: 2.9, popGrowth: 0.6, medianHHIncome: 95000, walkScore: 38, schoolDistrict: "Bethlehem Central", schoolRating: "A+", description: "The primary hamlet of the Town of Bethlehem, Delmar is served by the A+-rated Bethlehem Central School District. Delaware Avenue serves as the commercial center with local shops, restaurants, and services. Major employers in the broader area include the State of New York, Albany Medical Center, and professional services firms. Public amenities include Five Rivers Environmental Education Center, the Bethlehem YMCA, Elm Avenue Park with a pool complex, and the Bethlehem Public Library. Delmar is located minutes from downtown Albany via Route 443 and I-787. For investors, limited multifamily inventory in Delmar trades at a premium, but the 2.9% vacancy rate — the lowest among Bethlehem hamlets — and strong tenant retention support reliable long-term hold performance." },
  "East Greenbush": { medianPrice: 285000, avgRent2Bed: 1450, avgRent3Bed: 1750, capRate: 7.2, daysOnMarket: 28, inventoryCount: 14, yoyAppreciation: 6.8, vacancyRate: 4.1, popGrowth: 1.2, medianHHIncome: 78500, walkScore: 42, schoolDistrict: "East Greenbush Central", schoolRating: "A", description: "Located across the Hudson River from Albany in Rensselaer County, East Greenbush provides access to Capital District employment centers via I-90 and Routes 9 & 20. The town is served by the A-rated East Greenbush Central School District. Significant area employers include Regeneron Pharmaceuticals (neighboring Rensselaer), the State of New York, and healthcare and technology firms. Public amenities include Best Luther Forest, multiple golf courses, and a growing commercial corridor along Routes 9 & 20 with restaurants and retail. The Rensselaer County Cooperative Extension is also located here. For investors, East Greenbush offers a 7.2% cap rate and 6.8% annual appreciation at a lower median price than comparable western-suburb markets with similarly rated school districts." },
  "Guilderland": { medianPrice: 340000, avgRent2Bed: 1550, avgRent3Bed: 1900, capRate: 6.1, daysOnMarket: 22, inventoryCount: 13, yoyAppreciation: 5.5, vacancyRate: 3.4, popGrowth: 1.0, medianHHIncome: 86000, walkScore: 32, schoolDistrict: "Guilderland Central", schoolRating: "A", description: "A western suburb of Albany anchored by Crossgates Mall, one of the largest shopping centers in the northeast. The town is served by the A-rated Guilderland Central School District. Major employers include Crossgates Mall and its tenants, Broadview Federal Credit Union (formerly SEFCU), and the University at Albany nearby. Public amenities include Indian Ladder Farms, the Helderberg Escarpment for hiking, Tawasentha Park, and a dining corridor along Route 20. The Helderberg foothills provide outdoor recreation including trails and scenic overlooks. For investors, Guilderland posts 3.4% vacancy with steady appreciation and low turnover. Rental demand is supported by the large retail and commercial employment base and proximity to major educational institutions." },
  "Latham": { medianPrice: 295000, avgRent2Bed: 1475, avgRent3Bed: 1800, capRate: 7.0, daysOnMarket: 20, inventoryCount: 11, yoyAppreciation: 6.2, vacancyRate: 3.6, popGrowth: 0.8, medianHHIncome: 74000, walkScore: 40, schoolDistrict: "North Colonie", schoolRating: "A-", description: "A hamlet within the Town of Colonie, Latham is centrally located along the Route 9 commercial corridor with direct highway access via I-87 (Northway) and Route 7. The area is served by the A-minus-rated North Colonie School District. Major employers include Plug Power (hydrogen fuel cells), the Watervliet Arsenal nearby, and numerous retail and commercial businesses along Route 9. Public amenities include Pruyn House (cultural events venue), Stump Pond, and the Mohawk-Hudson Bike-Hike Trail. The Latham Circle area has undergone significant commercial redevelopment, and Latham Farms provides additional retail. For investors, Latham's central location and 7.0% cap rate offer a balance of cashflow and appreciation, with rental demand supported by the surrounding tech and commercial employment corridors." },
  "Malta": { medianPrice: 395000, avgRent2Bed: 1700, avgRent3Bed: 2100, capRate: 5.5, daysOnMarket: 21, inventoryCount: 9, yoyAppreciation: 5.8, vacancyRate: 2.8, popGrowth: 2.4, medianHHIncome: 96000, walkScore: 24, schoolDistrict: "Ballston Spa", schoolRating: "B", description: "The fastest-growing municipality in the Capital Region by population growth (2.4% annually), Malta's expansion has been driven primarily by GlobalFoundries, one of the world's largest semiconductor manufacturers, operating a major fabrication facility at Luther Forest Technology Campus. The campus has attracted a cluster of supporting technology and engineering firms. The town is served by the Ballston Spa Central School District. Public amenities include Saratoga National Historical Park, the Luther Forest trail system, Malta Community Park, and proximity to Saratoga Lake for boating and recreation. Round Lake, a Victorian-era village within Malta, hosts summer concert series. For investors, Malta posts the lowest vacancy rate in the region at 2.8% with premium rents driven by proximity to GlobalFoundries. Lower cap rates position this as a long-term appreciation and rent-growth play." },
  "Mechanicville": { medianPrice: 195000, avgRent2Bed: 1250, avgRent3Bed: 1500, capRate: 8.4, daysOnMarket: 19, inventoryCount: 6, yoyAppreciation: 9.4, vacancyRate: 4.6, popGrowth: 0.2, medianHHIncome: 49000, walkScore: 72, schoolDistrict: "Mechanicville", schoolRating: "C", description: "A compact city along the Hudson River in southern Saratoga County, Mechanicville posts one of the highest walk scores in the Capital Region at 72. Major area employers include Momentive Performance Materials, local government, and small businesses, with commuter access to Saratoga Springs, Clifton Park, and Albany. The downtown features a traditional grid layout with local restaurants and retail. Public amenities include Hudson Riverside Park and proximity to Saratoga Lake and the Lock 4 area of the Erie Canal. Annual community events include a Memorial Day Parade and seasonal festivals. For investors, the sub-$200k median price combined with 9.4% annual appreciation and 8.4% cap rate positions Mechanicville as a high-cashflow market, though the 4.6% vacancy rate is slightly above the metro average." },
  "Niskayuna": { medianPrice: 330000, avgRent2Bed: 1525, avgRent3Bed: 1875, capRate: 6.2, daysOnMarket: 23, inventoryCount: 8, yoyAppreciation: 5.3, vacancyRate: 3.2, popGrowth: 0.5, medianHHIncome: 88000, walkScore: 30, schoolDistrict: "Niskayuna Central", schoolRating: "A", description: "A suburban town in Schenectady County, Niskayuna is home to the Knolls Atomic Power Laboratory (operated by GE-Hitachi for the U.S. Navy) and is proximate to the GE Research campus. The town is served by the A-rated Niskayuna Central School District, one of the top-performing districts in the region. Public amenities include the Mohawk-Hudson Bike-Hike Trail, Aqueduct Park, Blatnick Park with sports fields and playgrounds, and the Niskayuna Co-op community center. The town provides easy access to both Schenectady and Albany via Route 7 and I-890. For investors, Niskayuna's limited multifamily inventory constrains supply, producing a 3.2% vacancy rate. Rental demand is supported by employment at Knolls/GE and the strong school district rating." },
  "Rensselaer": { medianPrice: 195000, avgRent2Bed: 1300, avgRent3Bed: 1550, capRate: 8.3, daysOnMarket: 24, inventoryCount: 7, yoyAppreciation: 7.8, vacancyRate: 4.9, popGrowth: 0.4, medianHHIncome: 50200, walkScore: 55, schoolDistrict: "Rensselaer City", schoolRating: "C-", description: "Located directly across the Hudson River from downtown Albany, the City of Rensselaer features waterfront access and the Albany-Rensselaer Amtrak station, one of the busiest stations in the nation outside the Northeast Corridor. Major employers include Regeneron Pharmaceuticals (operating a large campus south of the city), AMRI Global, and SUNY Polytechnic. Public amenities include Crailo State Historic Site and De Laet's Landing waterfront development. Pedestrian access to Albany is available via the Dunn Memorial Bridge. The city contains significant multifamily housing stock. For investors, the combination of sub-$200k entry points, 8.3% cap rate, Regeneron-driven employment growth, and Amtrak/Albany proximity creates a strong value-oriented investment thesis." },
  "Rotterdam": { medianPrice: 225000, avgRent2Bed: 1300, avgRent3Bed: 1550, capRate: 7.9, daysOnMarket: 23, inventoryCount: 15, yoyAppreciation: 7.3, vacancyRate: 4.5, popGrowth: 0.3, medianHHIncome: 58000, walkScore: 35, schoolDistrict: "Mohonasen", schoolRating: "C", description: "A large suburban town west of Schenectady, Rotterdam is proximate to Schenectady's major employment centers. Area employers include GE Vernova in Schenectady, Rivers Casino and Resort, MVP Health Care, and Ellis Medicine. The town is served by the Mohonasen Central School District. Public amenities include Rotterdam Junction's canal heritage sites, Maalwyck Park, and the Route 7 commercial corridor with shopping and dining. Rotterdam Square Mall and the nearby Altamont Fair provide additional commercial and entertainment options. For investors, Rotterdam offers some of the strongest rent-to-price ratios in Schenectady County with a 7.9% cap rate, 7.3% annual appreciation, and a median entry point of $225k — positioning it as a cashflow-forward market." },
  "Saratoga Springs": { medianPrice: 425000, avgRent2Bed: 1800, avgRent3Bed: 2200, capRate: 5.9, daysOnMarket: 32, inventoryCount: 11, yoyAppreciation: 5.4, vacancyRate: 3.2, popGrowth: 2.1, medianHHIncome: 92000, walkScore: 58, schoolDistrict: "Saratoga Springs", schoolRating: "A", description: "Saratoga Springs is anchored by the Saratoga Race Course (the oldest thoroughbred racing venue in the country), Saratoga Performing Arts Center (SPAC), and Saratoga Spa State Park. The city features a downtown commercial district along Broadway with restaurants, retail, and cultural venues. Major employers include Saratoga Hospital, Skidmore College, GlobalFoundries nearby, and a growing technology sector. Public amenities include mineral springs, Congress Park, Saratoga Lake access, and proximity to the Adirondack Park. The city is served by the A-rated Saratoga Springs Central School District. For investors, Saratoga's tourism infrastructure creates a seasonal revenue overlay on top of year-round rental demand, with short-term rental potential during track season (July-September) and SPAC events. The 3.2% vacancy rate and 2.1% population growth support long-term appreciation." },
  "Schenectady": { medianPrice: 195000, avgRent2Bed: 1250, avgRent3Bed: 1500, capRate: 8.6, daysOnMarket: 25, inventoryCount: 19, yoyAppreciation: 9.1, vacancyRate: 5.8, popGrowth: 0.1, medianHHIncome: 44800, walkScore: 62, schoolDistrict: "Schenectady City", schoolRating: "C", description: "Known historically as the birthplace of General Electric, Schenectady remains a center of industry and innovation. Major employers include GE Vernova (power and renewables), Rivers Casino and Resort, Ellis Medicine, MVP Health Care, Schenectady County Community College, and Union College. The downtown has undergone revitalization including Proctors Theatre (hosting Broadway tours and concerts), Mohawk Harbor waterfront development with Rivers Casino, and new restaurants. Public amenities include Central Park, the Stockade District (one of the oldest continuously occupied neighborhoods in America), and Mohawk River access. For investors, Schenectady posts the highest cap rates in the metro area at 8.6% with 9.1% annual appreciation and the largest active multifamily inventory (19 listings), making it the Capital Region's primary cashflow and value-add market." },
  "Scotia": { medianPrice: 210000, avgRent2Bed: 1275, avgRent3Bed: 1525, capRate: 8.1, daysOnMarket: 21, inventoryCount: 5, yoyAppreciation: 8.0, vacancyRate: 4.3, popGrowth: 0.4, medianHHIncome: 53000, walkScore: 60, schoolDistrict: "Scotia-Glenville", schoolRating: "B-", description: "A village along the Mohawk River directly across from Schenectady, Scotia features a walkable downtown along a traditional Main Street. The village is served by the Scotia-Glenville Central School District and is proximate to GE Vernova, Rivers Casino, and other Schenectady-area employers. Public amenities include Collins Park along the river, Freedom Park (summer concerts and events), Jumpin' Jacks (a seasonal dining destination), and the Glen Sanders Mansion. The downtown features locally owned shops and restaurants. For investors, Scotia's inventory is among the tightest in the metro (5 active listings), which constrains supply and supports an 8.1% cap rate with 8.0% annual appreciation. The 60 walk score and small multifamily stock produce strong rent-to-price ratios." },
  "Troy": { medianPrice: 215000, avgRent2Bed: 1350, avgRent3Bed: 1600, capRate: 8.1, daysOnMarket: 22, inventoryCount: 23, yoyAppreciation: 8.2, vacancyRate: 5.3, popGrowth: 0.8, medianHHIncome: 52000, walkScore: 71, schoolDistrict: "Troy City", schoolRating: "B", description: "Troy is the seat of Rensselaer County and home to two major educational institutions: Rensselaer Polytechnic Institute (RPI) and Russell Sage College. Major employers include RPI, Regeneron Pharmaceuticals (nearby), Albany Medical Center, and a growing technology and startup sector. The downtown features the Troy Waterfront Farmers Market, restaurants, boutique retail, and art galleries. Public amenities include Prospect Park with Hudson Valley views, Riverfront Park, the Uncle Sam Bikeway, and significant Victorian-era architectural stock. Troy posts the highest walk score in the Capital Region at 71 and the largest multifamily inventory at 23 active listings. For investors, Troy combines 8.1% cap rates with 8.2% annual appreciation. Rental demand is supported by approximately 12,000 enrolled students at RPI and Russell Sage combined, plus downtown revitalization momentum." },
  "Waterford": { medianPrice: 220000, avgRent2Bed: 1275, avgRent3Bed: 1525, capRate: 7.8, daysOnMarket: 26, inventoryCount: 4, yoyAppreciation: 6.9, vacancyRate: 3.9, popGrowth: 0.3, medianHHIncome: 62000, walkScore: 45, schoolDistrict: "Waterford-Halfmoon", schoolRating: "C+", description: "The oldest incorporated village in the United States, Waterford is located at the confluence of the Mohawk and Hudson Rivers in southern Saratoga County. The village is home to the Waterford Flight, a set of five Erie Canal locks that raises boats 169 feet. Major employers include Momentive Performance Materials (silicones manufacturing) and the Waterford-Halfmoon School District, with commuter access to Albany, Troy, and Saratoga County via I-87 and I-787. Public amenities include Peebles Island State Park at the river confluence and the annual Waterford Tugboat Roundup. Historic architecture is prevalent throughout the village. For investors, Waterford's extremely limited inventory (4 active listings) constrains supply and produces a 3.9% vacancy rate. The 7.8% cap rate and commuter highway access support steady rental demand." },
  "Watervliet": { medianPrice: 175000, avgRent2Bed: 1200, avgRent3Bed: 1400, capRate: 9.1, daysOnMarket: 18, inventoryCount: 9, yoyAppreciation: 10.5, vacancyRate: 5.4, popGrowth: -0.1, medianHHIncome: 43500, walkScore: 66, schoolDistrict: "Watervliet City", schoolRating: "C", description: "Watervliet is home to the Watervliet Arsenal, the oldest continuously operating weapons manufacturing facility in the United States, producing cannon and mortar systems for the U.S. military. The Arsenal provides a stable federal employment base. Other area employers include Momentive, the City of Watervliet, and local businesses. The city is compact with a 66 walk score and located minutes from downtown Albany. Public amenities include Hudson River access and proximity to I-787 for regional commuting. For investors, Watervliet posts the lowest median price ($175k) and highest cap rate (9.1%) in the metro area, combined with 10.5% year-over-year appreciation — the fastest in the region. The 18-day average days on market indicates strong transaction velocity. This is the Capital Region's most aggressive cashflow-oriented market." },
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

// ============================================
// PDF EXPORT (NEW)
// ============================================
function exportPDF(title, rows, subtitle) {
  const w = window.open("", "_blank");
  if (!w) { alert("Allow popups to export PDF"); return; }
  const rowsHtml = rows.map(function(row) {
    var l = row[0], v = row[1], highlight = row[2];
    if (l === "---") return '<tr><td colspan="2" style="padding:14px 0 4px 0;font-size:10px;font-weight:800;color:#1b4812;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #1b4812">' + v + '</td></tr>';
    return '<tr><td style="padding:6px 14px;border-bottom:1px solid #edf0f3;color:#5a6d82;font-weight:500;font-size:13px">' + l + '</td><td style="padding:6px 14px;border-bottom:1px solid #edf0f3;text-align:right;font-weight:' + (highlight ? '700' : '600') + ';font-size:13px;color:' + (highlight === 'green' ? '#1b4812' : highlight === 'red' ? '#dc2626' : '#1c2b3d') + '">' + v + '</td></tr>';
  }).join("");
  w.document.write('<!DOCTYPE html><html><head><title>' + title + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap" rel="stylesheet">' +
    '<style>*{margin:0;box-sizing:border-box;font-family:"DM Sans",sans-serif}@media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body style="padding:48px;max-width:720px;margin:auto;background:#fff">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;padding-bottom:14px;border-bottom:3px solid #1b4812">' +
    '<div><div style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;color:#1c2b3d">CAPITAL REGION INVESTOR HUB</div>' +
    '<div style="font-size:10px;color:#1b4812;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:2px">Empire Real Estate Firm</div></div>' +
    '<div style="text-align:right"><div style="font-size:11px;color:#5a6d82">' + new Date().toLocaleDateString() + '</div>' +
    '<div style="font-size:11px;color:#5a6d82">investcapitalregion.com</div></div></div>' +
    '<h2 style="font-family:Bebas Neue,sans-serif;font-size:26px;margin-bottom:4px;color:#1c2b3d;letter-spacing:1.5px">' + title + '</h2>' +
    (subtitle ? '<p style="font-size:12px;color:#5a6d82;margin-bottom:20px">' + subtitle + '</p>' : '<div style="margin-bottom:20px"></div>') +
    '<table style="width:100%;border-collapse:collapse">' + rowsHtml + '</table>' +
    '<div style="margin-top:40px;padding-top:14px;border-top:2px solid #1b4812;text-align:center">' +
    '<p style="font-size:11px;color:#5a6d82;margin:0 0 4px 0">Prepared by Ethan Harris &middot; Empire Real Estate Firm &middot; Capital Region, NY</p>' +
    '<p style="font-size:11px;color:#5a6d82;margin:0 0 4px 0">(518) 588-1122 &middot; Ethan@EmpireRealEstateFirm.com</p>' +
    '<p style="font-size:9px;color:#8a9bb0;margin-top:8px">This analysis is for informational purposes only. Not financial advice.</p></div>' +
    '<div class="no-print" style="text-align:center;margin-top:24px">' +
    '<button onclick="window.print()" style="padding:11px 32px;background:#1b4812;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;font-family:DM Sans,sans-serif;letter-spacing:0.5px">Download PDF</button></div>' +
    '</body></html>');
  w.document.close();
}

// ============================================
// SHARED COMPONENTS
// ============================================
function StatCard({ label, value, sub, accent }) {
  return (<div style={{ background: B.navyLight, border: "1px solid " + B.grayBorder, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
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
        onChange={function(e) { onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value); }}
        style={{ width: "100%", padding: prefix ? "10px 12px 10px 26px" : suffix ? "10px 38px 10px 12px" : "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 8, color: B.white, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border 0.2s" }}
        onFocus={function(e) { e.target.style.borderColor = B.green; }} onBlur={function(e) { e.target.style.borderColor = "rgba(27,72,18,0.25)"; }} />
      {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: B.grayMuted, fontSize: 11, fontWeight: 600 }}>{suffix}</span>}
    </div>
  </div>);
}

var sLabel = function(t) { return <div style={{ fontSize: 11, fontWeight: 800, color: B.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>{t}</div>; };
var pStyle = { background: B.navyLight, border: "1px solid " + B.grayBorder, borderRadius: 10, padding: 16, marginBottom: 14 };
var pH = function(t) { return <div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>{t}</div>; };
var rw = function(l, v, bold, pos) { return (<div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: bold ? "1px solid rgba(27,72,18,0.2)" : "none", marginTop: bold ? 4 : 0, paddingTop: bold ? 6 : 4 }}>
  <span style={{ fontSize: 12, color: bold ? B.greenLight : B.grayText, fontWeight: bold ? 700 : 400 }}>{l}</span>
  <span style={{ fontSize: 12, fontWeight: bold ? 800 : 500, color: bold ? (pos !== undefined ? (pos ? "#4ade80" : "#ef4444") : B.white) : B.white }}>{v}</span>
</div>); };

function StrategyToggle({ value, onChange }) {
  return (<div style={{ display: "flex", gap: 4, marginBottom: 18, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
    {[["ltr", "Long-Term"], ["str", "Short-Term"], ["mtr", "Mid-Term"], ["flip", "Flip"], ["brrrr", "BRRRR"]].map(function(pair) { var k = pair[0], l = pair[1]; return (
      <button key={k} onClick={function() { onChange(k); }} style={{ flex: 1, minWidth: 80, padding: "8px 12px", fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: "none", background: value === k ? B.green : "transparent", color: value === k ? B.white : B.grayMuted, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, transition: "all 0.2s" }}>{l}</button>
    ); })}
  </div>);
}

function ActionBtn({ label, onClick, primary, small }) {
  return <button onClick={onClick} style={{ padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 11 : 12, fontWeight: primary ? 700 : 600, borderRadius: 6, cursor: "pointer", border: primary ? "1px solid " + B.green : "1px solid rgba(27,72,18,0.2)", background: primary ? B.green : "transparent", color: primary ? B.white : B.grayText, fontFamily: "'DM Sans', sans-serif" }}>{label}</button>;
}

// ============================================
// LEAD GATE
// ============================================
var BLOCKED_DOMAINS = ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","sharklasers.com","guerrillamailblock.com","grr.la","dispostable.com","trashmail.com","fakeinbox.com","mailnesia.com","tempail.com","tempr.email","10minutemail.com","mohmal.com","getnada.com","emailondeck.com","temp-mail.org","maildrop.cc","harakirimail.com","33mail.com","spam4.me","trash-mail.com"];

function LeadGate({ onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interests: [] });
  const [errors, setErrors] = useState({});
  const [vis, setVis] = useState(0);
  var validate = function() {
    var e = {};
    var nameParts = form.name.trim().split(/\s+/);
    if (!form.name.trim()) e.name = "Required";
    else if (nameParts.length < 2 || nameParts.some(function(p) { return p.length < 2; })) e.name = "Please enter your full name (first and last)";
    var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!form.email.trim()) e.email = "Required";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email address";
    else { var domain = form.email.split("@")[1].toLowerCase(); if (BLOCKED_DOMAINS.includes(domain)) e.email = "Please use a permanent email address"; }
    var digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "Required";
    else if (digits.length < 10) e.phone = "Enter a valid 10-digit phone number";
    else if (digits.length > 11) e.phone = "Phone number is too long";
    else if (digits.length === 10 && digits[0] === "0") e.phone = "Enter a valid US phone number";
    else if (digits.length === 10 && digits[0] === "1") e.phone = "Don't include the country code, just 10 digits";
    if (form.interests.length === 0) e.interests = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  var toggleInterest = function(v) { setForm(function(prev) { return { ...prev, interests: prev.interests.includes(v) ? prev.interests.filter(function(i) { return i !== v; }) : [...prev.interests, v] }; }); };
  useEffect(function() { var t = setTimeout(function() { setVis(1); }, 200); return function() { clearTimeout(t); }; }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(170deg, " + B.navyDeep + " 0%, " + B.navy + " 40%, " + B.navyLight + " 100%)", fontFamily: "'DM Sans', sans-serif", padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 500, height: 500, background: "radial-gradient(circle, " + B.greenGlow + " 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ maxWidth: 460, width: "100%", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(30px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}><EmpireLogo size={44} /></div>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: B.green, marginBottom: 8, fontWeight: 800 }}>Empire Real Estate Firm</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, fontWeight: 400, color: B.white, margin: 0, lineHeight: 1.05, letterSpacing: 2.5, marginBottom: 10 }}>CAPITAL REGION<br/>INVESTOR HUB</h1>
          <p style={{ color: B.grayText, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Multifamily deal analysis, market intelligence, and equity insights for the Capital District.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(27,72,18,0.2)", borderRadius: 14, padding: 28 }}>
          {[{ key: "name", label: "Full Name", type: "text", placeholder: "Your name" }, { key: "email", label: "Email", type: "email", placeholder: "you@email.com" }, { key: "phone", label: "Phone", type: "tel", placeholder: "(518) 555-0000" }].map(function(f) { return (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={function(e) { setForm({ ...form, [f.key]: e.target.value }); if (errors[f.key]) setErrors(function(prev) { var n = {...prev}; delete n[f.key]; return n; }); }} style={{ width: "100%", padding: "11px 14px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: errors[f.key] ? "1px solid #e74c3c" : "1px solid rgba(27,72,18,0.2)", borderRadius: 8, color: B.white, outline: "none", transition: "border 0.2s", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} onFocus={function(e) { e.target.style.borderColor = B.green; }} onBlur={function(e) { e.target.style.borderColor = errors[f.key] ? "#e74c3c" : "rgba(27,72,18,0.2)"; }} />
              {errors[f.key] && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>{errors[f.key]}</div>}
            </div>
          ); })}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>I'm interested in... <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.7 }}>(select all that apply)</span></label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["exploring", "Exploring"], ["buying", "Buying"], ["scaling", "Scaling"], ["1031", "1031 Exchange"], ["portfolio", "Evaluating My Portfolio"]].map(function(pair) { var v = pair[0], l = pair[1];
                var sel = form.interests.includes(v);
                return <button key={v} onClick={function() { toggleInterest(v); }} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: sel ? "1px solid " + B.green : errors.interests ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(27,72,18,0.15)", background: sel ? "rgba(27,72,18,0.2)" : "transparent", color: sel ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: "all 0.2s" }}>{sel ? "✓ " : ""}{l}</button>;
              })}
            </div>
          </div>
          <button onClick={function() { if (validate()) onSubmit(form); }} style={{ width: "100%", padding: "13px 24px", fontSize: 14, fontWeight: 700, background: B.green, color: B.white, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.8, textTransform: "uppercase", boxShadow: "0 4px 20px " + B.greenGlow }} onMouseEnter={function(e) { e.target.style.transform = "translateY(-1px)"; e.target.style.background = B.greenLight; }} onMouseLeave={function(e) { e.target.style.transform = "translateY(0)"; e.target.style.background = B.green; }}>Access Free Tools →</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}><p style={{ color: B.grayMuted, fontSize: 11, margin: 0 }}>Ethan Harris · Real Estate Salesperson · (518) 588-1122</p></div>
      </div>
    </div>
  );
}

// ============================================
// DEAL ANALYZER (LTR / STR / MTR)
// ============================================
function DealAnalyzer({ onTrack }) {
  const [strategy, setStrategy] = useState("ltr");
  const [savedDeals, setSavedDeals] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [d, setD] = useState({
    address: "", units: 4, purchasePrice: 400000, downPct: 25, rate: 7.0, term: 30,
    grossRent: 5200, otherIncome: 0, vacancy: 5,
    adr: 150, occupancy: 65, cleaningFee: 85, turnoversPerMonth: 8, platformFeePct: 15, strOtherIncome: 0,
    mtrMonthlyRent: 2200, mtrUnits: 4, mtrVacancyWeeks: 2, mtrPlatformPct: 3, mtrOtherIncome: 0,
    furnishingTotal: 15000,
    maintenancePct: 5, capexPct: 5, management: 0,
    taxes: 6000, insurance: 2400, utilities: 0, otherExp: 0,
    lenderFees: 1, attorneyFees: 1000, titleFees: 2200, appraisal: 660, sellerConcession: 0,
    // Flip fields
    flipArv: 350000, flipMaoPct: 70, flipRehab: 50000, flipClosing: 12000, flipHoldingMonths: 4, flipHoldingPerMonth: 1500, flipSellingPct: 6,
    // BRRRR fields
    brrrrRehab: 40000, brrrrClosing: 15000, brrrrHoldInterest: 0, brrrrHoldRentCollected: 0, brrrrArv: 325000,
    brrrrRefiLtv: 75, brrrrRefiRate: 7.25, brrrrRefiTerm: 30,
    brrrrGrossRent: 3250, brrrrVacancy: 5,
    brrrrInsurance: 900, brrrrTaxes: 3767, brrrrWaterSewer: 1176, brrrrMaintPct: 5, brrrrCapxPct: 5, brrrrTrash: 0, brrrrLawn: 600
  });
  var u = function(k) { return function(v) { setD({ ...d, [k]: v }); }; };
  useEffect(function() { loadAnalyses(DEALS_KEY).then(setSavedDeals); }, []);
  var handleSave = async function() {
    var label = d.address || "Untitled Deal";
    var updated = await saveAnalysis(DEALS_KEY, { ...d, strategy: strategy, label: label });
    setSavedDeals(updated); setSaveMsg("Saved!"); setTimeout(function() { setSaveMsg(""); }, 2000);
    if (onTrack) onTrack("deal_saved", label + " | " + strategy.toUpperCase() + " | " + fmtD(d.purchasePrice) + (d.units ? " | " + d.units + " units" : ""));
  };
  var handleLoad = function(saved) { var rest = Object.assign({}, saved); delete rest.id; delete rest.savedAt; delete rest.label; var s = saved.strategy; if (s) setStrategy(s); delete rest.strategy; setD(function(prev) { return { ...prev, ...rest }; }); setShowSaved(false); if (onTrack) onTrack("deal_loaded", saved.label + " | " + (saved.strategy || "").toUpperCase()); };
  var handleDelete = async function(id) { var updated = await deleteAnalysis(DEALS_KEY, id); setSavedDeals(updated); };

  // ---- RENTAL CALCS (LTR/STR/MTR) ----
  var isRental = strategy === "ltr" || strategy === "str" || strategy === "mtr";
  var dp = d.purchasePrice * (d.downPct / 100);
  var loan = d.purchasePrice - dp;
  var mr = d.rate / 100 / 12;
  var tp = d.term * 12;
  var mtg = mr > 0 ? loan * (mr * Math.pow(1 + mr, tp)) / (Math.pow(1 + mr, tp) - 1) : loan / tp;
  var annMtg = mtg * 12;
  var furnishing = (strategy === "str" || strategy === "mtr") ? d.furnishingTotal : 0;
  var lenderFeeDollars = loan * (d.lenderFees / 100);
  var closingCosts = lenderFeeDollars + d.attorneyFees + d.titleFees + d.appraisal;
  var totalCashInvested = dp + furnishing + closingCosts - d.sellerConcession;

  var gri = 0, egi = 0;
  if (strategy === "str") {
    var bookingRev = d.adr * (d.occupancy / 100) * 365;
    var cleanRev = d.cleaningFee * d.turnoversPerMonth * 12;
    gri = bookingRev + cleanRev + d.strOtherIncome * 12;
    egi = gri * (1 - d.platformFeePct / 100);
  } else if (strategy === "mtr") {
    var occMonths = 12 - (d.mtrVacancyWeeks / 4.33);
    gri = (d.mtrMonthlyRent * d.mtrUnits * occMonths) + d.mtrOtherIncome * 12;
    egi = gri * (1 - d.mtrPlatformPct / 100);
  } else if (strategy === "ltr") {
    gri = (d.grossRent + d.otherIncome) * 12;
    egi = gri * (1 - d.vacancy / 100);
  }
  var maintenanceDollar = gri * (d.maintenancePct / 100);
  var capexDollar = gri * (d.capexPct / 100);
  var mgmtDollar = egi * (d.management / 100);
  var totExp = d.taxes + d.insurance + maintenanceDollar + capexDollar + mgmtDollar + d.utilities * 12 + d.otherExp * 12;
  var noi = egi - totExp;
  var cf = noi - annMtg;
  var cfDoor = d.units > 0 ? cf / d.units / 12 : 0;
  var cap = d.purchasePrice > 0 ? (noi / d.purchasePrice) * 100 : 0;
  var coc = totalCashInvested > 0 ? (cf / totalCashInvested) * 100 : 0;
  var dscr = annMtg > 0 ? noi / annMtg : Infinity;
  var grm = gri > 0 ? d.purchasePrice / gri : 0;
  var expR = egi > 0 ? (totExp / egi) * 100 : 0;
  var gc = function(m, v) { if (m === "cap") return v >= 8 ? "#4ade80" : v >= 6 ? B.greenLight : "#ef4444"; if (m === "coc") return v >= 10 ? "#4ade80" : v >= 6 ? B.greenLight : "#ef4444"; if (m === "dscr") return v >= 1.25 ? "#4ade80" : v >= 1.0 ? B.greenLight : "#ef4444"; if (m === "cf") return v >= 200 ? "#4ade80" : v >= 100 ? B.greenLight : "#ef4444"; return B.white; };
  var proj = Array.from({ length: 5 }, function(_, i) { var y = i + 1; return { y: y, v: d.purchasePrice * Math.pow(1.03, y), n: noi * Math.pow(1.03, y), c: noi * Math.pow(1.03, y) - annMtg }; });

  // ---- FLIP CALCS ----
  var flipMao = (d.flipMaoPct / 100) * d.flipArv - d.flipRehab;
  var flipTotalHolding = d.flipHoldingPerMonth * d.flipHoldingMonths;
  var flipTotalInvested = d.purchasePrice + d.flipRehab + d.flipClosing + flipTotalHolding;
  var flipSellingCosts = d.flipArv * (d.flipSellingPct / 100);
  var flipNetProceeds = d.flipArv - flipSellingCosts;
  var flipProfit = flipNetProceeds - flipTotalInvested;
  var flipRoi = flipTotalInvested > 0 ? (flipProfit / flipTotalInvested) * 100 : 0;
  var flipAnnRoi = d.flipHoldingMonths > 0 ? flipRoi * (12 / d.flipHoldingMonths) : 0;

  // ---- BRRRR CALCS ----
  var brrrrTotalAllIn = d.purchasePrice + d.brrrrRehab + d.brrrrClosing + d.brrrrHoldInterest - d.brrrrHoldRentCollected;
  var brrrrRefiLoan = d.brrrrArv * (d.brrrrRefiLtv / 100);
  var brrrrCashLeftIn = brrrrTotalAllIn - brrrrRefiLoan;
  var brrrrMr = (d.brrrrRefiRate / 100) / 12;
  var brrrrTp = d.brrrrRefiTerm * 12;
  var brrrrMtg = brrrrMr > 0 ? brrrrRefiLoan * (brrrrMr * Math.pow(1 + brrrrMr, brrrrTp)) / (Math.pow(1 + brrrrMr, brrrrTp) - 1) : brrrrRefiLoan / brrrrTp;
  var brrrrGri = d.brrrrGrossRent * 12;
  var brrrrVacDollar = brrrrGri * (d.brrrrVacancy / 100);
  var brrrrEgi = brrrrGri - brrrrVacDollar;
  var brrrrMaint = brrrrGri * (d.brrrrMaintPct / 100);
  var brrrrCapx = brrrrGri * (d.brrrrCapxPct / 100);
  var brrrrTotOpex = d.brrrrInsurance + d.brrrrTaxes + d.brrrrWaterSewer + brrrrMaint + brrrrCapx + d.brrrrTrash + d.brrrrLawn;
  var brrrrNoi = brrrrEgi - brrrrTotOpex;
  var brrrrAnnDebt = brrrrMtg * 12;
  var brrrrCf = brrrrNoi - brrrrAnnDebt;
  var brrrrDscr = brrrrAnnDebt > 0 ? brrrrNoi / brrrrAnnDebt : Infinity;
  var brrrrCapRate = d.brrrrArv > 0 ? (brrrrNoi / d.brrrrArv) * 100 : 0;
  var brrrrCoc = brrrrCashLeftIn > 0 ? (brrrrCf / brrrrCashLeftIn) * 100 : (brrrrCashLeftIn <= 0 ? Infinity : 0);

  // ---- PDF EXPORT ----
  var handleExportPDF = function() {
    var stratLabel = {ltr:"Long-Term Rental",str:"Short-Term Rental",mtr:"Mid-Term Rental",flip:"Flip",brrrr:"BRRRR"}[strategy];
    var rows = [];
    if (strategy === "flip") {
      rows = [
        ["---", "FLIP ANALYSIS"], ["Address", d.address || "\u2014"], ["Purchase Price", fmtD(d.purchasePrice)],
        ["After Repair Value (ARV)", fmtD(d.flipArv)],
        ["---", "COSTS"], ["Rehab", fmtD(d.flipRehab)], ["Closing Costs", fmtD(d.flipClosing)],
        ["Holding (" + d.flipHoldingMonths + " mo \u00D7 " + fmtD(d.flipHoldingPerMonth) + ")", fmtD(flipTotalHolding)],
        ["Total Invested", fmtD(flipTotalInvested)],
        ["---", "SALE"], ["ARV (Gross)", fmtD(d.flipArv)], ["Selling Costs (" + d.flipSellingPct + "%)", fmtD(flipSellingCosts)], ["Net Proceeds", fmtD(flipNetProceeds)],
        ["---", "RETURNS"], ["Estimated Profit", fmtD(flipProfit), flipProfit >= 0 ? "green" : "red"],
        ["ROI", fmtP(flipRoi), flipRoi >= 15 ? "green" : undefined], ["Annualized ROI", fmtP(flipAnnRoi)],
        ["---", "MAX OFFER"], ["MAO (" + d.flipMaoPct + "% \u00D7 ARV \u2212 Rehab)", fmtD(flipMao), "green"],
      ];
    } else if (strategy === "brrrr") {
      rows = [
        ["---", "BRRRR ANALYSIS"], ["Address", d.address || "\u2014"],
        ["---", "ACQUISITION"], ["Purchase Price", fmtD(d.purchasePrice)], ["Rehab Costs", fmtD(d.brrrrRehab)], ["Closing Costs", fmtD(d.brrrrClosing)],
        ["Hold Interest", fmtD(d.brrrrHoldInterest)], ["Rent Collected During Hold", fmtD(d.brrrrHoldRentCollected)], ["Total All-In", fmtD(brrrrTotalAllIn)],
        ["---", "REFINANCE"], ["ARV", fmtD(d.brrrrArv)], ["Refi LTV", d.brrrrRefiLtv + "%"], ["Refi Loan Amount", fmtD(brrrrRefiLoan)],
        ["Cash Left In / (Pulled Out)", fmtD(brrrrCashLeftIn), brrrrCashLeftIn <= 0 ? "green" : undefined],
        ["Refi Rate / Term", d.brrrrRefiRate + "% / " + d.brrrrRefiTerm + " yr"], ["Monthly Mortgage", fmtD(brrrrMtg)],
        ["---", "RENTAL P&L (ANNUAL)"], ["Gross Rent", fmtD(brrrrGri)], ["Vacancy (" + d.brrrrVacancy + "%)", "(" + fmtD(brrrrVacDollar) + ")"],
        ["EGI", fmtD(brrrrEgi)], ["Total OpEx", "(" + fmtD(brrrrTotOpex) + ")"], ["NOI", fmtD(brrrrNoi), "green"],
        ["Debt Service", "(" + fmtD(brrrrAnnDebt) + ")"], ["Annual Cashflow", fmtD(brrrrCf), brrrrCf >= 0 ? "green" : "red"],
        ["---", "METRICS"], ["DSCR", (brrrrDscr === Infinity ? "\u221E" : brrrrDscr.toFixed(2) + "x"), brrrrDscr >= 1.25 ? "green" : brrrrDscr < 1 ? "red" : undefined],
        ["Cap Rate", fmtP(brrrrCapRate)], ["Cash-on-Cash", brrrrCoc === Infinity ? "\u221E (no cash left in)" : fmtP(brrrrCoc), "green"],
      ];
    } else {
      rows = [
        ["---", "PROPERTY"], ["Address", d.address || "\u2014"], ["Units", d.units.toString()], ["Purchase Price", fmtD(d.purchasePrice)], ["Strategy", stratLabel],
        ["---", "FINANCING"], ["Down Payment", fmtD(dp) + " (" + d.downPct + "%)"], ["Loan Amount", fmtD(loan)], ["Rate / Term", d.rate + "% / " + d.term + " yr"], ["Monthly Mortgage", fmtD(mtg)],
        ["---", "INCOME"], ["Gross Revenue (Annual)", fmtD(gri)], ["Effective Gross Income", fmtD(egi)],
        ["---", "EXPENSES (ANNUAL)"],
        ["Taxes", fmtD(d.taxes)],
        ["Insurance", fmtD(d.insurance)],
        ["Maintenance (" + d.maintenancePct + "%)", fmtD(maintenanceDollar)],
        ["CapEx (" + d.capexPct + "%)", fmtD(capexDollar)],
      ];
      if (d.management > 0) rows.push(["Management (" + d.management + "%)", fmtD(mgmtDollar)]);
      if (d.utilities > 0) rows.push(["Utilities", fmtD(d.utilities * 12)]);
      if (d.otherExp > 0) rows.push(["Other Expenses", fmtD(d.otherExp * 12)]);
      rows.push(["Total Operating Expenses", fmtD(totExp)]);
      rows.push(
        ["---", "RETURNS"], ["NOI", fmtD(noi), "green"], ["Annual Cashflow", fmtD(cf), cf >= 0 ? "green" : "red"], ["Cash Flow / Door / Mo", fmtD(cfDoor), cfDoor >= 100 ? "green" : "red"],
        ["Cap Rate", fmtP(cap), cap >= 7 ? "green" : undefined], ["Cash-on-Cash Return", fmtP(coc), coc >= 8 ? "green" : undefined], ["DSCR", (dscr === Infinity ? "\u221E" : dscr.toFixed(2) + "x"), dscr >= 1.25 ? "green" : dscr < 1 ? "red" : undefined], ["GRM", grm.toFixed(1) + "x"], ["Expense Ratio", fmtP(expR)],
        ["---", "CASH TO CLOSE"],
        ["Down Payment", fmtD(dp)],
        ["Lender Fees (" + d.lenderFees + "%)", fmtD(lenderFeeDollars)],
        ["Attorney Fees", fmtD(d.attorneyFees)],
        ["Title Fees", fmtD(d.titleFees)]
      );
      if (d.appraisal > 0) rows.push(["Appraisal", fmtD(d.appraisal)]);
      if (strategy !== "ltr") rows.push(["Furnishing", fmtD(furnishing)]);
      rows.push(["Gross Closing Costs", fmtD(closingCosts)]);
      if (d.sellerConcession > 0) rows.push(["Seller Concession", "(" + fmtD(d.sellerConcession) + ")"]);
      rows.push(["Total Cash Invested", fmtD(totalCashInvested), "green"]);
    }
    exportPDF("Deal Analysis \u2014 " + (d.address || "Untitled"), rows, stratLabel);
    if (onTrack) onTrack("pdf_exported", "Deal Analysis | " + (d.address || "Untitled") + " | " + stratLabel);
  };

  // ---- RENDER ----
  return (
    <div>
      <StrategyToggle value={strategy} onChange={function(newStrat) {
        var prevStrat = strategy;
        setStrategy(newStrat);
        if (onTrack && newStrat !== prevStrat) onTrack("strategy_switched", "To: " + newStrat.toUpperCase());
        // Default purchase price to $200k when entering Flip or BRRRR from a rental strategy
        if ((newStrat === "flip" || newStrat === "brrrr") && (prevStrat === "ltr" || prevStrat === "str" || prevStrat === "mtr")) {
          setD(function(prev) { return { ...prev, purchasePrice: 200000 }; });
        }
        // Restore rental default when going back
        if ((newStrat === "ltr" || newStrat === "str" || newStrat === "mtr") && (prevStrat === "flip" || prevStrat === "brrrr")) {
          setD(function(prev) { return { ...prev, purchasePrice: 400000 }; });
        }
      }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <ActionBtn label="Save Analysis" onClick={handleSave} primary />
        <ActionBtn label={"My Saved (" + savedDeals.length + ")"} onClick={function() { setShowSaved(!showSaved); }} />
        <ActionBtn label="Export PDF" onClick={handleExportPDF} />
        {saveMsg && <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>{saveMsg}</span>}
      </div>
      {showSaved && savedDeals.length > 0 && (
        <div style={{ ...pStyle, marginBottom: 18, maxHeight: 200, overflowY: "auto" }}>
          {pH("Saved Analyses")}
          {savedDeals.map(function(s) { return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ cursor: "pointer", flex: 1 }} onClick={function() { handleLoad(s); }}>
                <div style={{ fontSize: 13, color: B.white, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: B.grayMuted }}>{(s.strategy || "").toUpperCase()} · {new Date(s.savedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={function() { handleDelete(s.id); }} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>✕</button>
            </div>
          ); })}
        </div>
      )}

      {/* ===== FLIP UI ===== */}
      {strategy === "flip" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {sLabel("Property")}
            <Field label="Address" value={d.address} onChange={u("address")} type="text" placeholder="123 Main St, Troy NY" />
            <Field label="Purchase Price" value={d.purchasePrice} onChange={u("purchasePrice")} prefix="$" step={1000} />

            {sLabel("After Repair Value")}
            <Field label="ARV (Estimated Resale)" value={d.flipArv} onChange={u("flipArv")} prefix="$" step={1000} />

            {sLabel("Project Costs")}
            <Field label="Rehab / Renovation" value={d.flipRehab} onChange={u("flipRehab")} prefix="$" step={1000} />
            <Field label="Closing Costs (Buy-Side)" value={d.flipClosing} onChange={u("flipClosing")} prefix="$" step={500} />
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <Field label="Holding Cost / Month" value={d.flipHoldingPerMonth} onChange={u("flipHoldingPerMonth")} prefix="$" small />
              <Field label="Hold Period (months)" value={d.flipHoldingMonths} onChange={u("flipHoldingMonths")} small />
            </div>
            <div style={{ fontSize: 9, color: B.grayMuted, marginTop: -8, marginBottom: 14 }}>Include loan interest, taxes, insurance, and utilities during hold.</div>

            {sLabel("Selling Costs")}
            <Field label="Agent Commission + Closing %" value={d.flipSellingPct} onChange={u("flipSellingPct")} suffix="%" step={0.5} />

            {sLabel("Maximum Allowable Offer")}
            <Field label="MAO Rule %" value={d.flipMaoPct} onChange={u("flipMaoPct")} suffix="%" step={1} />
            <div style={{ fontSize: 9, color: B.grayMuted, marginTop: -8 }}>Formula: MAO% × ARV − Rehab = Max Purchase Price</div>
          </div>
          <div>
            {sLabel("Key Metrics")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <StatCard label="Est. Profit" value={fmtD(flipProfit)} accent={flipProfit >= 0 ? "#4ade80" : "#ef4444"} />
              <StatCard label="ROI" value={fmtP(flipRoi)} accent={flipRoi >= 15 ? "#4ade80" : flipRoi >= 0 ? B.greenLight : "#ef4444"} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <StatCard label="Annualized ROI" value={fmtP(flipAnnRoi)} accent={flipAnnRoi >= 30 ? "#4ade80" : B.greenLight} />
              <StatCard label="Max Offer (MAO)" value={fmtD(flipMao)} accent={d.purchasePrice <= flipMao ? "#4ade80" : "#ef4444"} />
            </div>

            <div style={{ background: d.purchasePrice <= flipMao ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)", border: "1px solid " + (d.purchasePrice <= flipMao ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"), borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, color: d.purchasePrice <= flipMao ? "#4ade80" : "#ef4444" }}>{d.purchasePrice <= flipMao ? "Purchase is at or below MAO" : "Purchase exceeds MAO"}</div>
              <div style={{ fontSize: 13, color: B.white, fontWeight: 600 }}>{d.flipMaoPct}% × {fmtD(d.flipArv)} − {fmtD(d.flipRehab)} = <span style={{ color: "#4ade80" }}>{fmtD(flipMao)}</span></div>
              <div style={{ fontSize: 11, color: B.grayText, marginTop: 4 }}>Your purchase: {fmtD(d.purchasePrice)} ({d.purchasePrice <= flipMao ? "within" : fmtD(d.purchasePrice - flipMao) + " over"} MAO)</div>
            </div>

            <div style={pStyle}>
              {pH("Profit Breakdown")}
              {rw("Sale Price (ARV)", fmtD(d.flipArv))}
              {rw("Selling Costs (" + d.flipSellingPct + "%)", "(" + fmtD(flipSellingCosts) + ")")}
              {rw("Net Sale Proceeds", fmtD(flipNetProceeds))}
              {rw("Purchase Price", "(" + fmtD(d.purchasePrice) + ")")}
              {rw("Rehab", "(" + fmtD(d.flipRehab) + ")")}
              {rw("Closing Costs", "(" + fmtD(d.flipClosing) + ")")}
              {rw("Holding Costs", "(" + fmtD(flipTotalHolding) + ")")}
              {rw("Total Invested", fmtD(flipTotalInvested), true)}
              {rw("Net Profit", fmtD(flipProfit), true, flipProfit >= 0)}
            </div>
          </div>
        </div>
      )}

      {/* ===== BRRRR UI ===== */}
      {strategy === "brrrr" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {sLabel("Acquisition")}
            <Field label="Address" value={d.address} onChange={u("address")} type="text" placeholder="123 Main St, Troy NY" />
            <Field label="Purchase Price" value={d.purchasePrice} onChange={u("purchasePrice")} prefix="$" step={1000} />
            <Field label="Rehab Costs" value={d.brrrrRehab} onChange={u("brrrrRehab")} prefix="$" step={1000} />
            <Field label="Closing Costs" value={d.brrrrClosing} onChange={u("brrrrClosing")} prefix="$" step={500} />
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Interest During Rehab" value={d.brrrrHoldInterest} onChange={u("brrrrHoldInterest")} prefix="$" small />
              <Field label="Rent Collected in Hold" value={d.brrrrHoldRentCollected} onChange={u("brrrrHoldRentCollected")} prefix="$" small />
            </div>

            {sLabel("Refinance")}
            <Field label="After Repair Value (ARV)" value={d.brrrrArv} onChange={u("brrrrArv")} prefix="$" step={1000} />
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Refi LTV" value={d.brrrrRefiLtv} onChange={u("brrrrRefiLtv")} suffix="%" small />
              <Field label="Refi Rate" value={d.brrrrRefiRate} onChange={u("brrrrRefiRate")} suffix="%" small step={0.125} />
              <Field label="Term" value={d.brrrrRefiTerm} onChange={u("brrrrRefiTerm")} suffix="yr" small />
            </div>

            {sLabel("Rental Income (Monthly)")}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <Field label="Gross Monthly Rent" value={d.brrrrGrossRent} onChange={u("brrrrGrossRent")} prefix="$" small />
              <Field label="Vacancy" value={d.brrrrVacancy} onChange={u("brrrrVacancy")} suffix="%" small />
            </div>

            {sLabel("Operating Expenses (Annual)")}
            <div style={{ display: "flex", gap: 10 }}><Field label="Taxes" value={d.brrrrTaxes} onChange={u("brrrrTaxes")} prefix="$" small step={100} /><Field label="Insurance" value={d.brrrrInsurance} onChange={u("brrrrInsurance")} prefix="$" small step={100} /></div>
            <div style={{ display: "flex", gap: 10 }}><Field label="Water/Sewer" value={d.brrrrWaterSewer} onChange={u("brrrrWaterSewer")} prefix="$" small /><Field label="Trash" value={d.brrrrTrash} onChange={u("brrrrTrash")} prefix="$" small /></div>
            <div style={{ display: "flex", gap: 10 }}><Field label="Maintenance %" value={d.brrrrMaintPct} onChange={u("brrrrMaintPct")} suffix="%" small /><Field label="CapEx %" value={d.brrrrCapxPct} onChange={u("brrrrCapxPct")} suffix="%" small /></div>
            <Field label="Lawn/Snow" value={d.brrrrLawn} onChange={u("brrrrLawn")} prefix="$" />
          </div>
          <div>
            {sLabel("Key Metrics")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <StatCard label="DSCR" value={brrrrDscr === Infinity ? "\u221E" : brrrrDscr.toFixed(2) + "x"} accent={gc("dscr", brrrrDscr)} />
              <StatCard label="Cap Rate" value={fmtP(brrrrCapRate)} accent={gc("cap", brrrrCapRate)} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <StatCard label="Cash-on-Cash" value={brrrrCoc === Infinity ? "\u221E" : fmtP(brrrrCoc)} accent={brrrrCoc >= 10 || brrrrCoc === Infinity ? "#4ade80" : B.greenLight} sub={brrrrCashLeftIn <= 0 ? "no cash left in" : undefined} />
              <StatCard label="Monthly CF" value={fmtD(brrrrCf / 12)} accent={brrrrCf >= 0 ? "#4ade80" : "#ef4444"} />
            </div>

            <div style={{ background: brrrrCashLeftIn <= 0 ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)", border: "1px solid " + (brrrrCashLeftIn <= 0 ? "rgba(74,222,128,0.25)" : B.grayBorder), borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, color: brrrrCashLeftIn <= 0 ? "#4ade80" : B.grayText }}>{brrrrCashLeftIn <= 0 ? "Full cash recovery + " + fmtD(Math.abs(brrrrCashLeftIn)) + " pulled out" : fmtD(brrrrCashLeftIn) + " left in the deal"}</div>
              <div style={{ fontSize: 12, color: B.grayText }}>Total All-In: {fmtD(brrrrTotalAllIn)} | Refi Loan ({d.brrrrRefiLtv}% LTV): {fmtD(brrrrRefiLoan)}</div>
            </div>

            <div style={pStyle}>
              {pH("Acquisition")}
              {rw("Purchase Price", fmtD(d.purchasePrice))}
              {rw("Rehab", fmtD(d.brrrrRehab))}
              {rw("Closing Costs", fmtD(d.brrrrClosing))}
              {d.brrrrHoldInterest > 0 && rw("Hold Interest", fmtD(d.brrrrHoldInterest))}
              {d.brrrrHoldRentCollected > 0 && rw("Rent Collected (Hold)", "(" + fmtD(d.brrrrHoldRentCollected) + ")")}
              {rw("Total All-In", fmtD(brrrrTotalAllIn), true)}
            </div>

            <div style={pStyle}>
              {pH("Refinance")}
              {rw("ARV", fmtD(d.brrrrArv))}
              {rw("Refi Loan (" + d.brrrrRefiLtv + "% LTV)", fmtD(brrrrRefiLoan))}
              {rw("Cash Left In / (Out)", fmtD(brrrrCashLeftIn), true, brrrrCashLeftIn <= 0)}
              {rw("Monthly Mortgage", fmtD(brrrrMtg))}
            </div>

            <div style={pStyle}>
              {pH("Rental P&L (Annual)")}
              {rw("Gross Rent", fmtD(brrrrGri))}
              {rw("Vacancy (" + d.brrrrVacancy + "%)", "(" + fmtD(brrrrVacDollar) + ")")}
              {rw("Effective Gross Income", fmtD(brrrrEgi))}
              {rw("Insurance", "(" + fmtD(d.brrrrInsurance) + ")")}
              {rw("Taxes", "(" + fmtD(d.brrrrTaxes) + ")")}
              {rw("Water/Sewer", "(" + fmtD(d.brrrrWaterSewer) + ")")}
              {rw("Maintenance (" + d.brrrrMaintPct + "%)", "(" + fmtD(brrrrMaint) + ")")}
              {rw("CapEx (" + d.brrrrCapxPct + "%)", "(" + fmtD(brrrrCapx) + ")")}
              {d.brrrrTrash > 0 && rw("Trash", "(" + fmtD(d.brrrrTrash) + ")")}
              {d.brrrrLawn > 0 && rw("Lawn/Snow", "(" + fmtD(d.brrrrLawn) + ")")}
              {rw("Total Operating Expenses", "(" + fmtD(brrrrTotOpex) + ")")}
              {rw("NOI", fmtD(brrrrNoi), true)}
              {rw("Debt Service", "(" + fmtD(brrrrAnnDebt) + ")")}
              {rw("Annual Cashflow", fmtD(brrrrCf), true, brrrrCf >= 0)}
              {rw("Monthly Cashflow", fmtD(brrrrCf / 12))}
            </div>
          </div>
        </div>
      )}

      {/* ===== RENTAL UI (LTR / STR / MTR) ===== */}
      {isRental && (
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
          {strategy === "str" && <div style={{ marginBottom: 18 }}>{sLabel("STR Revenue")}<div style={{ display: "flex", gap: 10 }}><Field label="Avg Daily Rate" value={d.adr} onChange={u("adr")} prefix="$" small /><Field label="Occupancy" value={d.occupancy} onChange={u("occupancy")} suffix="%" small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Cleaning Fee" value={d.cleaningFee} onChange={u("cleaningFee")} prefix="$" small /><Field label="Turnovers/mo" value={d.turnoversPerMonth} onChange={u("turnoversPerMonth")} small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Platform Fee" value={d.platformFeePct} onChange={u("platformFeePct")} suffix="%" small /><Field label="Other/mo" value={d.strOtherIncome} onChange={u("strOtherIncome")} prefix="$" small /></div></div>}
          {strategy === "mtr" && <div style={{ marginBottom: 18 }}>{sLabel("MTR Revenue")}<div style={{ display: "flex", gap: 10 }}><Field label="Furnished Rent/Unit" value={d.mtrMonthlyRent} onChange={u("mtrMonthlyRent")} prefix="$" small /><Field label="# Units" value={d.mtrUnits} onChange={u("mtrUnits")} small /></div><div style={{ display: "flex", gap: 10 }}><Field label="Vacancy Wks/Yr" value={d.mtrVacancyWeeks} onChange={u("mtrVacancyWeeks")} small /><Field label="Platform Fee" value={d.mtrPlatformPct} onChange={u("mtrPlatformPct")} suffix="%" small /></div><Field label="Other Income/mo" value={d.mtrOtherIncome} onChange={u("mtrOtherIncome")} prefix="$" /></div>}
          {(strategy === "str" || strategy === "mtr") && <div style={{ marginBottom: 18 }}>{sLabel("Furnishing Costs")}<Field label="Total Furnishing Budget" value={d.furnishingTotal} onChange={u("furnishingTotal")} prefix="$" /></div>}
          <div style={{ marginBottom: 18 }}>
            {sLabel("Expenses (Annual)")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Field label="Taxes" value={d.taxes} onChange={u("taxes")} prefix="$" small step={100} /><Field label="Insurance" value={d.insurance} onChange={u("insurance")} prefix="$" small step={100} /></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Field label="Maintenance %" value={d.maintenancePct} onChange={u("maintenancePct")} suffix="%" small /><Field label="CapEx %" value={d.capexPct} onChange={u("capexPct")} suffix="%" small /></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Field label="Mgmt %" value={d.management} onChange={u("management")} suffix="%" small /><Field label="Utilities/mo" value={d.utilities} onChange={u("utilities")} prefix="$" small /></div>
            <Field label="Other Expenses/mo" value={d.otherExp} onChange={u("otherExp")} prefix="$" />
          </div>
          <div>
            {sLabel("Closing Costs")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Field label="Lender Fees %" value={d.lenderFees} onChange={u("lenderFees")} suffix="%" small step={0.1} /><Field label="Attorney" value={d.attorneyFees} onChange={u("attorneyFees")} prefix="$" small step={100} /><Field label="Title Fees" value={d.titleFees} onChange={u("titleFees")} prefix="$" small step={100} /></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Field label="Appraisal" value={d.appraisal} onChange={u("appraisal")} prefix="$" small step={50} /><Field label="Seller Concession" value={d.sellerConcession} onChange={u("sellerConcession")} prefix="$" small step={500} /></div>
          </div>
        </div>
        <div>
          {sLabel("Key Metrics")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <StatCard label="Cap Rate" value={fmtP(cap)} accent={gc("cap", cap)} />
            <StatCard label="Cash-on-Cash" value={fmtP(coc)} accent={gc("coc", coc)} sub="all-in basis" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <StatCard label="DSCR" value={dscr === Infinity ? "\u221E" : dscr.toFixed(2) + "x"} accent={gc("dscr", dscr)} />
            <StatCard label="$/Door/Mo" value={fmtD(cfDoor)} accent={gc("cf", cfDoor)} />
          </div>
          <div style={pStyle}>
            {pH("P&L \u2014 " + (strategy === "ltr" ? "Long-Term" : strategy === "str" ? "Short-Term" : "Mid-Term"))}
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
            {d.appraisal > 0 && rw("Appraisal", fmtD(d.appraisal))}
            {(strategy === "str" || strategy === "mtr") && rw("Furnishing", fmtD(furnishing))}
            {rw("Gross Closing Costs", fmtD(closingCosts))}
            {d.sellerConcession > 0 && rw("Seller Concession", "(" + fmtD(d.sellerConcession) + ")")}
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
              {proj.map(function(p) { return (<div key={p.y} style={{display:"contents"}}><span style={{ color: B.grayText }}>{p.y}</span><span style={{ color: B.white }}>{fmtC(p.v)}</span><span style={{ color: B.greenLight }}>{fmtC(p.n)}</span><span style={{ color: p.c >= 0 ? "#4ade80" : "#ef4444" }}>{fmtC(p.c)}</span></div>); })}
            </div>
            <div style={{ fontSize: 9, color: B.grayMuted, marginTop: 6 }}>Assumes 3% appreciation, 3% rent growth</div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ============================================
// MARKET INTEL + TOWN COMPARISON (NEW)
// ============================================
function MarketSnapshots({ onTrack }) {
  const [sel, setSel] = useState("Albany");
  const [compareMode, setCompareMode] = useState(false);
  const [comp, setComp] = useState(["Albany", "Troy", ""]);
  var towns = Object.keys(MARKET_DATA).sort();
  var m = MARKET_DATA[sel];
  var rc = function(r) { if (r.startsWith("A")) return "#4ade80"; if (r.startsWith("B")) return B.greenLight; if (r.startsWith("C")) return "#f59e0b"; return "#ef4444"; };

  var compMetrics = [
    { key: "medianPrice", label: "Median Price", fmt: fmtC, higher: false },
    { key: "avgRent2Bed", label: "Avg 2BR Rent", fmt: fmtD, higher: true },
    { key: "avgRent3Bed", label: "Avg 3BR Rent", fmt: fmtD, higher: true },
    { key: "capRate", label: "Cap Rate", fmt: fmtP, higher: true },
    { key: "daysOnMarket", label: "Days on Market", fmt: function(v) { return v.toString(); }, lower: true },
    { key: "inventoryCount", label: "Active Listings", fmt: function(v) { return v.toString(); }, higher: true },
    { key: "yoyAppreciation", label: "YoY Appreciation", fmt: function(v) { return "+" + fmtP(v); }, higher: true },
    { key: "vacancyRate", label: "Vacancy Rate", fmt: fmtP, lower: true },
    { key: "popGrowth", label: "Pop. Growth", fmt: function(v) { return (v >= 0 ? "+" : "") + fmtP(v); }, higher: true },
    { key: "medianHHIncome", label: "Median HH Income", fmt: fmtD, higher: true },
    { key: "walkScore", label: "Walk Score", fmt: function(v) { return v.toString(); }, higher: true },
    { key: "schoolRating", label: "School Grade", fmt: function(v) { return v; } },
  ];

  var compTowns = [comp[0], comp[1], comp[2]].filter(function(t) { return t && MARKET_DATA[t]; });

  var handleExportSingle = function() {
    var rows = [
      ["Median Price", fmtC(m.medianPrice)], ["Avg 2BR Rent", fmtD(m.avgRent2Bed)], ["Avg 3BR Rent", fmtD(m.avgRent3Bed)],
      ["Cap Rate", fmtP(m.capRate), m.capRate >= 7 ? "green" : undefined], ["Days on Market", m.daysOnMarket.toString()], ["Active Listings", m.inventoryCount.toString()],
      ["YoY Appreciation", "+" + fmtP(m.yoyAppreciation), "green"], ["Vacancy Rate", fmtP(m.vacancyRate)], ["Median HH Income", fmtD(m.medianHHIncome)],
      ["Walk Score", m.walkScore + " / 100"], ["School District", m.schoolDistrict], ["School Grade", m.schoolRating],
    ];
    exportPDF("Market Intel \u2014 " + sel, rows, m.description);
    if (onTrack) onTrack("pdf_exported", "Market Intel | " + sel);
  };

  var handleExportComparison = function() {
    if (compTowns.length < 2) return;
    var rows = [["---", "TOWN COMPARISON"]];
    compMetrics.forEach(function(met) {
      var vals = compTowns.map(function(t) { return met.fmt(MARKET_DATA[t][met.key]); });
      rows.push([met.label, vals.join("  |  ")]);
    });
    exportPDF("Town Comparison", rows, compTowns.join(" vs "));
    if (onTrack) onTrack("town_compared", compTowns.join(" vs "));
  };

  if (compareMode) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, fontWeight: 400, color: B.white, margin: 0, letterSpacing: 1.5 }}>TOWN COMPARISON</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionBtn label="Export PDF" onClick={handleExportComparison} />
            <ActionBtn label="Exit Comparison" onClick={function() { setCompareMode(false); }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[0, 1, 2].map(function(idx) { return (
            <div key={idx} style={{ minWidth: 160, flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Town {idx + 1}{idx === 2 ? " (optional)" : ""}</label>
              <select value={comp[idx]} onChange={function(e) { var next = comp.slice(); next[idx] = e.target.value; setComp(next); }}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 8, color: B.white, fontFamily: "'DM Sans', sans-serif" }}>
                {idx === 2 && <option value="">\u2014 None \u2014</option>}
                {towns.map(function(t) { return <option key={t} value={t}>{t}</option>; })}
              </select>
            </div>
          ); })}
        </div>
        {compTowns.length >= 2 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid " + B.green }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: B.grayMuted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>Metric</th>
                  {compTowns.map(function(t) { return <th key={t} style={{ textAlign: "right", padding: "10px 14px", color: B.greenLight, fontWeight: 800, fontSize: 12 }}>{t}</th>; })}
                </tr>
              </thead>
              <tbody>
                {compMetrics.map(function(met) {
                  var vals = compTowns.map(function(t) { return MARKET_DATA[t][met.key]; });
                  var numVals = vals.map(Number).filter(function(v) { return !isNaN(v); });
                  var bestVal = null;
                  if (met.key !== "schoolRating" && numVals.length > 0) {
                    bestVal = met.lower ? Math.min.apply(null, numVals) : Math.max.apply(null, numVals);
                  }
                  return (
                    <tr key={met.key} style={{ borderBottom: "1px solid " + B.grayBorder }}>
                      <td style={{ padding: "8px 14px", color: B.grayText, fontWeight: 500 }}>{met.label}</td>
                      {compTowns.map(function(t) {
                        var v = MARKET_DATA[t][met.key];
                        var isBest = bestVal !== null && Number(v) === bestVal && compTowns.length > 1;
                        return <td key={t} style={{ textAlign: "right", padding: "8px 14px", fontWeight: 600, color: isBest ? "#4ade80" : B.white }}>{met.fmt(v)}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              {compTowns.map(function(t) { return (
                <div key={t} style={{ ...pStyle, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B.greenLight, marginBottom: 4 }}>{t}</div>
                  <div style={{ fontSize: 12, color: B.grayText, lineHeight: 1.5 }}>{MARKET_DATA[t].description}</div>
                </div>
              ); })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <ActionBtn label="Export PDF" onClick={handleExportSingle} />
        <ActionBtn label="Compare Towns" onClick={function() { setCompareMode(true); }} primary />
      </div>
      <div style={{ background: "rgba(27,72,18,0.08)", border: "1px solid rgba(27,72,18,0.2)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: B.greenLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>Data Sources</div>
        <p style={{ fontSize: 12, color: B.grayText, margin: 0, lineHeight: 1.6 }}>Market data compiled from the Global MLS (GCAR/CRMLS), U.S. Census Bureau (ACS), Zillow Observed Rent Index (ZORI), CoStar rental analytics, and local assessor records. School district grades from Niche.com. Contact Ethan for current deal-specific data.</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {towns.map(function(t) { return (<button key={t} onClick={function() { setSel(t); if (onTrack) onTrack("town_viewed", t); }} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: sel === t ? "1px solid " + B.green : "1px solid rgba(27,72,18,0.12)", background: sel === t ? "rgba(27,72,18,0.2)" : "transparent", color: sel === t ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{t}</button>); })}
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
        {[["Median HH Income", fmtD(m.medianHHIncome)], ["Pop. Growth", (m.popGrowth >= 0 ? "+" : "") + fmtP(m.popGrowth) + " /yr"], ["Walk Score", m.walkScore + " / 100"]].map(function(pair, i) { return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>{pair[0]}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{pair[1]}</span></div>
        ); })}
        <div style={{ borderTop: "1px solid rgba(27,72,18,0.15)", marginTop: 6, paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>School District</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{m.schoolDistrict}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>Overall Grade</span><span style={{ fontSize: 12, color: rc(m.schoolRating), fontWeight: 700 }}>{m.schoolRating}</span></div>
        </div>
      </div>
      <div style={pStyle}>
        {pH("Cap Rate Comparison")}
        {towns.slice().sort(function(a, b) { return MARKET_DATA[b].capRate - MARKET_DATA[a].capRate; }).map(function(t) {
          var cr = MARKET_DATA[t].capRate; var mx = Math.max.apply(null, towns.map(function(x) { return MARKET_DATA[x].capRate; }));
          return (<div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: t === sel ? B.greenLight : B.grayText, width: 130, fontWeight: t === sel ? 700 : 400, flexShrink: 0 }}>{t}</span>
            <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: (cr / mx * 100) + "%", height: "100%", background: t === sel ? B.green : "rgba(27,72,18,0.35)", borderRadius: 4, transition: "width 0.5s ease" }} /></div>
            <span style={{ fontSize: 11, color: t === sel ? B.greenLight : B.grayText, width: 40, textAlign: "right", fontWeight: 700 }}>{fmtP(cr)}</span>
          </div>);
        })}
      </div>
      <div style={{ fontSize: 9, color: B.grayMuted, marginTop: 8 }}>Data last updated: {LAST_UPDATED}.</div>
    </div>
  );
}

// ============================================
// EQUITY ESTIMATOR
// ============================================
function EquityEstimator({ onTrack }) {
  const [savedEquities, setSavedEquities] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [d, setD] = useState({ address: "", purchasePrice: 300000, purchaseYear: 2022, bal: 225000, mtgPayment: 1450, mtgRate: 6.5, rent: 3200, taxes: 350, insurance: 175, maintenance: 150, utilities: 0, otherExp: 0 });
  var u = function(k) { return function(v) { setD({ ...d, [k]: v }); }; };
  useEffect(function() { loadAnalyses(EQUITIES_KEY).then(setSavedEquities); }, []);
  var yrs = 2026 - d.purchaseYear;
  var appRate = 0.055;
  var estVal = d.purchasePrice * Math.pow(1 + appRate, yrs);
  var eq = estVal - d.bal;
  var eqPct = estVal > 0 ? (eq / estVal) * 100 : 0;
  var totalMonthlyExp = (d.taxes || 0) + (d.insurance || 0) + (d.maintenance || 0) + (d.utilities || 0) + (d.otherExp || 0);
  var totalMonthlyOut = totalMonthlyExp + (d.mtgPayment || 0);
  var monthlyCF = d.rent - totalMonthlyOut;
  var annCF = monthlyCF * 12;
  var totRet = eq - (d.purchasePrice - d.bal) + annCF * yrs;
  var refiLoan = estVal * 0.75;
  var cashOut = refiLoan - d.bal;
  var rmr = (d.mtgRate || 6.5) / 100 / 12;
  var refiPmt = rmr > 0 ? refiLoan * (rmr * Math.pow(1 + rmr, 360)) / (Math.pow(1 + rmr, 360) - 1) : refiLoan / 360;

  var handleSave = async function() {
    var label = d.address || "Untitled Property";
    var updated = await saveAnalysis(EQUITIES_KEY, { ...d, label: label, computed: { estVal: estVal, eq: eq, eqPct: eqPct, annCF: annCF, totRet: totRet } });
    setSavedEquities(updated); setSaveMsg("Saved!"); setTimeout(function() { setSaveMsg(""); }, 2000);
    if (onTrack) onTrack("equity_saved", label + " | " + fmtD(d.purchasePrice) + " | Equity: " + fmtC(eq));
  };
  var handleLoad = function(saved) {
    var rest = Object.assign({}, saved); delete rest.id; delete rest.savedAt; delete rest.label; delete rest.computed;
    // Backward compatibility: if old save has 'exp' but no separated fields, migrate
    if (rest.exp !== undefined && rest.taxes === undefined) {
      var oldExp = rest.exp || 0;
      rest.taxes = Math.round(oldExp * 0.3);
      rest.insurance = Math.round(oldExp * 0.15);
      rest.maintenance = Math.round(oldExp * 0.15);
      rest.utilities = 0;
      rest.otherExp = Math.round(oldExp * 0.4);
      rest.mtgPayment = rest.mtgPayment || 1450;
      rest.mtgRate = rest.rate || rest.mtgRate || 6.5;
      delete rest.exp;
      delete rest.rate;
    }
    setD(function(prev) { return { ...prev, ...rest }; }); setShowSaved(false);
    if (onTrack) onTrack("equity_loaded", saved.label || "Untitled");
  };
  var handleDelete = async function(id) { var updated = await deleteAnalysis(EQUITIES_KEY, id); setSavedEquities(updated); };

  var handleExportPDF = function() {
    var rows = [
      ["---", "PROPERTY"], ["Address", d.address || "\u2014"], ["Purchase Price", fmtD(d.purchasePrice)], ["Year Purchased", d.purchaseYear.toString()], ["Years Owned", yrs.toString()],
      ["---", "EQUITY POSITION"],
      ["Est. Current Value", fmtD(estVal), "green"],
      ["Valuation Method", "Purchase price \u00D7 (1.055)^" + yrs + " = " + fmtD(estVal)],
      ["Mortgage Balance", fmtD(d.bal)], ["Total Equity", fmtD(eq), "green"], ["Equity %", fmtP(eqPct)],
      ["---", "MONTHLY INCOME & EXPENSES"],
      ["Monthly Rent", fmtD(d.rent)],
      ["Mortgage Payment", fmtD(d.mtgPayment)],
      ["Taxes", fmtD(d.taxes)], ["Insurance", fmtD(d.insurance)], ["Maintenance", fmtD(d.maintenance)],
    ];
    if (d.utilities > 0) rows.push(["Utilities", fmtD(d.utilities)]);
    if (d.otherExp > 0) rows.push(["Other Expenses", fmtD(d.otherExp)]);
    rows.push(["Total Monthly Out", fmtD(totalMonthlyOut)]);
    rows.push(["Monthly Cashflow", fmtD(monthlyCF), monthlyCF >= 0 ? "green" : "red"]);
    rows.push(["Annual Cashflow", fmtD(annCF), annCF >= 0 ? "green" : "red"]);
    rows.push(["Total Return (est.)", fmtD(totRet), "green"]);
    rows.push(["---", "CASH-OUT REFI (75% LTV)"]);
    rows.push(["New Loan Amount", fmtD(refiLoan)]);
    rows.push(["Cash Out Available", fmtD(Math.max(0, cashOut)), cashOut > 0 ? "green" : undefined]);
    rows.push(["New Monthly Payment", fmtD(refiPmt)]);
    rows.push(["Net CF After Refi", fmtD(d.rent - totalMonthlyExp - refiPmt) + "/mo"]);
    exportPDF("Equity Review \u2014 " + (d.address || "Untitled"), rows);
    if (onTrack) onTrack("pdf_exported", "Equity Review | " + (d.address || "Untitled"));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <ActionBtn label="Save Property" onClick={handleSave} primary />
        <ActionBtn label={"My Properties (" + savedEquities.length + ")"} onClick={function() { setShowSaved(!showSaved); }} />
        <ActionBtn label="Export PDF" onClick={handleExportPDF} />
        {saveMsg && <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>{saveMsg}</span>}
      </div>
      {showSaved && savedEquities.length > 0 && (
        <div style={{ ...pStyle, marginBottom: 18, maxHeight: 200, overflowY: "auto" }}>
          {pH("Saved Properties")}
          {savedEquities.map(function(s) { return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ cursor: "pointer", flex: 1 }} onClick={function() { handleLoad(s); }}>
                <div style={{ fontSize: 13, color: B.white, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: B.grayMuted }}>{new Date(s.savedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={function() { handleDelete(s.id); }} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>✕</button>
            </div>
          ); })}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          {sLabel("Property Details")}
          <Field label="Address" value={d.address} onChange={u("address")} type="text" placeholder="Your investment property" />
          <div style={{ display: "flex", gap: 10 }}><Field label="Purchase Price" value={d.purchasePrice} onChange={u("purchasePrice")} prefix="$" small step={1000} /><Field label="Year Purchased" value={d.purchaseYear} onChange={u("purchaseYear")} small /></div>

          {sLabel("Mortgage / Debt Service")}
          <Field label="Current Mortgage Balance" value={d.bal} onChange={u("bal")} prefix="$" />
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Field label="Monthly Mortgage Payment" value={d.mtgPayment} onChange={u("mtgPayment")} prefix="$" small />
            <Field label="Current Interest Rate" value={d.mtgRate} onChange={u("mtgRate")} suffix="%" small step={0.1} />
          </div>
          <div style={{ fontSize: 9, color: B.grayMuted, marginTop: -8, marginBottom: 14 }}>Your current P&I payment. The interest rate is used for refi scenario calculations below.</div>

          {sLabel("Monthly Income")}
          <Field label="Total Monthly Rent" value={d.rent} onChange={u("rent")} prefix="$" />

          {sLabel("Monthly Expenses (excl. mortgage)")}
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Taxes" value={d.taxes} onChange={u("taxes")} prefix="$" small />
            <Field label="Insurance" value={d.insurance} onChange={u("insurance")} prefix="$" small />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Maintenance" value={d.maintenance} onChange={u("maintenance")} prefix="$" small />
            <Field label="Utilities" value={d.utilities} onChange={u("utilities")} prefix="$" small />
          </div>
          <Field label="Other Monthly Expenses" value={d.otherExp} onChange={u("otherExp")} prefix="$" />
          <div style={{ fontSize: 9, color: B.grayMuted, marginTop: -8, marginBottom: 8 }}>Enter all amounts as monthly figures. Divide annual tax/insurance bills by 12.</div>
        </div>
        <div>
          {sLabel("Equity Position")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}><StatCard label="Est. Value" value={fmtC(estVal)} /><StatCard label="Total Equity" value={fmtC(eq)} accent="#4ade80" /></div>

          <div style={{ background: "rgba(27,72,18,0.08)", border: "1px solid rgba(27,72,18,0.2)", borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: B.greenLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>How is Est. Value calculated?</div>
            <p style={{ fontSize: 12, color: B.grayText, margin: 0, lineHeight: 1.6 }}>We apply 5.5% annual appreciation (the Capital Region average) to your original purchase price, compounded over the number of years you've owned the property.</p>
            <div style={{ fontSize: 12, color: B.white, fontWeight: 600, marginTop: 8, fontFamily: "'DM Sans', monospace", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: 6 }}>
              {fmtD(d.purchasePrice)} × (1.055)<sup>{yrs}</sup> = <span style={{ color: "#4ade80" }}>{fmtD(estVal)}</span>
            </div>
            <p style={{ fontSize: 10, color: B.grayMuted, margin: "6px 0 0 0" }}>This is an estimate. For a precise current value, request a comparative market analysis (CMA) from Ethan.</p>
          </div>

          <div style={pStyle}>{pH("Equity vs. Debt")}<div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 7, overflow: "hidden", marginBottom: 6 }}><div style={{ width: Math.max(0, Math.min(100, eqPct)) + "%", height: "100%", background: "linear-gradient(90deg, " + B.green + ", #4ade80)", borderRadius: 7, transition: "width 0.5s" }} /></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: "#4ade80" }}>Equity: {fmtP(eqPct)}</span><span style={{ color: B.grayText }}>Debt: {fmtP(100 - eqPct)}</span></div></div>

          <div style={pStyle}>
            {pH("Monthly P&L")}
            {rw("Rental Income", fmtD(d.rent))}
            {rw("Mortgage Payment", "(" + fmtD(d.mtgPayment) + ")")}
            {rw("Taxes", "(" + fmtD(d.taxes) + ")")}
            {rw("Insurance", "(" + fmtD(d.insurance) + ")")}
            {rw("Maintenance", "(" + fmtD(d.maintenance) + ")")}
            {(d.utilities > 0) && rw("Utilities", "(" + fmtD(d.utilities) + ")")}
            {(d.otherExp > 0) && rw("Other", "(" + fmtD(d.otherExp) + ")")}
            {rw("Monthly Cashflow", fmtD(monthlyCF), true, monthlyCF >= 0)}
            {rw("Annual Cashflow", fmtD(annCF), false)}
          </div>

          <div style={pStyle}>{pH("Performance")}{[["Years Owned", yrs], ["Total Appreciation", fmtD(estVal - d.purchasePrice)], ["Total Return (est.)", fmtD(totRet)]].map(function(pair, i) { return (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.grayText }}>{pair[0]}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>{pair[1]}</span></div>); })}</div>

          <div style={{ background: "rgba(27,72,18,0.1)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: B.greenLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>Cash-Out Refi (75% LTV)</div>
            {[["New Loan", fmtD(refiLoan)], ["Cash Out", fmtD(Math.max(0, cashOut))], ["New Payment", fmtD(refiPmt) + "/mo"], ["Net CF After Refi", fmtD(d.rent - totalMonthlyExp - refiPmt) + "/mo"]].map(function(pair, i) { return (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: 12, color: B.greenLight }}>{pair[0]}</span><span style={{ fontSize: 12, color: B.white, fontWeight: 700 }}>{pair[1]}</span></div>); })}
          </div>
          {eq > 100000 && <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>1031 Exchange Opportunity</div><p style={{ fontSize: 12, color: B.grayText, margin: 0, lineHeight: 1.5 }}>With {fmtC(eq)} in equity, you may qualify for a 1031 exchange into a larger property. Let's talk strategy.</p></div>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PORTFOLIO DASHBOARD
// ============================================
function PortfolioDashboard({ onTrack }) {
  const [properties, setProperties] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    Promise.all([loadAnalyses(EQUITIES_KEY), loadAnalyses(DEALS_KEY)]).then(function(results) {
      setProperties(results[0]); setDeals(results[1]); setLoading(false);
      if (onTrack && (results[0].length > 0 || results[1].length > 0)) onTrack("portfolio_viewed", results[0].length + " properties, " + results[1].length + " deals");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ color: B.grayMuted, padding: 20 }}>Loading portfolio...</div>;

  var hasData = properties.length > 0 || deals.length > 0;
  var totalValue = properties.reduce(function(sum, p) { var yrs = 2026 - (p.purchaseYear || 2022); return sum + (p.purchasePrice || 0) * Math.pow(1.055, yrs); }, 0);
  var totalEquity = properties.reduce(function(sum, p) { var yrs = 2026 - (p.purchaseYear || 2022); var val = (p.purchasePrice || 0) * Math.pow(1.055, yrs); return sum + (val - (p.bal || 0)); }, 0);
  var totalCashflow = properties.reduce(function(sum, p) {
    var monthlyExp = (p.taxes || 0) + (p.insurance || 0) + (p.maintenance || 0) + (p.utilities || 0) + (p.otherExp || 0) + (p.mtgPayment || 0);
    // Backward compat: old saves use 'exp'
    if (p.exp !== undefined && p.taxes === undefined) monthlyExp = (p.exp || 0);
    return sum + ((p.rent || 0) - monthlyExp) * 12;
  }, 0);
  var totalDebt = properties.reduce(function(sum, p) { return sum + (p.bal || 0); }, 0);

  var handleExportPDF = function() {
    var rows = [["---", "PORTFOLIO SUMMARY"]];
    rows.push(["Properties Tracked", properties.length.toString()]);
    rows.push(["Deal Analyses Saved", deals.length.toString()]);
    if (properties.length > 0) {
      rows.push(["Total Estimated Value", fmtD(totalValue), "green"]);
      rows.push(["Total Equity", fmtD(totalEquity), "green"]);
      rows.push(["Total Debt", fmtD(totalDebt)]);
      rows.push(["Total Annual Cashflow", fmtD(totalCashflow), totalCashflow >= 0 ? "green" : "red"]);
      rows.push(["---", "PROPERTIES"]);
      properties.forEach(function(p) {
        var yrs = 2026 - (p.purchaseYear || 2022);
        var val = (p.purchasePrice || 0) * Math.pow(1.055, yrs);
        var equity = val - (p.bal || 0);
        rows.push([p.label || "Untitled", "Value: " + fmtC(val) + " | Equity: " + fmtC(equity)]);
      });
    }
    exportPDF("Portfolio Summary", rows);
    if (onTrack) onTrack("pdf_exported", "Portfolio Summary | " + properties.length + " properties, " + deals.length + " deals");
  };

  return (
    <div>
      {!hasData ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: B.white, margin: "0 0 8px 0", letterSpacing: 1.5 }}>NO SAVED ANALYSES YET</h3>
          <p style={{ color: B.grayText, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Save properties in the Deal Analyzer or Equity Estimator to build your portfolio view.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <ActionBtn label="Export Portfolio PDF" onClick={handleExportPDF} primary />
          </div>
          {properties.length > 0 && (
            <div>
              {sLabel("Portfolio Summary")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <StatCard label="Total Est. Value" value={fmtC(totalValue)} />
                <StatCard label="Total Equity" value={fmtC(totalEquity)} accent="#4ade80" />
                <StatCard label="Total Annual CF" value={fmtD(totalCashflow)} accent={totalCashflow >= 0 ? "#4ade80" : "#ef4444"} />
                <StatCard label="Total Debt" value={fmtC(totalDebt)} />
              </div>
              {totalValue > 0 && (
                <div style={{ ...pStyle, marginBottom: 20 }}>
                  {pH("Equity vs. Debt")}
                  <div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 7, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ width: Math.max(0, Math.min(100, (totalEquity / totalValue) * 100)) + "%", height: "100%", background: "linear-gradient(90deg, " + B.green + ", #4ade80)", borderRadius: 7 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "#4ade80" }}>Equity: {fmtP((totalEquity / totalValue) * 100)}</span>
                    <span style={{ color: B.grayText }}>Debt: {fmtP((totalDebt / totalValue) * 100)}</span>
                  </div>
                </div>
              )}
              {sLabel("Properties (" + properties.length + ")")}
              <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                {properties.map(function(p) {
                  var yrs = 2026 - (p.purchaseYear || 2022);
                  var val = (p.purchasePrice || 0) * Math.pow(1.055, yrs);
                  var equity = val - (p.bal || 0);
                  var monthlyExp = (p.taxes || 0) + (p.insurance || 0) + (p.maintenance || 0) + (p.utilities || 0) + (p.otherExp || 0) + (p.mtgPayment || 0);
                  if (p.exp !== undefined && p.taxes === undefined) monthlyExp = (p.exp || 0);
                  var cf = ((p.rent || 0) - monthlyExp) * 12;
                  return (
                    <div key={p.id} style={pStyle}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 14, color: B.white, fontWeight: 700 }}>{p.label}</div>
                        <div style={{ fontSize: 10, color: B.grayMuted }}>Purchased {p.purchaseYear} · Saved {new Date(p.savedAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <div><div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1 }}>Est. Value</div><div style={{ fontSize: 16, fontWeight: 700, color: B.white, fontFamily: "'Bebas Neue', sans-serif" }}>{fmtC(val)}</div></div>
                        <div><div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1 }}>Equity</div><div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontFamily: "'Bebas Neue', sans-serif" }}>{fmtC(equity)}</div></div>
                        <div><div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1 }}>Annual CF</div><div style={{ fontSize: 16, fontWeight: 700, color: cf >= 0 ? "#4ade80" : "#ef4444", fontFamily: "'Bebas Neue', sans-serif" }}>{fmtD(cf)}</div></div>
                        <div><div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1 }}>Debt</div><div style={{ fontSize: 16, fontWeight: 700, color: B.white, fontFamily: "'Bebas Neue', sans-serif" }}>{fmtC(p.bal || 0)}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {deals.length > 0 && (
            <div>
              {sLabel("Saved Deal Analyses (" + deals.length + ")")}
              <div style={{ display: "grid", gap: 10 }}>
                {deals.map(function(dl) { return (
                  <div key={dl.id} style={pStyle}>
                    <div style={{ fontSize: 14, color: B.white, fontWeight: 700 }}>{dl.label}</div>
                    <div style={{ fontSize: 10, color: B.grayMuted }}>{(dl.strategy || "ltr").toUpperCase()} · {dl.units} units · {fmtD(dl.purchasePrice)} · {new Date(dl.savedAt).toLocaleDateString()}</div>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// SIDE-BY-SIDE DEAL COMPARISON (NEW)
// ============================================
function DealComparison({ onTrack }) {
  const [deals, setDeals] = useState([]);
  const [equities, setEquities] = useState([]);
  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    Promise.all([loadAnalyses(DEALS_KEY), loadAnalyses(EQUITIES_KEY)]).then(function(res) {
      setDeals(res[0]); setEquities(res[1]); setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: B.grayMuted, padding: 20 }}>Loading...</div>;

  var allItems = deals.map(function(d) { return { ...d, _type: "deal" }; }).concat(equities.map(function(e) { return { ...e, _type: "equity" }; }));

  var buildDealMetrics = function(d) {
    var strat = d.strategy || "ltr";
    // FLIP comparison metrics
    if (strat === "flip") {
      var fMao = ((d.flipMaoPct || 70) / 100) * (d.flipArv || 0) - (d.flipRehab || 0);
      var fHold = (d.flipHoldingPerMonth || 0) * (d.flipHoldingMonths || 0);
      var fTotalIn = (d.purchasePrice || 0) + (d.flipRehab || 0) + (d.flipClosing || 0) + fHold;
      var fSellCost = (d.flipArv || 0) * ((d.flipSellingPct || 6) / 100);
      var fProfit = (d.flipArv || 0) - fSellCost - fTotalIn;
      var fRoi = fTotalIn > 0 ? (fProfit / fTotalIn) * 100 : 0;
      return [
        ["Type", "FLIP"], ["Address", d.address || "\u2014"], ["Purchase Price", fmtD(d.purchasePrice || 0)],
        ["ARV", fmtD(d.flipArv || 0)], ["Rehab", fmtD(d.flipRehab || 0)], ["Total Invested", fmtD(fTotalIn)],
        ["Est. Profit", fmtD(fProfit)], ["ROI", fmtP(fRoi)], ["MAO (" + (d.flipMaoPct || 70) + "%)", fmtD(fMao)],
      ];
    }
    // BRRRR comparison metrics
    if (strat === "brrrr") {
      var bAllIn = (d.purchasePrice || 0) + (d.brrrrRehab || 0) + (d.brrrrClosing || 0) + (d.brrrrHoldInterest || 0) - (d.brrrrHoldRentCollected || 0);
      var bRefiLoan = (d.brrrrArv || 0) * ((d.brrrrRefiLtv || 75) / 100);
      var bCashLeft = bAllIn - bRefiLoan;
      var bMr = ((d.brrrrRefiRate || 7.25) / 100) / 12;
      var bTp = (d.brrrrRefiTerm || 30) * 12;
      var bMtg = bMr > 0 ? bRefiLoan * (bMr * Math.pow(1 + bMr, bTp)) / (Math.pow(1 + bMr, bTp) - 1) : bRefiLoan / bTp;
      var bGri = (d.brrrrGrossRent || 0) * 12;
      var bEgi = bGri * (1 - (d.brrrrVacancy || 5) / 100);
      var bOpex = (d.brrrrInsurance || 0) + (d.brrrrTaxes || 0) + (d.brrrrWaterSewer || 0) + bGri * ((d.brrrrMaintPct || 5) / 100) + bGri * ((d.brrrrCapxPct || 5) / 100) + (d.brrrrTrash || 0) + (d.brrrrLawn || 0);
      var bNoi = bEgi - bOpex;
      var bCf = bNoi - bMtg * 12;
      var bDscr = bMtg * 12 > 0 ? bNoi / (bMtg * 12) : Infinity;
      return [
        ["Type", "BRRRR"], ["Address", d.address || "\u2014"], ["Purchase Price", fmtD(d.purchasePrice || 0)],
        ["ARV", fmtD(d.brrrrArv || 0)], ["Total All-In", fmtD(bAllIn)], ["Refi Loan (" + (d.brrrrRefiLtv || 75) + "%)", fmtD(bRefiLoan)],
        ["Cash Left In", fmtD(bCashLeft)], ["Monthly Mortgage", fmtD(bMtg)], ["NOI", fmtD(bNoi)],
        ["Annual Cashflow", fmtD(bCf)], ["DSCR", bDscr === Infinity ? "\u221E" : bDscr.toFixed(2) + "x"],
      ];
    }
    // RENTAL comparison metrics (LTR/STR/MTR)
    var dp2 = (d.purchasePrice || 0) * ((d.downPct || 25) / 100);
    var loan2 = (d.purchasePrice || 0) - dp2;
    var mr2 = (d.rate || 7) / 100 / 12;
    var tp2 = (d.term || 30) * 12;
    var mtg2 = mr2 > 0 ? loan2 * (mr2 * Math.pow(1 + mr2, tp2)) / (Math.pow(1 + mr2, tp2) - 1) : loan2 / tp2;
    var annMtg2 = mtg2 * 12;
    var gri2, egi2;
    if (strat === "str") { gri2 = (d.adr || 0) * ((d.occupancy || 0) / 100) * 365 + (d.cleaningFee || 0) * (d.turnoversPerMonth || 0) * 12; egi2 = gri2 * (1 - (d.platformFeePct || 0) / 100); }
    else if (strat === "mtr") { gri2 = ((d.mtrMonthlyRent || 0) * (d.mtrUnits || 0) * (12 - (d.mtrVacancyWeeks || 0) / 4.33)); egi2 = gri2 * (1 - (d.mtrPlatformPct || 0) / 100); }
    else { gri2 = ((d.grossRent || 0) + (d.otherIncome || 0)) * 12; egi2 = gri2 * (1 - (d.vacancy || 5) / 100); }
    var totExp2 = (d.taxes || 0) + (d.insurance || 0) + gri2 * ((d.maintenancePct || 5) / 100) + gri2 * ((d.capexPct || 5) / 100) + egi2 * ((d.management || 0) / 100) + (d.utilities || 0) * 12 + (d.otherExp || 0) * 12;
    var noi2 = egi2 - totExp2;
    var furn = (strat === "str" || strat === "mtr") ? (d.furnishingTotal || 0) : 0;
    var totalCash2 = dp2 + furn + loan2 * ((d.lenderFees || 1) / 100) + (d.attorneyFees || 0) + (d.titleFees || 0) + (d.appraisal || 0) - (d.sellerConcession || 0);
    var cf2 = noi2 - annMtg2;
    var cap2 = d.purchasePrice > 0 ? (noi2 / d.purchasePrice) * 100 : 0;
    var coc2 = totalCash2 > 0 ? (cf2 / totalCash2) * 100 : 0;
    var dscr2 = annMtg2 > 0 ? noi2 / annMtg2 : Infinity;
    return [
      ["Type", strat.toUpperCase() + " Deal"], ["Address", d.address || "\u2014"], ["Units", (d.units || 0).toString()], ["Purchase Price", fmtD(d.purchasePrice || 0)],
      ["Down Payment", fmtD(dp2)], ["Gross Revenue", fmtD(gri2)], ["NOI", fmtD(noi2)], ["Annual Cashflow", fmtD(cf2)],
      ["$/Door/Mo", fmtD(cf2 / (d.units || 1) / 12)], ["Cap Rate", fmtP(cap2)], ["Cash-on-Cash", fmtP(coc2)],
      ["DSCR", dscr2 === Infinity ? "\u221E" : dscr2.toFixed(2) + "x"], ["Total Cash In", fmtD(totalCash2)],
    ];
  };

  var buildEquityMetrics = function(d) {
    var yrs2 = 2026 - (d.purchaseYear || 2022);
    var estVal2 = (d.purchasePrice || 0) * Math.pow(1.055, yrs2);
    var eq2 = estVal2 - (d.bal || 0);
    var eqPct2 = estVal2 > 0 ? (eq2 / estVal2) * 100 : 0;
    var monthlyExp2 = (d.taxes || 0) + (d.insurance || 0) + (d.maintenance || 0) + (d.utilities || 0) + (d.otherExp || 0) + (d.mtgPayment || 0);
    if (d.exp !== undefined && d.taxes === undefined) monthlyExp2 = (d.exp || 0);
    var annCF2 = ((d.rent || 0) - monthlyExp2) * 12;
    return [
      ["Type", "Equity Property"], ["Address", d.address || "\u2014"], ["Purchase Price", fmtD(d.purchasePrice || 0)],
      ["Est. Current Value", fmtD(estVal2)], ["Mortgage Balance", fmtD(d.bal || 0)], ["Total Equity", fmtD(eq2)],
      ["Equity %", fmtP(eqPct2)], ["Monthly Cashflow", fmtD((d.rent || 0) - monthlyExp2)], ["Annual Cashflow", fmtD(annCF2)],
      ["HELOC Potential (80%)", fmtD(Math.max(0, estVal2 * 0.80 - (d.bal || 0)))],
    ];
  };

  var itemA = allItems.find(function(i) { return String(i.id) === selA; });
  var itemB = allItems.find(function(i) { return String(i.id) === selB; });
  var metricsA = itemA ? (itemA._type === "deal" ? buildDealMetrics(itemA) : buildEquityMetrics(itemA)) : [];
  var metricsB = itemB ? (itemB._type === "deal" ? buildDealMetrics(itemB) : buildEquityMetrics(itemB)) : [];
  var maxRows = Math.max(metricsA.length, metricsB.length);

  var handleExportPDF = function() {
    if (!itemA || !itemB) return;
    var rows = [["---", (itemA.label || "A") + " vs " + (itemB.label || "B")]];
    for (var i = 0; i < maxRows; i++) {
      var a = metricsA[i]; var b = metricsB[i];
      rows.push([(a ? a[0] : (b ? b[0] : "")), (a ? a[1] : "\u2014") + "  |  " + (b ? b[1] : "\u2014")]);
    }
    exportPDF("Deal Comparison", rows, (itemA.label || "A") + " vs " + (itemB.label || "B"));
    if (onTrack) onTrack("comparison_run", (itemA.label || "A") + " vs " + (itemB.label || "B"));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, fontWeight: 400, color: B.white, margin: 0, letterSpacing: 1.5 }}>SIDE-BY-SIDE COMPARISON</h2>
        {itemA && itemB && <ActionBtn label="Export PDF" onClick={handleExportPDF} />}
      </div>
      {allItems.length < 2 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u2696\uFE0F"}</div>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: B.white, margin: "0 0 8px 0", letterSpacing: 1.5 }}>SAVE AT LEAST 2 ANALYSES</h3>
          <p style={{ color: B.grayText, fontSize: 14, margin: 0, lineHeight: 1.6 }}>Save deals or properties in the Deal Analyzer or Equity Estimator, then compare them head-to-head.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Analysis A</label>
              <select value={selA} onChange={function(e) { setSelA(e.target.value); }} style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 8, color: B.white, fontFamily: "'DM Sans', sans-serif" }}>
                <option value="">{"\u2014 Select \u2014"}</option>
                {allItems.map(function(item) { return <option key={item.id} value={String(item.id)}>{item.label} ({item._type})</option>; })}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.grayText, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Analysis B</label>
              <select value={selB} onChange={function(e) { setSelB(e.target.value); }} style={{ width: "100%", padding: "10px 12px", fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(27,72,18,0.25)", borderRadius: 8, color: B.white, fontFamily: "'DM Sans', sans-serif" }}>
                <option value="">{"\u2014 Select \u2014"}</option>
                {allItems.map(function(item) { return <option key={item.id} value={String(item.id)}>{item.label} ({item._type})</option>; })}
              </select>
            </div>
          </div>
          {itemA && itemB && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid " + B.green }}>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: B.grayMuted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>Metric</th>
                    <th style={{ textAlign: "right", padding: "10px 14px", color: B.greenLight, fontWeight: 800, fontSize: 12 }}>{itemA.label}</th>
                    <th style={{ textAlign: "right", padding: "10px 14px", color: B.greenLight, fontWeight: 800, fontSize: 12 }}>{itemB.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxRows }).map(function(_, i) {
                    var a = metricsA[i]; var b = metricsB[i];
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid " + B.grayBorder }}>
                        <td style={{ padding: "8px 14px", color: B.grayText, fontWeight: 500 }}>{a ? a[0] : (b ? b[0] : "")}</td>
                        <td style={{ textAlign: "right", padding: "8px 14px", fontWeight: 600, color: B.white }}>{a ? a[1] : "\u2014"}</td>
                        <td style={{ textAlign: "right", padding: "8px 14px", fontWeight: 600, color: B.white }}>{b ? b[1] : "\u2014"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// ACTIVITY LOG VIEWER (Admin only — access via ?admin=true)
// ============================================
function ActivityLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(function() { loadActivity().then(function(data) { setLog(data); setLoading(false); }); }, []);

  var filtered = filter === "all" ? log : log.filter(function(e) { return e.action === filter; });
  var actionTypes = log.reduce(function(acc, e) { if (acc.indexOf(e.action) < 0) acc.push(e.action); return acc; }, []);

  var actionLabel = function(a) {
    var labels = { tab_viewed: "Tab Viewed", deal_saved: "Deal Saved", equity_saved: "Equity Saved", pdf_exported: "PDF Exported", comparison_run: "Comparison Run", portfolio_viewed: "Portfolio Viewed", town_viewed: "Town Viewed", town_compared: "Town Compared", lead_registered: "Lead Registered", strategy_switched: "Strategy Switched", deal_loaded: "Loaded Saved Deal", equity_loaded: "Loaded Property" };
    return labels[a] || a;
  };
  var intentColor = function(a) {
    var high = ["deal_saved", "equity_saved", "pdf_exported", "comparison_run", "portfolio_viewed", "town_compared", "deal_loaded", "equity_loaded"];
    if (high.indexOf(a) >= 0) return "#4ade80";
    return B.grayText;
  };

  var handleClear = async function() {
    if (window.confirm("Clear all activity data? This cannot be undone.")) {
      await clearActivity(); setLog([]);
    }
  };

  var handleExportCSV = function() {
    if (log.length === 0) return;
    var header = "Timestamp,Name,Email,Phone,Action,Detail,UTM Source,UTM Campaign\n";
    var rows = log.map(function(e) {
      return [e.ts, '"' + (e.name || "") + '"', e.email || "", e.phone || "", e.action, '"' + (e.detail || "").replace(/"/g, '""') + '"', e.utm_source || "direct", '"' + (e.utm_campaign || "") + '"'].join(",");
    }).join("\n");
    var blob = new Blob([header + rows], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "prospect_activity_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ color: B.grayMuted, padding: 20 }}>Loading activity log...</div>;

  // Summary stats
  var uniqueEmails = log.reduce(function(acc, e) { if (e.email && acc.indexOf(e.email) < 0) acc.push(e.email); return acc; }, []);
  var highIntentCount = log.filter(function(e) { return ["deal_saved", "equity_saved", "pdf_exported", "comparison_run", "portfolio_viewed", "town_compared", "deal_loaded", "equity_loaded"].indexOf(e.action) >= 0; }).length;

  // UTM source breakdown — aggregate events + unique prospects per source
  var sourceMap = {};
  log.forEach(function(e) {
    var src = e.utm_source || "direct";
    if (!sourceMap[src]) sourceMap[src] = { count: 0, emails: [] };
    sourceMap[src].count += 1;
    if (e.email && sourceMap[src].emails.indexOf(e.email) < 0) sourceMap[src].emails.push(e.email);
  });
  var sourceBreakdown = Object.keys(sourceMap).map(function(k) {
    return { source: k, count: sourceMap[k].count, prospects: sourceMap[k].emails.length };
  }).sort(function(a, b) { return b.count - a.count; });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, fontWeight: 400, color: B.white, margin: 0, letterSpacing: 1.5 }}>PROSPECT ACTIVITY LOG</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <ActionBtn label={"Export CSV (" + log.length + ")"} onClick={handleExportCSV} primary />
          <ActionBtn label="Clear All" onClick={handleClear} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <StatCard label="Total Events" value={log.length.toString()} />
        <StatCard label="Unique Prospects" value={uniqueEmails.length.toString()} />
        <StatCard label="High-Intent Actions" value={highIntentCount.toString()} accent="#4ade80" />
      </div>

      {sourceBreakdown.length > 0 && (
        <div style={{ ...pStyle, marginBottom: 16 }}>
          {pH("Traffic Sources (UTM)")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            {sourceBreakdown.map(function(s) { return (
              <div key={s.source} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px", borderLeft: "2px solid " + (s.source === "direct" ? B.grayMuted : B.greenLight) }}>
                <div style={{ fontSize: 10, color: B.grayMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{s.source}</div>
                <div style={{ fontSize: 16, color: B.white, fontWeight: 700 }}>{s.count}</div>
                <div style={{ fontSize: 9, color: B.grayText }}>{s.prospects} prospects</div>
              </div>
            ); })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={function() { setFilter("all"); }} style={{ padding: "6px 12px", fontSize: 11, borderRadius: 5, cursor: "pointer", border: filter === "all" ? "1px solid " + B.green : "1px solid rgba(27,72,18,0.15)", background: filter === "all" ? "rgba(27,72,18,0.2)" : "transparent", color: filter === "all" ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>All ({log.length})</button>
        {actionTypes.map(function(a) {
          var count = log.filter(function(e) { return e.action === a; }).length;
          return <button key={a} onClick={function() { setFilter(a); }} style={{ padding: "6px 12px", fontSize: 11, borderRadius: 5, cursor: "pointer", border: filter === a ? "1px solid " + B.green : "1px solid rgba(27,72,18,0.15)", background: filter === a ? "rgba(27,72,18,0.2)" : "transparent", color: filter === a ? B.greenLight : B.grayText, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{actionLabel(a)} ({count})</button>;
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: B.grayMuted }}>No activity recorded yet. Events will appear here as prospects use the tools.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid " + B.green }}>
                {["Time", "Prospect", "Source", "Action", "Detail"].map(function(h) {
                  return <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: B.grayMuted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(function(e) {
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid " + B.grayBorder }}>
                    <td style={{ padding: "8px 10px", color: B.grayText, whiteSpace: "nowrap", fontSize: 11 }}>{new Date(e.ts).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ color: B.white, fontWeight: 600, fontSize: 12 }}>{e.name}</div>
                      <div style={{ color: B.grayMuted, fontSize: 10 }}>{e.email}{e.phone ? " · " + e.phone : ""}</div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: 11, color: (e.utm_source && e.utm_source !== "direct") ? B.greenLight : B.grayMuted, fontWeight: 600 }}>{e.utm_source || "direct"}</span>
                      {e.utm_campaign && <div style={{ fontSize: 9, color: B.grayMuted }}>{e.utm_campaign}</div>}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: intentColor(e.action) + "18", color: intentColor(e.action) }}>{actionLabel(e.action)}</span>
                    </td>
                    <td style={{ padding: "8px 10px", color: B.grayText, fontSize: 11, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{e.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && <div style={{ padding: 12, color: B.grayMuted, fontSize: 11, textAlign: "center" }}>Showing first 100 of {filtered.length} events. Export CSV for full data.</div>}
        </div>
      )}
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

  // Check for admin mode via URL param
  var isAdmin = (typeof window !== "undefined") && (window.location.search.indexOf("admin=true") >= 0 || window.location.search.indexOf("admin=1") >= 0);

  useEffect(function() {
    // Capture UTM parameters on landing (persists via localStorage for same-session attribution)
    captureUTMs();
    loadLead().then(function(saved) {
      if (saved && saved.email) setLead(saved);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  var handleLeadSubmit = async function(formData) {
    setLead(formData);
    await saveLead(formData);
    await sendToWebhook(formData);
    logActivity(formData, "lead_registered", "Interests: " + (Array.isArray(formData.interests) ? formData.interests.join(", ") : formData.interests));
  };

  var handleTrack = function(action, detail) {
    logActivity(lead, action, detail);
  };

  var handleTabChange = function(key) {
    setTab(key);
    logActivity(lead, "tab_viewed", key);
  };

  if (loading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(170deg, " + B.navyDeep + " 0%, " + B.navy + " 40%, " + B.navyLight + " 100%)", fontFamily: "'DM Sans', sans-serif" }}><div style={{ color: B.grayMuted, fontSize: 14 }}>Loading...</div></div>);
  if (!lead) return (<div><style>{fonts}</style><LeadGate onSubmit={handleLeadSubmit} /></div>);

  var tabsList = [
    { key: "analyzer", label: "Deal Analyzer", icon: "\uD83D\uDCCA" },
    { key: "markets", label: "Market Intel", icon: "\uD83C\uDFD8\uFE0F" },
    { key: "equity", label: "Equity Estimator", icon: "\uD83D\uDCB0" },
    { key: "portfolio", label: "Portfolio", icon: "\uD83D\uDCC1" },
    { key: "compare", label: "Compare", icon: "\u2696\uFE0F" },
  ];
  if (isAdmin) tabsList.push({ key: "activity", label: "Activity Log", icon: "\uD83D\uDCCB" });

  return (
    <div><style>{fonts}</style>
      <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(170deg, " + B.navyDeep + " 0%, " + B.navy + " 40%, " + B.navyLight + " 100%)", color: B.white }}>
        <div style={{ borderBottom: "1px solid " + B.grayBorder, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}><EmpireLogo size={32} /><div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, lineHeight: 1 }}>CAPITAL REGION INVESTOR HUB</div><div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: B.green, fontWeight: 700 }}>Empire Real Estate Firm</div></div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: B.white, fontWeight: 600 }}>Ethan Harris</div><div style={{ fontSize: 10, color: B.grayMuted }}>Real Estate Salesperson · (518) 588-1122</div></div>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "10px 24px", borderBottom: "1px solid " + B.grayBorder, flexWrap: "wrap" }}>
          {tabsList.map(function(t) { return (<button key={t.key} onClick={function() { handleTabChange(t.key); }} style={{ padding: "9px 18px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: "none", background: tab === t.key ? "rgba(27,72,18,0.18)" : "transparent", color: tab === t.key ? B.greenLight : B.grayMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}</button>); })}
        </div>
        <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
          {tab === "analyzer" && <DealAnalyzer onTrack={handleTrack} />}
          {tab === "markets" && <MarketSnapshots onTrack={handleTrack} />}
          {tab === "equity" && <EquityEstimator onTrack={handleTrack} />}
          {tab === "portfolio" && <PortfolioDashboard onTrack={handleTrack} />}
          {tab === "compare" && <DealComparison onTrack={handleTrack} />}
          {tab === "activity" && isAdmin && <ActivityLog />}
        </div>
        <div style={{ borderTop: "1px solid " + B.grayBorder, padding: "18px 24px", textAlign: "center", marginTop: 30 }}>
          <p style={{ color: B.grayMuted, fontSize: 11, margin: "0 0 3px 0" }}>Ready to make a move? Let's underwrite your next deal together.</p>
          <p style={{ color: B.white, fontSize: 12, fontWeight: 700, margin: 0 }}>Ethan Harris · Empire Real Estate Firm · (518) 588-1122 · Ethan@EmpireRealEstateFirm.com</p>
        </div>
        <div style={{ padding: "16px 24px 24px 24px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 9, color: B.grayMuted, lineHeight: 1.7, opacity: 0.7 }}>
            <strong style={{ color: B.grayText, fontWeight: 700 }}>Disclaimer:</strong> This tool and all analyses generated herein are financial models provided for informational and educational purposes only. Nothing on this site constitutes financial, legal, tax, or investment advice. All projections, estimates, and calculations — including but not limited to estimated property values, cap rates, cash-on-cash returns, cashflow projections, and appreciation forecasts — are hypothetical and are not guarantees or representations of actual or future performance. Estimated property values are based on a generalized appreciation formula and may not reflect actual market conditions; a professional appraisal or comparative market analysis (CMA) should be obtained before making any purchase or refinance decision. Market data is compiled from third-party sources believed to be reliable but is not warranted for accuracy or completeness. All figures are approximations and may change without notice. Past performance and historical trends are not indicative of future results. Real estate investing involves risk, including the potential loss of principal. You should consult with a licensed real estate attorney, certified public accountant (CPA), financial advisor, and/or mortgage professional before making any investment decision. Ethan Harris is a licensed real estate salesperson with Empire Real Estate Firm and is not a licensed financial advisor, attorney, or tax professional. By using this tool, you acknowledge that all investment decisions are made at your own risk.
          </div>
        </div>
      </div>
    </div>
  );
}
