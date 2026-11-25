export type HomeSpaceSummary = {
  accountId: string;
  professional: boolean;
  owner: boolean;
  next: 'onboarding' | 'report' | 'course' | 'growth' | 'tests';
  courseId: string | null;
  completedLessons: number | null;
};
export function homeSpaceSummary(bootstrap: unknown, courseResponse?: unknown): HomeSpaceSummary | null;
