import test from "node:test";
import assert from "node:assert/strict";
import {
  PSYCHOLOGIST_APPROACHES, PSYCHOLOGIST_METHODS, PSYCHOLOGIST_FOCI,
  buildPsychologyProgram, buildPsychologyDialogueTurn, consultPsychologistMind,
} from "../lib/holistic-support/psychologist-mind.mjs";
import { consultPsychologistMind as fromHolisticIntelligence } from
  "../lib/holistic-support/holistic-intelligence.mjs";

const safe = { safety: { status: "clear" } };
const programFor = (focus, locale = "ru", overrides = {}) =>
  buildPsychologyProgram({ ...safe, locale, intent: { focus }, ...overrides });

test("four voluntary support tracks each return exactly eight ordered session contracts", () => {
  for (const focus of PSYCHOLOGIST_FOCI.filter(x => x !== "trauma_support")) {
    for (const locale of ["ru", "en", "es"]) {
      const plan = programFor(focus, locale);
      assert.equal(plan.status, "ready");
      assert.equal(plan.focus, focus);
      assert.equal(plan.sessions.length, 8);
      assert.deepEqual(plan.sessions.map(x => x.number), [1,2,3,4,5,6,7,8]);
      assert.equal(new Set(plan.sessions.map(x => x.id)).size, 8);
      assert.ok(plan.sessions.every(x => x.title && x.canPauseOrSkip &&
        x.needsSessionSafetyCheck && x.editable));
      assert.ok(plan.sessions.every(x => x.mediaPublished === false &&
        x.videoAssetId === null && x.audioAssetId === null));
      assert.equal(plan.formulation.model, "5P");
      assert.equal(plan.formulation.predisposing, "unknown");
      assert.equal(plan.formulation.diagnosis, null);
      assert.equal(plan.releaseGate, "review_and_content_approval_required");
      assert.equal(plan.saved, false);
      assert.equal(plan.modelUsed, false);
    }
  }
});
test("the methods catalogue does not silently perform full KIP or any trauma processing", () => {
  const banned = ["kip_clinical", "emdr_processing",
    "cpt_trauma_processing", "exposure_processing", "psychodynamic_interpretation"];
  for (const id of banned) assert.equal(PSYCHOLOGIST_METHODS[id].selfGuided, false);
  for (const approach of ["kip", "emdr", "cpt", "prolonged_exposure"])
    assert.equal(PSYCHOLOGIST_APPROACHES[approach].clinicalTreatment, true);
  for (const focus of PSYCHOLOGIST_FOCI.filter(x => x !== "trauma_support")) {
    const plan = programFor(focus, "ru", { consent: { resourceImagery: true } });
    assert.ok(plan.sessions.every(s => s.methodIds.every(id =>
      PSYCHOLOGIST_METHODS[id]?.selfGuided === true && !banned.includes(id))));
  }
});
test("missing or ambiguous safety preflight fails closed before all program and chat steps", () => {
  assert.equal(buildPsychologyProgram({ intent: { focus: "stress" } }).status,
    "safety_check_required");
  const reply = buildPsychologyDialogueTurn({
    intent: { focus: "relationships" }, text: "Our conflict is difficult" });
  assert.equal(reply.status, "safety_check_required");
  assert.equal(reply.canStartExercise, false);
  assert.equal(reply.suggestedMethodIds.length, 0);
  assert.equal(buildPsychologyProgram({
    safety: { status: "unknown" }, intent: { focus: "stress" },
  }).sessions.length, 0);
});
test("urgent raw language and long-input fragments stop both flows without personal text leakage", () => {
  for (const raw of ["I want to kill myself", "Хочу покончить с собой",
    "a".repeat(360) + " I want to kill myself"]) {
    const input = { ...safe, locale: "ru",
      intent: { focus: "stress", rawUtterance: raw } };
    const plan = buildPsychologyProgram(input);
    const turn = buildPsychologyDialogueTurn({ ...input, text: raw });
    assert.equal(plan.status, "safety_handoff");
    assert.equal(plan.sessions.length, 0);
    assert.equal(turn.status, "safety_handoff");
    assert.equal(turn.canStartExercise, false);
    assert.ok(!JSON.stringify({plan,turn}).includes(raw));
  }
  assert.equal(buildPsychologyProgram({ ...safe, intent: { focus: "stress" },
    safety: { status: "urgent" } }).status, "safety_handoff");
  assert.equal(buildPsychologyProgram({ ...safe, intent: { focus: "stress" },
    safety: { status: "clear", flags: ["imminent_danger"] } }).status, "safety_handoff");
});
test("trauma processing and clinical complexity require human review, not auto treatment", () => {
  for (const intent of [
    { focus: "trauma_support" },
    { focus: "stress", requestedTraumaProcessing: true },
    { focus: "stress", rawUtterance: "I need EMDR for trauma" },
  ]) {
    const plan = buildPsychologyProgram({ ...safe, intent });
    assert.equal(plan.status, "human_review_required");
    assert.deepEqual(plan.sessions, []);
    assert.equal(plan.publishable, false);
  }
  assert.equal(buildPsychologyDialogueTurn({ ...safe, intent: { focus: "trauma_support" },
    text: "Help me relive trauma" }).status, "human_review_required");
  for (const flag of ["psychosis", "mania", "acute_dissociation"]) {
    assert.equal(buildPsychologyProgram({ safety: { status: "clear", flags: [flag] },
      intent: { focus: "stress" } }).status, "human_review_required");
  }
  assert.equal(buildPsychologyProgram({ safety: { status: "human_review" },
    intent: { focus: "relationships" } }).status, "human_review_required");
});
test("verified practitioner can see a non-publishable support-only review draft", () => {
  const attempt = programFor("trauma_support", "en", {
    intent: { focus: "trauma_support", mode: "practitioner_draft" },
    access: { authenticated: true, ownerScoped: true, verifiedPractitioner: true },
  });
  assert.equal(attempt.status, "clinician_draft");
  assert.equal(attempt.requiresHumanReview, true);
  assert.equal(attempt.sessions.length, 8);
  assert.equal(attempt.publishable, false);
  assert.ok(attempt.sessions.every(s => s.requiresHumanApproval));
  assert.ok(attempt.sessions.every(s => !s.methodIds.includes("emdr_processing") &&
    !s.methodIds.includes("exposure_processing")));
  const denied = programFor("stress", "en", {
    intent: { focus: "stress", mode: "practitioner_draft" },
    access: { authenticated: false, ownerScoped: false, verifiedPractitioner: true },
  });
  assert.equal(denied.status, "human_review_required");
});
test("an explicitly chosen focus wins over consented profile/memory and raw ambiguity", () => {
  const input = { ...safe,
    access: { authenticated: true, ownerScoped: true },
    consent: { profilePersonalization: true, agentMemory: true,
      confirmedResources: true },
    profile: { confirmedFocus: "meaning", preferredStyle: "concise",
      confirmedResourceCodes: ["nature", "secret_person", "rest"],
      privateNotes: "do-not-leak@example.com" },
  };
  const selected = buildPsychologyProgram({ ...input, intent: { focus: "relationships" } });
  assert.equal(selected.focus, "relationships");
  assert.deepEqual(selected.formulation.protectiveResources, ["nature", "rest"]);
  assert.equal(selected.contextUsed.agentMemory, true);
  assert.ok(!JSON.stringify(selected).includes("do-not-leak"));
  const memory = buildPsychologyProgram({ ...input, intent: {} });
  assert.equal(memory.focus, "meaning");
  const noMemory = buildPsychologyProgram({ ...input,
    consent: { profilePersonalization: true, agentMemory: false },
    intent: {} });
  assert.equal(noMemory.status, "needs_focus");
  const foreign = buildPsychologyProgram({ ...input,
    access: { authenticated: true, ownerScoped: false }, intent: {} });
  assert.equal(foreign.status, "needs_focus");
  assert.equal(foreign.contextUsed.profile, false);
  assert.equal(foreign.contextUsed.agentMemory, false);
});
test("user confirmed trigger/reaction forms a tentative hypothesis, never a diagnosis", () => {
  const plan = programFor("stress", "ru", { intent: { focus: "stress",
    confirmedTrigger: "criticism", confirmedReaction: "freeze" } });
  assert.equal(plan.formulation.precipitating, "criticism");
  assert.equal(plan.formulation.hypotheses.length, 1);
  assert.equal(plan.formulation.hypotheses[0].tentative, true);
  assert.equal(plan.formulation.hypotheses[0].confirmWithClient, true);
  assert.equal(plan.formulation.perpetuating, "not_established");
  const noEvidence = programFor("stress", "ru");
  assert.deepEqual(noEvidence.formulation.hypotheses, []);
});
test("resource imagery requires a separate opt-in and respects explicit opt-out", () => {
  const defaultPlan = programFor("stress");
  assert.ok(!defaultPlan.sessions.some(s => s.methodIds.includes("resource_imagery")));
  const allowed = programFor("stress", "ru",
    { consent: { resourceImagery: true } });
  assert.ok(allowed.sessions.some(s => s.methodIds.includes("resource_imagery")));
  const rejected = programFor("stress", "ru",
    { consent: { resourceImagery: true },
      intent: { focus: "stress", noImagery: true, avoidMethods: ["thought_reflection"] } });
  assert.ok(!rejected.sessions.some(s => s.methodIds.includes("resource_imagery")));
  assert.ok(!rejected.sessions.some(s => s.methodIds.includes("thought_reflection")));
});
test("client discomfort pauses the next program and dialogue", () => {
  const opts = { ...safe, intent: { focus: "stress" },
    feedback: { discomfort: true } };
  const plan = buildPsychologyProgram(opts);
  assert.equal(plan.status, "paused_for_review");
  assert.equal(plan.sessions.length, 0);
  const turn = buildPsychologyDialogueTurn({ ...opts, text: "I need a rest" });
  assert.equal(turn.status, "paused_for_review");
  assert.equal(turn.canStartExercise, false);
});
test("client dialogue uses same program and only one localized question", () => {
  for (const lang of ["en", "ru", "es"]) {
    const input = { ...safe, locale: lang, intent: { focus: "self_worth" },
      state: { sessionNumber: 4, phase: "reflection" } };
    const program = buildPsychologyProgram(input);
    const reply = buildPsychologyDialogueTurn(input);
    assert.equal(reply.status, "dialogue");
    assert.equal(reply.sessionNumber, 4);
    assert.deepEqual(reply.suggestedMethodIds, program.sessions[3].methodIds);
    assert.equal(reply.currentObjective, program.sessions[3].objectiveCode);
    assert.ok(reply.question?.text.length > 12);
    assert.equal(reply.canStartExercise, false);
    assert.equal(reply.dialogueContract.mayDiagnose, false);
    assert.equal(reply.modelUsed, false);
    assert.equal(reply.saved, false);
  }
  const handoff = buildPsychologyDialogueTurn({
    ...safe, text: "Я тревожусь на работе", state: { phase: "next", sessionNumber: 8 } });
  assert.equal(handoff.focus, "stress");
  assert.equal(handoff.sessionNumber, 8);
});
test("T0/T1 comparisons reuse canonical safe checkin helper and respect consent", () => {
  const state = { phase: "reflection", sessionNumber: 1,
    beforeCheckin: { promptKey: "session_current_state", value: 3,
      measuredAt: "2026-10-29T08:00:00Z" },
    afterCheckin: { promptKey: "session_current_state", value: 6,
      measuredAt: "2026-10-29T08:20:00Z" } };
  const base = { ...safe, intent: { focus: "stress" }, state };
  assert.equal(buildPsychologyDialogueTurn(base).voluntaryComparison, null);
  const compared = buildPsychologyDialogueTurn({ ...base,
    consent: { processFeedback: true } });
  assert.equal(compared.voluntaryComparison.change, 3);
  assert.equal(compared.voluntaryComparison.efficacyClaim, false);
  const invalid = buildPsychologyDialogueTurn({ ...base,
    consent: { processFeedback: true },
    state: { ...state, afterCheckin: { ...state.afterCheckin, promptKey: "other" } } });
  assert.equal(invalid.voluntaryComparison, null);
});
test("unified Holistic Intelligence reexports one callable persona entry for program and chat", () => {
  assert.equal(fromHolisticIntelligence, consultPsychologistMind);
  assert.equal(consultPsychologistMind({ task: "program", ...safe,
    intent: { focus: "meaning" } }).sessions.length, 8);
  assert.equal(consultPsychologistMind({ task: "dialogue", ...safe,
    intent: { focus: "meaning" } }).status, "dialogue");
  assert.equal(consultPsychologistMind({ task: "unknown" }).status, "unsupported_task");
});

