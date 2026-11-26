"use client";

import { CartNavLink } from '@/components/commerce/cart-nav-link';
import { HeaderCreditProfile } from './header-credit-profile';
import { SiteNavigation, type SiteNavigationBaseProps } from './site-navigation';

const fullHeaderComponents = { CartNavLink, HeaderCreditProfile };

export function SiteNavigationFull(props: SiteNavigationBaseProps) {
  return <SiteNavigation {...props} fullHeaderComponents={fullHeaderComponents} />;
}
