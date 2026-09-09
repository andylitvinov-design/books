'use client'

export function PrescriptionOwnerActions({ clientPath, pdfPath, editPath, revokeAction }) {
  const copyClientLink = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(new URL(clientPath, window.location.origin).toString())
  }

  return (
    <section className="prescription-owner-actions" aria-label="Prescription delivery actions">
      <div>
        <p>Client link ready</p>
        <h2>Share the prescription</h2>
      </div>
      <div className="prescription-owner-action-grid">
        <button type="button" onClick={copyClientLink}>Copy client link</button>
        <a href={clientPath} target="_blank" rel="noreferrer">Open client page</a>
        <a href={pdfPath}>Download PDF</a>
        <button type="button" onClick={() => window.open(`${clientPath}?print=1`, '_blank', 'noopener,noreferrer')}>Print</button>
        <a href={editPath}>Edit</a>
        <form action={revokeAction}><button type="submit">Revoke link</button></form>
      </div>
    </section>
  )
}
