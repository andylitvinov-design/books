// Feature remains OFF until RLS migration, three-locale E2E, browser session
// verification and no-cost production release have passed.
export function publicEnquiryGuestChatReady(env=process.env){
  return env.HH_PUBLIC_GUEST_CHAT_ENABLED==='true'&&
    (env.VERCEL_ENV!=='production'||env.HH_PUBLIC_GUEST_CHAT_PRODUCTION_APPROVED==='true')
}
