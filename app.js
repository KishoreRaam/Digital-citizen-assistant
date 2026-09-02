"use strict";

/* ============================================================
   App overview
   ------------------------------------------------------------
   This file controls the interactive welfare-assistant flow for the
   current prototype. It manages:
   - screen transitions (input/loading/results/no-match/error)
   - situation text capture and language detection
   - local scheme matching fallback logic
   - DOM rendering for result cards and status screens
   - user actions such as search, edit, retry, and replay

   The app is intentionally built to be explicit and easy to extend:
   each major section has a clear role and is written in a way that
   can be replaced or upgraded later without rewriting the entire app.
   ============================================================ */

/* ============================================================
   State
   ============================================================ */
let currentScreen = "input"; // 'input' | 'loading' | 'results' | 'nomatch' | 'error'
let chromeLang = "en";       // UI chrome only — independent of query/response language
let lastSituationText = "";
let lastMatchResult = null;  // { detectedLang, hero: {scheme,confidence}|null, secondary: [{scheme,confidence}] }
let activeNomatchFact = null; // "age" | "family" | null — which no-match suggestion chip is open
let userProfile = null;      // saved basic-details profile, or null — see Profile section below

// Full 120-scheme catalogue (data/schemes.json), loaded once at startup —
// see loadSchemes() in the Init section at the bottom of this file.
let SCHEMES = [];

// The app has no per-user profile/residency input yet, so every request is
// made on behalf of a Tamil Nadu resident — the only state this demo covers.
const RESIDENT_STATE = "Tamil Nadu";

const els = {};
document.querySelectorAll("[id]").forEach((el) => { els[el.id] = el; });

/* ============================================================
   Language detection for the user's typed situation
   (separate concern from the chrome toggle — see i18n.js)
   ============================================================ */
function detectLang(text) {
  if (/[஀-௿]/.test(text)) return "ta";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  return "en";
}

/* ============================================================
   Local zero-hallucination matcher (fallback / offline path)
   Only ever returns schemes from the SCHEMES catalogue. Scores by literal
   word overlap between the situation text and each scheme's English name /
   department / eligibility / description — the catalogue has no per-scheme
   keyword list or translated body text, so this fallback only finds
   signal in English (or English-word) input; Tamil/Hindi input offline
   falls through to "no match" until the live API is reachable again.
   ============================================================ */
function localMatchSchemes(text) {
  const words = [...new Set((text.toLowerCase().match(/[a-z]{4,}/g) || []))];
  if (words.length === 0) return [];

  const scored = SCHEMES.map((s) => {
    const haystack = `${s.name} ${s.department} ${s.eligibility} ${s.description}`.toLowerCase();
    const score = words.reduce((n, w) => n + (haystack.includes(w) ? 1 : 0), 0);
    return { scheme: s, score };
  }).filter((r) => r.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function buildResultFromLocalMatch(text) {
  const lang = detectLang(text);
  const scored = localMatchSchemes(text)
    .filter((r) => r.scheme.level === "central" || r.scheme.state === RESIDENT_STATE)
    .slice(0, 5);

  if (scored.length === 0) {
    return { detectedLang: lang, hero: null, secondary: [] };
  }

  const top = scored[0].score;
  const ranked = scored.map((r) => ({
    scheme: r.scheme,
    confidence: r.score >= top ? "high" : r.score >= top / 2 ? "medium" : "low",
  }));
  return { detectedLang: lang, hero: ranked[0], secondary: ranked.slice(1) };
}

/* ============================================================
   Backend call with graceful fallback
   404 / no route  -> silently fall back to local matcher (static hosting)
   5xx / network error while online -> real error screen
   ============================================================ */
async function matchSchemes(text) {
  if (navigator.onLine) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const res = await fetch("/api/match-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, state: RESIDENT_STATE }),
        signal: controller.signal,
      });
      clearTimeout(t);

      if (res.ok) {
        const data = await res.json();
        return normalizeApiResult(data);
      }
      if (res.status >= 500) {
        throw new Error("backend_error_" + res.status);
      }
      // 404 or similar: no backend deployed here — fall back quietly, but
      // still surface it in the console so a broken/missing backend during
      // local dev is never silently indistinguishable from a real no-match.
      console.warn(`[Thaguthi] /api/match-schemes returned ${res.status} — falling back to the local offline matcher (English-only, much weaker than the live match). If a backend should be running, check it's actually deployed/reachable at this URL.`);
    } catch (err) {
      if (err && err.name !== "AbortError" && String(err.message || "").startsWith("backend_error_")) {
        throw err;
      }
      if (err && err.name === "TypeError") {
        // fetch couldn't even reach a route — no backend present, fall back quietly
        console.warn("[Thaguthi] /api/match-schemes was unreachable (network-level failure) — falling back to the local offline matcher (English-only, much weaker than the live match).", err);
      } else if (err && err.name === "AbortError") {
        throw new Error("timeout");
      } else if (err && String(err.message || "").startsWith("backend_error_")) {
        throw err;
      }
    }
  }
  return buildResultFromLocalMatch(text);
}

function normalizeApiResult(data) {
  // Expected shape from /api/match-schemes: { detectedLang, matches: [{id, confidence}] }
  const byId = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
  const matches = (Array.isArray(data.matches) ? data.matches : [])
    .map((m) => ({ scheme: byId[m.id], confidence: m.confidence }))
    .filter((r) => r.scheme);
  return {
    detectedLang: data.detectedLang || "en",
    hero: matches[0] || null,
    secondary: matches.slice(1),
  };
}

/* ============================================================
   i18n chrome helpers
   ============================================================ */
function t(key) {
  const v = I18N[chromeLang][key];
  return typeof v === "function" ? v : v;
}
function applyChromeI18n() {
  document.documentElement.lang = chromeLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const v = I18N[chromeLang][key];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = I18N[chromeLang][key];
  });
  els.langBtnLabel.textContent = I18N[chromeLang].langLabels[chromeLang];
  els.langBtnLabel.className = chromeLang === "ta" ? "tamil" : chromeLang === "hi" ? "deva" : "";
  document.querySelectorAll(".lang-row").forEach((row) => {
    const l = row.getAttribute("data-lang");
    row.classList.toggle("active", l === chromeLang);
    row.querySelector("[data-check]").classList.toggle("show", l === chromeLang);
  });
  renderChips();
  renderSchemeStrip();
  renderStripMore();
  renderFooterStats();
  renderWhyStats();
  if (currentScreen === "results" && lastMatchResult) renderResults(lastMatchResult);
  if (currentScreen === "nomatch" && lastMatchResult) renderNomatch(lastMatchResult);
  if (currentScreen === "nomatch" && activeNomatchFact) updateNomatchDetailLabel();
  renderFormAssistant();
}

