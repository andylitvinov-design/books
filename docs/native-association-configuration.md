# Native link association status

`public/.well-known/apple-app-site-association` and
`public/.well-known/assetlinks.json` are deliberately valid empty association
documents. They establish URL locations without asserting an Apple Team ID or
Android certificate fingerprint that has not been approved.

The native projects declare the public library host and the `psialchemy` custom
scheme for public remedy routing. iOS forwards custom-scheme and Universal Link
events to Capacitor; Android declares public `/ru` and `/en` remedy paths with
`autoVerify=false`. They do **not** enable private prescription links. Before a
real production association can be verified, the project owner must provide the
final iOS Team ID, production bundle ID, Android signing certificate SHA-256 and
approved final domain. Then replace the empty documents, add the iOS associated
domains entitlement, enable verified app links, deploy them at the final domain
and test on devices.

Simulator builds need no Apple signing identity. A Play-store release later
requires a separate Android upload/release signing key; this change creates no
store artifact or submission.
