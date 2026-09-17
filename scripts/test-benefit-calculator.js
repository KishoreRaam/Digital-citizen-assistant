#!/usr/bin/env node
// Unit tests for benefitCalculator.js. Run with `node --test scripts/test-benefit-calculator.js`.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { computeBenefitDashboard } = require(path.join(__dirname, "..", "benefitCalculator.js"));

test("returns null for an empty match list (no ₹0 dashboard)", () => {
  assert.equal(computeBenefitDashboard([]), null);
});

test("fixed cash amount: annualizes monthly, sums a one_time and an annual scheme", () => {
  const schemes = [
    { id: "a", name: "Monthly Pension", benefit_category: "cash", benefit_type: "monthly", benefit_amount_min: 1000, benefit_amount_max: 1000, conflict_group: null },
    { id: "b", name: "Annual Grant", benefit_category: "cash", benefit_type: "annual", benefit_amount_min: 6000, benefit_amount_max: 6000, conflict_group: null },
    { id: "c", name: "One-time Bonus", benefit_category: "cash", benefit_type: "one_time", benefit_amount_min: 500, benefit_amount_max: 500, application_cost: 20, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  assert.equal(result.hasAnyAmount, true);
  // 1000*12 + 6000 + 500 = 18500
  assert.equal(result.cash.low, 18500);
  assert.equal(result.cash.high, 18500);
  assert.equal(result.cash.isRange, false);
  assert.equal(result.coverage.high, 0);
  assert.equal(result.items.every((i) => !i.excluded), true);
  // application_cost passes through for the UI to surface; defaults to 0 when absent.
  assert.equal(result.items.find((i) => i.id === "a").applicationCost, 0);
  assert.equal(result.items.find((i) => i.id === "c").applicationCost, 20);
});

test("range amount: min !== max stays a range, not a false-precision single number", () => {
  const schemes = [
    { id: "a", name: "Tiered Pension", benefit_category: "cash", benefit_type: "monthly", benefit_amount_min: 1000, benefit_amount_max: 1500, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  assert.equal(result.cash.low, 12000);
  assert.equal(result.cash.high, 18000);
  assert.equal(result.cash.isRange, true);
  assert.equal(result.items[0].isRange, true);
});

test("mixed cash + insurance: kept in separate totals, coverage never added to cash", () => {
  const schemes = [
    { id: "pmkisan", name: "PM-KISAN", benefit_category: "cash", benefit_type: "annual", benefit_amount_min: 6000, benefit_amount_max: 6000, conflict_group: null },
    { id: "cmchis", name: "CMCHIS", benefit_category: "coverage", benefit_type: "annual", benefit_amount_min: 500000, benefit_amount_max: 500000, conflict_group: null },
    { id: "kcc", name: "Kisan Credit Card", benefit_category: "none", benefit_type: null, benefit_amount_min: null, benefit_amount_max: null, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  assert.equal(result.cash.high, 6000);
  assert.equal(result.coverage.high, 500000);
  const kcc = result.items.find((i) => i.id === "kcc");
  assert.equal(kcc.hasAmount, false);
  assert.equal(kcc.excluded, false); // "no data", not "conflicted"
});

test("mutually exclusive schemes: only the higher-value one counts, other is flagged not silently dropped", () => {
  const schemes = [
    { id: "tn-oap", name: "TN Old Age Pension", benefit_category: "cash", benefit_type: "monthly", benefit_amount_min: 1000, benefit_amount_max: 1500, conflict_group: "elderly-pension" },
    { id: "ignoaps", name: "IGNOAPS", benefit_category: "cash", benefit_type: "monthly", benefit_amount_min: 200, benefit_amount_max: 500, conflict_group: "elderly-pension" },
  ];
  const result = computeBenefitDashboard(schemes);
  // Only tn-oap's annualized max (18000) should count, not both summed (24000).
  assert.equal(result.cash.high, 18000);
  const kept = result.items.find((i) => i.id === "tn-oap");
  const dropped = result.items.find((i) => i.id === "ignoaps");
  assert.equal(kept.excluded, false);
  assert.equal(dropped.excluded, true);
  assert.equal(dropped.excludedInFavorOf, "tn-oap");
  assert.equal(result.excludedGroups.length, 1);
  assert.deepEqual(result.excludedGroups[0].excludedIds, ["ignoaps"]);
});

test("all matched schemes have no stated amount: hasAnyAmount is false, not a ₹0 total", () => {
  const schemes = [
    { id: "a", name: "Training Programme", benefit_category: "none", benefit_type: null, benefit_amount_min: null, benefit_amount_max: null, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  assert.equal(result.hasAnyAmount, false);
  assert.equal(result.cash.high, 0);
});

test("varies scheme (e.g. a percentage input subsidy): flagged via hasVariableSchemes, never folded into cash", () => {
  const schemes = [
    { id: "pm-kisan", name: "PM-KISAN", benefit_category: "cash", benefit_type: "annual", benefit_amount_min: 6000, benefit_amount_max: 6000, conflict_group: null },
    // Modelled on real "% subsidy on input cost" schemes in the catalogue
    // (e.g. drip-irrigation / farm-machinery subsidy schemes) — the rupee
    // value depends on a purchase cost or land size the catalogue never
    // states, so it must stay out of the total rather than being guessed.
    { id: "micro-irrigation-subsidy", name: "Micro Irrigation Subsidy", benefit_category: "varies", benefit_type: null, benefit_amount_min: null, benefit_amount_max: null, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  assert.equal(result.hasVariableSchemes, true);
  assert.equal(result.cash.high, 6000); // the varies scheme contributes nothing to the total
  const varies = result.items.find((i) => i.id === "micro-irrigation-subsidy");
  assert.equal(varies.hasAmount, false);
  assert.equal(varies.benefitCategory, "varies");
});

test("in-kind scheme (free device/training, no rupee value stated): kept out of every total, still surfaced", () => {
  const schemes = [
    { id: "free-bicycle-scheme", name: "Free Bicycle Scheme", benefit_category: "in_kind", benefit_type: null, benefit_amount_min: null, benefit_amount_max: null, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  // In-kind-only matches still deserve a dashboard (not the "no data" empty
  // state) — app.js's renderBenefitDashboard checks this alongside hasAnyAmount.
  assert.equal(result.hasAnyAmount, false);
  assert.equal(result.hasVariableSchemes, false);
  const item = result.items.find((i) => i.id === "free-bicycle-scheme");
  assert.equal(item.hasAmount, false);
  assert.equal(item.benefitCategory, "in_kind");
});

test("range amount total is conservative: the low bound, not the high bound or a blended range", () => {
  // Modelled on a real destitute/old-age pension scheme whose monthly amount
  // varies ₹1,000–1,500 by district/category.
  const schemes = [
    { id: "tn-destitute-pension", name: "TN Destitute Pension", benefit_category: "cash", benefit_type: "monthly", benefit_amount_min: 1000, benefit_amount_max: 1500, conflict_group: null },
  ];
  const result = computeBenefitDashboard(schemes);
  // The total a citizen is guaranteed is the low bound annualized (₹12,000),
  // never the high bound (₹18,000) — that only appears on the item's own
  // breakdown row (isRange / annualLow / annualHigh), never as "the total".
  assert.equal(result.cash.low, 12000);
  assert.equal(result.items[0].isRange, true);
  assert.equal(result.items[0].annualLow, 12000);
  assert.equal(result.items[0].annualHigh, 18000);
});
