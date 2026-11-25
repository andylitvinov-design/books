/**
 * VideoProjectV2: browser-local, immutable and revision-guarded project state.
 * This module contains NO network, billing, persistence, or rendering effects.
 * The existing Studio remains the renderer while UI slices migrate gradually.
 */
export const VIDEO_PROJECT_SCHEMA_VERSION = 2;
export const VIDEO_PROJECT_WORKSPACES = Object.freeze([
  "video", "phrases", "effects", "practices", "pro", "editor",
]);
const ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const ASPECTS = new Set(["portrait", "landscape", "square"]);
const EXCLUSIONS = new Set(["forest", "water", "dark"]);
const LOCALES = new Set(["ru", "en", "es"]);
const safeId = (value, max = 96) =>
  typeof value === "string" && value.length <= max && ID.test(value);
const isPlain = v => v !== null && typeof v === "object" &&
  !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const fail = code => { throw new Error(code); };
const exactly = (value, keys) => isPlain(value) &&
  Object.keys(value).every(k => keys.includes(k));
const scalarId = (id, max = 96) => id === null || safeId(id, max);

export function createVideoProjectV2({ projectId, locale = "ru", goalText = "" } = {}) {
  if (!safeId(projectId, 96) || !LOCALES.has(locale) ||
      typeof goalText !== "string" || goalText.length > 800)
    fail("video_project_invalid_input");
  return freeze({
    schemaVersion: VIDEO_PROJECT_SCHEMA_VERSION, projectId, revision: 0, locale,
    activeWorkspace: "video",
    goal: { text: goalText, categoryId: null, topicId: null,
      scenarioId: null, ideaId: null, exclusions: [] },
    film: { presetId: null, aspect: "portrait", durationMs: 30000, shots: [] },
    phrases: { approved: [], approvedVersion: 0 },
    audio: { trackId: "none", volumePercent: 75 },
    renderApproval: { planHash: null, revision: null },
    export: { status: "idle", planHash: null, artifact: null },
    privacy: { localOnly: true, externalAiConsent: false },
  });
}

function validShotList(shots, durationMs) {
  if (!Array.isArray(shots) || shots.length !== 4 ||
      !Number.isInteger(durationMs) || durationMs < 10000 || durationMs > 60000)
    return false;
  let cursor = 0;
  const seen = new Set();
  for (const shot of shots) {
    if (!exactly(shot, ["sceneId", "startMs", "durationMs"]) ||
        !safeId(shot.sceneId) || seen.has(shot.sceneId) ||
        !Number.isInteger(shot.startMs) || shot.startMs !== cursor ||
        !Number.isInteger(shot.durationMs) || shot.durationMs < 2000) return false;
    seen.add(shot.sceneId);
    cursor += shot.durationMs;
  }
  return cursor === durationMs;
}

/**
 * A successful patch increments the creative revision. A tab change does not.
 * Every creative change revokes old render approval and marks output stale;
 * the old output record is kept for explicit user download/disposal decisions.
 */
