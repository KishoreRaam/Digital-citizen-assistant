#!/usr/bin/env node
// Test harness for the /api/match-schemes handler. Invokes the handler
// function directly (Vercel-style req/res mocks) — no live server needed.
"use strict";

const path = require("path");
const SCHEMES = require(path.join(__dirname, "..", "data", "schemes.json"));
const handler = require(path.join(__dirname, "..", "api", "match-schemes.js"));

const VALID_IDS = new Set(SCHEMES.map((s) => s.id));
const SCHEMES_BY_ID = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
const HAS_KEY = !!process.env.GEMINI_API_KEY;

if (!HAS_KEY) {
  console.log("No GEMINI_API_KEY set — running structural smoke test only, cannot validate live model output.\n");
}

// Very rough script-presence check — good enough to flag "explanation is
// plainly the wrong script", not a real language classifier.
const SCRIPT_RANGES = {
  ta: /[஀-௿]/,
  hi: /[ऀ-ॿ]/,
};
function looksLikeLatinOnly(s) {
  return /^[\x00-\x7F]*$/.test(s);
}
function explanationLanguageFlag(detectedLang, explanation) {
  if (!explanation) return "MISSING explanation";
  if (detectedLang === "en") return null;
  const expectedScript = SCRIPT_RANGES[detectedLang];
  if (expectedScript && !expectedScript.test(explanation) && looksLikeLatinOnly(explanation)) {
    return `English leaking through — detectedLang=${detectedLang} but explanation has no ${detectedLang} script characters`;
  }
  return null;
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

async function call(text, state) {
  const req = { method: "POST", body: state === undefined ? { text } : { text, state } };
  const res = mockRes();
  const t0 = Date.now();
  await handler(req, res);
  const ms = Date.now() - t0;
  return { status: res.statusCode, body: res.body, effectiveState: state === undefined ? "Tamil Nadu" : state, ms };
}

const QUERIES = [
  {
    label: "Tamil — farmer, crop loss",
    text: "நான் ஒரு விவசாயி. 2 ஏக்கர் நிலத்தில் நெல் பயிரிடுகிறேன். இந்த ஆண்டு மழையின்றி பயிர் முழுவதும் பாதிக்கப்பட்டது, வேறு வருமானம் இல்லை.",
  },
  {
    label: "Hindi — widow, no income",
    text: "मेरे पति का पिछले साल निधन हो गया। मेरी उम्र 45 साल है, मेरे पास कोई नियमित आय नहीं है और मुझे अपने दो बच्चों को पालना है।",
  },
  {
    label: "English — small business owner needing loan",
    text: "I run a small tailoring shop from home and want to expand it, but I have no collateral to offer a bank for a loan.",
  },
  {
    label: "Tanglish — farmer crop loss",
    text: "Naan oru farmer, 3 acre land la paddy cultivate pandren. Indha year rain kammiya irundhu crop full ah damage aayiduchu, vera income onnum illa.",
  },
  {
    label: "Vague / unmatchable",
    text: "life is hard these days",
    expectLowSignal: true,
  },
  {
    label: "TN resident — explicit state scheme candidate",
    text: "நான் தமிழ்நாட்டில் பதிவு செய்யப்பட்ட மீனவன், கடலோர பகுதியில் வசிக்கிறேன், படகுக்கு காப்பீடு தேவை.",
    state: "Tamil Nadu",
  },
  {
    label: "Non-TN resident — mirrors a TN-only scheme (must be excluded)",
    text: "I am a registered marine fisherman living on the coast, I need welfare support and insurance for my fishing boat.",
    state: "Kerala",
  },
  {
    label: "Multi-scheme-eligible — elderly farmer widow",
    text: "நான் 65 வயது விதவை, என் கணவர் விவசாயி ஆக இருந்தார், தற்போது 2 ஏக்கர் நிலத்தை நானே பராமரிக்கிறேன், நிலையான வருமானம் இல்லை, ஓய்வூதியமும் இல்லை.",
    state: "Tamil Nadu",
  },
  {
    label: "Short input",
    text: "I am unemployed.",
    expectLowSignal: true,
  },
  {
    label: "Long rambling input",
    text: "So basically my whole week has been a mess, first the power went out for two days which spoiled some vegetables I had stored, then my neighbour's kid was sick so I helped them get to the hospital, and on top of that I've been meaning to fix the roof before the monsoon but haven't had time, oh and I forgot to mention — I'm a farmer, I have about 4 acres of land growing paddy and sugarcane, and this season the yield was really poor because of erratic rainfall, so I'm not sure what to do about income for the next few months, my son also wants to apply for a scholarship for college but we haven't figured out the paperwork yet.",
  },
];

function checkInvariants(result, query) {
  const problems = [];
  const warnings = [];
  const matches = (result.body && Array.isArray(result.body.matches)) ? result.body.matches : null;

  if (result.status === 200) {
    if (!matches) {
      problems.push("status 200 but body.matches is not an array");
    } else {
      if (matches.length > 5) problems.push(`matches.length=${matches.length} exceeds max of 5`);
      const detectedLang = result.body.detectedLang;

      let highCount = 0;
      for (const m of matches) {
        if (!m || !VALID_IDS.has(m.id)) {
          problems.push(`invalid scheme id: ${m && m.id}`);
          continue;
        }
        const scheme = SCHEMES_BY_ID[m.id];
        if (scheme.level === "state" && scheme.state !== result.effectiveState) {
          problems.push(`STATE LEAK: "${m.id}" is state:${scheme.state} but resident state is ${result.effectiveState}`);
        }
        if (m.confidence === "high") highCount++;

        const langFlag = explanationLanguageFlag(detectedLang, m.explanation);
        if (langFlag) warnings.push(`${m.id}: ${langFlag}`);
      }

      if (query.expectLowSignal && highCount > 0) {
        warnings.push(`CONFIDENCE BUCKETING: low-signal query returned ${highCount} "high" confidence match(es) — ${matches.map((m) => `${m.id}:${m.confidence}`).join(", ")}`);
      }
      if (matches.length >= 4 && matches.every((m) => m.confidence === "high")) {
        warnings.push(`CONFIDENCE BUCKETING: all ${matches.length} matches are "high" — looks like padding rather than ranked confidence`);
      }
    }
  } else if (!HAS_KEY) {
    const err = result.body && result.body.error;
    const documented = ["server_not_configured", "upstream_error", "bad_model_output", "upstream_exception", "missing_text", "method_not_allowed"];
    if (!documented.includes(err)) problems.push(`undocumented error code: ${err}`);
  } else {
    problems.push(`unexpected non-200 status with GEMINI_API_KEY set: ${result.status} ${JSON.stringify(result.body)}`);
  }

  return { problems, warnings };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let allPass = true;
  let first = true;
  const latencies = [];
  for (const q of QUERIES) {
    if (HAS_KEY && !first) await sleep(6000); // stay under free-tier per-minute quota
    first = false;
    let result, problems, warnings;
    try {
      result = await call(q.text, q.state);
      ({ problems, warnings } = checkInvariants(result, q));
    } catch (err) {
      problems = [`threw: ${err && err.stack || err}`];
      warnings = [];
      result = { status: "THROW", body: null };
    }
    const matches = (result.body && Array.isArray(result.body.matches)) ? result.body.matches : [];
    const pass = problems.length === 0;
    allPass = allPass && pass;
    if (typeof result.ms === "number" && result.status === 200) latencies.push(result.ms);

    console.log(`\n[${pass ? "PASS" : "FAIL"}] ${q.label}`);
    console.log(`  status=${result.status} detectedLang=${result.body && result.body.detectedLang} matches=${matches.length}${q.state ? ` requestState=${q.state}` : ""} latency=${result.ms}ms`);
    matches.forEach((m) => {
      console.log(`    - ${m.id} [${m.confidence}] ${m.explanation ? `"${m.explanation}"` : "(no explanation)"}`);
    });
    problems.forEach((p) => console.log(`  ! FAIL: ${p}`));
    warnings.forEach((w) => console.log(`  ~ FLAG: ${w}`));
  }
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    console.log(`\nAverage latency over ${latencies.length} successful call(s): ${Math.round(avg)}ms`);
  }
  console.log("\n" + (allPass ? "OVERALL PASS" : "OVERALL FAIL"));
  process.exitCode = allPass ? 0 : 1;
})();
