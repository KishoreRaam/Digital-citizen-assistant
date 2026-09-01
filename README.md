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
3. The app checks the input against a closed catalogue of real schemes found in `schemes.js`.
4. The top match and secondary matches are rendered as official-looking result cards.
5. If nothing is confidently matched, the user sees a “no match found” experience.
6. If a runtime issue occurs, the app shows an error screen.

## Codebase map

- `index.html` — document structure, screens, page sections, footer, and app layout
- `style.css` — design system, visual tokens, typography, responsive layout, animations, hover states, document styling
- `app.js` — browser logic, screen switching, local matching, rendering, interactions, loading states, and event wiring
- `schemes.js` — the authoritative list of supported government schemes and their eligibility reasons
- `i18n.js` — UI copy and translation strings for the interface chrome
- `api/match-schemes.js` — serverless backend endpoint intended to handle model or match requests securely
- `manifest.json` — PWA config for installability and browser metadata
- `sw.js` — service worker for offline support basics
- `icons/` — app assets for branding and install support

## Matching model and constraints

This project follows a zero-hallucination approach for the current build:

- only schemes from a fixed internal list are eligible to be recommended
- no fake or made-up scheme names are allowed
- when the app cannot confidently match, it says so instead of guessing

This is a design and product safety choice, not just a UI preference.

## Data flow

The core logic flow in the browser is:

- the input is captured from the textarea
- the app stores the last situation text for rendering the results panel
- `matchSchemes()` checks the backend route if available, then falls back to local matching
- `buildResultFromLocalMatch()` ranks scheme matches using keyword scoring
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

### `schemes.js`

This file stores the truth source for the app. Each scheme entry contains:

- scheme metadata such as name, agency, category, and amount
- keyword triggers that help detect likely relevance
- human-readable reasons in multiple languages
- next-step guidance and required document hints

The structure is intentionally easy to extend if more schemes need to be added.

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

Run the app from the project root:

```bash
python3 -m http.server 5050
```

Then open:

```text
http://localhost:5050
```

## Security and product constraints

The current prototype follows the intended production pattern:

- client-side code does not contain the secret model key
- model calls are expected to route through a backend function
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
