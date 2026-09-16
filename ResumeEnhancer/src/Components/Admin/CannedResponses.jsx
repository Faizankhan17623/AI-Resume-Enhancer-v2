import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { FaComments, FaTrash, FaPlus } from 'react-icons/fa'
import Navbar from '../Home/Navbar'
import AdminNav from './AdminNav'
import PageTransition from '../extra/PageTransition'
import Loading from '../extra/Loading'
import { apiConnector } from '../../Services/apiConnector'
import { AdminCannedResponses } from '../../Services/Apis/AdminApi'

// small library of reusable reply texts sir, per direct request — Admin manages them here,
// Support picks from the list wherever a freeform reason/reply is typed (see Users.jsx's ban
// dialog for the first wired-in picker). Self-contained state (plain apiConnector calls, not
// the Redux admin slice) sir — same lightweight pattern as this session's other small admin
// pages, simpler than threading one more slice through for a page this size.
const CannedResponses = () => {
  const { token, user: me } = useSelector((state) => state.auth)
  const isAdmin = me?.role === 'Admin'
  const [responses, setResponses] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    apiConnector('GET', AdminCannedResponses.list, null, { Authorization: `Bearer ${token}` })
      .then((r) => setResponses(r.data.responses))
      .catch(() => setResponses([]))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    try {
      await apiConnector('POST', AdminCannedResponses.create, { title: title.trim(), body: body.trim() }, { Authorization: `Bearer ${token}` })
      toast.success('Canned response saved')
      setTitle('')
      setBody('')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not save this canned response')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (responseId) => {
    try {
      await apiConnector('DELETE', `${AdminCannedResponses.remove}/${responseId}`, null, { Authorization: `Bearer ${token}` })
      toast.success('Removed')
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not remove this canned response')
    }
  }

  return (
    <div className="min-h-screen w-full bg-richblack-900">
      <Helmet>
        <title>Admin — Canned Responses | Resumify</title>
      </Helmet>
      <Navbar />
      <AdminNav />

      <PageTransition className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h2 className="font-display text-lg text-richblack-5 flex items-center gap-2">
          <FaComments className="text-yellow-50" /> Canned responses
        </h2>
        <p className="text-sm text-richblack-400 -mt-4">
          Reusable reply texts — Support can pick from these instead of retyping the same
          explanation every time (ban reasons, appeal rejections, etc).
        </p>

        {isAdmin && (
          <form onSubmit={handleCreate} className="rounded-xl bg-richblack-800 shadow-md p-5 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title, e.g. 'Refund policy violation'"
              className="w-full rounded-lg bg-richblack-900 border border-richblack-700 px-3 py-2 text-sm text-richblack-5 placeholder:text-richblack-500 focus:outline-none focus:border-yellow-50"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The actual reply text..."
              className="w-full min-h-20 rounded-lg bg-richblack-900 border border-richblack-700 p-3 text-sm text-richblack-5 placeholder:text-richblack-500 focus:outline-none focus:border-yellow-50 resize-none"
            />
            <button
              type="submit"
              disabled={saving || !title.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-50 text-richblack-900 cursor-pointer disabled:opacity-50"
            >
              <FaPlus className="text-xs" /> {saving ? 'Saving...' : 'Add canned response'}
            </button>
          </form>
        )}

        {!responses ? (
          <Loading text="Loading canned responses..." />
        ) : responses.length === 0 ? (
          <div className="rounded-xl bg-richblack-800 shadow-md p-10 text-center">
            <p className="text-sm text-richblack-400">No canned responses yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((r) => (
              <div key={r._id} className="rounded-xl bg-richblack-800 p-4 shadow-md flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-richblack-5">{r.title}</p>
                  <p className="text-xs text-richblack-400 mt-1 whitespace-pre-wrap">{r.body}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="p-2 rounded-full text-richblack-400 hover:text-pink-100 cursor-pointer shrink-0"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PageTransition>
    </div>
  )
}

export default CannedResponses