function setChromeLang(l) {
  chromeLang = l;
  try { localStorage.setItem("chromeLang", l); } catch {}
  els.langMenu.hidden = true;
  els.langBtn.setAttribute("aria-expanded", "false");
  applyChromeI18n();
}

/* ============================================================
   Example chips — always keep a Tamil and a Hindi example present,
   whatever the chrome language is set to.
   ============================================================ */
const CHIP_EXAMPLES = [
  { text: "நான் ஒரு விவசாயி. 2 ஏக்கர் நிலத்தில் நெல் பயிரிடுகிறேன். இந்த ஆண்டு மழையின்றி பயிர் பாதிக்கப்பட்டது. ", cls: "tamil" },
  { text: "मेरे पति का निधन हो गया और मेरे पास कोई नियमित आय नहीं है। ", cls: "deva" },
  { text: "எனக்கு 62 வயது, தனியாக வசிக்கிறேன், நிலையான வருமானம் இல்லை. ", cls: "tamil" },
  { text: "मेरे घर में गैस कनेक्शन नहीं है, हम लकड़ी से खाना बनाते हैं। ", cls: "deva" },
];
function renderChips() {
  els.chips.innerHTML = "";
  CHIP_EXAMPLES.forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip " + c.cls;
    b.textContent = c.text.trim();
    b.addEventListener("click", () => {
      els.situationInput.value = c.text;
      runSearch();
    });
    els.chips.appendChild(b);
  });
}

/* ============================================================
   Input screen — browsable scheme strip (a taste of the catalogue,
   visible before typing) and footer stats. Both chrome-translated.
   ============================================================ */
const STRIP_SCHEME_IDS = [
  "pm-kisan",
  "mgnrega",
  "chief-minister-s-comprehensive-health-insurance-scheme",
  "indira-gandhi-national-old-age-pension-scheme",
  "pradhan-mantri-awas-yojana-gramin",
  "post-matric-scholarship-for-sc-students",
];

// Department names come from the xlsx catalogue in English only — this maps
// each one to a UI-chrome translation, same role schemes.js's old
// per-scheme CATEGORY_META played, just keyed by department instead.
const DEPARTMENT_META = {
  "Agriculture": { en: "Agriculture", ta: "விவசாயம்", hi: "कृषि" },
  "Business/MSME": { en: "Business / MSME", ta: "வணிகம் & MSME", hi: "व्यवसाय / एमएसएमई" },
  "Defence": { en: "Defence", ta: "பாதுகாப்பு", hi: "रक्षा" },
  "Digital & IT": { en: "Digital & IT", ta: "டிஜிட்டல் & IT", hi: "डिजिटल एवं आईटी" },
  "Education": { en: "Education", ta: "கல்வி", hi: "शिक्षा" },
  "Employment": { en: "Employment", ta: "வேலைவாய்ப்பு", hi: "रोज़गार" },
  "Energy": { en: "Energy", ta: "எரிசக்தி", hi: "ऊर्जा" },
  "Finance/Banking": { en: "Finance / Banking", ta: "நிதி & வங்கி", hi: "वित्त एवं बैंकिंग" },
  "Food & Civil Supplies": { en: "Food & Civil Supplies", ta: "உணவு & பொது விநியோகம்", hi: "खाद्य एवं आपूर्ति" },
  "Health": { en: "Health", ta: "சுகாதாரம்", hi: "स्वास्थ्य" },
  "Housing": { en: "Housing", ta: "வீட்டு வசதி", hi: "आवास" },
  "Minority Affairs": { en: "Minority Affairs", ta: "சிறுபான்மையினர் நலன்", hi: "अल्पसंख्यक कल्याण" },
  "Social Welfare": { en: "Social Welfare", ta: "சமூக நலன்", hi: "सामाजिक कल्याण" },
  "Sports & Youth": { en: "Sports & Youth", ta: "விளையாட்டு & இளைஞர்", hi: "खेल एवं युवा" },
  "Transport": { en: "Transport", ta: "போக்குவரத்து", hi: "परिवहन" },
  "Women & Child": { en: "Women & Child", ta: "பெண்கள் & குழந்தைகள்", hi: "महिला एवं बाल" },
};
function departmentLabel(department, lang) {
  const meta = DEPARTMENT_META[department];
  return meta ? (meta[lang] || meta.en) : department;
}

// Scheme catalogue fields (name/eligibility/description/source) are English
// by default; ta/hi versions live under scheme.i18n[lang], added by
// scripts/translate-schemes.py. Falls back to English when a translation is
// missing for a given scheme/field so nothing ever renders blank.
function schemeText(scheme, field, lang) {
  const translated = scheme.i18n && scheme.i18n[lang] && scheme.i18n[lang][field];
  return translated || scheme[field];
}

function renderSchemeStrip() {
  const byId = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
  els.schemeStrip.innerHTML = STRIP_SCHEME_IDS.map((id) => {
    const scheme = byId[id];
    if (!scheme) return "";
    const catLabel = departmentLabel(scheme.department, chromeLang);
    return `
      <div class="strip-card">
        <div class="strip-card-head">${SHIELD_ICON}<span class="strip-card-cat">${escapeHtml(catLabel)}</span></div>
        <div class="strip-card-name" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "name", chromeLang))}</div>
        <div class="strip-card-blurb" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "description", chromeLang))}</div>
      </div>`;
  }).join("");
}

function renderFooterStats() {
  els.footerStats.textContent = I18N[chromeLang].footerStats(SCHEMES.length, Object.keys(I18N).length);
}

function renderWhyStats() {
  if (els.whyStatSchemes) els.whyStatSchemes.textContent = SCHEMES.length;
  if (els.whyStatLangs) els.whyStatLangs.textContent = Object.keys(I18N).length;
}

function renderStripMore() {
  const more = SCHEMES.length - STRIP_SCHEME_IDS.length;
  els.stripMore.textContent = more > 0 ? I18N[chromeLang].stripMore(more) : "";
}

/* ============================================================
   Screen switching
   ============================================================ */
