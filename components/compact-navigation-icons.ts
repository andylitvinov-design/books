import { BookOpen, BriefcaseBusiness, Flame, GraduationCap, Heart, House, Landmark, UserRound, MessagesSquare, HeartHandshake, Sparkles } from 'lucide-react';

// The hamburger and mobile bar share their visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
  analysis: Sparkles,
  courses: BookOpen,
  profile: UserRound,
  coaching: MessagesSquare,
  insights: Sparkles,
  support: HeartHandshake,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  books: BookOpen,
  pro: GraduationCap,
  temple: Landmark,
} as const;
