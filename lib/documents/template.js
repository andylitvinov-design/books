// PDF coordinates are points. PNG pixels retain the approved master's orientation.
export const DOCUMENT_TEMPLATE = Object.freeze({
  page: Object.freeze({ width: 595.28, height: 841.89, margin: 68, contentWidth: 459.28 }),
  typography: Object.freeze({ bodySize: 10.9, detailSize: 10.2, titleSize: 15.5, ink: '0.16 0.22 0.27', muted: '0.35 0.41 0.45', heading: '0.12 0.29 0.38' }),
  signature: Object.freeze({ path: 'assets/documents/andrii-signature-left-90.png', width: 170.0787, height: 66.97975, offsetX: 5.66929, gap: 4.78, lineWidth: 221.1, pixelsWide: 1229, pixelsHigh: 484 }),
})
