/**
 * Read-only Holistic House benchmarking manifest validation and prioritization.
 * Never fetches competitor pages, reads cookies, executes downloaded code, or writes
 * to the database. Ordinal scores are planning judgments, not revenue forecasts.
 */
const PRIORITIES = new Set(["P0", "P1", "P2"]);
const EVIDENCE = new Set([
  "docs_only",
  "anonymous_ui_observed",
  "hh_implemented",
  "hh_browser_tested",
  "hh_provider_verified",
]);
const STATUSES = new Set(["reference_only", "research_pending", "pilot_spec", "in_progress", "blocked", "released"]);
const FIELDS = [
  "id", "competitor", "job", "pattern", "primarySource", "sourceKind",
  "evidenceLevel", "hhRoute", "hhModule", "priority", "status", "note",
];

function safeHttpSource(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username && !url.password && !url.search && !url.hash &&
      !["localhost", "127.0.0.1", "holistichouse.vercel.app"].includes(url.hostname) &&
      !url.hostname.endsWith(".local") && !url.hostname.endsWith(".internal");
  } catch {
    return false;
  }
}

/** An empty error array indicates a structurally safe, evidence-labelled manifest. */
export function validateReferenceMatrix(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["Manifest must be an object"];
  if (manifest.schemaVersion !== 1) errors.push("Unsupported schemaVersion");
  if (manifest.measurementStatus !== "NOT_MEASURED") {
    errors.push("A source-only reference matrix cannot claim measured UX or conversion");
  }
  if (!Array.isArray(manifest.patterns) || manifest.patterns.length === 0 || manifest.patterns.length > 100) {
    errors.push("patterns must contain 1–100 reference-only rows");
    return errors;
  }
  const seen = new Set();
  for (const [index, row] of manifest.patterns.entries()) {
    const id = row && typeof row.id === "string" ? row.id : "row-" + index;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(`${id}: row must be an object`);
      continue;
    }
    for (const key of FIELDS) {
      if (typeof row[key] !== "string" || !row[key].trim()) errors.push(`${id}: missing ${key}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push(`${id}: invalid id`);
    if (seen.has(id)) errors.push(`${id}: duplicate id`);
    seen.add(id);
    if (!safeHttpSource(row.primarySource)) errors.push(`${id}: source must be public HTTPS without credentials/query/fragment`);
    if (row.sourceKind !== "official_doc") errors.push(`${id}: only labelled official docs in the initial source matrix`);
    if (!EVIDENCE.has(row.evidenceLevel)) errors.push(`${id}: unknown evidenceLevel`);
    if (row.evidenceLevel !== "docs_only") errors.push(`${id}: browser/provider evidence requires a separate evidence manifest`);
    if (!PRIORITIES.has(row.priority)) errors.push(`${id}: invalid priority`);
    if (!STATUSES.has(row.status)) errors.push(`${id}: invalid status`);
    if (row.status !== "reference_only" && row.status !== "research_pending") {
      errors.push(`${id}: implementation status requires linked verification evidence`);
    }
    if (row.originalAssetsAllowed !== false || row.copiedCodeAllowed !== false) {
      errors.push(`${id}: copying competitor assets or code is forbidden`);
    }
    if (!/^\/(?:en|ru|es)\/[a-z0-9/-]+$/.test(row.hhRoute)) {
      errors.push(`${id}: hhRoute must be locale-scoped and contain no personal query`);
    }
    if (typeof row.hhModule !== "string" || !/^(?:app|components|data|lib)\//.test(row.hhModule) ||
      row.hhModule.includes("..") || /[\s?#\\]/.test(row.hhModule)) {
      errors.push(`${id}: hhModule must point to a project module, not another repo`);
    }
    for (const metric of [
      "estimatedImpact", "estimatedConfidence", "implementationEffort", "reversibility", "operationalRisk",
    ]) {
      if (!Number.isInteger(row[metric]) || row[metric] < 1 || row[metric] > 5) {
        errors.push(`${id}: ${metric} must be an ordinal integer 1–5`);
      }
    }
    if (typeof row.note !== "string" || row.note.length < 40) errors.push(`${id}: missing limitations/gap note`);
    if (typeof row.note === "string" && /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:token|password|api[_-]?key)\s*[:=])/i.test(row.note)) {
      errors.push(`${id}: potential credential or personal email in note`);
    }
  }
  return errors;
}

export function assertValidReferenceMatrix(manifest) {
  const errors = validateReferenceMatrix(manifest);
  if (errors.length) throw new Error("Benchmark manifest invalid:\n" + errors.join("\n"));
  return manifest;
}

/** Product triage only. Does not represent a measured uplift or competitor rating. */
export function planningScore(row) {
  return Math.round(
    ((row.estimatedImpact * row.estimatedConfidence * row.reversibility) /
    (row.implementationEffort * row.operationalRisk)) * 100,
  ) / 100;
}

export function rankReferencePatterns(manifest) {
  assertValidReferenceMatrix(manifest);
  return manifest.patterns.map((row) => ({ ...row, planningScore: planningScore(row) }))
    .sort((a, b) => {
      const level = { P0: 0, P1: 1, P2: 2 };
      return level[a.priority] - level[b.priority] ||
        b.planningScore - a.planningScore ||
        a.id.localeCompare(b.id);
    });
}
