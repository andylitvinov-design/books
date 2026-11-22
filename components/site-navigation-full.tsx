"use client";

import { CartNavLink } from '@/components/commerce/cart-nav-link';
import { HeaderCreditProfile } from './header-credit-profile';
import { SiteNavigation, type SiteNavigationProps } from './site-navigation';

const fullHeaderComponents = { CartNavLink, HeaderCreditProfile };

export function SiteNavigationFull(props: Omit<SiteNavigationProps, 'fullHeaderComponents'>) {
  return <SiteNavigation {...props} fullHeaderComponents={fullHeaderComponents} />;
}
