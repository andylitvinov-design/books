// One-release, fail-closed scope for the private practitioner meditation studio.
// Unrelated auth, client, RLS, media and CI edits must retain exhaustive IA.
// This helper is used only with an exact GitHub synthetic merge HEAD+BASE lease.
export const MEDITATION_RELEASE_ALLOWED_FILES = Object.freeze([
  "app/admin/practitioners/meditations/page.jsx",
  "app/admin/youtube-upload/page.js",
  "app/api/admin/practitioners/meditations/[id]/handoff/route.js",
  "app/api/admin/practitioners/meditations/[id]/media/route.js",
  "app/api/admin/practitioners/meditations/route.js",
  "app/api/admin/practitioners/meditations/youtube-start/route.js",
  "app/api/admin/practitioners/meditations/youtube-verify/route.js",
  "app/api/app/practice/meditations/[id]/media/route.js",
  "app/api/app/practice/meditations/route.js",
  "components/app/practice-workspace.jsx",
  "components/app/practitioner-meditation-studio.jsx",
  "components/app/practitioner-meditation-studio.module.css",
  "components/practice-showcase.jsx",
  "components/practitioner-meditations-moderation.jsx",
  "components/practitioner-moderation.jsx",
  "components/youtube-phone-uploader.jsx",
  "lib/practitioners/meditation-studio-contract.mjs",
  "lib/practitioners/meditation-studio-service.js",
  "supabase/migrations/20261028143326_hh_practitioner_meditation_studio_20261028.sql",
  "tests/practitioner-meditation-studio.test.mjs",
  "tests/practitioner-preview-auth.test.mjs",
  "tests/course-slide-recorder.test.mjs",
  "tests/practice-course-materials-navigation.test.mjs",
  "tests/practice-single-owner-cabinet.test.mjs",
  "tests/practitioner-course-builder.test.mjs",
  "tests/practitioner-course-quick-start.test.mjs",
  "tests/growth-studio-benchmark-quick-compose.test.mjs",
  ".github/workflows/ia-v2.yml",
  "scripts/ci-practitioner-meditation-scope.mjs",
  "tests/ci-practitioner-meditation-scope.test.mjs"
]);
export const MEDITATION_RELEASE_REQUIRED_FILES = Object.freeze([
  "app/api/admin/practitioners/meditations/route.js",
  "app/api/app/practice/meditations/route.js",
  "lib/practitioners/meditation-studio-service.js",
  "supabase/migrations/20261028143326_hh_practitioner_meditation_studio_20261028.sql"
]);
const allowed = new Set(MEDITATION_RELEASE_ALLOWED_FILES);
export function isPrivateMeditationRelease(files){
  if (!Array.isArray(files) || files.length < MEDITATION_RELEASE_REQUIRED_FILES.length || files.length > allowed.size) return false;
  const seen = new Set();
  for (const path of files) {
    if (typeof path !== 'string' || !allowed.has(path) || seen.has(path)) return false;
    seen.add(path);
  }
  return MEDITATION_RELEASE_REQUIRED_FILES.every(path => seen.has(path));
}