export function applyVideoProjectAction(project, action, expectedRevision = project?.revision) {
  if (!isPlain(project) || project.schemaVersion !== VIDEO_PROJECT_SCHEMA_VERSION ||
      !Number.isInteger(project.revision)) fail("video_project_invalid_state");
  if (expectedRevision !== project.revision) fail("video_project_stale_revision");
  if (!isPlain(action) || typeof action.type !== "string") fail("video_project_invalid_action");
  if (action.type === "set_workspace") {
    if (!exactly(action, ["type", "workspace"]) ||
        !VIDEO_PROJECT_WORKSPACES.includes(action.workspace)) fail("video_project_invalid_workspace");
    return action.workspace === project.activeWorkspace ? project :
      freeze({ ...project, activeWorkspace: action.workspace });
  }
  if (action.type === "approve_plan") {
    if (!exactly(action, ["type", "planHash", "revision"]) ||
        !/^fnv64-[0-9a-f]{16}$/.test(action.planHash) ||
        action.revision !== project.revision ||
        !validShotList(project.film.shots, project.film.durationMs))
      fail("video_project_approval_requires_current_valid_film");
    return freeze({ ...project, renderApproval: {
      planHash: action.planHash, revision: project.revision },
    });
  }
  if (action.type === "export_ready") {
    if (!exactly(action, ["type", "planHash", "artifact"]) ||
        project.renderApproval.revision !== project.revision ||
        project.renderApproval.planHash !== action.planHash ||
        !isPlain(action.artifact) ||
        !exactly(action.artifact, ["mime", "bytes", "validatedPlayback"]) ||
        !["video/mp4", "video/webm"].includes(action.artifact.mime) ||
        !Number.isInteger(action.artifact.bytes) || action.artifact.bytes < 1024 ||
        action.artifact.validatedPlayback !== true)
      fail("video_project_export_not_verified");
    return freeze({ ...project, export: {
      status: "ready", planHash: action.planHash,
      artifact: { ...action.artifact },
    } });
  }

  let patch;
  switch (action.type) {
    case "set_goal": {
      if (!exactly(action, ["type", "goal"]) ||
          !exactly(action.goal, ["text", "categoryId", "topicId", "scenarioId", "ideaId", "exclusions"]))
        fail("video_project_invalid_goal");
      const { text, categoryId = null, topicId = null, scenarioId = null,
        ideaId = null, exclusions = [] } = action.goal;
      if (typeof text !== "string" || text.length > 800 ||
          ![categoryId, topicId, scenarioId, ideaId].every(id => scalarId(id)) ||
          !Array.isArray(exclusions) || exclusions.length > 3 ||
          exclusions.some(id => !EXCLUSIONS.has(id)) ||
          new Set(exclusions).size !== exclusions.length)
        fail("video_project_invalid_goal");
      patch = { goal: { text, categoryId, topicId, scenarioId, ideaId,
        exclusions: [...exclusions] } };
      break;
    }
    case "set_film": {
      if (!exactly(action, ["type", "film"]) ||
          !exactly(action.film, ["presetId", "aspect", "durationMs", "shots"]) ||
          !scalarId(action.film.presetId) || !ASPECTS.has(action.film.aspect) ||
          !validShotList(action.film.shots, action.film.durationMs))
        fail("video_project_invalid_film");
      patch = { film: { presetId: action.film.presetId, aspect: action.film.aspect,
        durationMs: action.film.durationMs,
        shots: action.film.shots.map(shot => ({ ...shot })) } };
      break;
    }
    case "approve_phrases": {
      if (!exactly(action, ["type", "confirmed", "items"]) || action.confirmed !== true ||
          !Array.isArray(action.items) || action.items.length > 8 ||
          action.items.some(text => typeof text !== "string" ||
            text.trim().length < 2 || text.length > 220))
        fail("video_project_invalid_phrases");
      patch = { phrases: { approved: action.items.map(s => s.trim()),
        approvedVersion: project.phrases.approvedVersion + 1 } };
      break;
    }
    case "set_audio": {
      if (!exactly(action, ["type", "trackId", "volumePercent"]) ||
          !safeId(action.trackId) || !Number.isInteger(action.volumePercent) ||
          action.volumePercent < 0 || action.volumePercent > 100)
        fail("video_project_invalid_audio");
      patch = { audio: { trackId: action.trackId, volumePercent: action.volumePercent } };
      break;
    }
    default: fail("video_project_unsupported_action");
  }
  if (Object.keys(patch).every(key => JSON.stringify(patch[key]) === JSON.stringify(project[key])))
    return project;
  return freeze({ ...project, ...patch, revision: project.revision + 1,
    renderApproval: { planHash: null, revision: null },
    export: { ...project.export, status: project.export.artifact ? "stale" : "idle" },
  });
}
