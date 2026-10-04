import type { PublicLocale } from './public-locales';
export type NavigationId = 'home' | 'library' | 'services' | 'academy' | 'about' | 'cabinet';
export interface NavigationItem { id: NavigationId; label: string; href: string; external: boolean; ariaLabel: string }
export const navigationCopy: Record<PublicLocale, Record<NavigationId | 'navigation' | 'mobile' | 'language', string>>;
export const primaryNavigationIds: NavigationId[];
export const academyUrl: string;
export function getSiteNavigation(locale?: PublicLocale): NavigationItem[];
export function activeNavigationId(pathname: string): NavigationId | undefined;
export function routeLocale(pathname: string): PublicLocale | undefined;
