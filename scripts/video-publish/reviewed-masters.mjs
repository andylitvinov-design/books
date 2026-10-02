// Reviewed 2026-10-02. Canonical six-master record:
// https://github.com/andylitvinov-design/ai-projects-brain/issues/219#issuecomment-5936677214
export const REVIEWED_MASTERS = Object.freeze([
  ['en', 'home', 'ed202847a43a96b918308aa972177b34', '1yMXi-sT3acnvpe5vnErLebN8kvyI7Uq_', '20bedc1e36eac341c745fd1231b496e01c8c3478a39682299223eb15b0e30f6c'],
  ['en', 'services', '48105a2f2228e7cb3a67391e97acaf8b', '14NH72zJuXXOQCFbiykAo8wW1oayYvydV', 'dce001d7f061d4994802452da22913cdad7288747311563fdd2504282ac18c6a'],
  ['en', 'homeopathy', '34df311e461509433b45929908a9097a', '1XMPLm8q-o4tNY6ZbS5SE5GEa01tl2n3g', '375b00026a47ea113b32c7ee1feacf88032cbe3c5d17a1705bd043fb252ffde4'],
  ['ru', 'home', '388a04b39ebf215ae656bcd22d0d0847', '1NTKQtYMMjs4KZB4zPzXoCKEOK3CyWagc', 'fe6722f005e67b875e091936a5d4a419f6552e900aa578dde23a0e63148d6394'],
  ['ru', 'services', '79c2845577865979cd95ac40a08fc01a', '13nHZDib2mYI2QsQdx8rGb32l0drG3Bew', 'fa8466a2ad5a91d13c83283146fe03e91e74e4b75e5efb27b763f70db7d81c89'],
  ['ru', 'homeopathy', '0f984780d06948b1e78166e6e553e4e9', '1MKaFg_oXf_OBGYh8BxEsYBrjLyCiUVwl', '3e400c332eabaa42c5c7a80c7cc2395f01e0b2e438cad08a8047dd6693668f92'],
].map(([locale, page, heygenId, fileId, sha256]) => Object.freeze({ locale, page, heygenId, fileId, sha256 })))

export function reviewedMaster(fileId, locale) {
  const master = REVIEWED_MASTERS.find((entry) => entry.fileId === fileId)
  if (!master) throw new Error('Drive source is not a reviewed master')
  if (master.locale !== locale) throw new Error('Job locale does not match reviewed master')
  return master
}
