import { BookOpen, BriefcaseBusiness, ClipboardList, Flame, GraduationCap, Heart, House } from 'lucide-react';

// The hamburger and mobile bar share the same seven visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  tests: ClipboardList,
  books: BookOpen,
  pro: GraduationCap,
} as const;
