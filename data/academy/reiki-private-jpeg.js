// Small dependency-free inspection for student initiation photos.
// Browser canvas re-encodes images without GPS, but clients can bypass browsers.
// Reject embedded EXIF/IPTC/comments before ever saving to private storage.
export function reikiPrivateJpegValid(bytes) {
  if (!bytes || bytes.length < 128 || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return false
  let i = 2, frame = false, scan = false
  while (i + 3 < bytes.length) {
    if (bytes[i++] !== 0xff) return false
    while (bytes[i] === 0xff && i < bytes.length - 2) i++
    const marker = bytes[i++]
    if (marker === 0xda) {
      scan = true
      break
    }
    // APP1 (EXIF/GPS), APP13 (IPTC), comments and unsupported markers.
    // Canvas JPEGs commonly carry APP0 JFIF and optionally APP2 ICC.
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe ||
        marker === 0x00 || marker === 0xd8 || marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)) return false
    const size = (bytes[i] << 8) | bytes[i + 1]
    if (size < 2 || i + size > bytes.length - 2) return false
    if ([0xc0,0xc1,0xc2].includes(marker)) {
      if (frame || size < 11) return false
      const h = (bytes[i + 3] << 8) | bytes[i + 4]
      const w = (bytes[i + 5] << 8) | bytes[i + 6]
      if (h < 100 || w < 100 || h > 1600 || w > 1600) return false
      frame = true
    }
    i += size
  }
  return frame && scan
}
