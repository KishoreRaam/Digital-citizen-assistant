// Benefit Dashboard math — pure computation over the already-matched scheme
// records (which carry benefit_category/benefit_type/benefit_amount_min/max/
// application_cost/conflict_group from data/schemes.json). No LLM call here:
// the model only ever decides *which* schemes matched (see api/match-schemes.js);
// every number on the dashboard is a lookup/sum over static catalogue fields,
// so it can't drift from what the catalogue actually says.
"use strict";

// monthly * 12, one_time counted once (year 1), annual as-is. Only called for
// schemes that already have a stated amount (hasAmount === true elsewhere).
function annualizeAmount(benefitType, amount) {
  if (benefitType === "monthly") return amount * 12;
  return amount; // "annual" and "one_time" are both already a single-year figure
}

function schemeHasAmount(scheme) {
  return (
    scheme.benefit_category === "cash" || scheme.benefit_category === "coverage"
  ) && typeof scheme.benefit_amount_min === "number" && typeof scheme.benefit_amount_max === "number";
}

// Within each conflict_group present in the matched list, only the
// highest-value scheme is counted toward the totals — the rest are flagged as
// excluded rather than silently dropped, so the UI can still show a warning
// icon and name what was left out. Schemes with no conflict_group (the vast
// majority) never conflict with anything.
function resolveConflicts(schemes) {
  const groups = new Map();
  schemes.forEach((s) => {
    if (!s.conflict_group) return;
    if (!groups.has(s.conflict_group)) groups.set(s.conflict_group, []);
    groups.get(s.conflict_group).push(s);
  });

  const excludedIds = new Map(); // id -> keptId
  const excludedGroups = [];
  groups.forEach((members, groupId) => {
    if (members.length < 2) return;
    const ranked = [...members].sort((a, b) => {
      const av = schemeHasAmount(a) ? annualizeAmount(a.benefit_type, a.benefit_amount_max) : -1;
      const bv = schemeHasAmount(b) ? annualizeAmount(b.benefit_type, b.benefit_amount_max) : -1;
      return bv - av;
    });
    const kept = ranked[0];
    const excluded = ranked.slice(1);
    excluded.forEach((s) => excludedIds.set(s.id, kept.id));
    excludedGroups.push({ conflictGroup: groupId, keptId: kept.id, excludedIds: excluded.map((s) => s.id) });
  });

  return { excludedIds, excludedGroups };
}

// matchedSchemes: array of full scheme records (as matched by Stage 2 /
// localMatchSchemes), in match order. Returns null when there is nothing to
// show — the dashboard must not render for an empty match list (see
// renderBenefitDashboard in app.js).
function computeBenefitDashboard(matchedSchemes) {
  if (!Array.isArray(matchedSchemes) || matchedSchemes.length === 0) return null;

  const { excludedIds, excludedGroups } = resolveConflicts(matchedSchemes);

  const cash = { low: 0, high: 0 };
  const coverage = { low: 0, high: 0 };

  const items = matchedSchemes.map((scheme) => {
    const hasAmount = schemeHasAmount(scheme);
    const excludedInFavorOf = excludedIds.get(scheme.id) || null;

    let annualLow = null;
    let annualHigh = null;
    let isRange = false;
    if (hasAmount) {
      annualLow = annualizeAmount(scheme.benefit_type, scheme.benefit_amount_min);
      annualHigh = annualizeAmount(scheme.benefit_type, scheme.benefit_amount_max);
      isRange = scheme.benefit_amount_min !== scheme.benefit_amount_max;

      if (!excludedInFavorOf) {
        const bucket = scheme.benefit_category === "coverage" ? coverage : cash;
        bucket.low += annualLow;
        bucket.high += annualHigh;
      }
    }

    return {
      id: scheme.id,
      name: scheme.name,
      benefitCategory: scheme.benefit_category || "none",
      benefitType: scheme.benefit_type || null,
      applicationCost: scheme.application_cost || 0,
      hasAmount,
      annualLow,
      annualHigh,
      isRange,
      excluded: !!excludedInFavorOf,
      excludedInFavorOf,
    };
  });

  cash.isRange = cash.low !== cash.high;
  coverage.isRange = coverage.low !== coverage.high;
  const hasAnyAmount = cash.high > 0 || coverage.high > 0;

  return { hasAnyAmount, cash, coverage, items, excludedGroups };
}

const BenefitCalculator = { computeBenefitDashboard, annualizeAmount };
if (typeof module !== "undefined" && module.exports) module.exports = BenefitCalculator;
if (typeof window !== "undefined") window.BenefitCalculator = BenefitCalculator;
