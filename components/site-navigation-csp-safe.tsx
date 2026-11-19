"use client";

import { CartNavLink } from "@/components/commerce/cart-nav-link";
import { HeaderCreditProfile } from "./header-credit-profile";
import { HomePersonalSpaceNavEntry } from "./home-personal-space";
import { SiteNavigationCore, type SiteNavigationProps } from "./site-navigation-core";

// Public service pages use the normal module graph so strict-dynamic CSP can
// nonce these controls at render time instead of loading runtime-created chunks.
export function SiteNavigationCspSafe(props: SiteNavigationProps) {
  return <SiteNavigationCore
    {...props}
    CartNavLink={CartNavLink}
    HomePersonalSpaceNavEntry={HomePersonalSpaceNavEntry}
    HeaderCreditProfile={HeaderCreditProfile}
  />;
}