function showScreen(name) {
  currentScreen = name;
  ["input", "loading", "results", "nomatch", "error"].forEach((s) => {
    els["screen-" + s].hidden = s !== name;
  });
  window.scrollTo(0, 0);
  // Not fired here: at this point renderResults() hasn't run yet, so
  // #resultSeal either doesn't exist or is still the previous render's stale
  // element. renderResults() calls fireSeal() itself once it's rebuilt it.
  if (name === "loading") startLoadingMsgs(); else stopLoadingMsgs();
}

/* ============================================================
   Loading screen — rotating micro-copy (chrome-translated),
   distinct from a generic spinner.
   ============================================================ */
let loadingMsgTimer = null;
function startLoadingMsgs() {
  let i = 0;
  const advance = () => {
    const msgs = I18N[chromeLang].loadingMsgs;
    els.loadingHeading.textContent = msgs[i % msgs.length];
    i++;
  };
  advance();
  loadingMsgTimer = setInterval(advance, 1200);
}
function stopLoadingMsgs() {
  if (loadingMsgTimer) {
    clearInterval(loadingMsgTimer);
    loadingMsgTimer = null;
  }
}

function fireSeal() {
  const seal = document.getElementById("resultSeal");
  if (!seal) return;
  seal.classList.remove("on");
  requestAnimationFrame(() => requestAnimationFrame(() => seal.classList.add("on")));
}

/* ============================================================
   Results rendering
   ============================================================ */
function factTags(text, lang) {
  const tags = [];
  const has = (arr) => arr.some((k) => text.toLowerCase().includes(k.toLowerCase()));
  const push = (kEn, kTa, kHi, v) => {
    const label = lang === "ta" ? kTa : lang === "hi" ? kHi : kEn;
    tags.push({ k: label, v });
  };
  if (has(["farmer","விவசாயி","किसान","acre","ஏக்கர்","एकड़"])) {
    push("Occupation","தொழில்","पेशा", lang === "ta" ? "விவசாயம்" : lang === "hi" ? "खेती" : "Farming");
  }
  if (has(["crop fail","drought","பயிர் இழப்பு","வறட்சி","फसल खराब","सूखा"])) {
    push("Situation","நிலைமை","स्थिति", lang === "ta" ? "வறட்சி · பயிர் இழப்பு" : lang === "hi" ? "सूखा · फसल नुकसान" : "Drought · crop loss");
  }
  if (has(["widow","விதவை","विधवा"])) {
    push("Situation","நிலைமை","स्थिति", lang === "ta" ? "விதவை" : lang === "hi" ? "विधवा" : "Widowed");
  }
  if (has(["disab","மாற்றுத்திறன","विकलांग","दिव्यांग"])) {
    push("Situation","நிலைமை","स्थिति", lang === "ta" ? "மாற்றுத்திறனாளி" : lang === "hi" ? "दिव्यांग" : "Disability");
  }
  return tags;
}

