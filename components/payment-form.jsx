'use client'

import { useActionState } from 'react'

export function PaymentForm({ action, payment, patientName, dateOfService, paymentStatus = 'unpaid' }) {
  const [state, formAction, pending] = useActionState(action, {})
  return <form action={formAction} className="prescription-admin-form payment-form">
    <fieldset><legend>Payment document</legend>
      <label>Client name<input name="patientName" defaultValue={payment?.patientName ?? patientName} required maxLength={200} /></label>
      <label>Date of service<input name="dateOfService" type="date" defaultValue={payment?.dateOfService ?? dateOfService ?? new Date().toISOString().slice(0, 10)} required /></label>
      <label>Date issued<input name="dateIssued" type="date" defaultValue={payment?.dateIssued ?? new Date().toISOString().slice(0, 10)} required /></label>
      <label>Amount<input name="amount" type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" defaultValue={payment ? (payment.amount / 100).toFixed(2) : undefined} placeholder="150.00" required /></label>
      <label>Currency<select name="currency" defaultValue={payment?.currency ?? 'CAD'}><option>CAD</option><option>USD</option><option>EUR</option><option>UAH</option></select></label>
      <label>Service<textarea name="service" defaultValue={payment?.service} required maxLength={1000} /></label>
      <label>Number of consultations (optional)<input name="consultations" type="number" min="1" step="1" defaultValue={payment?.consultations} /></label>
      <label>Receipt / invoice number (optional)<input name="documentNumber" defaultValue={payment?.documentNumber} maxLength={80} /></label>
      <label>Payment status<select name="paymentStatus" defaultValue={payment?.paymentStatus ?? paymentStatus}><option value="unpaid">Not received — Invoice</option><option value="received">Received — Receipt</option></select></label>
    </fieldset>
    {state?.error && <p role="alert">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save payment document'}</button>
  </form>
}
