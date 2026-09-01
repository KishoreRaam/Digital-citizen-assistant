// Vercel serverless function. The API key lives only in process.env.GEMINI_API_KEY
// (set via a local .env file for dev, and via Vercel project env vars for
// deploys) — never in client-side code.
"use strict";

const SCHEMES = require("../data/schemes.json");

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALID_IDS = new Set(SCHEMES.map((s) => s.id));
const SCHEMES_BY_ID = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));

// Sorted by department at build time (see scripts/build-schemes.py) so schemes
// in the same department stay adjacent in the prompt.
const SCHEME_CONTEXT = SCHEMES.map((s) => {
  const scope = s.level === "state" ? `state:${s.state}` : "central";
  return `- id: ${s.id} | ${s.name} | dept: ${s.department} | ${scope} | eligibility: ${s.eligibility}`;
}).join("\n");

const SYSTEM_PROMPT = `You are a welfare-scheme matcher for Indian citizens, mostly rural and semi-urban.
You may ONLY recommend schemes from this exact catalogue — never invent a scheme, id, or eligibility rule not stated here:
${SCHEME_CONTEXT}

The user message is a JSON object: {"state": "<citizen's home state>", "text": "<citizen's free-text situation, in Tamil, Hindi, or English>"}.

Respond with STRICT JSON only, no prose, matching this shape:
{
  "detectedLang": "ta" | "hi" | "en",
  "matches": [
    { "id": "<scheme id>", "confidence": "high" | "medium" | "low", "explanation": "<1-2 sentence reason, in detectedLang>" }
  ]
}

Rules:
- "detectedLang" is the language of the "text" field the citizen wrote in (Tamil in Latin script / Tanglish still counts as "ta") — it is never the language you respond in for anything except "explanation", since every other field is a fixed code value.
- List at most 5 entries in "matches", ranked best-first.
- "confidence": "high" means the stated facts clearly satisfy the scheme's eligibility; "medium" means plausible but a detail is missing or ambiguous; "low" means only loosely related — include it only if it's still a reasonable lead, not a random guess.
- "explanation" must be written in "detectedLang" (Tamil script for "ta", Devanagari for "hi", English for "en") and must be grounded ONLY in that scheme's "eligibility" text above plus what the citizen actually said — never introduce a fact, amount, or condition not present in the eligibility text.
- A scheme whose scope is "state:<X>" may ONLY be included if the citizen's "state" field equals X. A Central scheme (scope "central") is available to any citizen regardless of state. If the citizen's situation would otherwise match a state scheme from a different state, leave it out entirely — do not substitute or explain.
- Never fabricate a scheme id not in the catalogue above. If nothing qualifies, return an empty "matches" array.
- Prefer fewer, well-justified matches over padding to 5. A vague or one-line input with no concrete eligibility signal should usually return an empty array, not a handful of low-confidence guesses.

Examples:

Input: {"state": "Tamil Nadu", "text": "நான் ஒரு விவசாயி. 2 ஏக்கர் நிலத்தில் நெல் பயிரிடுகிறேன்."}
Output: {"detectedLang": "ta", "matches": [{"id": "pm-kisan", "confidence": "high", "explanation": "நீங்கள் நிலம் வைத்திருக்கும் விவசாயி என்று கூறியிருப்பதால், இந்தத் திட்டத்தின் தகுதி நிபந்தனையை பூர்த்தி செய்கிறீர்கள்."}]}
(Illustrative only — a real reply lists only what the eligibility text actually supports; shown here to demonstrate explanation must be in Tamil, not English, when detectedLang is "ta".)

Input: {"state": "Kerala", "text": "I am a farm labourer in Kerala registered with the labour board, I need accident insurance."}
Output: {"detectedLang": "en", "matches": []}
(Because the closest-sounding scheme in the catalogue for a registered agricultural labourer's accident cover is Tamil Nadu-only — scope "state:Tamil Nadu" — and this citizen's state is Kerala, it is correctly excluded rather than offered anyway.)

Input: {"state": "Tamil Nadu", "text": "life is hard these days"}
Output: {"detectedLang": "en", "matches": []}
(Too vague to confirm any specific eligibility — an empty array is correct; never pad with unrelated guesses.)`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    detectedLang: { type: "STRING", enum: ["ta", "hi", "en"] },
    matches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          confidence: { type: "STRING", enum: ["high", "medium", "low"] },
          explanation: { type: "STRING" },
        },
        required: ["id", "confidence", "explanation"],
      },
    },
  },
  required: ["detectedLang", "matches"],
};