function renderResults(result) {
  const lang = result.detectedLang;
  els.spText.textContent = lastSituationText;
  els.spText.setAttribute("lang", lang);

  els.spTags.innerHTML = "";
  factTags(lastSituationText, lang).forEach((tag) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="sp-tag-k">${tag.k}</div><div class="sp-tag-v" lang="${lang}">${escapeHtml(tag.v)}</div>`;
    els.spTags.appendChild(wrap);
  });

  const total = 1 + result.secondary.length;
  els.schemesCount.textContent = I18N[chromeLang].schemesCount(total);

  els.heroCard.innerHTML = heroCardHtml(result.hero);
  els.secondaryGrid.innerHTML = result.secondary.map((r, i) => secondaryCardHtml(r, i)).join("");
  renderBenefitDashboard(result);
  fireSeal(); // #resultSeal was just (re)built above — safe to animate it now.
}

/* ============================================================
   Benefit Dashboard — pure computation over the matched schemes' static
   catalogue fields (see benefitCalculator.js). No LLM call: the model only
   ever decides which schemes matched; every number here is a lookup/sum, so
   it can't drift from the catalogue.

   Labels follow the situation's detected language (result.detectedLang),
   same as spText/factTags above — not the chromeLang UI toggle — since this
   panel is read together with the citizen's own words.
   ============================================================ */
const WARNING_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 17h.01M10.3 4.5L2.9 18a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0z"/></svg>';

function formatINR(n) {
  return Math.round(n).toLocaleString("en-IN");
}

// One scheme's annualized figure as display text, e.g. "₹6,000" (fixed),
// "₹1,000–₹1,500" (range), "up to ₹5,00,000" (a coverage ceiling — insurance
// caps are money available if needed, not a guaranteed payout, unlike a
// fixed one_time cash gift which needs no "up to" hedge).
function amountRangeText(item, t) {
  const isCeiling = item.benefitCategory === "coverage";
  const amount = item.isRange
    ? `₹${formatINR(item.annualLow)}–₹${formatINR(item.annualHigh)}`
    : `₹${formatINR(item.annualHigh)}`;
  return isCeiling ? t.benefitUpTo(amount) : amount;
}

// item.displayName/excludedNameShown are set by renderBenefitDashboard from
// schemeText(scheme, "name", chromeLang) — scheme names follow chromeLang,
// the same convention the hero/secondary cards right below use, so a row
// here never disagrees with the card for the same scheme. Only this panel's
// own labels (t, keyed by the situation's detected language) differ from
// the cards, per the dashboard's language spec.
function benefitBreakdownRowHtml(item, t) {
  const byline =
    item.benefitCategory === "coverage"
      ? `<span class="bd-tag">${escapeHtml(t.benefitCoverageTag)}</span>`
      : "";
  const warning = item.excluded
    ? `<div class="bd-warning">${WARNING_ICON}<span>${escapeHtml(t.benefitConflictWarning(item.excludedNameShown))}</span></div>`
    : "";
  const feeNote =
    item.applicationCost > 0
      ? `<div class="bd-fee">${escapeHtml(t.benefitApplicationCost(`₹${formatINR(item.applicationCost)}`))}</div>`
      : "";
  // A one_time cash gift isn't recurring — "/yr" on it would assert a
  // yearly cadence the source data never stated (it's only annualized once,
  // for the year-1 total).
  const suffix =
    item.benefitCategory === "coverage" || item.benefitType === "one_time" ? "" : t.benefitPerYearSuffix;
  return `
    <div class="bd-row${item.excluded ? " bd-row-excluded" : ""}">
      <div class="bd-row-main">
        <span class="bd-name" lang="${chromeLang}">${escapeHtml(item.displayName)}</span>
        <span class="bd-amount">${amountRangeText(item, t)}${suffix}</span>
      </div>
      ${byline}
      ${feeNote}
      ${warning}
    </div>`;
}

function renderBenefitDashboard(result) {
  if (!els.benefitDashboard) return;

  const matched = [result.hero, ...result.secondary].filter(Boolean).map((m) => m.scheme);
  const dashboard = window.BenefitCalculator ? window.BenefitCalculator.computeBenefitDashboard(matched) : null;

  if (!dashboard) {
    els.benefitDashboard.innerHTML = "";
    els.benefitDashboard.hidden = true;
    return;
  }

  const lang = result.detectedLang;
  const t = I18N[lang] || I18N.en;
  els.benefitDashboard.hidden = false;

  if (!dashboard.hasAnyAmount) {
    els.benefitDashboard.innerHTML = `
      <div class="benefit-dashboard-card benefit-dashboard-empty">
        <div class="bd-title" lang="${lang}">${escapeHtml(t.benefitDashboardTitle)}</div>
        <p class="bd-empty-msg" lang="${lang}">${escapeHtml(t.benefitEmptyState)}</p>
      </div>`;
    return;
  }

  // Scheme names follow chromeLang (schemeText), same as the hero/secondary
  // cards below — resolved from `matched`, which still has the full scheme
  // records (dashboard.items only carries the catalogue's English name).
  const nameById = Object.fromEntries(matched.map((s) => [s.id, schemeText(s, "name", chromeLang)]));
  dashboard.items.forEach((i) => {
    i.displayName = nameById[i.id] || i.name;
    if (i.excluded) i.excludedNameShown = nameById[i.excludedInFavorOf] || i.excludedInFavorOf;
  });

  const cashHeadline =
    dashboard.cash.high > 0
      ? dashboard.cash.isRange
        ? `₹${formatINR(dashboard.cash.low)}–₹${formatINR(dashboard.cash.high)}`
        : `₹${formatINR(dashboard.cash.high)}`
      : null;

  const missingOutHtml = cashHeadline
    ? `<div class="bd-headline">${escapeHtml(t.benefitMissingOut(cashHeadline))}</div>`
    : "";

  const coverageTileHtml =
    dashboard.coverage.high > 0
      ? `
      <div class="bd-tile">
        <div class="bd-tile-label" lang="${lang}">${escapeHtml(t.benefitCoverageLabel)}</div>
        <div class="bd-tile-value">${dashboard.coverage.isRange ? `₹${formatINR(dashboard.coverage.low)}–₹${formatINR(dashboard.coverage.high)}` : `₹${formatINR(dashboard.coverage.high)}`}</div>
      </div>`
      : "";

  const breakdownItems = dashboard.items.filter((i) => i.hasAmount);
  const breakdownHtml = breakdownItems.length
    ? `
      <div class="bd-breakdown">
        <div class="dossier-label">${escapeHtml(t.benefitBreakdownLabel)}</div>
        ${breakdownItems.map((i) => benefitBreakdownRowHtml(i, t)).join("")}
      </div>`
    : "";

  els.benefitDashboard.innerHTML = `
    <div class="benefit-dashboard-card">
      <div class="bd-title" lang="${lang}">${escapeHtml(t.benefitDashboardTitle)}</div>
      ${missingOutHtml}
      <div class="bd-tiles">
        <div class="bd-tile">
          <div class="bd-tile-label" lang="${lang}">${escapeHtml(t.benefitCashLabel)}</div>
          <div class="bd-tile-value">${cashHeadline ? cashHeadline : "—"}</div>
        </div>
        ${coverageTileHtml}
      </div>
      ${breakdownHtml}
      <p class="bd-disclaimer" lang="${lang}">${escapeHtml(t.benefitDisclaimer)}</p>
    </div>`;
}

function confidenceBadgeHtml(confidence) {
  if (confidence === "high") return "";
  const key = "confidence" + confidence.charAt(0).toUpperCase() + confidence.slice(1);
  return `<span class="sc-badge">${escapeHtml(I18N[chromeLang][key])}</span>`;
}

function heroCardHtml(match) {
  const { scheme, confidence } = match;
  const badge = confidenceBadgeHtml(confidence);

  return `
    <div class="rowin hero-card">
      <div class="seal" id="resultSeal" title="Replay stamp">
        <svg viewBox="0 0 100 100">
          <defs><path id="ptop" d="M20,54 A34,34 0 0 1 80,54"/><path id="pbot" d="M22,52 A32,32 0 0 0 78,52"/></defs>
          <circle cx="50" cy="50" r="41" fill="rgba(201,162,39,.06)" stroke="#C9A227" stroke-width="2.5"/>
          <circle cx="50" cy="50" r="33" fill="none" stroke="#C9A227" stroke-width="1" stroke-dasharray="1.5 3"/>
          <text font-family="Libre Franklin" font-size="8.5" font-weight="700" letter-spacing="2.5" fill="#C9A227"><textPath href="#ptop" startOffset="50%" text-anchor="middle">${I18N[chromeLang].eligibleRibbonTop}</textPath></text>
          <text font-family="Noto Sans Tamil" font-size="9.5" font-weight="600" fill="#C9A227"><textPath href="#pbot" startOffset="50%" text-anchor="middle">${escapeHtml(I18N[chromeLang].eligibleRibbonBottom)}</textPath></text>
          <path d="M38 51 l8 8 l16 -18" fill="none" stroke="#C9A227" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${categoryTagHtml(scheme)}
      <div class="hero-agency" lang="en">${escapeHtml(scheme.department)}</div>
      <div class="hero-name-row">
        <span class="hero-name" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "name", chromeLang))}</span>
        ${badge}
      </div>
      <div class="dossier-label" style="margin-top:12px">${escapeHtml(I18N[chromeLang].whyQualify)}</div>
      <p class="hero-reason" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "eligibility", chromeLang))}</p>
      ${benefitHtml(scheme)}
      ${dossierHtml(scheme)}
    </div>`;
}

function secondaryCardHtml(match, i) {
  const { scheme, confidence } = match;
  const badge = confidenceBadgeHtml(confidence);
  return `
    <div class="rowin secondary-card" style="animation-delay:${(i + 1) * 0.09}s">
      ${categoryTagHtml(scheme)}
      <div class="sc-head">
        <span class="sc-agency" lang="en">${escapeHtml(scheme.department)}</span>
        ${badge}
      </div>
      <div class="sc-name" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "name", chromeLang))}</div>
      <div class="sc-body" lang="${chromeLang}">${escapeHtml(schemeText(scheme, "eligibility", chromeLang))}</div>
      ${dossierHtml(scheme)}
    </div>`;
}

function renderNomatch(result) {
  // The API no longer returns a "closest possible" hint scheme alongside an
  // empty match list, so this panel stays hidden — see match-schemes.js.
  els.nomatchHint.hidden = true;
}

const NOMATCH_FACT_LABELS = {
  age: { en: "Your age", ta: "உங்கள் வயது", hi: "आपकी उम्र" },
  family: { en: "Family details", ta: "குடும்ப விவரங்கள்", hi: "पारिवारिक विवरण" },
};
function updateNomatchDetailLabel() {
  const label = NOMATCH_FACT_LABELS[activeNomatchFact];
  els.nomatchDetailLabel.textContent = label ? (label[chromeLang] || label.en) : "";
}
// Called whenever a fresh (new) no-match result is rendered, so a leftover
// open chip/typed detail from a previous search doesn't carry over.
function resetNomatchDetailInput() {
  activeNomatchFact = null;
  els.nomatchDetailRow.hidden = true;
  els.nomatchDetailInput.value = "";
  document.querySelectorAll(".nomatch-suggest-btn").forEach((b) => b.classList.remove("active"));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const SHIELD_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>';
const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9.5 12l2 2 3.5-4"/><circle cx="12" cy="12" r="9"/></svg>';
const ARROW_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function categoryTagHtml(scheme) {
  const label = departmentLabel(scheme.department, chromeLang);
  return `<div class="category-tag">${SHIELD_ICON}<span>${escapeHtml(label)}</span></div>`;
}

function benefitHtml(scheme) {
  return `
    <div class="dossier-label">${escapeHtml(I18N[chromeLang].whatYouGet)}</div>
    <div class="benefit-line">${CHECK_ICON}<span lang="${chromeLang}">${escapeHtml(schemeText(scheme, "description", chromeLang))}</span></div>`;
}

// apply_url is the strongest field in the catalogue (100% coverage across
// all 120 schemes) — always rendered as a real, clickable link, not just text.
function dossierHtml(scheme) {
  const displayUrl = scheme.apply_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `
    <div class="dossier">
      <div>
        <div class="dossier-label">${escapeHtml(I18N[chromeLang].sourceLabel)}</div>
        <div class="dossier-next" lang="${chromeLang}"><span>${escapeHtml(schemeText(scheme, "source", chromeLang))}</span></div>
      </div>
      <div>
        <div class="dossier-label">${escapeHtml(I18N[chromeLang].nextStepLabel)}</div>
        <a class="dossier-next apply-link" lang="en" href="${escapeHtml(scheme.apply_url)}" target="_blank" rel="noopener noreferrer">${ARROW_ICON}<span>${escapeHtml(displayUrl)}</span></a>
      </div>
    </div>`;
}

/* ============================================================
   Form Assistant — wired to the currently matched scheme (session state
   only, i.e. lastMatchResult), not to the decorative FORM_TEMPLATES mockup
   below it. No LLM call: the checklist is pure string formatting of the
   scheme's own eligibility text already in data/schemes.json.
   ============================================================ */
function renderFormAssistant() {
  const scheme = lastMatchResult && lastMatchResult.hero && lastMatchResult.hero.scheme;
  if (!scheme) {
    els.formMatchedPanel.hidden = true;
    els.formAssistantProtoLabel.hidden = false;
    return;
  }
  els.formAssistantProtoLabel.hidden = true;
  els.formMatchedPanel.hidden = false;
  els.formMatchedName.textContent = schemeText(scheme, "name", chromeLang);
  els.formMatchedName.setAttribute("lang", chromeLang);
  els.formMatchedChecklist.setAttribute("lang", chromeLang);
  els.formMatchedChecklist.innerHTML = schemeText(scheme, "eligibility", chromeLang)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const displayUrl = scheme.apply_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  els.formMatchedLink.href = scheme.apply_url;
  els.formMatchedLink.innerHTML = `${ARROW_ICON}<span>${escapeHtml(displayUrl)}</span>`;
}

/* ============================================================
   Profile — one-time basic details, saved locally only. Used to (a) build
   a situation sentence for the same scheme-matching pipeline runSearch()
   already uses, and (b) pre-fill the Form Assistant mockup fields instead
   of its canned per-template sample data. Never sent anywhere except as
   part of a normal search request.
   ============================================================ */
const PROFILE_STORAGE_KEY = "thaguthiProfile";

// English-only labels, independent of chromeLang — these feed the situation
// text sent to the matcher/API, which only understands English/Tamil/Hindi
// prose, not raw form keys.
const OCCUPATION_LABELS = {
  farmer: "farmer", laborer: "daily wage labourer", selfEmployed: "self-employed / small business owner",
  govtEmployee: "government employee", privateEmployee: "private employee", unemployed: "unemployed",
  student: "student", homemaker: "homemaker", retired: "retired / senior citizen",
};
const CATEGORY_LABELS = { general: "General", obc: "OBC", sc: "SC", st: "ST", minority: "Minority" };

const PROFILE_FIELD_IDS = [
  "profileFullName", "profileAge", "profileGender", "profileOccupation", "profileCategory",
  "profileMaritalStatus", "profileIncome", "profileLand", "profileFamilyMembers", "profileDistrict",
  "profileDisability", "profileRationCard",
];

function loadProfileFromStorage() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveProfileToStorage(profile) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
}
function clearProfileFromStorage() {
  try { localStorage.removeItem(PROFILE_STORAGE_KEY); } catch {}
}

function getProfileFormData() {
  const profile = {};
  PROFILE_FIELD_IDS.forEach((id) => {
    const el = els[id];
    if (el) profile[id] = el.value.trim();
  });
  return profile;
}
function setProfileFormData(profile) {
  const p = profile || {};
  PROFILE_FIELD_IDS.forEach((id) => {
    const el = els[id];
    if (!el) return;
    // yes/no selects default to "no" rather than blank — a false "no" is a
    // safer default than a false "yes" for eligibility-affecting facts.
    const isYesNo = id === "profileDisability" || id === "profileRationCard";
    el.value = p[id] || (isYesNo ? "no" : "");
  });
}

function openProfileModal() {
  setProfileFormData(userProfile);
  els.profileSavedTag.hidden = true;
  els.profileModal.hidden = false;
}
function closeProfileModal() {
  els.profileModal.hidden = true;
}

// Composes a plain-English situation sentence from the profile — fed into
// the exact same matchSchemes()/runSearch() pipeline as free-typed text, so
// it benefits from the live API when reachable and the local fallback matcher
// when not, with no separate matching logic to keep in sync.
function buildSituationTextFromProfile(p) {
  const parts = [];
  if (p.profileAge && p.profileGender) {
    parts.push(`I am a ${p.profileAge} year old ${p.profileGender}`);
  } else if (p.profileAge) {
    parts.push(`I am ${p.profileAge} years old`);
  }
  const occ = OCCUPATION_LABELS[p.profileOccupation];
  if (occ) parts.push(`I work as a ${occ}`);
  if (p.profileLand && Number(p.profileLand) > 0) parts.push(`I own ${p.profileLand} acres of farm land`);
  if (p.profileDistrict) parts.push(`I live in ${p.profileDistrict}, ${RESIDENT_STATE}`);
  if (p.profileIncome) parts.push(`My annual family income is about ₹${p.profileIncome}`);
  if (p.profileFamilyMembers) parts.push(`There are ${p.profileFamilyMembers} members in my family`);
  const cat = CATEGORY_LABELS[p.profileCategory];
  if (cat && cat !== "General") parts.push(`I belong to the ${cat} category`);
  if (p.profileMaritalStatus === "widowed") parts.push(`I am widowed`);
  if (p.profileDisability === "yes") parts.push(`I have a disability`);
  if (p.profileRationCard === "yes") parts.push(`I hold a BPL ration card`);
  return parts.join(". ") + (parts.length ? "." : "");
}

// Overrides for the Form Assistant mockup's per-template sample data (see
// FORM_TEMPLATES below) — only the fields the saved profile actually covers,
// so an incomplete profile still falls back to the template's own sample.
function profileOverlayForTemplate(key) {
  if (!userProfile) return {};
  const p = userProfile;
  const overlay = {};
  if (p.profileFullName) overlay.applicant = p.profileFullName;
  const occLabel = OCCUPATION_LABELS[p.profileOccupation];
  const catLabel = CATEGORY_LABELS[p.profileCategory];
  if (occLabel) {
    const occTitled = occLabel.charAt(0).toUpperCase() + occLabel.slice(1);
    overlay.category = catLabel && catLabel !== "General" ? `${occTitled} (${catLabel})` : occTitled;
  }
  if (p.profileDistrict) overlay.district = `${p.profileDistrict}, ${RESIDENT_STATE}`;
  if (key === "pmkisan" && p.profileLand) overlay.landIncome = `${p.profileLand} Acres`;
  if (key === "cmchis" && p.profileIncome) overlay.landIncome = `₹${Number(p.profileIncome).toLocaleString("en-IN")} / year`;
  if (key === "pension" && p.profileAge) {
    overlay.landIncome = p.profileIncome
      ? `${p.profileAge} Years / ₹${Number(p.profileIncome).toLocaleString("en-IN")} income`
      : `${p.profileAge} Years`;
  }
  return overlay;
}

function handleSaveProfile() {
  userProfile = getProfileFormData();
  saveProfileToStorage(userProfile);
  els.profileSavedTag.hidden = false;
}

function handleClearProfile() {
  userProfile = null;
  clearProfileFromStorage();
  setProfileFormData(null);
  els.profileSavedTag.hidden = true;
}

function handleSaveAndFindSchemes() {
  userProfile = getProfileFormData();
  saveProfileToStorage(userProfile);
  const text = buildSituationTextFromProfile(userProfile);
  closeProfileModal();
  if (!text) { els.situationInput.focus(); return; }
  els.situationInput.value = text;
  runSearch();
}

/* ============================================================
   Search flow
   ============================================================ */
let loadingStarted = 0;
async function runSearch() {
  const text = els.situationInput.value.trim();
  if (!text) { els.situationInput.focus(); return; }
  lastSituationText = text;

  loadingStarted = Date.now();
  showScreen("loading");

  try {
    const result = await matchSchemes(text);
    lastMatchResult = result;
    renderFormAssistant();
    const elapsed = Date.now() - loadingStarted;
    const wait = Math.max(0, 900 - elapsed); // avoid a screen flash on instant local matches
    setTimeout(() => {
      if (!result.hero) {
        resetNomatchDetailInput();
        showScreen("nomatch");
        renderNomatch(result);
      } else {
        showScreen("results");
        renderResults(result);
      }
    }, wait);
  } catch (err) {
    const elapsed = Date.now() - loadingStarted;
    const wait = Math.max(0, 900 - elapsed);
    setTimeout(() => showScreen("error"), wait);
  }
}

function resetToInput(opts) {
  const clear = !!(opts && opts.clear);
  if (clear) els.situationInput.value = "";
  showScreen("input");
  if (!clear) {
    els.situationInput.focus();
    const end = els.situationInput.value.length;
    els.situationInput.setSelectionRange(end, end);
  }
}

function setupStickyNav() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const toggleHeaderState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  toggleHeaderState();
  window.addEventListener("scroll", toggleHeaderState, { passive: true });
}

function setupRevealAnimations() {
  const targets = document.querySelectorAll(".hiw-step-lg, .strip-card, .why-body");
  targets.forEach((el, idx) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${idx * 120}ms`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  targets.forEach((el) => observer.observe(el));
}

