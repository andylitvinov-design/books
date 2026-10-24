import { BookOpen, BriefcaseBusiness, Flame, GraduationCap, Heart, House, Landmark, UserRound, MessagesSquare, HeartHandshake, Sparkles } from 'lucide-react';

// The hamburger and mobile bar share the same seven visitor-facing directions.
export const compactNavigationIcons = {
  home: House,
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
