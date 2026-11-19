"use client";

import dynamic from "next/dynamic";
import { SiteNavigationCore, type SiteNavigationProps } from "./site-navigation-core";

// Keep these noncritical controls out of the compact Home navigation bundle.
// Full navigation routes use the static wrapper so strict CSP can nonce every chunk.
const CartNavLink = dynamic(() => import("@/components/commerce/cart-nav-link").then(m => m.CartNavLink));
const HomePersonalSpaceNavEntry = dynamic(() => import("./home-personal-space").then(m => m.HomePersonalSpaceNavEntry));
const HeaderCreditProfile = dynamic(() => import("./header-credit-profile").then(m => m.HeaderCreditProfile));

export function SiteNavigation(props: SiteNavigationProps) {
  return <SiteNavigationCore
    {...props}
    CartNavLink={CartNavLink}
    HomePersonalSpaceNavEntry={HomePersonalSpaceNavEntry}
    HeaderCreditProfile={HeaderCreditProfile}
  />;
}
