import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import { GetPayments } from '../../Services/operations/Admin'

const statusChip = {
  paid: 'bg-caribgreen-700/30 text-caribgreen-25 border-caribgreen-700',
  created: 'bg-yellow-700/30 text-yellow-25 border-yellow-700',
  failed: 'bg-pink-700/30 text-pink-100 border-pink-700',
}

const Payments = () => {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { payments, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(GetPayments(token, page, status))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status])

  const stats = payments?.stats

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Payments | ResumeEnhancer</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn">

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
        <div className="flex gap-2 mb-6">
          {['', 'paid', 'created', 'failed'].map((s) => (
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
        </div>

        {loading ? (
          <Loading text="Loading the payments..." />
        ) : (
          <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                  <th className="p-4">User</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Date</th>
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
                    </td>
                    <td className="p-4 font-mono text-xs text-richblack-300">{payment.orderId}</td>
                    <td className="p-4 text-xs text-richblack-300">{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(payments?.payments || []).length === 0 && (
              <p className="text-sm text-richblack-300 py-10 text-center">No payments found for this filter sir.</p>
            )}
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
      </div>
    </div>
  )
}

export default Payments
