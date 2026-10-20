import { BriefcaseBusiness, ClipboardList, GraduationCap, House, LayoutDashboard, Sparkles } from 'lucide-react';

// The hamburger's main destinations and the mobile bottom bar share these icons,
// just as they already share their labels, order and URLs in site-navigation-model.
export const compactNavigationIcons = {
  home: House,
  tests: ClipboardList,
  services: Sparkles,
  academy: GraduationCap,
  business: BriefcaseBusiness,
  house: LayoutDashboard,
} as const;
