import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { FaFileDownload, FaUndo } from 'react-icons/fa'
import AdminLayout from './AdminLayout'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { GetPayments, RefundPayment } from '../../Services/operations/Admin'
import { downloadCsv } from '../../utils/csvExport'
import { swalDark } from '../../utils/accountShared'

const statusChip = {
  paid: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  created: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  failed: 'bg-pink-700/30 text-pink-100 border-pink-700',
  refunded: 'bg-richblack-700 text-richblack-200 border-richblack-600',
}

const PAYMENT_CSV_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'plan', label: 'Plan' },
  { key: 'amount', label: 'Amount (₹)' },
  { key: 'status', label: 'Status' },
  { key: 'orderId', label: 'Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'refundAmount', label: 'Refund Amount (₹)' },
  { key: 'refundedAt', label: 'Refunded At' },
]

const Payments = () => {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dispatch = useDispatch()
  const { token, user: me } = useSelector((state) => state.auth)
  const { payments, loading } = useSelector((state) => state.admin)
  const [refundingId, setRefundingId] = useState(null)
  const isAdmin = me?.role === 'Admin'

  useEffect(() => {
    dispatch(GetPayments(token, page, status))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status])

  const stats = payments?.stats

  // real money movement sir — Admin-only (enforced server-side too), two-step confirm since this
  // isn't reversible from here. Reason is optional context for the audit log; amount left blank
  // means a full refund, matching Razorpay's own semantics.
  const handleRefund = async (payment) => {
    const fullRupees = payment.amount / 100
    const { value: formValues } = await Swal.fire({
      ...swalDark,
      title: `Refund ${payment.user?.email}?`,
      html: `Original payment: <strong>₹${fullRupees}</strong> (${payment.plan})`,
      icon: 'warning',
      input: 'text',
      inputLabel: `Refund amount in ₹ (leave blank for full ₹${fullRupees})`,
      inputPlaceholder: `${fullRupees}`,
      showCancelButton: true,
      confirmButtonText: 'Continue',
      confirmButtonColor: '#C1443C',
      preConfirm: (amountInput) => {
        if (amountInput && (isNaN(amountInput) || Number(amountInput) <= 0 || Number(amountInput) > fullRupees)) {
          Swal.showValidationMessage(`Enter a number between 0 and ₹${fullRupees}, or leave it blank`)
          return false
        }
        return amountInput
      },
    })
    if (formValues === undefined) return

    const { value: reason } = await Swal.fire({
      ...swalDark,
      title: 'Reason for this refund (optional)',
      input: 'textarea',
      inputPlaceholder: 'e.g. accidental duplicate charge, customer requested cancellation...',
      showCancelButton: true,
      confirmButtonText: 'Confirm refund',
      confirmButtonColor: '#C1443C',
    })
    if (reason === undefined) return

    const amountPaise = formValues ? Math.round(Number(formValues) * 100) : undefined
    const setBusy = (isBusy) => setRefundingId(isBusy ? payment._id : null)
    await dispatch(RefundPayment(payment._id, amountPaise, reason, token, page, status, setBusy))
  }

  // exports the currently-loaded page/filter sir — client-side from data already fetched
  const handleExportCsv = () => {
    const rows = (payments?.payments || []).map((payment) => ({
      name: `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim(),
      email: payment.user?.email || '',
      plan: payment.plan,
      amount: payment.amount / 100,
      status: payment.status,
      orderId: payment.orderId,
      date: new Date(payment.createdAt).toLocaleString(),
      refundAmount: payment.refundAmount ? payment.refundAmount / 100 : '',
      refundedAt: payment.refundedAt ? new Date(payment.refundedAt).toLocaleString() : '',
    }))
    downloadCsv(`payments-page-${page}.csv`, rows, PAYMENT_CSV_COLUMNS)
  }

  return (
    <AdminLayout title="Payments">
      <Helmet>
        <title>Admin — Payments | Resumify</title>
      </Helmet>

      <PageTransition className="max-w-7xl mx-auto px-6 py-8">

        {/* Money stat cards sir */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <p className="text-xs text-richblack-300 mb-2">MRR (last 30 days)</p>
              <p className="font-display text-2xl text-caribgreen-100">₹{stats.mrrRupees}</p>
            </div>
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <p className="text-xs text-richblack-300 mb-2">Paid Orders</p>
              <p className="font-display text-2xl text-richblack-5">{stats.byStatus?.paid?.count || 0}</p>
            </div>
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <p className="text-xs text-richblack-300 mb-2">Failure Rate</p>
              <p className={`font-display text-2xl ${stats.failureRate > 10 ? 'text-pink-200' : 'text-richblack-5'}`}>{stats.failureRate}%</p>
            </div>
            <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
              <p className="text-xs text-richblack-300 mb-2">Revenue by Plan</p>
              <div className="space-y-1">
                {(stats.byPlan || []).map((p) => (
                  <p key={p.plan} className="text-xs text-richblack-100 font-mono">{p.plan}: ₹{p.amountRupees} ({p.orders})</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status filter sir */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {['', 'paid', 'created', 'failed', 'refunded'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-4 py-2 text-xs font-bold rounded-full border transition-all duration-200 cursor-pointer ${
                status === s
                  ? 'bg-yellow-50 text-richblack-900 border-yellow-50'
                  : 'text-richblack-200 border-richblack-600 hover:text-richblack-5'
              }`}
            >
              {s === '' ? 'All' : s.toUpperCase()}
            </button>
          ))}
          <button
            onClick={handleExportCsv}
            disabled={(payments?.payments || []).length === 0}
            title="Export this page as CSV"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-richblack-100 border border-richblack-600 rounded-full hover:bg-richblack-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer ml-auto"
          >
            <FaFileDownload /> Export CSV
          </button>
        </div>

        {loading && (payments?.payments || []).length === 0 ? (
          <Loading text="Loading the payments..." />
        ) : (
          <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
            {/* Mobile card list sir — same data as the table below, one card per payment,
                shown below lg so nobody has to horizontally scroll a table on a phone */}
            <div className="lg:hidden space-y-3">
              {(payments?.payments || []).map((payment) => (
                <div key={payment._id} className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-richblack-5 truncate">{payment.user?.firstName} {payment.user?.lastName}</p>
                      <p className="text-xs text-richblack-400 truncate">{payment.user?.email}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusChip[payment.status] || statusChip.created}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-richblack-100">{payment.plan}</span>
                    <span className="font-mono text-richblack-5">₹{payment.amount / 100}</span>
                  </div>
                  <p className="font-mono text-xs text-richblack-300 mt-2 truncate">{payment.orderId}</p>
                  <p className="text-xs text-richblack-300 mt-1">{new Date(payment.createdAt).toLocaleString()}</p>
                  {isAdmin && payment.status === 'paid' && (
                    <button
                      onClick={() => handleRefund(payment)}
                      disabled={refundingId === payment._id}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-100 border border-pink-700 rounded-full hover:bg-pink-700/20 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
                    >
                      <FaUndo className="text-[10px]" /> {refundingId === payment._id ? 'Refunding...' : 'Refund'}
                    </button>
                  )}
                  {payment.status === 'refunded' && (
                    <p className="text-xs text-richblack-400 mt-2">
                      Refunded ₹{(payment.refundAmount / 100)?.toFixed(0)} on {new Date(payment.refundedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
              {(payments?.payments || []).length === 0 && (
                <p className="text-sm text-richblack-300 py-10 text-center">No payments found for this filter sir.</p>
              )}
            </div>

            <div className="hidden lg:block rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                    <th className="p-4">User</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Date</th>
                    {isAdmin && <th className="p-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-richblack-700">
                  {(payments?.payments || []).map((payment) => (
                    <tr key={payment._id}>
                      <td className="p-4">
                        <p className="font-medium text-richblack-5">{payment.user?.firstName} {payment.user?.lastName}</p>
                        <p className="text-xs text-richblack-400">{payment.user?.email}</p>
                      </td>
                      <td className="p-4 text-richblack-100">{payment.plan}</td>
                      <td className="p-4 font-mono text-richblack-5">₹{payment.amount / 100}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusChip[payment.status] || statusChip.created}`}>
                          {payment.status}
                        </span>
                        {payment.status === 'refunded' && (
                          <p className="text-[10px] text-richblack-400 mt-1">₹{(payment.refundAmount / 100)?.toFixed(0)} back</p>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-richblack-300">{payment.orderId}</td>
                      <td className="p-4 text-xs text-richblack-300">{new Date(payment.createdAt).toLocaleString()}</td>
                      {isAdmin && (
                        <td className="p-4">
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => handleRefund(payment)}
                              disabled={refundingId === payment._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-100 border border-pink-700 rounded-full hover:bg-pink-700/20 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
                            >
                              <FaUndo className="text-[10px]" /> {refundingId === payment._id ? 'Refunding...' : 'Refund'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(payments?.payments || []).length === 0 && (
                <p className="text-sm text-richblack-300 py-10 text-center">No payments found for this filter sir.</p>
              )}
            </div>
          </div>
        )}

        {/* Pagination sir */}
        {payments?.pagination && payments.pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-richblack-300 font-mono">{page} / {payments.pagination.pages}</span>
            <button
              disabled={page >= payments.pagination.pages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </PageTransition>
    </AdminLayout>
  )
}

export default Payments
