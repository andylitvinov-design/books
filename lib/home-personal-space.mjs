// Minimal, account-scoped homepage navigation summary. Never persist or export
// scores, answers, notes, personal course titles or private report contents.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function homeSpaceSummary(bootstrap, courseResponse = null) {
  const account = bootstrap?.account;
  if (!account || typeof account.id !== 'string' || !UUID.test(account.id) ||
      typeof account.onboardingState !== 'string') return null;

  const savedReports = Array.isArray(bootstrap.savedReports) ? bootstrap.savedReports : [];
  const unreadReport = savedReports.some(report =>
    report && report.available === true && report.unread === true);
  const courses = Array.isArray(courseResponse?.courses) ? courseResponse.courses : [];
  const resumable = courses.filter(course =>
    course && typeof course.id === 'string' && UUID.test(course.id) &&
    ['active', 'draft', 'paused'].includes(course.status));
  const current = resumable.find(course => course.isPrimary && course.status !== 'paused') ||
    resumable.find(course => course.status !== 'paused') ||
    resumable.find(course => course.isPrimary) || resumable[0] || null;
  const hasResults = Array.isArray(bootstrap.results) && bootstrap.results.length > 0;

  // One action; never infer someone's health or developmental needs from scores.
  const next = account.onboardingState !== 'active' ? 'onboarding' :
    unreadReport ? 'report' : current ? 'course' : hasResults ? 'growth' : 'tests';
  return {
    accountId: account.id,
    professional: Boolean(bootstrap.practitioner || bootstrap.practice),
    owner: Boolean(bootstrap.practitioner),
    next,
    courseId: next === 'course' ? current.id : null,
    completedLessons: next === 'course' &&
      Number.isInteger(current.completedLessons) && current.completedLessons >= 0
      ? Math.min(current.completedLessons, 28) : null,
  };
}
