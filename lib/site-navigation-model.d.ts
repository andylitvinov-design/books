import type { PublicLocale } from './public-locales';
export type NavigationId = 'home' | 'tests' | 'library' | 'services' | 'events' | 'business' | 'relationships' | 'academy' | 'about' | 'courses' | 'cabinet' | 'house';
export interface NavigationItem { id: NavigationId; label: string; href: string; external: boolean; ariaLabel: string }
export const navigationCopy: Record<PublicLocale, Record<NavigationId | 'navigation' | 'mobile' | 'language', string>>;
export const primaryNavigationIds: NavigationId[];
export function getSiteNavigation(locale?: PublicLocale): NavigationItem[];
export const compactNavigationIds: readonly NavigationId[];
export function getCompactNavigation(locale?: PublicLocale): NavigationItem[];
export function activeCompactNavigationId(pathname: string): NavigationId | undefined;
export function activeNavigationId(pathname: string): NavigationId | undefined;
export function routeLocale(pathname: string): PublicLocale | undefined;

/** The public guest test chooser, not a private client session or report. */
export function isPublicTestDiscoveryPath(pathname: string): boolean;
