import { BookOpen, BriefcaseBusiness, Flame, GraduationCap, Heart, House, Landmark } from 'lucide-react';

// The hamburger and mobile bar share the same seven visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  books: BookOpen,
  pro: GraduationCap,
  temple: Landmark,
} as const;
