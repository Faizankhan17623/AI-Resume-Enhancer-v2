import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import Swal from 'sweetalert2'
import { FaSearch, FaTrash, FaBan, FaUndo, FaCoins } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import Loading from '../extra/Loading'
import { GetUsers, UpdateUserRole, UpdateUserPlan, AdjustCredits, BanUser, DeleteUser } from '../../Services/operations/Admin'

const swalDark = { background: '#161D29', color: '#F1F2FF', confirmButtonColor: '#FFD60A', cancelButtonColor: '#2C333F' }

const Users = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const dispatch = useDispatch()
  const { token, user: me } = useSelector((state) => state.auth)
  const { users, usersPagination, loading } = useSelector((state) => state.admin)
  const isAdmin = me?.role === 'Admin'

  useEffect(() => {
    dispatch(GetUsers(token, page, search))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    dispatch(GetUsers(token, 1, search))
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
    if (delta) dispatch(AdjustCredits(target._id, delta, token, page, search))
  }

  const handleBan = async (target) => {
    if (target.isBanned) {
      dispatch(BanUser(target._id, false, '', token, page, search))
      return
    }
    const { value, isConfirmed } = await Swal.fire({
      ...swalDark,
      title: `Suspend ${target.email}?`,
      input: 'text',
      inputPlaceholder: 'Reason for the ban',
      showCancelButton: true,
      confirmButtonText: 'Suspend',
      confirmButtonColor: '#EF476F',
    })
    if (isConfirmed) dispatch(BanUser(target._id, true, value || '', token, page, search))
  }

  const handleDelete = (target) => {
    Swal.fire({
      ...swalDark,
      title: `Delete ${target.email}?`,
      text: 'Their chats and reviews go too. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete forever',
      confirmButtonColor: '#EF476F',
    }).then((result) => {
      if (result.isConfirmed) dispatch(DeleteUser(target._id, token, page, search))
    })
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Users | ResumeEnhancer</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn">

        {/* Search sir */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6 max-w-md">
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
          <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-yellow-50 text-richblack-900 rounded-lg hover:brightness-110 transition-all duration-200 cursor-pointer">
            Search
          </button>
        </form>

        {loading ? (
          <Loading text="Loading the users..." />
        ) : (
          <>
            <div className="rounded-xl bg-richblack-800 border border-richblack-700 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-richblack-400 border-b border-richblack-700">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Credits</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-richblack-700">
                  {users.map((row) => (
                    <tr key={row._id} className={`${row.isBanned ? 'opacity-60' : ''}`}>
                      <td className="p-4">
                        <p className="font-medium text-richblack-5">{row.firstName} {row.lastName}</p>
                        <p className="text-xs text-richblack-400">{row.email}</p>
                      </td>
                      <td className="p-4">
                        {/* role select sir — Admin only, and never on yourself */}
                        <select
                          value={row.role}
                          disabled={!isAdmin || row._id === me?.id}
                          onChange={(e) => dispatch(UpdateUserRole(row._id, e.target.value, token, page, search))}
                          className="rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="User">User</option>
                          <option value="Support">Support</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <select
                          value={row.SubType || 'Basic'}
                          disabled={!isAdmin}
                          onChange={(e) => dispatch(UpdateUserPlan(row._id, e.target.value, token, page, search))}
                          className="rounded-md bg-richblack-700 border border-richblack-600 px-2 py-1.5 text-xs text-richblack-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="Basic">Basic</option>
                          <option value="Pro">Pro</option>
                          <option value="ProMax">Pro Max</option>
                        </select>
                      </td>
                      <td className="p-4 font-mono text-richblack-100">{row.count}</td>
                      <td className="p-4">
                        {row.isBanned ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-pink-700/30 text-pink-100 border border-pink-700">BANNED</span>
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
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-richblack-300 font-mono">{page} / {usersPagination.pages}</span>
                <button
                  disabled={page >= usersPagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 text-sm text-richblack-100 border border-richblack-600 rounded-lg hover:bg-richblack-800 disabled:opacity-40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Users
