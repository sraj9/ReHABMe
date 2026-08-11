import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { format, parseISO, subMonths, isSameMonth } from 'date-fns'
import {
  IndianRupee, TrendingUp, TrendingDown, Wallet, Plus, Trash2, Receipt, LayoutGrid, Ban,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import RecordPaymentModal from '../../components/RecordPaymentModal'
import AccountsChart, { type MonthlyMoney } from './AccountsChart'
import { usePaymentsContext } from '../../context/PaymentsContext'
import { useExpensesContext } from '../../context/ExpensesContext'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { invoiceBalance, effectivePayments } from '../../lib/ledger'
import { formatCurrency } from '../../lib/format'
import type { Expense, ExpenseCategory, Invoice, Payment, PaymentMethod } from '../../lib/types'

const PAGE_SIZE = 10

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank', other: 'Other',
}

const categoryLabels: Record<ExpenseCategory, string> = {
  rent: 'Rent', salaries: 'Salaries', equipment: 'Equipment', supplies: 'Supplies',
  utilities: 'Utilities', maintenance: 'Maintenance', other: 'Other',
}

const fieldClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent'
const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

type AccountsTab = 'overview' | 'payments' | 'expenses'

export default function Accounts() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<AccountsTab>('overview')

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />
  if (!profile) return <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>

  const tabs: { key: AccountsTab; label: string; icon: typeof Wallet }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'payments', label: 'Payments', icon: IndianRupee },
    { key: 'expenses', label: 'Expenses', icon: Receipt },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-[#3d9cd6] text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
    </div>
  )
}

// ============================================================
// OVERVIEW
// ============================================================
function OverviewTab() {
  const { payments } = usePaymentsContext()
  const { expenses } = useExpensesContext()
  const { invoices } = useInvoicesContext()

  const now = new Date()
  const counted = effectivePayments(payments)
  const collectedThisMonth = counted
    .filter(p => isSameMonth(parseISO(p.paid_at), now))
    .reduce((sum, p) => sum + p.amount, 0)
  const spentThisMonth = expenses
    .filter(e => isSameMonth(parseISO(e.expense_date), now))
    .reduce((sum, e) => sum + e.amount, 0)
  const outstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'draft')
    .reduce((sum, i) => sum + invoiceBalance(i, payments), 0)
  const net = collectedThisMonth - spentThisMonth

  const months: MonthlyMoney[] = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    return {
      label: format(month, 'MMM'),
      collections: counted
        .filter(p => isSameMonth(parseISO(p.paid_at), month))
        .reduce((sum, p) => sum + p.amount, 0),
      expenses: expenses
        .filter(e => isSameMonth(parseISO(e.expense_date), month))
        .reduce((sum, e) => sum + e.amount, 0),
    }
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Collected This Month"
          value={formatCurrency(collectedThisMonth)}
          subtitle={`${counted.filter(p => isSameMonth(parseISO(p.paid_at), now)).length} payments`}
          icon={<IndianRupee size={24} />}
          color="green"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(outstanding)}
          subtitle="Across unpaid invoices"
          icon={<Wallet size={24} />}
          color="amber"
        />
        <StatCard
          title="Expenses This Month"
          value={formatCurrency(spentThisMonth)}
          subtitle={`${expenses.filter(e => isSameMonth(parseISO(e.expense_date), now)).length} entries`}
          icon={<TrendingDown size={24} />}
          color="red"
        />
        <StatCard
          title="Net This Month"
          value={`${net < 0 ? '−' : ''}${formatCurrency(Math.abs(net))}`}
          subtitle="Collections minus expenses"
          icon={<TrendingUp size={24} />}
          color={net >= 0 ? 'primary' : 'red'}
        />
      </div>

      <AccountsChart months={months} />
    </div>
  )
}