test("dialogue respects a client's stop and complaint of worsening, independent of phase", () => {
  for (const [locale, stop, worse] of [
    ["ru", "Стоп. Хватит.", "После упражнения мне стало хуже"],
    ["en", "Please stop.", "I feel worse now"],
    ["es", "Basta, para.", "Me siento peor"],
  ]) {
    const common = { ...safe, locale, intent: { focus: "stress" },
      state: { phase: "practice_intro", sessionNumber: 3 } };
    const stopped = buildPsychologyDialogueTurn({ ...common, text: stop });
    assert.equal(stopped.status, "client_paused");
    assert.equal(stopped.question, null);
    assert.equal(stopped.canStartExercise, false);
    const uncomfortable = buildPsychologyDialogueTurn({ ...common, text: worse });
    assert.equal(uncomfortable.status, "paused_for_review");
    assert.equal(uncomfortable.question, null);
    assert.deepEqual(uncomfortable.suggestedMethodIds, []);
  }
});
test("uncertainty or a why-question changes phrasing without hallucinating a cause", () => {
  const common = { ...safe, locale: "ru", intent: { focus: "relationships" } };
  const unsure = buildPsychologyDialogueTurn({ ...common, text: "Не знаю" });
  const why = buildPsychologyDialogueTurn({ ...common, text: "Почему?" });
  assert.equal(unsure.status, "dialogue");
  assert.match(unsure.message, /Необязательно/);
  assert.equal(why.status, "dialogue");
  assert.match(why.message, /не с диагнозом/);
});