function setupCountUp() {
  const nodes = document.querySelectorAll(".why-stat-num");
  nodes.forEach((el) => {
    const target = parseInt(el.textContent, 10);
    if (Number.isNaN(target)) return;
    el.dataset.countTarget = String(target);
    el.textContent = "0";
  });

  const DURATION = 900;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const el = entry.target;
      const target = Number(el.dataset.countTarget || 0);
      if (target <= 0) { el.textContent = "0"; return; }
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = String(target);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });

  nodes.forEach((el) => observer.observe(el));
}

/* ============================================================
   Wire up events
   ============================================================ */
els.brandReset.addEventListener("click", (e) => { e.preventDefault(); resetToInput({ clear: true }); });
els.submitBtn.addEventListener("click", runSearch);
els.situationInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runSearch();
});
// "Edit situation" — take the user back to their own text to revise, not a blank form.
els.editBtn.addEventListener("click", () => resetToInput({ clear: false }));
// Results "Search again" — a fresh search starts from a blank slate.
els.backBtn.addEventListener("click", () => resetToInput({ clear: true }));
els.replayBtn.addEventListener("click", fireSeal);
// The seal graphic itself is tappable to replay, not just the "Replay seal" button —
// event delegation because #resultSeal is recreated on every heroCard render.
els.heroCard.addEventListener("click", (e) => { if (e.target.closest("#resultSeal")) fireSeal(); });
// No-match suggestion chips — clicking one opens a small inline input for
// that specific detail, right on the no-match screen (no screen change).
document.querySelectorAll(".nomatch-suggest-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nomatch-suggest-btn").forEach((b) => b.classList.toggle("active", b === btn));
    activeNomatchFact = btn.dataset.fact;
    updateNomatchDetailLabel();
    els.nomatchDetailRow.hidden = false;
    els.nomatchDetailInput.value = "";
    els.nomatchDetailInput.focus();
  });
});
// "Add details and search again" merges whatever was typed into the inline
// detail input into the situation text, then calls the exact same runSearch()
// the main search bar uses — same endpoint, same loading state, same rendering.
els.nomatchRetryBtn.addEventListener("click", () => {
  const detail = (!els.nomatchDetailRow.hidden && els.nomatchDetailInput.value.trim()) || "";
  els.situationInput.value = detail ? `${lastSituationText} ${detail}`.trim() : lastSituationText;
  runSearch();
});
els.nomatchDetailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); els.nomatchRetryBtn.click(); }
});
els.errorRetryBtn.addEventListener("click", runSearch);
els.errorHomeBtn.addEventListener("click", () => resetToInput({ clear: true }));