// ============================================================
// PAYMENTS REGISTER
// ============================================================
function PaymentsTab() {
  const { payments, loading, updatePayment } = usePaymentsContext()
  const { invoices, updateInvoice } = useInvoicesContext()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [showPicker, setShowPicker] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null)

  const confirmVoid = async () => {
    if (!voidTarget) return
    const result = await updatePayment({
      ...voidTarget,
      voided: true,
      voided_at: new Date().toISOString(),
    })
    const target = voidTarget
    setVoidTarget(null)
    if (!result) {
      toast.error('Could not mark the payment as a wrong entry')
      return
    }

    // A paid invoice may no longer be settled once this payment stops counting
    const invoice = invoices.find(i => i.id === target.invoice_id)
    if (invoice && invoice.status === 'paid') {
      const remaining = invoiceBalance(
        invoice,
        payments.map(p => (p.id === target.id ? { ...p, voided: true } : p))
      )
      if (remaining > 0) {
        await updateInvoice({ ...invoice, status: 'sent', paid_date: null, updated_at: new Date().toISOString() })
      }
    }
    toast.success(`${formatCurrency(target.amount)} marked as wrong entry — removed from totals`)
  }

  const pageCount = Math.max(1, Math.ceil(payments.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = payments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openInvoices = invoices.filter(i => i.status !== 'paid' && invoiceBalance(i, payments) > 0)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => setShowPicker(true)}>
          Record Payment
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Patient', 'Invoice', 'Method', 'Received By', 'Amount', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Loading payments…' : 'No payments recorded yet'}
                  </td>
                </tr>
              ) : (
                paged.map(payment => (
                  <tr key={payment.id} className={payment.voided ? 'opacity-60' : ''}>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{format(parseISO(payment.paid_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{payment.patient?.full_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-[#3d9cd6]">{payment.invoice?.invoice_number ?? '—'}</td>
                    <td className="px-5 py-3.5"><Badge variant="default">{methodLabels[payment.method]}</Badge></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{payment.receiver?.full_name ?? '—'}</td>
                    <td className={`px-5 py-3.5 text-sm font-semibold text-gray-900 text-right ${payment.voided ? 'line-through' : ''}`}>{formatCurrency(payment.amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {payment.voided ? (
                        <Badge variant="danger" size="sm">wrong entry</Badge>
                      ) : (
                        <button
                          onClick={() => setVoidTarget(payment)}
                          aria-label="Mark as wrong entry"
                          title="Mark as wrong entry"
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                        >
                          <Ban size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={payments.length} onPageChange={setPage} label="payments" />
      </Card>

      {/* Pick an open invoice, then record against it */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Select Invoice</h2>
              <button onClick={() => setShowPicker(false)} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {openInvoices.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-gray-500">No invoices with an outstanding balance</p>
              ) : (
                openInvoices.map(invoice => (
                  <button
                    key={invoice.id}
                    onClick={() => { setShowPicker(false); setPaymentTarget(invoice) }}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#3d9cd6]">{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-500">{invoice.patient?.full_name}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoiceBalance(invoice, payments))} due</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {paymentTarget && (
        <RecordPaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(null)} />
      )}

      <ConfirmDialog
        open={!!voidTarget}
        title="Mark as wrong entry?"
        message={`${voidTarget ? formatCurrency(voidTarget.amount) : ''} (${voidTarget?.patient?.full_name ?? ''}, ${voidTarget?.invoice?.invoice_number ?? ''}) will stay on record but no longer count toward any totals. The invoice's balance reopens if needed.`}
        confirmLabel="Mark wrong entry"
        onConfirm={confirmVoid}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  )
}

// ============================================================
// EXPENSES BOOK
// ============================================================
function ExpensesTab() {
  const { expenses, loading, addExpense, deleteExpense } = useExpensesContext()
  const { profile } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const pageCount = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = expenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await deleteExpense(deleteTarget.id)
    setDeleteTarget(null)
    if (ok) {
      toast.success('Expense deleted')
    } else {
      toast.error('Could not delete the expense')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          Add Expense
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date', 'Category', 'Description', 'Recorded By', 'Amount', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Loading expenses…' : 'No expenses recorded yet'}
                  </td>
                </tr>
              ) : (
                paged.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{format(parseISO(expense.expense_date), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5"><Badge variant="default">{categoryLabels[expense.category]}</Badge></td>
                    <td className="px-5 py-3.5 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{expense.recorder?.full_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDeleteTarget(expense)}
                        aria-label="Delete expense"
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={expenses.length} onPageChange={setPage} label="expenses" />
      </Card>

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onAdd={async expense => {
            const result = await addExpense({ ...expense, recorded_by: profile?.id, recorder: profile ?? undefined })
            if (result) {
              toast.success('Expense recorded')
            } else {
              toast.error('Could not record the expense')
            }
            return !!result
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense?"
        message={`This will permanently delete "${deleteTarget?.description ?? ''}" (${deleteTarget ? formatCurrency(deleteTarget.amount) : ''}).`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function AddExpenseModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (expense: Expense) => Promise<boolean>
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ category: 'supplies' as ExpenseCategory, description: '', amount: '', expense_date: today })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const value = Math.round(parseFloat(form.amount) * 100) / 100
    if (!form.description.trim()) {
      setError('Description is required')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    const now = new Date().toISOString()
    const ok = await onAdd({
      id: `exp-${Date.now()}`,
      category: form.category,
      description: form.description.trim(),
      amount: value,
      expense_date: form.expense_date || today,
      created_at: now,
      updated_at: now,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="expense-description" className={labelClass}>Description *</label>
            <input id="expense-description" className={fieldClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Ultrasound gel restock" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-category" className={labelClass}>Category</label>
              <select id="expense-category" className={fieldClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-amount" className={labelClass}>Amount (₹) *</label>
              <input id="expense-amount" type="number" min="0" step="0.01" className={fieldClass} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="expense-date" className={labelClass}>Date</label>
            <input id="expense-date" type="date" className={fieldClass} value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Add Expense</Button>
        </div>
      </div>
    </div>
  )
}
