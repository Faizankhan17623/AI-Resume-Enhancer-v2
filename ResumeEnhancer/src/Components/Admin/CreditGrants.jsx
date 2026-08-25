import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import { FaSearch, FaCoins, FaUserFriends } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { GetCreditGrants } from '../../Services/operations/Admin'

// one row of either section sir — admin grants and referral rewards render through the same
// row shell so the two sections read as one system, just with a different actor/detail line
const GrantRow = ({ icon: Icon, iconClass, actorLine, detailLine, credits, when }) => (
  <div className="rounded-lg bg-richblack-800 shadow-sm shadow-richblack-900/10 px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconClass}`}>
      <Icon className="text-sm" />
    </span>
    <p className="text-sm text-richblack-100 flex-1 min-w-0">
      {actorLine}
      {detailLine && <span className="text-richblack-300 ml-2 text-xs">{detailLine}</span>}
    </p>
    <span className="shrink-0 text-sm font-mono font-bold text-yellow-50">+{credits}</span>
    <span className="shrink-0 text-xs text-richblack-400 md:w-40 md:text-right">{new Date(when).toLocaleString()}</span>
  </div>
)

const Pager = ({ page, pages, onChange }) => {
  if (!pages || pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-richblack-300 font-mono">{page} / {pages}</span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}

// every source of bonus credits, split into the two sections that actually make sense sir —
// admin grants (Users.jsx's "Grant bonus credits" + "Grant bonus to all") and referral rewards
// (automatic, paid out on a successful invite). URL is the source of truth for all three params
// (adminPage/referralPage/search) so this page survives a refresh, back/forward, and is
// shareable/bookmarkable exactly where an admin left it.
const CreditGrants = () => {
  const { token } = useSelector((state) => state.auth)
  const [searchParams, setSearchParams] = useSearchParams()

  const adminPage = Math.max(1, parseInt(searchParams.get('adminPage')) || 1)
  const referralPage = Math.max(1, parseInt(searchParams.get('referralPage')) || 1)
  const search = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(search)

  const [data, setData] = useState({ admin: null, referral: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await GetCreditGrants(token, { adminPage, referralPage, search })
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData({ admin: null, referral: null })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPage, referralPage, search])

  const updateParams = (updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 1) next.delete(key)
        else next.set(key, value)
      })
      return next
    })
  }

  const handleSearch = (e) => {
    e.preventDefault()
    updateParams({ search: searchInput.trim(), adminPage: null, referralPage: null })
  }

  const adminGrants = data.admin?.grants || []
  const referralGrants = data.referral?.grants || []

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Credit Grants | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-richblack-300 mb-6">
          Every bonus credit ever handed out sir, split by where it came from — an admin's own hand, or an automatic referral reward.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8 max-w-md">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email..."
              className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-yellow-50 text-richblack-900 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer">
            Search
          </button>
        </form>

        {loading && !data.admin && !data.referral ? (
          <Loading text="Loading credit grants..." />
        ) : (
          <div className="space-y-10">

            {/* Admin grants sir */}
            <section>
              <h2 className="flex items-center gap-2 text-base font-display text-richblack-5 mb-3">
                <FaCoins className="text-yellow-50" /> Admin grants
                {data.admin && <span className="text-xs font-normal text-richblack-400">({data.admin.pagination.total})</span>}
              </h2>
              {adminGrants.length === 0 ? (
                <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-10 text-center">
                  <p className="text-richblack-300 text-sm">{search ? 'No admin grants match this search.' : 'No admin credit grants recorded yet.'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {adminGrants.map((log) => {
                    const isBroadcast = log.action === 'CREDIT_BONUS_BROADCAST'
                    const actor = log.isSystem ? 'System' : (log.actor?.email || 'deleted admin')
                    return (
                      <GrantRow
                        key={log._id}
                        icon={FaCoins}
                        iconClass="bg-yellow-900/20 text-yellow-50"
                        credits={isBroadcast ? log.details?.credits : log.details?.credits}
                        when={log.createdAt}
                        actorLine={
                          <>
                            <span className="text-richblack-5 font-medium">{actor}</span>
                            <span className="text-richblack-400 mx-1.5">→</span>
                            <span className="text-richblack-5 font-medium">
                              {isBroadcast ? `every User account (${log.details?.matched ?? '?'})` : log.targetEmail}
                            </span>
                          </>
                        }
                        detailLine={log.details?.reason ? `"${log.details.reason}"` : null}
                      />
                    )
                  })}
                </div>
              )}
              {data.admin && (
                <Pager page={adminPage} pages={data.admin.pagination.pages} onChange={(p) => updateParams({ adminPage: p })} />
              )}
            </section>

            {/* Referral rewards sir */}
            <section>
              <h2 className="flex items-center gap-2 text-base font-display text-richblack-5 mb-3">
                <FaUserFriends className="text-caribgreen-100" /> Referral rewards
                {data.referral && <span className="text-xs font-normal text-richblack-400">({data.referral.pagination.total})</span>}
              </h2>
              {referralGrants.length === 0 ? (
                <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-10 text-center">
                  <p className="text-richblack-300 text-sm">{search ? 'No referral rewards match this search.' : 'No referral rewards paid out yet.'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referralGrants.map((log) => (
                    <GrantRow
                      key={log._id}
                      icon={FaUserFriends}
                      iconClass="bg-caribgreen-900/20 text-caribgreen-100"
                      credits={log.bonusCredits}
                      when={log.createdAt}
                      actorLine={
                        <>
                          <span className="text-richblack-5 font-medium">{log.referrer?.email || 'deleted user'}</span>
                          <span className="text-richblack-400 mx-1.5">referred</span>
                          <span className="text-richblack-5 font-medium">{log.referredUserEmail || log.referredUserName}</span>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
              {data.referral && (
                <Pager page={referralPage} pages={data.referral.pagination.pages} onChange={(p) => updateParams({ referralPage: p })} />
              )}
            </section>

          </div>
        )}
      </PageTransition>
    </div>
  )
}

export default CreditGrants