// Profile modal
els.navProfileBtn.addEventListener("click", () => {
  els.siteNav.classList.remove("open");
  els.navToggle.setAttribute("aria-expanded", "false");
  openProfileModal();
});
els.profileCloseBtn.addEventListener("click", closeProfileModal);
els.profileModal.addEventListener("click", (e) => { if (e.target === els.profileModal) closeProfileModal(); });
els.btnSaveProfile.addEventListener("click", handleSaveProfile);
els.btnClearProfile.addEventListener("click", handleClearProfile);
els.btnSaveFindSchemes.addEventListener("click", handleSaveAndFindSchemes);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.profileModal.hidden) closeProfileModal();
});

els.langBtn.addEventListener("click", () => {
  const open = els.langMenu.hidden;
  els.langMenu.hidden = !open;
  els.langBtn.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".lang-row").forEach((row) => {
  row.addEventListener("click", () => setChromeLang(row.getAttribute("data-lang")));
});
document.addEventListener("click", (e) => {
  if (!els.langMenu.hidden && !e.target.closest(".lang-switch")) {
    els.langMenu.hidden = true;
    els.langBtn.setAttribute("aria-expanded", "false");
  }
});

// Sticky nav — mobile hamburger toggle
els.navToggle.addEventListener("click", () => {
  const open = !els.siteNav.classList.contains("open");
  els.siteNav.classList.toggle("open", open);
  els.navToggle.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (els.siteNav.classList.contains("open") && !e.target.closest(".header-right")) {
    els.siteNav.classList.remove("open");
    els.navToggle.setAttribute("aria-expanded", "false");
  }
});

// Nav anchor links — the sections they point to only exist on the input
// screen, so jump there first (without disturbing any typed text) before
// smooth-scrolling to the target.
document.querySelectorAll("a.nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").slice(1);
    els.siteNav.classList.remove("open");
    els.navToggle.setAttribute("aria-expanded", "false");
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (currentScreen !== "input") {
      showScreen("input");
      requestAnimationFrame(() => requestAnimationFrame(scrollToTarget));
    } else {
      scrollToTarget();
    }
  });
});

