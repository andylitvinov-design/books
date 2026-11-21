'use client';
import { useCallback, useEffect, useState } from 'react';

const BUTTON = { border: '1px solid #8bbdb6', borderRadius: 10, background: '#e9f6f3',
  color: '#194f49', fontWeight: 650, padding: '8px 12px', minHeight: 42 };
export function LivePhotoPaymentsAdmin() {
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState('loading');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState({});
  const [busy, setBusy] = useState(null);
  const reload = useCallback(async () => {
    const response = await fetch('/api/admin/videos/live-photo-orders', {
      credentials: 'same-origin', cache: 'no-store',
    });
    if (!response.ok) throw Error('ADMIN_REVIEW_UNAVAILABLE');
    const data = await response.json();
    setItems(data.orders || []);
    setEnabled(data.reviewEnabled === true);
    setState('ready');
  }, []);
  useEffect(() => { void reload().catch(() => setState('error')); }, [reload]);
  async function verify(order) {
    const fields = editing[order.id] || {};
    if (!enabled || busy || !fields.confirmed || !fields.reference) return;
    setBusy(order.id); setNotice('');
    try {
      const res = await fetch('/api/admin/videos/live-photo-orders', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id, receiptReference: fields.reference.trim(),
          amountMinor: 250, confirmed: true,
        }),
      });
      if (!res.ok) throw Error('RECEIPT_REVIEW_FAILED');
      setEditing(previous => ({ ...previous, [order.id]: { reference: '', confirmed: false } }));
      await reload();
      setNotice('Платёж подтверждён. Клиент может использовать одну оплаченную генерацию.');
    } catch { setNotice('Не удалось подтвердить: проверьте реальный платёж, сумму и уникальность квитанции.'); }
    finally { setBusy(null); }
  }
  return <section data-admin-live-photo-payments aria-label="Paid Live Photos"
    style={{ margin: '20px 0', padding: 16, background: '#f7fbfa', border: '1px solid #cadfdc', borderRadius: 15 }}>
    <h2 style={{ margin: '0 0 7px' }}>HeyGen · Живые фото · Оплаченные генерации</h2>
    <p style={{ fontSize: 14 }}>
      Один бесплатный AI-ролик на аккаунт. Последующие — €2,50 (EUR).
      Здесь подтверждаются только действительно полученные платежи PayPal.
      Платёж не создаётся нажатием этой кнопки.
    </p>
    {state === 'loading' ? <p>Загружаем заказы…</p> : null}
    {state === 'error' ? <button type="button" style={BUTTON} onClick={() => void reload()}>Повторить</button> : null}
    {!enabled ? <p>Проверка оплаченных заказов выключена до утверждения платёжного канала.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {state === 'ready' && !items.length ? <p>Заказов пока нет.</p> : null}
    {items.map(order => {
      const fields = editing[order.id] || {};
      return <article key={order.id} style={{ marginTop: 11, padding: 12,
        borderRadius: 10, background: 'white', border: '1px solid #dce7e5', overflowWrap: 'anywhere' }}>
        <strong>{order.status === 'requested' ? 'Ожидает оплаты' :
          order.status === 'verified' ? 'Оплата подтверждена' : 'Генерация оплачена и использована'}</strong>
        <p style={{ margin: '6px 0', fontSize: 13 }}>Заказ: <code>{order.id}</code></p>
        <p style={{ margin: '6px 0', fontSize: 13 }}>Аккаунт: <code>{order.accountId}</code></p>
        <p style={{ margin: '6px 0', fontSize: 13 }}>Сумма: €{(order.priceMinor / 100).toFixed(2)} · {order.paymentMethod}</p>
        {enabled && order.status === 'requested' ? <div style={{ display: 'grid', gap: 9, maxWidth: 460 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Проверенный ID платежа PayPal
            <input type="text" maxLength={120} autoComplete="off"
              value={fields.reference || ''}
              onChange={e => setEditing(old => ({ ...old,
                [order.id]: { ...old[order.id], reference: e.target.value } }))}
              style={{ minHeight: 40, borderRadius: 8, padding: 8 }}/>
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={fields.confirmed === true}
              onChange={e => setEditing(old => ({ ...old,
                [order.id]: { ...old[order.id], confirmed: e.target.checked } }))}/>
            {' '}Подтверждаю, что независимо проверил получение €2,50 по этому заказу в PayPal.
          </label>
          <button type="button" style={BUTTON}
            disabled={Boolean(busy) || !fields.confirmed || !fields.reference?.trim()}
            onClick={() => void verify(order)}>Подтвердить оплату</button>
        </div> : null}
      </article>;
    })}
  </section>;
}
