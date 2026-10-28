// Isolated UI-only acceptance fixture guard. NEVER authorizes /admin routes,
// never touches owner cookies or provider credentials, and is disabled on Vercel.
// Its sole allowed origin is the loopback port owned by the Playwright script.
export function phoneYoutubeQaAllowed(env=process.env,host=''){
 return env.CI==='true' &&
   env.HH_APP_TEST_RUNTIME==='isolated' &&
   !env.VERCEL &&
   host==='127.0.0.1:3157'
}
