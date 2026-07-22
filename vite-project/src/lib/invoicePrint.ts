import { format, parseISO } from 'date-fns'
import { formatCurrency } from './format'
import type { Invoice } from './types'

function esc(value: string | undefined | null): string {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function fmtDate(date: string): string {
  return format(parseISO(date), 'MMMM d, yyyy')
}

/**
 * Opens a printable invoice in a new window and triggers the browser's print
 * dialog — the user can print or "Save as PDF". Returns false if the pop-up
 * was blocked.
 */
export function printInvoice(invoice: Invoice): boolean {
  const win = window.open('', '_blank', 'width=800,height=920')
  if (!win) return false

  const patient = invoice.patient
  const itemRows = invoice.items.map(item => `
    <tr>
      <td>${esc(item.description)}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatCurrency(item.unit_price, { minimumFractionDigits: 2 })}</td>
      <td class="num">${formatCurrency(item.quantity * item.unit_price, { minimumFractionDigits: 2 })}</td>
    </tr>`).join('')

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(invoice.invoice_number)} — ReHABMe</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; color: #1a2332; padding: 40px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3d9cd6; padding-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { height: 44px; }
  .brand h1 { font-size: 20px; color: #3d9cd6; }
  .brand p { font-size: 11px; color: #6b7280; }
  .inv-meta { text-align: right; }
  .inv-meta h2 { font-size: 22px; letter-spacing: 1px; color: #1a2332; }
  .inv-meta .num-badge { font-size: 13px; color: #3d9cd6; font-weight: 600; margin-top: 2px; }
  .status { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .status.paid { background: #dcfce7; color: #15803d; }
  .status.overdue { background: #fee2e2; color: #b91c1c; }
  .status.sent { background: #dbeafe; color: #1d4ed8; }
  .status.draft { background: #f3f4f6; color: #4b5563; }
  .cols { display: flex; justify-content: space-between; margin: 24px 0; gap: 24px; }
  .cols h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
  .cols p { line-height: 1.5; }
  .cols .right { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; padding: 8px 10px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; }
  th.num, td.num { text-align: right; }
  .totals { margin-top: 14px; margin-left: auto; width: 260px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 10px; }
  .totals .grand { border-top: 2px solid #1a2332; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; }
  .notes { margin-top: 28px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #4b5563; }
  .foot { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">
      <img src="${window.location.origin}/logo.svg" alt="" onerror="this.style.display='none'">
      <div>
        <h1>ReHABMe</h1>
        <p>Rehabilitation &amp; Physiotherapy Center</p>
      </div>
    </div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <p class="num-badge">${esc(invoice.invoice_number)}</p>
      <span class="status ${esc(invoice.status)}">${esc(invoice.status)}</span>
    </div>
  </div>

  <div class="cols">
    <div>
      <h3>Billed To</h3>
      <p><strong>${esc(patient?.full_name ?? 'Patient')}</strong></p>
      ${patient?.phone ? `<p>${esc(patient.phone)}</p>` : ''}
      ${patient?.email ? `<p>${esc(patient.email)}</p>` : ''}
      ${patient?.address ? `<p>${esc(patient.address)}, ${esc(patient.city)}, ${esc(patient.state)} ${esc(patient.zip)}</p>` : ''}
    </div>
    <div class="right">
      <h3>Details</h3>
      <p>Issued: <strong>${fmtDate(invoice.issue_date)}</strong></p>
      <p>Due: <strong>${fmtDate(invoice.due_date)}</strong></p>
      ${invoice.paid_date ? `<p>Paid: <strong>${fmtDate(invoice.paid_date)}</strong></p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal, { minimumFractionDigits: 2 })}</span></div>
    ${invoice.tax_amount > 0 ? `<div class="row"><span>Tax (${invoice.tax_rate}%)</span><span>${formatCurrency(invoice.tax_amount, { minimumFractionDigits: 2 })}</span></div>` : ''}
    ${invoice.discount_amount > 0 ? `<div class="row"><span>Discount</span><span>−${formatCurrency(invoice.discount_amount, { minimumFractionDigits: 2 })}</span></div>` : ''}
    <div class="row grand"><span>Total</span><span>${formatCurrency(invoice.total_amount, { minimumFractionDigits: 2 })}</span></div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(invoice.notes)}</div>` : ''}

  <div class="foot">Thank you for choosing ReHABMe Rehabilitation &amp; Physiotherapy Center</div>

  <script>window.onload = function () { window.print() }</script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
  win.focus()
  return true
}
