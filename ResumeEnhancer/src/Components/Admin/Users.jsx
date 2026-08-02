import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { FaSearch, FaTrash, FaBan, FaUndo, FaCoins, FaWrench, FaFileDownload } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import PageTransition from '../extra/PageTransition'
import { GetUsers, UpdateUserRole, BulkUpdateUserRole, UpdateUserPlan, AdjustCredits, BanUser, BulkBanUsers, DeleteUser } from '../../Services/operations/Admin'
import { downloadCsv } from '../../utils/csvExport'
import { getProviderMeta } from '../../utils/authProvider'
import UserDetailModal from './UserDetailModal'

const USER_CSV_COLUMNS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'plan', label: 'Plan' },
  { key: 'signUpMethod', label: 'Sign-up method' },
  { key: 'credits', label: 'Credits used' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined' },
]

const swalDark = { background: '#1F1C16', color: '#F3EFE6', confirmButtonColor: '#2F6F5E', cancelButtonColor: '#3A3428' }

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'User', label: 'Users' },
  { value: 'Support', label: 'Support' },
]

const Users = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  // opens straight to a user's detail drawer sir when arriving from the global admin
  // search (?highlight=<userId>) — the modal fetches by id, so it doesn't matter whether
  // that user is even on the currently loaded page. Lazy init, not an effect, since the
  // param is already known synchronously at mount
  const [detailUserId, setDetailUserId] = useState(() => searchParams.get('highlight'))
  const dispatch = useDispatch()
  const { token, user: me } = useSelector((state) => state.auth)
  const { users, usersPagination, loading } = useSelector((state) => state.admin)
  const isAdmin = me?.role === 'Admin'
  // only rows an admin can actually act on sir — same rule as the single-row ban button
  const selectableIds = users.filter((row) => row._id !== me?.id).map((row) => row._id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))

  useEffect(() => {
    dispatch(GetUsers(token, page, search, roleFilter))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter])

  useEffect(() => {
    if (searchParams.get('highlight')) {
      setSearchParams((prev) => {
        prev.delete('highlight')
        return prev
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSelected([])
    dispatch(GetUsers(token, 1, search, roleFilter))
  }

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value)
    setPage(1)
    setSelected([])
  }

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setSelected([])
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? [] : selectableIds)
  }

  const toggleSelectOne = (userId) => {
    setSelected((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId])
  }

  const handleBulkBan = async (banned) => {
    if (banned) {
      const { value, isConfirmed } = await Swal.fire({
        ...swalDark,
        title: `Suspend ${selected.length} account${selected.length === 1 ? '' : 's'}?`,
        input: 'text',
        inputPlaceholder: 'Reason for the ban',
        showCancelButton: true,
        confirmButtonText: 'Suspend all',
        confirmButtonColor: '#C1443C',
      })
      if (!isConfirmed) return
      dispatch(BulkBanUsers(selected, true, value || '', token, page, search, roleFilter))
    } else {
      const { isConfirmed } = await Swal.fire({
        ...swalDark,
        title: `Restore ${selected.length} account${selected.length === 1 ? '' : 's'}?`,
        showCancelButton: true,
        confirmButtonText: 'Restore all',
      })
      if (!isConfirmed) return
      dispatch(BulkBanUsers(selected, false, '', token, page, search, roleFilter))
    }
    setSelected([])
  }

  const handleBulkRoleChange = async (role) => {
    const { isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Move ${selected.length} account${selected.length === 1 ? '' : 's'} to ${role}?`,
      showCancelButton: true,
      confirmButtonText: `Move to ${role}`,
    })
    if (!isConfirmed) return
    dispatch(BulkUpdateUserRole(selected, role, token, page, search, roleFilter))
    setSelected([])
  }

  // ask for the credit delta sir — negative refunds, positive charges
  const handleCredits = async (target) => {
    const { value } = await Swal.fire({
      ...swalDark,
      title: 'Adjust credits',
      text: `${target.email} has used ${target.count} credits. Negative refunds (e.g. -1), positive charges.`,
      input: 'number',
      inputPlaceholder: '-1',
      showCancelButton: true,
    })
    const delta = parseInt(value)
    if (delta) dispatch(AdjustCredits(target._id, delta, token, page, search, roleFilter))
  }

  const handleBan = async (target) => {
    if (target.isBanned) {
      dispatch(BanUser(target._id, false, '', token, page, search, roleFilter))
      return
    }
    const { value, isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Suspend ${target.email}?`,
      input: 'text',
      inputPlaceholder: 'Reason for the ban',
      showCancelButton: true,
      confirmButtonText: 'Suspend',
      confirmButtonColor: '#C1443C',
    })
    if (isConfirmed) dispatch(BanUser(target._id, true, value || '', token, page, search, roleFilter))
  }

  // deliberate, explicit action sir — not a casual dropdown, since this is revenue-adjacent
  // (fixing a failed webhook, honoring a refund, a manual giveaway)
  const handleFixPlan = async (target) => {
    const { value: plan, isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Set ${target.email}'s plan`,
      text: `Current plan: ${target.SubType === 'ProMax' ? 'Pro Max' : (target.SubType || 'Basic')}. Only do this for refunds, failed webhooks, or giveaways.`,
      input: 'select',
      inputOptions: { Basic: 'Basic', Pro: 'Pro', ProMax: 'Pro Max' },
      inputValue: target.SubType || 'Basic',
      showCancelButton: true,
      confirmButtonText: 'Set plan',
    })
    if (isConfirmed && plan) dispatch(UpdateUserPlan(target._id, plan, token, page, search, roleFilter))
  }

  // exports just the currently-loaded page sir — matches the current search/role filter,
  // not the whole database, since this is client-side from data already on screen
  const handleExportCsv = () => {
    const rows = users.map((row) => ({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role,
      plan: row.SubType === 'ProMax' ? 'Pro Max' : (row.SubType || 'Basic'),
      signUpMethod: getProviderMeta(row.provider).label,
      credits: row.count,
      status: row.isBanned ? 'Banned' : (row.Verified ? 'Active' : 'Unverified'),
      joined: new Date(row.createdAt).toLocaleDateString(),
    }))
    downloadCsv(`users-page-${page}.csv`, rows, USER_CSV_COLUMNS)
  }

  const handleDelete = (target) => {
    Swal.fire({
      ...swalDark,
      title: `Delete ${target.email}?`,
      text: 'Their chats and reviews go too. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete forever',
      confirmButtonColor: '#C1443C',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteUser(target._id, token, page, search, roleFilter))
    })
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Users | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-7xl mx-auto px-6 py-8">

        {/* Search + role filter sir — Admin accounts never appear in this list regardless of filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-richblack-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg bg-richblack-800 border border-richblack-600 pl-10 pr-4 py-2.5 text-richblack-5 text-sm placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-yellow-50 text-richblack-900 rounded-full hover:brightness-110 transition-all duration-200 cursor-pointer">
              Search
            </button>
          </form>
          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            className="rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-2.5 text-sm text-richblack-5 cursor-pointer focus:outline-none focus:border-yellow-50 transition-colors duration-200"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleExportCsv}
            disabled={users.length === 0}
            title="Export this page as CSV"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            <FaFileDownload /> Export CSV
          </button>
        </div>

        {/* Bulk action bar sir — Admin only, only shows once something's selected */}
        {isAdmin && selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 rounded-lg bg-richblack-800 border border-richblack-600 px-4 py-3">
            <span className="text-sm text-richblack-100 font-medium">{selected.length} selected</span>
            <button
              onClick={() => handleBulkBan(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-700/20 text-pink-100 border border-pink-700 hover:bg-pink-700/30 transition-colors duration-200 cursor-pointer"
            >
              Suspend selected
            </button>
            <button
              onClick={() => handleBulkBan(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-caribgreen-700/20 text-caribgreen-25 border border-caribgreen-700 hover:bg-caribgreen-700/30 transition-colors duration-200 cursor-pointer"
            >
              Restore selected
            </button>
            <button
              onClick={() => handleBulkRoleChange('Support')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700/20 text-blue-100 border border-blue-700 hover:bg-blue-700/30 transition-colors duration-200 cursor-pointer"
            >
              Move to Support
            </button>
            <button
              onClick={() => handleBulkRoleChange('User')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-richblack-700 text-richblack-100 border border-richblack-600 hover:bg-richblack-600 transition-colors duration-200 cursor-pointer"
            >
              Move to User
            </button>
            <button
              onClick={() => setSelected([])}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-richblack-300 hover:text-richblack-5 transition-colors duration-200 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {loading && users.length === 0 ? (
          <Loading text="Loading the users..." />
        ) : (
          <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
            {/* Mobile card list sir — the table below is desktop/tablet only (lg+), this is
                the same data/actions as one card per user, no horizontal scroll needed */}
            <div className="lg:hidden space-y-3">
              {users.map((row) => (
                <div key={row._id} className={`rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-4 ${row.isBanned ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                      {isAdmin && row._id !== me?.id && (
                        <input
                          type="checkbox"
                          checked={selected.includes(row._id)}
                          onChange={() => toggleSelectOne(row._id)}
                          className="mt-1 cursor-pointer"
                          aria-label="Select user"
                        />
                      )}
                      <button onClick={() => setDetailUserId(row._id)} className="min-w-0 text-left cursor-pointer group">
                        <p className="font-medium text-richblack-5 truncate group-hover:underline">{row.firstName} {row.lastName}</p>
                        <p className="text-xs text-richblack-400 truncate">{row.email}</p>
                      </button>
                    </div>
                    {row.isBanned ? (
                      <span
                        title={row.banReason ? `Reason: ${row.banReason}` : 'No reason recorded'}
                        className="shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-700/30 text-pink-100 border border-pink-700 cursor-help"
                      >
                        BANNED
                      </span>
                    ) : row.Verified ? (
                      <span className="shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-caribgreen-700/30 text-caribgreen-25 border border-caribgreen-700">ACTIVE</span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-richblack-700 text-richblack-200 border border-richblack-600">UNVERIFIED</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-richblack-400 block mb-1">Role</label>
                      <select
                        value={row.role}
                        disabled={!isAdmin || row._id === me?.id}
                        onChange={(e) => dispatch(UpdateUserRole(row._id, e.target.value, token, page, search, roleFilter))}
                        className="w-full rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="User">User</option>
                        <option value="Support">Support</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-richblack-400 block mb-1">Plan</label>
                      <span className="inline-block w-full rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5">
                        {row.SubType === 'ProMax' ? 'Pro Max' : (row.SubType || 'Basic')}
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] text-richblack-400 block mb-1">Sign-up</label>
                      {(() => {
                        const { label, icon: Icon } = getProviderMeta(row.provider)
                        return (
                          <span className="inline-flex items-center gap-1.5 w-full rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5">
                            <Icon className="text-sm text-richblack-400" /> {label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-richblack-300">
                      <span className="font-mono">{row.count}</span> credits used · joined {new Date(row.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleCredits(row)} aria-label="Adjust credits" title="Adjust credits"
                        className="p-2 rounded-md text-yellow-50 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                        <FaCoins className="text-sm" />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => handleFixPlan(row)} aria-label="Fix plan" title="Fix plan (refund/webhook/giveaway)"
                            className="p-2 rounded-md text-blue-100 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                            <FaWrench className="text-sm" />
                          </button>
                          <button onClick={() => handleBan(row)} aria-label={row.isBanned ? "Restore user" : "Suspend user"} title={row.isBanned ? "Restore" : "Suspend"}
                            className="p-2 rounded-md text-pink-100 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                            {row.isBanned ? <FaUndo className="text-sm" /> : <FaBan className="text-sm" />}
                          </button>
                          <button onClick={() => handleDelete(row)} aria-label="Delete user" title="Delete"
                            className="p-2 rounded-md text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                            <FaTrash className="text-sm" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-richblack-300 py-10 text-center">No users found sir.</p>
              )}
            </div>

            <div className="hidden lg:block rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                    {isAdmin && (
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="cursor-pointer" aria-label="Select all" />
                      </th>
                    )}
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Sign-up</th>
                    <th className="p-4">Credits</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-richblack-700">
                  {users.map((row) => (
                    <tr key={row._id} className={`${row.isBanned ? 'opacity-60' : ''}`}>
                      {isAdmin && (
                        <td className="p-4">
                          {row._id !== me?.id && (
                            <input
                              type="checkbox"
                              checked={selected.includes(row._id)}
                              onChange={() => toggleSelectOne(row._id)}
                              className="cursor-pointer"
                              aria-label="Select user"
                            />
                          )}
                        </td>
                      )}
                      <td className="p-4">
                        <button onClick={() => setDetailUserId(row._id)} className="text-left cursor-pointer group">
                          <p className="font-medium text-richblack-5 group-hover:underline">{row.firstName} {row.lastName}</p>
                          <p className="text-xs text-richblack-400">{row.email}</p>
                        </button>
                      </td>
                      <td className="p-4">
                        {/* role select sir — Admin only, and never on yourself */}
                        <select
                          value={row.role}
                          disabled={!isAdmin || row._id === me?.id}
                          onChange={(e) => dispatch(UpdateUserRole(row._id, e.target.value, token, page, search, roleFilter))}
                          className="rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="User">User</option>
                          <option value="Support">Support</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="inline-block rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5">
                          {row.SubType === 'ProMax' ? 'Pro Max' : (row.SubType || 'Basic')}
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const { label, icon: Icon } = getProviderMeta(row.provider)
                          return (
                            <span title={label} className="inline-flex items-center gap-1.5 text-xs text-richblack-200">
                              <Icon className="text-sm text-richblack-400" /> {label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="p-4 font-mono text-richblack-100">{row.count}</td>
                      <td className="p-4">
                        {row.isBanned ? (
                          <span
                            title={row.banReason ? `Reason: ${row.banReason}` : 'No reason recorded'}
                            className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-700/30 text-pink-100 border border-pink-700 cursor-help"
                          >
                            BANNED
                          </span>
                        ) : row.Verified ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-caribgreen-700/30 text-caribgreen-25 border border-caribgreen-700">ACTIVE</span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-richblack-700 text-richblack-200 border border-richblack-600">UNVERIFIED</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-richblack-300">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleCredits(row)} title="Adjust credits"
                            className="p-2 rounded-md text-yellow-50 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                            <FaCoins className="text-sm" />
                          </button>
                          {isAdmin && (
                            <>
                              <button onClick={() => handleFixPlan(row)} title="Fix plan (refund/webhook/giveaway)"
                                className="p-2 rounded-md text-blue-100 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                                <FaWrench className="text-sm" />
                              </button>
                              <button onClick={() => handleBan(row)} title={row.isBanned ? "Restore" : "Suspend"}
                                className="p-2 rounded-md text-pink-100 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                                {row.isBanned ? <FaUndo className="text-sm" /> : <FaBan className="text-sm" />}
                              </button>
                              <button onClick={() => handleDelete(row)} title="Delete"
                                className="p-2 rounded-md text-pink-200 hover:bg-richblack-700 transition-colors duration-200 cursor-pointer">
                                <FaTrash className="text-sm" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination sir */}
            {usersPagination && usersPagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-richblack-300 font-mono">{page} / {usersPagination.pages}</span>
                <button
                  disabled={page >= usersPagination.pages}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </PageTransition>
      <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
    </div>
  )
}

export default Users
