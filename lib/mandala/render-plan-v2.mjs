/**
 * RenderPlanV2 is a verified execution contract over actual first-party MP4s.
 * It is not a second renderer, a cloud job, or an invented AI video source.
 * Its fnv64 key is for local stale-state detection, NOT cryptographic security.
 */
import {isSafeMontageScene, validateMontageClips} from "./video-montage-sources.mjs";
export const VIDEO_RENDER_PLAN_VERSION = "hh-render-plan-v2";
const LENGTHS = new Set([10,15,20,30,60]);
const ASPECTS = new Set(["portrait","landscape","square"]);
const RIGHTS = new Set(["existing_approved_first_party_master","dareful_cc_by_4_0"]);
const safeId = v => typeof v === "string" && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(v) && v.length <= 96;
const fail = reason => { throw new Error(reason); };
const freeze = v => {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.values(v).forEach(freeze); Object.freeze(v);
  }
  return v;
};
const sizeFor = (aspect, quality) => {
  const large = quality === "fullhd";
  if (aspect === "portrait") return { width: large ? 1080 : 720, height: large ? 1920 : 1280 };
  if (aspect === "square") return { width: large ? 1080 : 720, height: large ? 1080 : 720 };
  return { width: large ? 1920 : 1280, height: large ? 1080 : 720 };
};
export function videoRenderFingerprint(value) {
  const json = JSON.stringify(value);
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(json)) {
    hash = ((hash ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return "fnv64-" + hash.toString(16).padStart(16, "0");
}
/**
 * Strict adapter from current validated executable four-shot scenario.
 * Source paths and rights are always resolved from the trusted scene registry,
 * never from user prose or LLM-supplied URLs.
 */
export function compileVerifiedRenderPlanV2({scenario, scenes, projectId = "guest-preview",
  projectRevision = 0} = {}) {
  if (!safeId(projectId) || !Number.isInteger(projectRevision) || projectRevision < 0 ||
      !scenario || scenario.readyToExecute !== true ||
      scenario.version !== "hh-executable-video-scenario-v1" ||
      scenario.paidRenderApproved !== false || scenario.noExternalClientData !== true ||
      !LENGTHS.has(scenario.durationSeconds) || !ASPECTS.has(scenario.aspect) ||
      !Array.isArray(scenario.shots) || scenario.shots.length !== 4 ||
      !Array.isArray(scenes)) fail("render_plan_invalid_input");
  const exclusions = scenario.edit?.excludedMotifs || [];
  const ids = scenario.shots.map(shot => shot.sceneId);
  if (!validateMontageClips(ids, scenes, exclusions)) fail("render_plan_unlicensed_scene");
  const sceneById = new Map(scenes.filter(scene => isSafeMontageScene(scene,exclusions))
    .map(scene => [scene.id, scene]));
  let cursor = 0;
  const captions = [];
  const proof = [];
  const shots = scenario.shots.map((shot, index) => {
    const source = sceneById.get(shot.sceneId);
    if (!source || shot.assetPath !== source.video ||
        !RIGHTS.has(source.rightsReference?.kind) ||
        !Number.isInteger(shot.startSeconds) ||
        !Number.isInteger(shot.durationSeconds) || shot.durationSeconds < 2 ||
        shot.startSeconds !== cursor) fail("render_plan_invalid_timeline");
    const startMs = cursor * 1000;
    const durationMs = shot.durationSeconds * 1000;
    cursor += shot.durationSeconds;
    const captionText = typeof shot.captionText === "string" ? shot.captionText.trim() : "";
    if (captionText.length > 180) fail("render_plan_invalid_caption");
    const captionIds = [];
    if (captionText) {
      const id = "shot-" + (index + 1) + "-caption";
      captionIds.push(id);
      captions.push({id, text: captionText, source: "user_requested_preset",
        startMs, endMs: startMs + durationMs, safeArea: "center"});
    }
    proof.push({sceneId: source.id, collection: source.collection,
      rightsKind: source.rightsReference.kind, sourcePath: source.video});
    return {shotId: "shot-" + (index + 1), sceneAssetId: source.id,
      sourcePath: source.video, startMs, sourceInMs: 0, durationMs,
      transition: "cut", captionIds};
  });
  if (cursor !== scenario.durationSeconds) fail("render_plan_duration_mismatch");
  const audio = scenario.audio;
  if (!audio || !Number.isInteger(audio.volumePercent) ||
      audio.volumePercent < 0 || audio.volumePercent > 100 ||
      !["none","harmony","love","meditation"].includes(audio.trackId) ||
      (audio.kind === "silent") !== (audio.trackId === "none"))
    fail("render_plan_invalid_audio");
  const audioTracks = audio.trackId === "none" ? [] : [{
    assetId: audio.trackId, kind: "music", startMs: 0,
    endMs: scenario.durationSeconds * 1000, gainPercent: audio.volumePercent,
    fadeInMs: 0, fadeOutMs: 0,
  }];
  const plan = {
    version: VIDEO_RENDER_PLAN_VERSION, projectId, projectRevision,
    sourceScenarioVersion: scenario.version, presetId: scenario.presetId,
    engine: "existing_canvas_mediarecorder",
    requestedTarget: { aspect: scenario.aspect, ...sizeFor(scenario.aspect,scenario.rendering?.quality),
      fps: 24, mime: "browser_negotiated" },
    durationMs: scenario.durationSeconds * 1000, shots, captions,
    audioTracks, rightsProof: proof,
    // Neither raw visitor goal nor profile, uploaded image, audio, PII or payment enters the plan.
    privacy: { localOnly: true, externalProviderApproved: false },
  };
  return freeze({...plan, planHash: videoRenderFingerprint(plan)});
}
