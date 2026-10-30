'use client'
import { useCallback, useEffect, useState } from 'react'
import styles from './wallet-panel.module.css'

const cad = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })
  .format((Number(value) || 0) / 100)

export default function WalletReview() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [verified, setVerified] = useState({})
  const load = useCallback(async () => {
    try {
      const response = await fetch('/admin/api/wallet', { credentials: 'same-origin', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'REVIEW_UNAVAILABLE')
      setOrders(result.orders || [])
      setError('')
    } catch (error) { setError(error.message || 'REVIEW_UNAVAILABLE') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  async function review(order, action) {
    if (busy) return
    const proof = verified[order.id] || {}
    // The reviewer must retype the exact amount and reference from the seller's
    // transaction record, not merely click a button prefilled with buyer claims.
    if (action === 'approve' &&
        (String(proof.transactionId || '').trim().toUpperCase() !== order.reference ||
         String(proof.amount || '').trim() !== (order.amountMinor / 100).toFixed(2))) {
      setError('Verify the CAD amount and re-enter the transaction ID from your PayPal seller activity.')
      return
    }
    const message = action === 'approve'
      ? 'Confirm that you independently verified this exact CAD payment, receiving account and transaction ID in the PayPal statement?'
      : action === 'reverse'
        ? 'Confirm actual refund or chargeback in the provider statement before reversing wallet credit?'
        : 'Reject the unverified claim?'
    if (!window.confirm(message)) return
    setBusy(order.id)
    try {
      const response = await fetch('/admin/api/wallet', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topupId: order.id, action, revision: order.revision, confirmed: true,
          ...(action === 'approve' ? { amountMinor: Math.round(Number(proof.amount) * 100), currency: 'CAD',
            transactionId: String(proof.transactionId).trim() } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'REVIEW_FAILED')
      setVerified(prev => ({ ...prev, [order.id]: { amount: '', transactionId: '' } }))
      await load()
    } catch (error) { setError(error.message || 'REVIEW_FAILED') }
    finally { setBusy('') }
  }
  return <section className={styles.shell}>
    <h1>Wallet top-ups · independent payment verification</h1>
    <p>Only approve after checking a real PayPal Goods &amp; Services transaction in the seller dashboard, amount in CAD, recipient and reference. A buyer's claim or screenshot is not proof. Reversals require confirmed refund/chargeback.</p>
    <button type="button" className={styles.secondary} onClick={load} disabled={loading || Boolean(busy)}>Refresh orders</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loading && <p>Loading…</p>}
    {!loading && !orders.length && <p>No manual wallet payments to review.</p>}
    <div className={styles.orderList}>
      {orders.map(order => <article key={order.id} className={styles.order}>
        <div><strong>{cad(order.amountMinor)} · {order.status}</strong>
          <small>Order: {order.id} | Account: {order.accountId}</small>
          <small>PayPal transaction ID (buyer-reported): {order.reference || '—'}</small>
          <small>Created: {order.createdAt}</small>
        </div>
        <div className={styles.actions}>
          {order.status === 'reported' && <>
            <label className={styles.reviewField}>Actual CAD amount in seller activity
              <input inputMode="decimal" placeholder="40.00" autoComplete="off"
                value={verified[order.id]?.amount || ''}
                onChange={event => setVerified(prev => ({
                  ...prev, [order.id]: { ...prev[order.id], amount: event.target.value },
                }))}/>
            </label>
            <label className={styles.reviewField}>Re-enter provider transaction ID from PayPal activity
              <input placeholder="PayPal transaction reference" autoComplete="off"
                value={verified[order.id]?.transactionId || ''}
                onChange={event => setVerified(prev => ({
                  ...prev, [order.id]: { ...prev[order.id], transactionId: event.target.value },
                }))}/>
            </label>
            <button className={styles.primary} type="button" disabled={Boolean(busy)} onClick={() => review(order,'approve')}>Verify receipt &amp; credit</button>
            <button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => review(order,'reject')}>Reject</button>
          </>}
          {order.status === 'credited' &&
            <button className={styles.secondary} type="button" disabled={Boolean(busy)} onClick={() => review(order,'reverse')}>Reverse after refund</button>}
        </div>
      </article>)}
    </div>
  </section>
}