/* ============================================================
   Dev-only QA entry points (not linked from the UI):
   ?demo=input|loading|results|nomatch|error
   ============================================================ */
function initDemoParam() {
  const p = new URLSearchParams(location.search).get("demo");
  const mockText = "நான் ஒரு விவசாயி. 2 ஏக்கர் நிலத்தில் நெல் பயிரிடுகிறேன். இந்த ஆண்டு மழையின்றி பயிர் பாதிக்கப்பட்டு, வேறு எந்த வருமானமும் இல்லை. கடந்த மாதம் என் மகனுக்கு மருத்துவமனையில் அறுவை சிகிச்சை தேவைப்பட்டது, அதற்கான செலவும் பெரிதாக இருந்தது.";
  const byId = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
  if (p === "results") {
    lastSituationText = mockText;
    // Deterministic mock matches (not the fuzzy local matcher, which only
    // scores English text) so this dev-only screen is stable to demo.
    const r = {
      detectedLang: "ta",
      hero: byId["pm-kisan"] ? { scheme: byId["pm-kisan"], confidence: "high" } : null,
      secondary: byId["pradhan-mantri-fasal-bima-yojana"] ? [{ scheme: byId["pradhan-mantri-fasal-bima-yojana"], confidence: "medium" }] : [],
    };
    lastMatchResult = r;
    renderFormAssistant();
    showScreen("results");
    renderResults(r);
  } else if (p === "nomatch") {
    lastSituationText = "எனக்கு உதவி தேவை.";
    const r = { detectedLang: "ta", hero: null, secondary: [] };
    lastMatchResult = r;
    renderFormAssistant();
    showScreen("nomatch");
    renderNomatch(r);
  } else if (p === "error") {
    showScreen("error");
  } else if (p === "loading") {
    showScreen("loading");
  }
}

/* ============================================================
   Scroll-driven Vertical Timeline Flow for "How We Verify"
   ============================================================ */
function setupScrollTimeline() {
  const timelineContainer = document.querySelector(".verify-timeline-container");
  const timelineProgress = document.getElementById("timelineProgress");
  const stepCards = document.querySelectorAll(".verify-step-card");
  if (!timelineContainer || !timelineProgress) return;

  function updateTimeline() {
    const rect = timelineContainer.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calculate percentage of timeline scrolled through viewport
    const totalHeight = rect.height;
    const currentPos = windowHeight * 0.6 - rect.top;
    let progress = (currentPos / totalHeight) * 100;
    progress = Math.max(0, Math.min(100, progress));
    
    timelineProgress.style.height = `${progress}%`;

    stepCards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.top < windowHeight * 0.75 && cardRect.bottom > windowHeight * 0.25) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", updateTimeline, { passive: true });
  updateTimeline();
}

/* ============================================================
   Interactive Form Assistant Mockup
   ============================================================ */