function buildUserMessage(text, state) {
  return JSON.stringify({ state, text });
}

function extractJson(raw) {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;
  try {
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

async function callModel(apiKey, userMessage, retryNote) {
  const contents = [{ role: "user", parts: [{ text: userMessage }] }];
  if (retryNote) {
    contents.push({ role: "model", parts: [{ text: retryNote.badReply }] });
    contents.push({ role: "user", parts: [{ text: "That was not valid JSON matching the required shape. Reply again with ONLY the JSON object — no prose, no markdown fences." }] });
  }

  const upstream = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    }),
  });

  if (!upstream.ok) {
    const err = new Error("upstream_error");
    err.status = upstream.status;
    err.body = await upstream.text().catch(() => "");
    throw err;
  }

  const data = await upstream.json();
  const candidate = (data.candidates || [])[0];
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  return parts.map((p) => p.text || "").join("").trim();
}

// Deterministic guard: never trust the model's ids or scope reasoning on their
// own — every id must exist in the closed catalogue, and every state-scoped
// scheme must match the citizen's declared state.
function sanitizeMatches(parsed, residentState) {
  const stateLower = (residentState || "").trim().toLowerCase();
  const seen = new Set();
  const out = [];

  for (const m of Array.isArray(parsed && parsed.matches) ? parsed.matches : []) {
    if (!m || typeof m !== "object") continue;
    const id = m.id;
    if (!VALID_IDS.has(id) || seen.has(id)) continue;

    const scheme = SCHEMES_BY_ID[id];
    if (scheme.level === "state" && scheme.state.toLowerCase() !== stateLower) {
      console.warn(`[match-schemes] guard dropped state-mismatched scheme: id=${id} scheme.state=${scheme.state} requestState=${residentState}`);
      continue;
    }

    const confidence = ["high", "medium", "low"].includes(m.confidence) ? m.confidence : "low";
    const explanation = typeof m.explanation === "string" ? m.explanation.slice(0, 500).trim() : "";
    seen.add(id);
    out.push({ id, confidence, explanation });
    if (out.length === 5) break;
  }

  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const text = (body && body.text || "").toString().slice(0, 4000).trim();
  const state = (body && body.state || "Tamil Nadu").toString().slice(0, 100).trim();
  if (!text) {
    res.status(400).json({ error: "missing_text" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  const userMessage = buildUserMessage(text, state);

  try {
    let raw;
    let parsed;
    try {
      raw = await callModel(apiKey, userMessage, null);
      parsed = extractJson(raw);
    } catch (err) {
      res.status(502).json({ error: "upstream_error", status: err.status });
      return;
    }

    if (!parsed) {
      // One retry: malformed JSON on the first attempt is usually a stray
      // preamble or markdown fence — a pointed reminder fixes it.
      try {
        const retryRaw = await callModel(apiKey, userMessage, { badReply: raw });
        parsed = extractJson(retryRaw);
      } catch (err) {
        res.status(502).json({ error: "upstream_error", status: err.status });
        return;
      }
    }

    if (!parsed) {
      res.status(502).json({ error: "bad_model_output" });
      return;
    }

    const clean = {
      detectedLang: ["ta", "hi", "en"].includes(parsed.detectedLang) ? parsed.detectedLang : "en",
      matches: sanitizeMatches(parsed, state),
    };

    res.status(200).json(clean);
  } catch (err) {
    res.status(502).json({ error: "upstream_exception" });
  }
};
