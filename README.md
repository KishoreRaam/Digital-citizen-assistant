# Thaguthi (தகுதி) — Welfare Scheme Eligibility Assistant

Thaguthi is a lightweight welfare-scheme eligibility assistant designed for rural and semi-urban citizens in India. It helps people describe their situation in plain language and get back likely-matching government schemes, along with a clear explanation of why those schemes may apply.

This project is built around the core idea that many eligible families are not enrolled because scheme information is buried in formal, bureaucratic language rather than plain spoken Hindi, Tamil, or English.

## What this project is building

This app is a public-facing eligibility helper for real government welfare schemes. The user can describe household, health, employment, crop, housing, or elderly-support conditions in simple words, and the app responds with:

- likely scheme matches
- the reason the scheme is relevant
- basic eligibility context
- next-step guidance
- no invented scheme recommendations

The project intentionally uses a closed, hardcoded list of real schemes as the trusted matching source instead of generating random program names.

## Current status

This repository currently contains the working static prototype for the product:

- landing page
- scheme explainer sections
- interactive input flow
- loading state
- match / no-match / error states
- local offline scheme matching logic
- service worker / manifest setup for browser support

This is the “current build” stage, not the final full production implementation.

## Project goal

The product exists to reduce the access gap for welfare programs by making eligibility information easier to understand. The experience is deliberately designed to feel official and trustworthy, using a document-like visual system inspired by government notices and approval letters.

## Main files

- `index.html` — overall page structure and app layout
- `style.css` — styling, document aesthetic, responsive behavior, animations
- `app.js` — app logic, screens, matching flow, UI interaction
- `schemes.js` — authoritative scheme catalog used by the matching logic
- `i18n.js` — language strings and translation support structure
- `api/match-schemes.js` — backend route placeholder for serverless scheme matching
- `manifest.json` — PWA manifest
- `sw.js` — service worker for offline support basics

## How the app works

1. A user enters a short description of their situation in plain language.
2. The app checks the input against a fixed list of real welfare schemes.
3. If there is a good match, it shows the likely eligible schemes and why they fit.
4. If no schemes are confidently matched, it shows a “no match found” state and suggests more detail.
5. If the system fails unexpectedly, it shows a clear error state.

## Example matching behavior

The app can match situations including examples such as:

- farmer with crop failure
- widow or dependent household
- elderly person with no stable income
- unemployed rural worker
- family needing healthcare support
- no proper housing or livelihood support

## Design direction

The visual language follows a government-document aesthetic:

- paper-like background
- serif-based headline treatment for official feel
- gold seal accents for matched eligibility
- calm, trustworthy document layout
- minimal and practical interface

## Security and data approach

The current version follows the intended security pattern for the real product:

- model calls should happen through a server-side endpoint only
- no API key should be exposed in client-side JavaScript
- scheme recommendations are constrained to a hardcoded, validated list

This repo keeps the matching logic local for the current prototype while preserving the structure needed for a future serverless implementation.

## Local run

From the project root, run:

```bash
python3 -m http.server 5050
```

Then open:

```text
http://localhost:5050
```

## Notes

This README intentionally documents the current build and the product purpose as it stands now. It does not include future roadmap steps beyond the current implementation.