const FORM_TEMPLATES = {
  pmkisan: {
    title: "Pradhan Mantri Kisan Samman Nidhi Application",
    landLabel: "Land Holding Size",
    sourceText: '"நான் ஒரு விவசாயி. 2 ஏக்கர் நிலத்தில் நெல் பயிரிடுகிறேன்."',
    applicant: "K. Ramasamy / ராமசாமி",
    category: "Small & Marginal Farmer",
    landIncome: "2.0 Acres Paddy Land",
    district: "Thanjavur, Tamil Nadu",
    benefit: "₹6,000 / year Direct Income Support",
  },
  cmchis: {
    title: "CM Comprehensive Health Insurance Scheme Application",
    landLabel: "Annual Household Income",
    sourceText: '"கடந்த மாதம் அறுவை சிகிச்சை தேவைப்பட்டது, செலவு பெரிதாக இருந்தது."',
    applicant: "S. Meenakshi / மீனாட்சி",
    category: "Low Income Family / BPL",
    landIncome: "Below ₹1,20,000 / year",
    district: "Madurai, Tamil Nadu",
    benefit: "Cashless Treatment up to ₹5 Lakh / Year",
  },
  pension: {
    title: "Indira Gandhi National Old Age Pension Application",
    landLabel: "Applicant Age & Financial Status",
    sourceText: '"எனக்கு 62 வயது, தனியாக வசிக்கிறேன், நிலையான வருமானம் இல்லை."',
    applicant: "M. Karuppan / கருப்பன்",
    category: "Senior Citizen (60+ Years)",
    landIncome: "62 Years / No Fixed Income",
    district: "Salem, Tamil Nadu",
    benefit: "₹1,000 / month Direct Pension",
  },
};

function setupFormAssistant() {
  const select = document.getElementById("formTemplateSelect");
  const btnAutofill = document.getElementById("btnAutofill");
  const btnReset = document.getElementById("btnResetForm");
  const btnDownloadPdf = document.getElementById("btnDownloadPdf");
  const btnSubmitSeva = document.getElementById("btnSubmitSeva");
  const modal = document.getElementById("formFeedbackModal");
  const modalClose = document.getElementById("modalCloseBtn");
  
  if (!select) return;

  function loadTemplate(key, triggerAutofill = true) {
    const tpl = { ...(FORM_TEMPLATES[key] || FORM_TEMPLATES.pmkisan), ...profileOverlayForTemplate(key) };
    if (els.mockupFormTitle) els.mockupFormTitle.textContent = tpl.title;
    if (els.mockupSourceText) els.mockupSourceText.textContent = tpl.sourceText;
    if (els.labelLandIncome) els.labelLandIncome.textContent = tpl.landLabel;
    if (els.fieldBenefit) els.fieldBenefit.value = tpl.benefit;
    
    if (triggerAutofill) {
      runFormAutofill(tpl);
    } else {
      clearFormFields();
    }
  }

  function clearFormFields() {
    if (els.fieldApplicantName) els.fieldApplicantName.value = "";
    if (els.fieldCategory) els.fieldCategory.value = "";
    if (els.fieldLandIncome) els.fieldLandIncome.value = "";
    if (els.fieldDistrict) els.fieldDistrict.value = "";
    if (els.mockupStatusBadge) {
      els.mockupStatusBadge.textContent = "Draft Mode";
      els.mockupStatusBadge.style.borderColor = "var(--seal-gold)";
      els.mockupStatusBadge.style.color = "var(--seal-gold)";
    }
    document.querySelectorAll(".extracted-chip").forEach((chip) => chip.classList.remove("show"));
  }

  function runFormAutofill(tpl) {
    clearFormFields();
    
    const fields = [
      { el: els.fieldApplicantName, val: tpl.applicant },
      { el: els.fieldCategory, val: tpl.category },
      { el: els.fieldLandIncome, val: tpl.landIncome },
      { el: els.fieldDistrict, val: tpl.district },
    ];

    fields.forEach((f, idx) => {
      if (!f.el) return;
      setTimeout(() => {
        f.el.value = f.val;
        f.el.classList.add("autofilled");
        const chip = f.el.parentElement ? f.el.parentElement.querySelector(".extracted-chip") : null;
        if (chip) chip.classList.add("show");
        setTimeout(() => f.el.classList.remove("autofilled"), 1200);
      }, idx * 250);
    });

    setTimeout(() => {
      if (els.mockupStatusBadge) {
        els.mockupStatusBadge.textContent = "100% Pre-filled";
        els.mockupStatusBadge.style.borderColor = "var(--text-primary)";
        els.mockupStatusBadge.style.color = "var(--text-primary)";
      }
    }, fields.length * 250 + 100);
  }

  select.addEventListener("change", (e) => loadTemplate(e.target.value, true));
  if (btnAutofill) btnAutofill.addEventListener("click", () => loadTemplate(select.value, true));
  if (btnReset) btnReset.addEventListener("click", clearFormFields);

  function openModal(title, desc) {
    if (title && els.modalTitle) els.modalTitle.textContent = title;
    if (desc && els.modalDesc) els.modalDesc.textContent = desc;
    if (modal) modal.hidden = false;
  }

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener("click", (e) => {
      e.preventDefault();
      openModal("PDF Download Complete", "Official application form PDF for " + (FORM_TEMPLATES[select.value]?.title || "Scheme") + " downloaded with reference #THAG-2026-9842.");
    });
  }

  if (btnSubmitSeva) {
    btnSubmitSeva.addEventListener("click", (e) => {
      e.preventDefault();
      openModal("Sent to E-Seva Kendra!", "Your pre-filled application dossier has been submitted to your local District E-Seva Kendra under Reference #THAG-2026-9842.");
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        e.preventDefault();
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  // Initial load
  loadTemplate("pmkisan", true);
}

/* ============================================================
   Init
   ============================================================ */
async function loadSchemes() {
  const res = await fetch("data/schemes.json");
  SCHEMES = await res.json();
}

(async function init() {
  // Every render below (chip/strip/footer text, and the ?demo= QA entry
  // points) reads from SCHEMES, so the catalogue must be in before any of it runs.
  await loadSchemes().catch(() => { SCHEMES = []; });

  try {
    const saved = localStorage.getItem("chromeLang");
    if (saved && I18N[saved]) chromeLang = saved;
  } catch {}
  userProfile = loadProfileFromStorage();

  setupStickyNav();
  setupRevealAnimations();
  setupScrollTimeline();
  setupFormAssistant();
  renderFormAssistant();
  applyChromeI18n();
  setupCountUp();
  if (currentScreen === "input") showScreen("input");
  initDemoParam();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
