import { useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { SortableList, SortableListItem } from '../Animated/SortableList'

const STORAGE_KEY = 'resumifyJobSearchTodos'

const STARTER_TODOS = [
  { id: 1, text: 'Tailor my resume to a job I want', checked: false, description: '' },
  { id: 2, text: 'Send one outreach message to a recruiter', checked: false, description: '' },
  { id: 3, text: 'Add this week\'s applications to the tracker', checked: false, description: '' },
]

// private to this browser sir (localStorage, no backend) — a scratch checklist, not account data.
// Storage can throw or be blocked, so every access falls back to the starter list / a no-op.
const loadTodos = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* fall through to starters */ }
  return STARTER_TODOS
}

// a drag-to-reorder to-do list for the job hunt sir. Tick an item to reveal its delete button
// (that is how SortableList works); drag the handle to change the order.
const JobSearchTodos = () => {
  const [items, setItems] = useState(loadTodos)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* not persisted */ }
  }, [items])

  const addItem = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setItems((prev) => [...prev, { id: Date.now(), text, checked: false, description: '' }])
    setDraft('')
  }

  const toggleChecked = (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  }

  return (
    <div className="rounded-xl bg-richblack-800 shadow-md shadow-richblack-900/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg text-richblack-5">Job-search to-dos</h2>
        <span className="text-xs text-richblack-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <p className="text-xs text-richblack-400 mb-4">Drag to reorder. Tick an item to reveal its delete button.</p>

      <form onSubmit={addItem} className="flex items-center gap-2 mb-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={120}
          placeholder="Add a task..."
          className="flex-1 rounded-lg bg-richblack-900 border border-richblack-600 px-3 py-2 text-sm text-richblack-5 placeholder:text-richblack-400 focus:outline-none focus:border-yellow-50 transition-colors duration-200"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-richblack-900 bg-yellow-50 rounded-lg hover:bg-yellow-25 transition-colors duration-200 cursor-pointer"
        >
          <FaPlus className="text-xs" /> Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-richblack-400 py-4 text-center">Nothing on the list — add your next step above.</p>
      ) : (
        <div className="overflow-hidden">
          <SortableList
            items={items}
            setItems={setItems}
            onCompleteItem={toggleChecked}
            renderItem={(item, order, onComplete, onRemove) => (
              <SortableListItem
                key={item.id}
                item={item}
                order={order}
                onCompleteItem={onComplete}
                onRemoveItem={onRemove}
                handleDrag={() => {}}
              />
            )}
          />
        </div>
      )}
    </div>
  )
}

export default JobSearchTodos
