// PDF coordinates are points. PNG pixels retain the approved master's orientation.
export const DOCUMENT_TEMPLATE = Object.freeze({
  page: Object.freeze({ width: 595.28, height: 841.89, margin: 68, contentWidth: 459.28 }),
  typography: Object.freeze({ bodySize: 10.5, detailSize: 9.5, titleSize: 14, ink: '0.28 0.28 0.28', muted: '0.43 0.46 0.48', heading: '0.29 0.38 0.43' }),
  signature: Object.freeze({ path: 'assets/documents/andrii-signature-left-90.png', width: 170.0787, height: 66.97975, offsetX: 5.66929, gap: 4.78, lineWidth: 221.1, pixelsWide: 1229, pixelsHigh: 484 }),
})
