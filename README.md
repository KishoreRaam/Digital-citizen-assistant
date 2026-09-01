# Thaguthi (தகுதி) — Welfare Scheme Eligibility Assistant

Thaguthi is a welfare-scheme eligibility assistant designed for citizens in rural and semi-urban India. It helps people describe their situation in plain language and understand which real government schemes they may qualify for, along with a short explanation for why those schemes are relevant.

The project is built around a practical problem: many eligible families do not access welfare programs because scheme details are hidden behind formal government language, confusing terminology, and scattered information sources.

## Product purpose

The app is meant to help users:

- describe a household or personal situation in plain words
- receive likely welfare scheme matches
- understand the reason for the match in non-technical language
- see what documents or steps may be needed next
- avoid hallucinated or fake scheme suggestions

This prototype intentionally matches against a fixed, hardcoded catalog of real schemes rather than inventing unknown programs.

## Current build status

This repository currently contains the working static product prototype for the app. The current scope includes:

- landing page and brand presentation
- sticky navigation and smooth scroll behavior
- hero section and introductory copy
- step-by-step explanation of the product flow
- scheme coverage cards
- input, loading, results, no-match, and error screens
- local matching logic for offline fallback
- browser support via manifest and service worker

This is the current build stage and not a final production SaaS implementation.

## Why this app exists

The goal is to reduce the access gap in welfare enrollment. In many cases, eligible families fail to apply because they do not understand the language, criteria, or process. Thaguthi tries to simplify that by turning plain language into a guided path toward actual government schemes.

## Architecture overview

The app is intentionally simple and front-end driven for the current prototype. The key flow is:

1. The user types a situation in plain Tamil, Hindi, or English.
2. The system detects the likely language and normalizes the text.
3. The app checks the input against a closed catalogue of 120 real schemes in `data/schemes.json`, via a Gemini-backed match endpoint at `api/match-schemes.js` (falls back to local keyword matching if the backend is unreachable).
4. The top match and secondary matches are rendered as official-looking result cards.
5. If nothing is confidently matched, the user sees a “no match found” experience.
6. If a runtime issue occurs, the app shows an error screen.

## Codebase map

- `index.html` — document structure, screens, page sections, footer, and app layout
- `style.css` — design system, visual tokens, typography, responsive layout, animations, hover states, document styling
- `app.js` — browser logic, screen switching, local matching, rendering, interactions, loading states, and event wiring
- `data/schemes.json` — the authoritative catalog of 120 government schemes (id, department, level/state, eligibility, description, apply_url), built from `India_Government_Schemes_Directory.xlsx` via `scripts/build-schemes.py`
- `i18n.js` — UI copy and translation strings for the interface chrome
- `api/match-schemes.js` — Vercel serverless function that calls the Gemini API to match a situation against `data/schemes.json`, with a deterministic guard (valid id + state/level consistency) applied to every response before it reaches the client
- `scripts/build-schemes.py` — one-off build script, xlsx → `data/schemes.json`
- `scripts/test-match-schemes.js` — test harness for `api/match-schemes.js` (10 query types across languages/edge cases; runs live against Gemini if `GEMINI_API_KEY` is set, otherwise a structural smoke test)
- `manifest.json` — PWA config for installability and browser metadata
- `sw.js` — service worker for offline support basics
- `icons/` — app assets for branding and install support

## Matching model and constraints

Matching is done by the Gemini API (`gemini-3.1-flash-lite`, `thinkingConfig.thinkingLevel: "minimal"` — chosen for latency/cost over the larger `gemini-3.6-flash`; both live on `generateContent`), called server-side from `api/match-schemes.js`. This project follows a zero-hallucination approach for the current build:

- only schemes from `data/schemes.json` are eligible to be recommended — every returned id is checked against that catalog server-side, and any id the model invents is dropped before the response leaves the backend
- a scheme scoped to a specific state (currently only Tamil Nadu state schemes exist) is only ever returned if the citizen's declared state matches — enforced deterministically, not left to the model's judgement
- each match carries a `confidence` ("high" / "medium" / "low") and a short `explanation`, in the citizen's own detected language, grounded only in that scheme's eligibility text
- when the app cannot confidently match, it says so instead of guessing

This is a design and product safety choice, not just a UI preference.

## Data flow

The core logic flow in the browser is:

- the input is captured from the textarea
- the app stores the last situation text for rendering the results panel
- `matchSchemes()` checks the backend route if available, then falls back to local matching
- the backend returns `{ detectedLang, matches: [{ id, confidence, explanation }] }` (max 5, ranked best-first)
- `buildResultFromLocalMatch()` (offline fallback only) ranks scheme matches using literal word overlap against each scheme's English text — it has no per-scheme keyword list or translated body text, so it only finds signal in English input
- `renderResults()` builds the official document-like match cards
- `showScreen()` transitions between the input, loading, results, no-match, and error views

## File-by-file documentation

### `app.js`

This is the main interaction layer for the prototype. It handles:

- screen state management
- language detection
- local scheme matching
- loading feedback
- result rendering
- edit/retry/reset actions
- smooth scrolling and navigation behavior
- user-triggered interactions such as search and replay

### `data/schemes.json`

This file stores the truth source for the app: 120 schemes, each with `id`, `name`, `department`, `level` (central/state), `state`, `eligibility`, `description`, `source`, and `apply_url`. Regenerate it from the source spreadsheet with `python3 scripts/build-schemes.py`.

### `i18n.js`

This file centralizes the interface text for the app chrome. It keeps labels, button text, and section headings separate from the content that users type. This makes the UI easier to translate later without rewriting the entire app.

### `style.css`

This file contains the visual system for the product. It defines:

- locked color tokens
- typography choices
- card layouts
- official-document style patterns
- hover states
- animation timing for seal presses, reveals, and transitions

## Local development

```bash
npm install   # first time only — installs the vercel CLI as a devDependency
npm run dev
```

`npm run dev` runs `vercel dev`, which emulates the real Vercel deployment locally: it serves the static frontend **and** actually executes `api/match-schemes.js` (the previous `npx serve`-based setup only did the former — `/api/*` routes silently 404'd under it, which made every search fall back to the much weaker local offline matcher). `vercel dev` reads `GEMINI_API_KEY` from `.env` automatically, no extra flags needed. Opens on `http://localhost:5050`.

The first time you run it in a fresh environment, it will prompt to log in to Vercel and link the project (already linked to the `thaguthi` project in this repo's case).

## Security and product constraints

The current prototype follows the intended production pattern:

- `GEMINI_API_KEY` lives only in `.env` (gitignored) locally and in Vercel project env vars in production — never in client-side code
- model calls route through `api/match-schemes.js`, a serverless function
- scheme recommendations stay constrained to a vetted list
- the app never invents a welfare scheme or makes up eligibility details

## Contribution notes

When editing this project, keep these principles in mind:

- prefer real, verifiable scheme names and wording
- do not invent benefits or eligibility rules
- keep app copy in separate constants or strings where possible
- preserve the official-document visual identity
- keep the matching logic honest and constrained

## Notes

This documentation is intentionally focused on the current implementation and the product purpose as it exists today. It does not include roadmap items or future-step planning beyond the current build.
