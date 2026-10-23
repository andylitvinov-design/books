import { BookOpen, BriefcaseBusiness, Flame, GraduationCap, Heart, House } from 'lucide-react';

// The hamburger and mobile bar share the same six visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  books: BookOpen,
  pro: GraduationCap,
} as const;
