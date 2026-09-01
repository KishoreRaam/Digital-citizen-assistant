// Vercel serverless function. The API key lives only in process.env.API_KEY
// (set in Vercel project settings) — never in client-side code.
"use strict";

const { SCHEMES } = require("../schemes.js");

const SCHEME_CONTEXT = SCHEMES.map((s) => ({
  id: s.id,
  name: s.name,
  agency: s.agency.en,
  amount: s.amount ? `${s.amount.value} ${s.amount.period.en}` : null,
  category: s.category,
})).map((s) => `- id: ${s.id} | ${s.name} (${s.agency})${s.amount ? " | " + s.amount : ""} | category: ${s.category}`).join("\n");

const SYSTEM_PROMPT = `You are a welfare-scheme matcher for rural and semi-urban Indian citizens.
You may ONLY recommend schemes from this exact list — never invent a scheme, amount, or eligibility rule not stated here:
${SCHEME_CONTEXT}

Given a citizen's free-text description of their situation (in Tamil, Hindi, or English), respond with STRICT JSON only, no prose, matching this shape:
{
  "detectedLang": "ta" | "hi" | "en",
  "heroId": "<scheme id or null>",
  "secondaryIds": ["<scheme id>", ...up to 2],
  "hintId": "<scheme id or null, only when heroId is null>",
  "uncertain": <boolean, true if secondaryIds are plausible but not confidently confirmed>
}
Rules:
- "heroId" is the single best-confirmed match, or null if nothing is confidently eligible.
- If heroId is null, you may set "hintId" to the closest possible scheme, to suggest what more info would help confirm it. Leave hintId null if nothing is even plausible.
- Never fabricate a scheme not in the list above. If unsure, prefer null over guessing.
- detectedLang must match the language the citizen wrote in, not the language you respond in (you always respond with JSON field values only, no natural-language reasoning field — the client renders reasoning from its own hardcoded per-scheme, per-language text).`;

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
  if (!text) {
    res.status(400).json({ error: "missing_text" });
    return;
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "server_not_configured" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "upstream_error", status: upstream.status });
      return;
    }

    const data = await upstream.json();
    const raw = (data.content || []).map((b) => b.text || "").join("").trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      res.status(502).json({ error: "bad_model_output" });
      return;
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    // Guard against hallucinated ids that aren't in the closed catalogue.
    const validIds = new Set(SCHEMES.map((s) => s.id));
    const clean = {
      detectedLang: ["ta", "hi", "en"].includes(parsed.detectedLang) ? parsed.detectedLang : "en",
      heroId: validIds.has(parsed.heroId) ? parsed.heroId : null,
      secondaryIds: (Array.isArray(parsed.secondaryIds) ? parsed.secondaryIds : []).filter((id) => validIds.has(id)).slice(0, 2),
      hintId: validIds.has(parsed.hintId) ? parsed.hintId : null,
      uncertain: !!parsed.uncertain,
    };

    res.status(200).json(clean);
  } catch (err) {
    res.status(502).json({ error: "upstream_exception" });
  }
};
