import { BookOpen, BriefcaseBusiness, Flame, FlaskConical, GraduationCap, Heart, House, Landmark, UserRound, HeartHandshake, Sparkles, Clapperboard } from 'lucide-react';

// The hamburger and mobile bar share their visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
  analysis: Sparkles,
  courses: BookOpen,
  profile: UserRound,
  alchemy: FlaskConical,
  mytube: Clapperboard,
  insights: Sparkles,
  support: HeartHandshake,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  books: BookOpen,
  pro: GraduationCap,
  temple: Landmark,
} as const;