test("clinician-only KIP and psychodynamic options are discussed but never runnable", () => {
  const input = { ...safe, locale: "ru",
    access: { authenticated: true, ownerScoped: true, verifiedPractitioner: true },
    intent: { mode: "practitioner_draft", focus: "relationships" } };
  const draft = buildPsychologyProgram(input);
  assert.equal(draft.status, "clinician_draft");
  assert.equal(draft.clinicalAssessmentRequired, true);
  assert.ok(draft.sessions.some(s => s.clinicianDiscussionIds.includes("kip_clinical")));
  assert.ok(draft.sessions.some(s => s.clinicianDiscussionIds.includes("psychodynamic_interpretation")));
  assert.ok(draft.sessions.every(s => s.clinicianMethodsRunnableByAI === false));
  assert.ok(draft.sessions.every(s => !s.methodIds.includes("kip_clinical") &&
    !s.methodIds.includes("psychodynamic_interpretation")));
  const trauma = buildPsychologyProgram({ ...input,
    intent: { mode: "practitioner_draft", focus: "trauma_support" } });
  assert.deepEqual(trauma.specialistDiscussionOptions,
    ["cpt_trauma_processing", "emdr_processing", "exposure_processing"]);
  assert.ok(trauma.sessions.every(s => s.clinicianDiscussionIds.length === 0));
  const guided = programFor("relationships");
  assert.ok(guided.sessions.every(s => s.clinicianDiscussionIds.length === 0));
});

test("client tone is genuinely different for current concise and structured preferences", () => {
  const base = { ...safe, locale: "ru",
    intent: { focus: "stress" }, state: { sessionNumber: 2, phase: "checkin" } };
  const warm = buildPsychologyDialogueTurn(base);
  const concise = buildPsychologyDialogueTurn({ ...base,
    intent: { ...base.intent, style: "concise" } });
  const structured = buildPsychologyDialogueTurn({ ...base,
    intent: { ...base.intent, style: "structured" } });
  assert.notEqual(warm.message, concise.message);
  assert.notEqual(structured.message, concise.message);
  assert.match(structured.message, /Тема текущего шага/);
});
