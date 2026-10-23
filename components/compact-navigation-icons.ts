import { BookOpen, BriefcaseBusiness, ClipboardList, Flame, Heart, House } from 'lucide-react';

// The hamburger's main destinations and the mobile bottom bar share these icons,
// just as they already share their labels, order and URLs in site-navigation-model.
export const compactNavigationIcons = {
  home: House,
  tests: ClipboardList,
  energy: Flame,
  love: Heart,
  business: BriefcaseBusiness,
  books: BookOpen,
} as const;
