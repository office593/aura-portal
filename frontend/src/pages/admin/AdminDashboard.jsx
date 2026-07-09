import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../api'
import { useAuth } from '../../AuthContext'

/* ─── Avatar Cropper ─── */
function AvatarCropper({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const [img, setImg] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const SIZE = 200

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const initScale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight)
      setScale(initScale)
      setPos({ x: (SIZE - image.naturalWidth * initScale) / 2, y: (SIZE - image.naturalHeight * initScale) / 2 })
      setImg(image)
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!img || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, pos.x, pos.y, img.naturalWidth * scale, img.naturalHeight * scale)
    ctx.restore()
  }, [img, pos, scale])

  function onMouseDown(e) {
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }

  function onMouseMove(e) {
    if (!dragging || !dragStart.current) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
  }

  function onMouseUp() { setDragging(false) }

  function onTouchStart(e) {
    const t = e.touches[0]
    setDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y }
  }

  function onTouchMove(e) {
    if (!dragging || !dragStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - dragStart.current.mx
    const dy = t.clientY - dragStart.current.my
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
  }

  function confirm() {
    const out = document.createElement('canvas')
    out.width = SIZE; out.height = SIZE
    const ctx = out.getContext('2d')
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, pos.x, pos.y, img.naturalWidth * scale, img.naturalHeight * scale)
    out.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-72 shadow-xl">
        <p className="text-center font-bold text-gray-700 mb-3">גרור את התמונה למיקום הרצוי</p>
        <div className="flex justify-center mb-3">
          <canvas
            ref={canvasRef}
            width={SIZE} height={SIZE}
            className="rounded-full border-4 border-blue-200 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
          />
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1 text-center">זום</label>
          <input type="range" min="0.5" max="3" step="0.05"
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="w-full accent-blue-500" />
        </div>
        <div className="flex gap-2">
          <button onClick={confirm} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">אישור</button>
          <button onClick={onCancel} className="border px-4 rounded-xl text-sm text-gray-500">ביטול</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Stages management ─── */
const EMPTY_STAGE = { name: '', status: 'pending', completion_pct: 0, target_date: '', description: '' }
const CATEGORY_ORDER = ['תב"ע', 'תכנית עיצוב אדריכלי', 'היתר בנייה']
const CATEGORY_COLORS = {
  'תב"ע': 'bg-purple-600',
  'תכנית עיצוב אדריכלי': 'bg-blue-600',
  'היתר בנייה': 'bg-green-600',
}

function StagesManager() {
  const [stages, setStages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_STAGE)
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await api.get('/project/stages')
    setStages(r.data)
  }

  useEffect(() => { load() }, [])

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({
      name: s.name,
      status: s.status,
      completion_pct: s.completion_pct,
      target_date: s.target_date || '',
      description: s.description || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_STAGE)
  }

  async function saveEdit(id) {
    setSaving(true)
    try {
      await api.put(`/project/stages/${id}`, {
        ...editForm,
        completion_pct: Number(editForm.completion_pct),
      })
      setEditingId(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function quickUpdate(id, field, value) {
    await api.put(`/project/stages/${id}`, { [field]: field === 'completion_pct' ? Number(value) : value })
    load()
  }

  const statusOptions = ['pending', 'active', 'completed']
  const statusLabels = { pending: 'טרם התחיל', active: 'בביצוע', completed: 'הושלם' }
  const statusColors = { pending: 'text-gray-400', active: 'text-blue-600 font-medium', completed: 'text-green-600 font-medium' }
  const inp = 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full'

  // Group by category, preserving CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: stages.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0)
  // Stages without a category
  const uncategorized = stages.filter((s) => !s.category || !CATEGORY_ORDER.includes(s.category))

  function renderStage(s) {
    return (
      <div key={s.id} className={`border rounded-xl p-4 transition-colors ${editingId === s.id ? 'border-blue-400 bg-blue-50' : 'bg-white'}`}>
        {editingId === s.id ? (
          <div className="space-y-3">
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="שם השלב"
              className={inp}
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="תיאור קצר (אופציונלי)"
              rows={2}
              className={`${inp} resize-none`}
            />
            <div className="grid grid-cols-3 gap-3">
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className={inp}
              >
                {statusOptions.map((o) => <option key={o} value={o}>{statusLabels[o]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={0} max={100}
                  value={editForm.completion_pct}
                  onChange={(e) => setEditForm({ ...editForm, completion_pct: e.target.value })}
                  className={inp}
                />
                <span className="text-sm text-gray-500 shrink-0">%</span>
              </div>
              <input
                type="date"
                value={editForm.target_date}
                onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
                className={inp}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveEdit(s.id)} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button onClick={cancelEdit}
                className="px-4 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800">{s.name}</span>
              {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <select
                value={s.status}
                onChange={(e) => quickUpdate(s.id, 'status', e.target.value)}
                className={`border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${statusColors[s.status]}`}
              >
                {statusOptions.map((o) => <option key={o} value={o}>{statusLabels[o]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={0} max={100}
                  value={s.completion_pct}
                  onChange={(e) => quickUpdate(s.id, 'completion_pct', e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-xs w-16 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
              <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                ✏️ ערוך
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-6">
      {grouped.map(({ cat, items }) => {
        const catPct = Math.round(items.reduce((a, s) => a + s.completion_pct, 0) / items.length)
        const colorClass = CATEGORY_COLORS[cat] || 'bg-gray-600'
        return (
          <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Category header */}
            <div className={`${colorClass} px-6 py-4 flex items-center justify-between`}>
              <h3 className="text-white font-bold text-base">{cat}</h3>
              <span className="text-white text-sm opacity-90 bg-white/20 px-3 py-1 rounded-full">
                {catPct}% הושלם
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100">
              <div className={`h-full ${colorClass} transition-all`} style={{ width: `${catPct}%` }} />
            </div>
            {/* Sub-stages */}
            <div className="p-4 space-y-2">
              {items.map(renderStage)}
            </div>
          </div>
        )
      })}
      {uncategorized.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">שלבים נוספים</h3>
          {uncategorized.map(renderStage)}
        </div>
      )}
    </div>
  )
}

/* ─── Announcements management ─── */
function AnnouncementsManager() {
  const [items, setItems] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal', target_group: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [annRes, tenRes] = await Promise.all([
      api.get('/announcements/'),
      api.get('/tenants/'),
    ])
    setItems(annRes.data)
    const unique = [...new Set(tenRes.data.map(t => t.project).filter(Boolean))]
    setProjects(unique)
  }

  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, target_group: form.target_group || null }
    await api.post('/announcements/', payload)
    setForm({ title: '', body: '', priority: 'normal', target_group: '' })
    load()
    setSaving(false)
  }

  async function del(id) {
    if (!confirm('למחוק הודעה זו?')) return
    await api.delete(`/announcements/${id}`)
    load()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">ניהול הודעות</h3>
      <form onSubmit={submit} className="space-y-3 mb-6">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="כותרת"
          required
          className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="תוכן ההודעה"
          required
          rows={3}
          className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="normal">רגיל</option>
            <option value="urgent">דחוף</option>
          </select>
          <select
            value={form.target_group}
            onChange={(e) => setForm({ ...form, target_group: e.target.value })}
            className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">📢 לכל הדיירים</option>
            {projects.map(p => (
              <option key={p} value={p}>🏗️ {p}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            פרסם
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
            <div>
              <span className="font-medium text-sm text-gray-800">{item.title}</span>
              {item.priority === 'urgent' && (
                <span className="mr-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">דחוף</span>
              )}
              {item.target_group && (
                <span className="mr-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">🏗️ {item.target_group}</span>
              )}
            </div>
            <button onClick={() => del(item.id)} className="text-red-400 hover:text-red-600 text-sm">מחק</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Gallery management ─── */
const GALLERY_CATEGORIES = ['הדמיות פרויקט', 'כנסים', 'מפגשים בשכונה']

function GalleryManager() {
  const [items, setItems] = useState([])
  const [queue, setQueue] = useState([])
  const [uploadCategory, setUploadCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  async function load() {
    const g = await api.get('/gallery/')
    setItems(g.data)
  }

  useEffect(() => { load() }, [])

  function addFiles(files) {
    setUploadError('')
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    const newItems = []
    for (const file of files) {
      if (!allowed.includes(file.type)) { setUploadError(`הקובץ ${file.name} אינו JPG/PNG`); continue }
      if (file.size > 10 * 1024 * 1024) { setUploadError(`הקובץ ${file.name} גדול מ-10MB`); continue }
      newItems.push({ file, preview: URL.createObjectURL(file), caption: '', category: uploadCategory, status: 'pending' })
    }
    setQueue(prev => [...prev, ...newItems])
  }

  function handleFileChange(e) { if (e.target.files.length) addFiles(Array.from(e.target.files)); e.target.value = '' }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) addFiles(files)
  }

  function removeFromQueue(idx) {
    setQueue(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUploadAll() {
    if (!queue.length) return
    setSaving(true)
    setUploadError('')
    let hasError = false
    const updatedQueue = [...queue]
    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status === 'done') continue
      updatedQueue[i] = { ...updatedQueue[i], status: 'uploading' }
      setQueue([...updatedQueue])
      try {
        const formData = new FormData()
        formData.append('file', updatedQueue[i].file)
        if (updatedQueue[i].caption) formData.append('caption', updatedQueue[i].caption)
        if (uploadCategory) formData.append('category', uploadCategory)
        await api.post('/gallery/upload', formData)
        updatedQueue[i] = { ...updatedQueue[i], status: 'done' }
        setQueue([...updatedQueue])
      } catch (err) {
        updatedQueue[i] = { ...updatedQueue[i], status: 'error' }
        setQueue([...updatedQueue])
        hasError = true
      }
    }
    if (hasError) setUploadError('חלק מהתמונות לא הועלו')
    else setQueue([])
    setSaving(false)
    load()
  }

  async function del(id) {
    if (!confirm('למחוק?')) return
    await api.delete(`/gallery/${id}`)
    load()
  }

  const doneCount = queue.filter(q => q.status === 'done').length
  const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'uploading').length

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">ניהול גלריה</h3>

      <div className="space-y-3 mb-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <span className="text-5xl">📁</span>
            <span className="font-medium text-gray-700">גרור תמונות לכאן או לחץ לבחירה</span>
            <span className="text-xs">JPG, PNG — עד 10MB לתמונה — ניתן לבחור כמה ביחד</span>
          </div>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple onChange={handleFileChange} className="hidden" />
        </div>

        {uploadError && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">⚠️ {uploadError}</p>
        )}

        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">קטגוריה לכל התמונות (אופציונלי)</option>
          {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {queue.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">{queue.length} תמונות נבחרו:</p>
            <div className="grid grid-cols-3 gap-2">
              {queue.map((item, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200">
                  <img src={item.preview} alt="" className="w-full h-24 object-cover" />
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">מעלה...</div>
                  )}
                  {item.status === 'done' && (
                    <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center text-white text-xl">✓</div>
                  )}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center text-white text-xs">שגיאה</div>
                  )}
                  {item.status === 'pending' && (
                    <button onClick={() => removeFromQueue(idx)}
                      className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleUploadAll}
          disabled={saving || pendingCount === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40"
        >
          {saving ? `מעלה... (${doneCount}/${queue.length})` : `⬆️ העלה ${queue.length > 0 ? queue.length + ' תמונות' : 'תמונות'}`}
        </button>
      </div>

      {/* Gallery grid */}
      {items.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{items.length} תמונות בגלריה</p>
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                <div className="relative">
                  <img src={item.url} alt="" className="w-full aspect-square object-cover" />
                  <button
                    onClick={() => del(item.id)}
                    className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-red-600"
                  >✕</button>
                </div>
                <div className="p-2">
                  <select
                    value={item.category || ''}
                    onChange={async (e) => {
                      await api.put(`/gallery/${item.id}`, { category: e.target.value || null })
                      load()
                    }}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                  >
                    <option value="">ללא קטגוריה</option>
                    {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Contacts management ─── */
const CONTACT_CATEGORIES = ['יזם', 'מנהלת', 'עו"ד דיירים', 'שמאי דיירים']

function ContactsManager() {
  const [contacts, setContacts] = useState([])
  const [addingTo, setAddingTo] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', role: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '', email: '', whatsapp: '' })
  const [avatarFile, setAvatarFile] = useState(null)      // cropped blob
  const [cropFile, setCropFile] = useState(null)           // raw file pending crop
  const [cropContactId, setCropContactId] = useState(null) // which contact's avatar_url for preview
  const [saving, setSaving] = useState(false)
  const editAvatarRef = useRef(null)
  const inp = 'border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full'

  async function load() {
    const r = await api.get('/contacts/')
    setContacts(r.data)
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/contacts/', { name: form.name, phone: form.phone, role: form.role, category: addingTo })
      setForm({ name: '', phone: '', role: '' })
      setAddingTo(null)
      load()
    } finally { setSaving(false) }
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await api.put(`/contacts/${editingId}`, editForm)
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        await api.post(`/contacts/${editingId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setAvatarFile(null)
      }
      setEditingId(null)
      load()
    } finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('למחוק?')) return
    await api.delete(`/contacts/${id}`)
    load()
  }

  return (
    <>
    {cropFile && (
      <AvatarCropper
        file={cropFile}
        onConfirm={blob => { setAvatarFile(blob); setCropFile(null) }}
        onCancel={() => setCropFile(null)}
      />
    )}
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-5">📞 ניהול צור קשר</h3>

      <div className="space-y-5">
        {CONTACT_CATEGORIES.map(cat => {
          const items = contacts.filter(c => c.category === cat)
          return (
            <div key={cat} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-700">{cat}</h4>
                <button onClick={() => { setAddingTo(cat); setForm({ name: '', phone: '' }) }}
                  className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded-lg">
                  + הוסף
                </button>
              </div>

              {addingTo === cat && (
                <form onSubmit={submit} className="space-y-2 mb-3 p-3 bg-blue-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="שם *" required className={inp} />
                    <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      placeholder="תפקיד" className={inp} />
                  </div>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="טלפון" className={inp} dir="ltr" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                      {saving ? 'שומר...' : 'הוסף'}
                    </button>
                    <button type="button" onClick={() => setAddingTo(null)}
                      className="border px-4 rounded-xl text-sm text-gray-500">ביטול</button>
                  </div>
                </form>
              )}

              {items.length === 0 ? (
                <p className="text-xs text-gray-400">אין אנשי קשר בקטגוריה זו</p>
              ) : (
                <div className="space-y-2">
                  {items.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      {editingId === c.id ? (
                        <div className="space-y-2 p-2 bg-white rounded-xl">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                              placeholder="שם" className={inp} />
                            <input value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                              placeholder="תפקיד" className={inp} />
                          </div>
                          <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                            placeholder="טלפון" className={inp} dir="ltr" />
                          <input value={editForm.whatsapp} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})}
                            placeholder="וואטסאפ (מספר)" className={inp} dir="ltr" />
                          <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                            placeholder="מייל" className={inp} dir="ltr" />
                          <div className="flex items-center gap-2">
                            {(avatarFile || c.avatar_url) && (
                              <img src={avatarFile ? URL.createObjectURL(avatarFile) : c.avatar_url}
                                alt="" className="w-9 h-9 rounded-full object-cover" />
                            )}
                            <button type="button" onClick={() => editAvatarRef.current?.click()}
                              className="text-xs text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50">
                              {c.avatar_url || avatarFile ? '🖼️ החלף תמונה' : '🖼️ הוסף תמונה'}
                            </button>
                            <input ref={editAvatarRef} type="file" accept="image/*" className="hidden"
                              onChange={e => { if (e.target.files[0]) { setCropFile(e.target.files[0]); setCropContactId(c.id) } }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} disabled={saving}
                              className="flex-1 bg-blue-600 text-white py-1.5 rounded-xl text-sm font-medium disabled:opacity-50">
                              {saving ? 'שומר...' : 'שמור'}
                            </button>
                            <button onClick={() => { setEditingId(null); setAvatarFile(null) }}
                              className="border px-4 rounded-xl text-sm text-gray-500">ביטול</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm text-gray-800">{c.name}</span>
                            {c.role && <span className="text-gray-400 text-xs mr-2">— {c.role}</span>}
                            {c.phone && <span className="text-gray-500 text-xs mr-2" dir="ltr">{c.phone}</span>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, phone: c.phone || '', role: c.role || '', email: c.email || '', whatsapp: c.whatsapp || '' }); setAvatarFile(null) }}
                              className="text-blue-500 hover:text-blue-700 text-xs border border-blue-200 px-2 py-0.5 rounded-lg">✏️</button>
                            <button onClick={() => del(c.id)} className="text-red-400 hover:text-red-600 text-xs">מחק</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}

/* ─── Professionals management ─── */
function ProfessionalsManager() {
  const [pros, setPros] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', website: '', email: '', whatsapp: '' })
  const [avatarFile, setAvatarFile] = useState(null)  // cropped blob
  const [cropFile, setCropFile] = useState(null)       // raw file pending crop
  const [uploading, setUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const inp = 'border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full'

  async function load() {
    const r = await api.get('/contacts/professionals')
    setPros(r.data)
  }
  useEffect(() => { load() }, [])

  function startEdit(p) {
    setEditingId(p.id)
    setEditForm({ name: p.name, role: p.role, website: p.website || '', email: p.email || '', whatsapp: p.whatsapp || '' })
    setAvatarFile(null)
  }

  async function saveEdit() {
    setUploading(true)
    try {
      await api.put(`/contacts/${editingId}`, editForm)
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        await api.post(`/contacts/${editingId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setEditingId(null)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'שגיאה')
    } finally {
      setUploading(false)
    }
  }

  const colors = ['bg-blue-600','bg-emerald-600','bg-purple-600','bg-orange-500','bg-teal-600','bg-rose-600','bg-indigo-600']
  function initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }

  return (
    <>
    {cropFile && (
      <AvatarCropper
        file={cropFile}
        onConfirm={blob => { setAvatarFile(blob); setCropFile(null) }}
        onCancel={() => setCropFile(null)}
      />
    )}
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">👷 ניהול אנשי מקצוע</h3>
      <div className="space-y-3">
        {pros.map((p, idx) => (
          <div key={p.id} className="border rounded-xl p-4">
            {editingId === p.id ? (
              <div className="space-y-3">
                <input value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                  placeholder="תפקיד" className={inp} />
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  placeholder="שם" className={inp} />
                <input value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})}
                  placeholder="כתובת אתר (https://...)" className={inp} dir="ltr" />
                <input value={editForm.whatsapp} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})}
                  placeholder="וואטסאפ (מספר)" className={inp} dir="ltr" />
                <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  placeholder="מייל" className={inp} dir="ltr" />
                <div className="flex items-center gap-3">
                  {(avatarFile ? URL.createObjectURL(avatarFile) : p.avatar_url) ? (
                    <img src={avatarFile ? URL.createObjectURL(avatarFile) : p.avatar_url}
                      alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-white font-bold`}>
                      {initials(p.name)}
                    </div>
                  )}
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:underline">
                    {p.avatar_url || avatarFile ? 'החלף תמונה' : 'הוסף תמונה'}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files[0]) setCropFile(e.target.files[0]) }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={uploading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                    {uploading ? 'שומר...' : 'שמור'}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 border py-2 rounded-xl text-sm text-gray-600">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-11 h-11 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {initials(p.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{p.role}</p>
                  <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                </div>
                <button onClick={() => startEdit(p)}
                  className="text-blue-500 hover:text-blue-700 text-sm px-3 py-1 border border-blue-200 rounded-lg">
                  ✏️ ערוך
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  )
}

function convertDriveLink(url) {
  if (!url) return url
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  const m2 = url.match(/id=([a-zA-Z0-9_-]+)/)
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`
  return url
}

/* ─── Tenants management ─── */
const SPEC_KEYS = ['קירות', 'ריצוף', 'מטבח', 'חדר אמבטיה', 'חלונות', 'מיזוג']
const EMPTY_SPECS = Object.fromEntries(SPEC_KEYS.map((k) => [k, '']))
const EMPTY_FORM = { phone: '', name: '', is_admin: false, project: '', air_old: '', air_new: '', floor_old: '', floor_new: '', specs: { ...EMPTY_SPECS }, id_number: '', id_image_url: '' }

function TenantsManager() {
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [avatarRotation, setAvatarRotation] = useState(0)
  const [cropModal, setCropModal] = useState(null) // {tenantId, name, imgUrl}
  const [cropRect, setCropRect] = useState(null)   // {x,y,w,h} in image %
  const cropImgRef = useRef(null)
  const cropDragRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [extractingAll, setExtractingAll] = useState(false)
  const [extractProgress, setExtractProgress] = useState(null) // {done, total, ok, fail}

  async function load() {
    const r = await api.get('/tenants/')
    setTenants(r.data)
  }

  useEffect(() => { load() }, [])

  async function extractAllAvatars() {
    const withId = tenants.filter(t => t.id_image_url && !t.is_admin)
    if (!withId.length) { alert('אין דיירים עם תעודת זהות'); return }
    if (!window.confirm(`לחלץ פנים מ-${withId.length} דיירים? הפעולה תחליף תמונות קיימות.`)) return
    setExtractingAll(true)
    setExtractProgress({ done: 0, total: withId.length, ok: 0, fail: 0 })
    let ok = 0, fail = 0
    for (let i = 0; i < withId.length; i++) {
      try {
        await api.post(`/tenants/${withId[i].id}/extract-avatar`)
        ok++
      } catch { fail++ }
      setExtractProgress({ done: i + 1, total: withId.length, ok, fail })
    }
    setExtractingAll(false)
    load()
  }

  async function deleteAllTenants() {
    if (!window.confirm('למחוק את כל הדיירים (לא האדמינים)? פעולה זו אינה הפיכה!')) return
    setDeletingAll(true)
    try {
      const r = await api.delete('/tenants/all')
      alert(`נמחקו ${r.data.deleted} דיירים`)
      load()
    } catch (err) {
      alert('שגיאה במחיקה')
    } finally {
      setDeletingAll(false)
    }
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post('/tenants/import-excel', fd)
      setImportResult(r.data)
      load()
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'שגיאה בייבוא'
      setImportResult({ error: `${err.response?.status || ''} ${detail}` })
    } finally {
      setImporting(false)
    }
  }

  function startEdit(t) {
    setEditingId(t.id)
    const existingSpecs = typeof t.specs === 'object' && t.specs ? t.specs : {}
    const specs = Object.fromEntries(SPEC_KEYS.map((k) => [k, existingSpecs[k] || '']))
    setForm({ phone: t.phone, name: t.name, is_admin: t.is_admin || false, project: t.project || '', air_old: t.air_old || '', air_new: t.air_new || '', floor_old: t.floor_old || '', floor_new: t.floor_new || '', specs, id_number: t.id_number || '', id_image_url: t.id_image_url || '' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        const specsJson = JSON.stringify(Object.fromEntries(Object.entries(form.specs).filter(([, v]) => v.trim())))
        const idImageUrl = form.id_image_url ? convertDriveLink(form.id_image_url) : null
        await api.put(`/tenants/${editingId}`, { name: form.name, phone: form.phone || undefined, is_admin: form.is_admin, project: form.project || null, air_old: form.air_old, air_new: form.air_new, floor_old: form.floor_old, floor_new: form.floor_new, specs: specsJson, id_number: form.id_number || null, id_image_url: idImageUrl })
        setEditingId(null)
      } else {
        const specsJson = JSON.stringify(Object.fromEntries(Object.entries(form.specs).filter(([, v]) => v.trim())))
        await api.post('/tenants/', { ...form, specs: specsJson })
      }
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  async function del(id) {
    if (!confirm('למחוק דייר?')) return
    await api.delete(`/tenants/${id}`)
    load()
  }

  const inp = 'border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="space-y-4">
    {/* Excel import card */}
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 flex-wrap">
      <div className="flex-1">
        <p className="font-bold text-gray-800">📥 ייבוא דיירים מאקסל</p>
        <p className="text-xs text-gray-400 mt-0.5">קובץ עם עמודות: שם פרטי, שם משפחה, טלפון נייד</p>
      </div>
      <label className={`cursor-pointer px-5 py-2.5 rounded-xl font-medium text-white transition-colors ${importing ? 'opacity-50' : ''}`}
        style={{background:'#1B2A4A'}}>
        {importing ? 'מייבא...' : '📂 בחר קובץ Excel'}
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
      </label>
      <button
        onClick={extractAllAvatars}
        disabled={extractingAll || importing}
        className="px-5 py-2.5 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {extractingAll && extractProgress
          ? `📸 חולץ... ${extractProgress.done}/${extractProgress.total}`
          : '📸 חלץ פנים לכולם'}
      </button>
      <button
        onClick={deleteAllTenants}
        disabled={deletingAll}
        className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
      >
        {deletingAll ? 'מוחק...' : '🗑️ מחק את כל הדיירים'}
      </button>
      {extractProgress && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>חילוץ פנים: {extractProgress.done}/{extractProgress.total}</span>
            <span className="text-green-600">✓ {extractProgress.ok} הצליחו</span>
            {extractProgress.fail > 0 && <span className="text-red-500">✗ {extractProgress.fail} נכשלו</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{width: `${(extractProgress.done / extractProgress.total) * 100}%`}} />
          </div>
          {!extractingAll && <p className="text-xs text-green-600 mt-1">✅ החילוץ הסתיים!</p>}
        </div>
      )}
      {importResult && (
        <div className={`w-full text-sm rounded-xl px-4 py-2 ${importResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {importResult.error
            ? `שגיאה: ${importResult.error}`
            : `✅ נוצרו ${importResult.created} דיירים | כפולים: ${importResult.skipped_duplicate} | ללא טלפון: ${importResult.skipped_no_phone}`}
        </div>
      )}
    </div>

    {!editingId && <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">הוספת דייר</h3>

      <form onSubmit={submit} className="mb-6">
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="מספר טלפון *" required
            className={inp} dir="ltr" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="שם מלא *" required className={inp} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })}
              className="w-4 h-4 rounded accent-amber-500" />
            <span className="text-sm font-medium text-gray-700">⚙️ מנהל מערכת</span>
          </label>
        </div>
        <div className="mb-3">
          <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}
            placeholder="🏗️ שם פרויקט (לרשימת תפוצה, למשל: ראשון לציון)" className={`w-full ${inp}`} />
        </div>

        {/* Old apartment */}
        <p className="text-xs text-gray-400 font-medium mb-2 mt-1">דירה נוכחית</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={form.air_old} onChange={(e) => setForm({ ...form, air_old: e.target.value })}
            placeholder="כיוון אוויר ישן" className={inp} />
          <input value={form.floor_old} onChange={(e) => setForm({ ...form, floor_old: e.target.value })}
            placeholder="קומה ישנה" className={inp} />
        </div>

        {/* New apartment */}
        <p className="text-xs text-gray-400 font-medium mb-2">דירה חדשה בשיבוץ</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input value={form.air_new} onChange={(e) => setForm({ ...form, air_new: e.target.value })}
            placeholder="כיוון אוויר חדש" className={inp} />
          <input value={form.floor_new} onChange={(e) => setForm({ ...form, floor_new: e.target.value })}
            placeholder="קומה חדשה" className={inp} />
        </div>

        {/* ID card */}
        {editingId && (
          <>
            <p className="text-xs text-gray-400 font-medium mb-2 mt-1">תעודת זהות</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})}
                placeholder="מספר תעודת זהות" className={inp} dir="ltr" />
              <input value={form.id_image_url} onChange={e => setForm({...form, id_image_url: e.target.value})}
                placeholder="קישור תמונת ת.ז. (Google Drive)" className={inp} dir="ltr" />
            </div>
          </>
        )}

        {/* Technical specs */}
        {editingId && (
          <>
            <p className="text-xs text-gray-400 font-medium mb-2 mt-1">מפרט טכני</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SPEC_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{key}</label>
                  <input
                    value={form.specs[key] || ''}
                    onChange={(e) => setForm({ ...form, specs: { ...form.specs, [key]: e.target.value } })}
                    placeholder={key}
                    className={inp}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium disabled:opacity-50">
            {saving ? 'שומר...' : editingId ? 'שמור שינויים' : 'הוסף דייר'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}
              className="px-5 border rounded-xl text-gray-600 hover:bg-gray-50">
              ביטול
            </button>
          )}
        </div>
      </form>
    </div>}

    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="text-right py-2 font-medium w-12">תמונה</th>
              <th className="text-right py-2 font-medium">שם</th>
              <th className="text-right py-2 font-medium">טלפון</th>
              <th className="text-right py-2 font-medium">פרויקט</th>
              <th className="text-right py-2 font-medium">כיוון ישן</th>
              <th className="text-right py-2 font-medium">קומה ישנה</th>
              <th className="text-right py-2 font-medium">כיוון חדש</th>
              <th className="text-right py-2 font-medium">קומה חדשה</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map((t) => editingId === t.id ? (
              <tr key={t.id} className="bg-blue-50">
                <td colSpan={9} className="py-3 px-3">
                  <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="טלפון *" required className={inp} dir="ltr" />
                      <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="שם מלא *" required className={inp} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.project} onChange={e => setForm({...form, project: e.target.value})} placeholder="פרויקט" className={inp} />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_admin} onChange={e => setForm({...form, is_admin: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                        <span className="text-sm text-gray-700">מנהל מערכת</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.air_old} onChange={e => setForm({...form, air_old: e.target.value})} placeholder="כיוון אוויר ישן" className={inp} />
                      <input value={form.floor_old} onChange={e => setForm({...form, floor_old: e.target.value})} placeholder="קומה ישנה" className={inp} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.air_new} onChange={e => setForm({...form, air_new: e.target.value})} placeholder="כיוון אוויר חדש" className={inp} />
                      <input value={form.floor_new} onChange={e => setForm({...form, floor_new: e.target.value})} placeholder="קומה חדשה" className={inp} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} placeholder="מספר ת.ז." className={inp} dir="ltr" />
                      <input value={form.id_image_url} onChange={e => setForm({...form, id_image_url: e.target.value})} placeholder="קישור תמונת ת.ז." className={inp} dir="ltr" />
                    </div>
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer">מפרט טכני</summary>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {SPEC_KEYS.map(key => (
                          <div key={key}>
                            <label className="text-xs text-gray-500 mb-1 block">{key}</label>
                            <input value={form.specs[key] || ''} onChange={e => setForm({...form, specs: {...form.specs, [key]: e.target.value}})} placeholder={key} className={inp} />
                          </div>
                        ))}
                      </div>
                    </details>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-medium disabled:opacity-50">
                        {saving ? 'שומר...' : 'שמור'}
                      </button>
                      <button type="button" onClick={cancelEdit} className="px-4 border rounded-xl text-gray-600 hover:bg-gray-50">ביטול</button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={t.id}>
                <td className="py-2">
                  <label className="cursor-pointer group relative inline-block">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm group-hover:bg-blue-50 transition-colors border-2 border-gray-200 group-hover:border-blue-400">
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">📷</div>
                    <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0]; if (!file) return
                        setAvatarPreview({ tenantId: t.id, file, previewUrl: URL.createObjectURL(file), name: t.name })
                      }} />
                  </label>
                </td>
                <td className="py-2 px-2">{t.name}</td>
                <td className="py-2 px-2" dir="ltr">{(t.phone || '').replace(/\D/g, '')}</td>
                <td className="py-2 px-2">{t.project ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t.project}</span> : '—'}</td>
                <td className="py-2 px-2">{t.air_old || '—'}</td>
                <td className="py-2 px-2">{t.floor_old || '—'}</td>
                <td className="py-2 px-2">{t.air_new || '—'}</td>
                <td className="py-2 px-2">{t.floor_new || '—'}</td>
                <td className="py-2">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(t)} className="text-blue-500 hover:text-blue-700">ערוך</button>
                    <button onClick={() => del(t.id)} className="text-red-400 hover:text-red-600">מחק</button>
                    {t.avatar_url && (
                      <button onClick={async () => {
                        if (!window.confirm(`להסיר את התמונה של ${t.name}?`)) return
                        await api.delete(`/tenants/${t.id}/avatar`)
                        load()
                      }} className="text-gray-400 hover:text-red-500 text-xs" title="הסר תמונה">🗑️ תמונה</button>
                    )}
                    {t.id_image_url && (<>
                      <button onClick={async () => {
                        try {
                          const res = await api.post(`/tenants/${t.id}/extract-avatar`)
                          const blob = await fetch(res.data.avatar_url).then(r => r.blob())
                          const previewUrl = URL.createObjectURL(blob)
                          setAvatarRotation(0)
                          setAvatarPreview({ tenantId: t.id, file: blob, previewUrl, name: t.name })
                          load()
                        } catch { alert('שגיאה בחילוץ תמונה') }
                      }} className="text-purple-500 hover:text-purple-700 text-xs">📸 חלץ פנים</button>
                      <button onClick={async () => {
                        try {
                          const resp = await api.get(`/tenants/${t.id}/id-card-image`, { responseType: 'blob' })
                          const blobUrl = URL.createObjectURL(resp.data)
                          setCropRect(null)
                          setCropModal({ tenantId: t.id, name: t.name, imgUrl: blobUrl })
                        } catch { alert('שגיאה בטעינת תעודת זהות') }
                      }} className="text-orange-500 hover:text-orange-700 text-xs">✂️ חתוך</button>
                    </>)}
                    {t.is_admin && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">אדמין</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      {/* Avatar preview modal */}
      {avatarPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72 text-center">
            <h4 className="font-bold text-gray-800 mb-4">תצוגה מקדימה — {avatarPreview.name}</h4>
            <div className="w-32 h-32 mx-auto mb-3 overflow-hidden rounded-full border-4 border-blue-100 flex items-center justify-center bg-gray-50">
              <img src={avatarPreview.previewUrl} alt=""
                style={{ transform: `rotate(${avatarRotation}deg)`, transition: 'transform 0.2s', width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="flex gap-2 justify-center mb-4">
              <button onClick={() => setAvatarRotation(r => r - 90)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">↺ שמאל</button>
              <button onClick={() => setAvatarRotation(r => r + 90)} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">↻ ימין</button>
            </div>
            {avatarError && <p className="text-red-600 text-sm mb-3">{avatarError}</p>}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setAvatarUploading(true)
                  setAvatarError(null)
                  try {
                    // apply rotation via canvas before upload
                    const rotated = await new Promise(resolve => {
                      const img = new Image()
                      img.onload = () => {
                        const rad = (avatarRotation * Math.PI) / 180
                        const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad))
                        const cw = Math.round(img.width * cos + img.height * sin)
                        const ch = Math.round(img.width * sin + img.height * cos)
                        const canvas = document.createElement('canvas')
                        canvas.width = cw; canvas.height = ch
                        const ctx = canvas.getContext('2d')
                        ctx.translate(cw/2, ch/2)
                        ctx.rotate(rad)
                        ctx.drawImage(img, -img.width/2, -img.height/2)
                        canvas.toBlob(resolve, 'image/jpeg', 0.92)
                      }
                      img.src = avatarPreview.previewUrl
                    })
                    const fd = new FormData()
                    fd.append('file', rotated, 'avatar.jpg')
                    await api.post(`/tenants/${avatarPreview.tenantId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                    setAvatarPreview(null)
                    setAvatarRotation(0)
                    load()
                  } catch (e) {
                    setAvatarError(e?.response?.data?.detail || 'שגיאה בהעלאה')
                  } finally {
                    setAvatarUploading(false)
                  }
                }}
                disabled={avatarUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium"
              >
                {avatarUploading ? 'שומר...' : 'אישור ✓'}
              </button>
              <button
                disabled={avatarUploading}
                onClick={() => { setAvatarPreview(null); setAvatarError(null); setAvatarRotation(0) }}
                className="flex-1 border rounded-xl text-gray-600 hover:bg-gray-50 py-2.5"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Crop Modal ── */}
      {cropModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-lg">
            <h4 className="font-bold text-gray-800 mb-3">בחר אזור פנים — {cropModal.name}</h4>
            <p className="text-xs text-gray-400 mb-3">גרור מלבן על פני הדייר</p>
            <div className="relative select-none overflow-hidden rounded-xl border border-gray-200 cursor-crosshair"
              onMouseDown={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                cropDragRef.current = { startX: x, startY: y }
                setCropRect({ x, y, w: 0, h: 0 })
              }}
              onMouseMove={e => {
                if (!cropDragRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                const { startX, startY } = cropDragRef.current
                setCropRect({
                  x: Math.min(x, startX), y: Math.min(y, startY),
                  w: Math.abs(x - startX), h: Math.abs(y - startY)
                })
              }}
              onMouseUp={() => { cropDragRef.current = null }}
            >
              <img ref={cropImgRef} src={cropModal.imgUrl} alt="" className="w-full block pointer-events-none" />
              {cropRect && cropRect.w > 0.01 && (
                <div className="absolute border-2 border-blue-500 bg-blue-200/20 pointer-events-none"
                  style={{
                    left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`,
                    width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`
                  }} />
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                disabled={!cropRect || cropRect.w < 0.01}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl font-medium"
                onClick={() => {
                  const img = cropImgRef.current
                  const canvas = document.createElement('canvas')
                  const iw = img.naturalWidth, ih = img.naturalHeight
                  const sx = cropRect.x * iw, sy = cropRect.y * ih
                  const sw = cropRect.w * iw, sh = cropRect.h * ih
                  canvas.width = 300; canvas.height = 300
                  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, 300, 300)
                  canvas.toBlob(blob => {
                    const previewUrl = URL.createObjectURL(blob)
                    setAvatarRotation(0)
                    setAvatarPreview({ tenantId: cropModal.tenantId, file: blob, previewUrl, name: cropModal.name })
                    URL.revokeObjectURL(cropModal.imgUrl)
                    setCropModal(null)
                    setCropRect(null)
                  }, 'image/jpeg', 0.92)
                }}
              >
                חתוך ✓
              </button>
              <button onClick={() => { URL.revokeObjectURL(cropModal.imgUrl); setCropModal(null); setCropRect(null) }}
                className="flex-1 border rounded-xl text-gray-600 hover:bg-gray-50 py-2.5">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Plans management (per-tenant PDFs) ─── */
function PlansManager() {
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('all')
  const [docs, setDocs] = useState([])
  const [viewTenantId, setViewTenantId] = useState('')
  const [files, setFiles] = useState([]) // multiple files
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('') // status text during multi-upload
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    api.get('/tenants/').then((r) => {
      setTenants(r.data.filter((t) => !t.is_admin))
    })
  }, [])

  useEffect(() => {
    if (!viewTenantId) { setDocs([]); return }
    if (viewTenantId === 'all') {
      api.get('/tenant-docs/all').then((r) => setDocs(r.data))
    } else {
      api.get(`/tenant-docs/by-tenant/${viewTenantId}`).then((r) => setDocs(r.data))
    }
  }, [viewTenantId])

  function sanitizeFileName(name) {
    const dotIdx = name.lastIndexOf('.')
    const ext = dotIdx >= 0 ? name.slice(dotIdx) : ''
    const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name
    const cleanBase = base.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').replace(/^_+|_+$/g, '')
    return (cleanBase || `file_${Date.now()}`) + ext
  }

  function handleFileChange(e) {
    setUploadError('')
    const selected = Array.from(e.target.files)
    const invalid = selected.filter(f => !f.name.toLowerCase().endsWith('.pdf'))
    if (invalid.length) { setUploadError('יש לבחור קבצי PDF בלבד'); e.target.value = ''; return }
    const hasHebrew = selected.some(f => /[֐-׿]/.test(f.name))
    if (hasHebrew) {
      setUploadError('⚠️ שם הקובץ מכיל עברית — השם ישונה אוטומטית לאנגלית לפני ההעלאה')
    }
    setFiles(selected)
  }

  async function uploadToTenant(tenantId, file, isPersonal) {
    const cleanName = sanitizeFileName(file.name) || `file_${Date.now()}.pdf`
    const renamedFile = new File([file], cleanName, { type: file.type })
    const fd = new FormData()
    fd.append('tenant_id', tenantId)
    fd.append('file', renamedFile)
    if (caption) fd.append('caption', caption)
    fd.append('is_personal', isPersonal ? '1' : '0')
    await api.post('/tenant-docs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!files.length) return
    let targetTenants
    if (selectedTenantId === 'all') {
      targetTenants = tenants
    } else if (String(selectedTenantId).startsWith('proj:')) {
      const projName = selectedTenantId.slice(5)
      targetTenants = tenants.filter(t => t.project === projName)
    } else {
      targetTenants = tenants.filter(t => String(t.id) === selectedTenantId)
    }
    if (!targetTenants.length) return
    const isPersonal = !selectedTenantId.startsWith('proj:') && selectedTenantId !== 'all'
    setSaving(true); setUploadError(''); setProgress('')
    try {
      let done = 0
      const total = files.length * targetTenants.length
      for (const tenant of targetTenants) {
        for (const file of files) {
          await uploadToTenant(tenant.id, file, isPersonal)
          done++
          setProgress(`מעלה... ${done}/${total}`)
        }
      }
      setFiles([]); setCaption(''); setProgress('')
      if (viewTenantId) api.get(`/tenant-docs/by-tenant/${viewTenantId}`).then((r) => setDocs(r.data))
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'שגיאה בהעלאת הקובץ')
    } finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('למחוק?')) return
    await api.delete(`/tenant-docs/${id}`)
    api.get(`/tenant-docs/by-tenant/${viewTenantId}`).then((r) => setDocs(r.data))
  }

  async function delFromAll(filename) {
    if (!confirm('למחוק קובץ זה אצל כל הדיירים?')) return
    const serverFilename = filename.split('/').pop()
    await api.delete(`/tenant-docs/by-filename/${serverFilename}`)
    api.get('/tenant-docs/all').then((r) => setDocs(r.data))
  }

  const inp = 'border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-5">ניהול קבצים ותוכניות לדיירים</h3>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="space-y-4 mb-8">

        {/* Target selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">העלה עבור</label>
          <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className={inp}>
            <option value="all">📢 כל הדיירים</option>
            {[...new Set(tenants.map(t => t.project).filter(Boolean))].map(proj => (
              <option key={`proj_${proj}`} value={`proj:${proj}`}>🏗️ פרויקט: {proj}</option>
            ))}
            <optgroup label="── דייר בודד ──">
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* File picker — multiple */}
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
            files.length ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}>
            {files.length ? (
              <div className="space-y-1">
                <span className="text-2xl">📄</span>
                {files.map((f, i) => (
                  <p key={i} className="text-sm text-blue-700 font-medium truncate">{f.name}</p>
                ))}
                <p className="text-xs text-gray-400">{files.length} קבצים נבחרו</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-500">
                <span className="text-3xl">📄</span>
                <span className="font-medium">לחץ לבחירת קבצי PDF</span>
                <span className="text-xs">ניתן לבחור מספר קבצים — PDF בלבד</span>
              </div>
            )}
          </div>
          <input type="file" accept=".pdf,application/pdf" multiple onChange={handleFileChange} className="hidden" />
        </label>

        {uploadError && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">⚠️ {uploadError}</p>}

        <input value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="שם / תיאור לכל הקבצים (אופציונלי)"
          className={inp} />

        <button type="submit" disabled={saving || !files.length}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40">
          {saving ? (progress || 'מעלה...') : `⬆️ העלה ${files.length > 1 ? files.length + ' קבצים' : 'PDF'}`}
        </button>
      </form>

      {/* View docs per tenant */}
      <div className="border-t pt-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">צפה בקבצים של דייר</label>
        <select value={viewTenantId} onChange={(e) => setViewTenantId(e.target.value)} className={inp}>
          <option value="">— בחר דייר לצפייה —</option>
          <option value="all">📋 כל הדיירים</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
          ))}
        </select>

        {viewTenantId && (
          <div className="mt-4">
            {docs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">אין קבצים</p>
            ) : (() => {
              const displayDocs = docs
              return (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-2">{displayDocs.length} קבצים</p>
                  {displayDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-2xl flex-shrink-0">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.caption || doc.filename}</p>
                        {doc.caption && <p className="text-xs text-gray-400 truncate">{doc.filename}</p>}
                      </div>
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-lg hover:bg-blue-50 flex-shrink-0">פתח</a>
                      {viewTenantId === 'all'
                        ? <button onClick={() => delFromAll(doc.url)} className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 flex-shrink-0">מחק מכולם</button>
                        : <button onClick={() => del(doc.id)} className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 flex-shrink-0">מחק</button>
                      }
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main admin page ─── */
/* ─── Carousel management ─── */
function CarouselManager() {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  async function load() {
    const r = await api.get('/carousel/')
    setImages(r.data)
  }

  useEffect(() => { load() }, [])

  async function upload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (images.length >= 3) { alert('מקסימום 3 תמונות'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('/carousel/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'שגיאה בהעלאה')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function del(id) {
    if (!confirm('למחוק תמונה?')) return
    await api.delete(`/carousel/${id}`)
    load()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">🖼️ תמונות דף הבית ({images.length}/3)</h3>
        {images.length < 3 && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? 'מעלה...' : '+ הוסף תמונה'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          </>
        )}
      </div>

      {images.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">אין תמונות — העלה עד 3 תמונות לקרוסלה בדף הבית</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border">
              <img src={img.url} alt="" className="w-full h-40 object-cover" />
              <button
                onClick={() => del(img.id)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── About manager ─── */
function AboutManager() {
  const [projects, setProjects] = useState([])
  const [press, setPress] = useState([])
  const [editingProject, setEditingProject] = useState(null)
  const [editingPress, setEditingPress] = useState(null)
  const [addingProject, setAddingProject] = useState(false)
  const [addingPress, setAddingPress] = useState(false)
  const [pForm, setPForm] = useState({ name: '', location: '', description: '', url: '' })
  const [prForm, setPrForm] = useState({ title: '', source: '', date: '', url: '' })
  const [company, setCompany] = useState({ founder_name: '', founder_title: '', founder_years: '', founder_description: '', founder_image_url: '' })
  const [companySaving, setCompanySaving] = useState(false)
  const [companyImagePreview, setCompanyImagePreview] = useState(null)
  const founderImageRef = useRef(null)
  const inp = 'border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full'

  async function load() {
    const [p, pr, co] = await Promise.all([api.get('/about/projects'), api.get('/about/press'), api.get('/about/company')])
    setProjects(p.data); setPress(pr.data)
    setCompany({ founder_name: co.data.founder_name||'', founder_title: co.data.founder_title||'', founder_years: co.data.founder_years||'', founder_description: co.data.founder_description||'', founder_image_url: co.data.founder_image_url||'' })
  }
  useEffect(() => { load() }, [])

  async function saveCompany() {
    setCompanySaving(true)
    await api.put('/about/company', { founder_name: company.founder_name, founder_title: company.founder_title, founder_years: company.founder_years, founder_description: company.founder_description })
    setCompanySaving(false)
  }

  async function uploadFounderImage(e) {
    const file = e.target.files[0]; if (!file) return
    setCompanyImagePreview(URL.createObjectURL(file))
    const fd = new FormData(); fd.append('file', file)
    const res = await api.post('/about/company/upload-image', fd)
    setCompany(prev => ({ ...prev, founder_image_url: res.data.url }))
  }

  async function saveProject(id) {
    if (id) await api.put(`/about/projects/${id}`, { ...pForm, order: 0 })
    else await api.post('/about/projects', { ...pForm, order: projects.length })
    setEditingProject(null); setAddingProject(false); setPForm({ name: '', location: '', description: '', url: '' }); load()
  }

  async function savePress(id) {
    if (id) await api.put(`/about/press/${id}`, { ...prForm, order: 0 })
    else await api.post('/about/press', { ...prForm, order: press.length })
    setEditingPress(null); setAddingPress(false); setPrForm({ title: '', source: '', date: '', url: '' }); load()
  }

  return (
    <div className="space-y-6">
      {/* Company / Founder */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">👑 מייסד / תיאור החברה</h3>
        <div className="flex flex-col items-center mb-4">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 mb-2 cursor-pointer"
            style={{borderColor:'#1B2A4A'}}
            onClick={() => founderImageRef.current?.click()}>
            {(companyImagePreview || company.founder_image_url) ? (
              <img src={companyImagePreview || company.founder_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl">👤</div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs">📷 החלף</div>
          </div>
          <input ref={founderImageRef} type="file" accept="image/*" className="hidden" onChange={uploadFounderImage} />
          <p className="text-xs text-gray-400">לחץ על התמונה להעלאה</p>
        </div>
        <div className="space-y-2">
          <input value={company.founder_name} onChange={e => setCompany(p=>({...p,founder_name:e.target.value}))} placeholder="שם המייסד" className={inp} />
          <input value={company.founder_title} onChange={e => setCompany(p=>({...p,founder_title:e.target.value}))} placeholder="תפקיד / כותרת" className={inp} />
          <input value={company.founder_years} onChange={e => setCompany(p=>({...p,founder_years:e.target.value}))} placeholder="שנים (למשל 1931 – 2010)" className={inp} />
          <textarea value={company.founder_description} onChange={e => setCompany(p=>({...p,founder_description:e.target.value}))} placeholder="תיאור החברה / המייסד..." rows={5} className={inp+' resize-none'} />
          <button onClick={saveCompany} disabled={companySaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-40">
            {companySaving ? 'שומר...' : '💾 שמור'}
          </button>
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">🏗️ רשימת פרויקטים</h3>
          <button onClick={() => { setAddingProject(true); setPForm({ name: '', location: '', description: '', url: '' }) }}
            className="text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50">+ הוסף</button>
        </div>

        {addingProject && (
          <div className="space-y-2 mb-4 p-4 bg-blue-50 rounded-xl">
            <input value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} placeholder="שם הפרויקט *" className={inp} />
            <input value={pForm.location} onChange={e => setPForm({...pForm, location: e.target.value})} placeholder="מיקום" className={inp} />
            <input value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} placeholder="תיאור" className={inp} />
            <input value={pForm.url} onChange={e => setPForm({...pForm, url: e.target.value})} placeholder="קישור לאתר (https://...)" className={inp} dir="ltr" />
            <div className="flex gap-2">
              <button onClick={() => saveProject(null)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">הוסף</button>
              <button onClick={() => setAddingProject(false)} className="border px-4 rounded-xl text-sm text-gray-500">ביטול</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.id} className="bg-gray-50 rounded-xl p-3">
              {editingProject === p.id ? (
                <div className="space-y-2">
                  <input value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} placeholder="שם" className={inp} />
                  <input value={pForm.location} onChange={e => setPForm({...pForm, location: e.target.value})} placeholder="מיקום" className={inp} />
                  <input value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} placeholder="תיאור" className={inp} />
                  <input value={pForm.url} onChange={e => setPForm({...pForm, url: e.target.value})} placeholder="קישור לאתר" className={inp} dir="ltr" />
                  <div className="flex gap-2">
                    <button onClick={() => saveProject(p.id)} className="flex-1 bg-blue-600 text-white py-1.5 rounded-xl text-sm">שמור</button>
                    <button onClick={() => setEditingProject(null)} className="border px-3 rounded-xl text-sm text-gray-500">ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                    {p.location && <p className="text-xs text-gray-500">📍 {p.location}</p>}
                    {p.url && <p className="text-xs text-blue-600 truncate" dir="ltr">{p.url}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setEditingProject(p.id); setPForm({ name: p.name, location: p.location||'', description: p.description||'', url: p.url||'' }) }}
                      className="text-blue-500 text-xs border border-blue-200 px-2 py-0.5 rounded-lg">✏️</button>
                    <button onClick={async () => { if(confirm('למחוק?')) { await api.delete(`/about/projects/${p.id}`); load() } }}
                      className="text-red-400 text-xs hover:text-red-600">מחק</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Press */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">📰 מן העיתונות</h3>
          <button onClick={() => { setAddingPress(true); setPrForm({ title: '', source: '', date: '', url: '' }) }}
            className="text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50">+ הוסף</button>
        </div>

        {addingPress && (
          <div className="space-y-2 mb-4 p-4 bg-blue-50 rounded-xl">
            <input value={prForm.title} onChange={e => setPrForm({...prForm, title: e.target.value})} placeholder="כותרת *" className={inp} />
            <input value={prForm.source} onChange={e => setPrForm({...prForm, source: e.target.value})} placeholder="מקור (גלובס, כלכליסט...)" className={inp} />
            <input value={prForm.date} onChange={e => setPrForm({...prForm, date: e.target.value})} placeholder="תאריך (ינואר 2024)" className={inp} />
            <input value={prForm.url} onChange={e => setPrForm({...prForm, url: e.target.value})} placeholder="קישור לכתבה (https://...)" className={inp} dir="ltr" />
            <div className="flex gap-2">
              <button onClick={() => savePress(null)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">הוסף</button>
              <button onClick={() => setAddingPress(false)} className="border px-4 rounded-xl text-sm text-gray-500">ביטול</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {press.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-3">
              {editingPress === item.id ? (
                <div className="space-y-2">
                  <input value={prForm.title} onChange={e => setPrForm({...prForm, title: e.target.value})} placeholder="כותרת" className={inp} />
                  <input value={prForm.source} onChange={e => setPrForm({...prForm, source: e.target.value})} placeholder="מקור" className={inp} />
                  <input value={prForm.date} onChange={e => setPrForm({...prForm, date: e.target.value})} placeholder="תאריך" className={inp} />
                  <input value={prForm.url} onChange={e => setPrForm({...prForm, url: e.target.value})} placeholder="קישור" className={inp} dir="ltr" />
                  <div className="flex gap-2">
                    <button onClick={() => savePress(item.id)} className="flex-1 bg-blue-600 text-white py-1.5 rounded-xl text-sm">שמור</button>
                    <button onClick={() => setEditingPress(null)} className="border px-3 rounded-xl text-sm text-gray-500">ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {item.source && <span className="text-xs text-blue-600">{item.source}</span>}
                      {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setEditingPress(item.id); setPrForm({ title: item.title, source: item.source||'', date: item.date||'', url: item.url||'' }) }}
                      className="text-blue-500 text-xs border border-blue-200 px-2 py-0.5 rounded-lg">✏️</button>
                    <button onClick={async () => { if(confirm('למחוק?')) { await api.delete(`/about/press/${item.id}`); load() } }}
                      className="text-red-400 text-xs hover:text-red-600">מחק</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Tasks management ─── */
function TasksManager() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [admins, setAdmins] = useState([])
  const [form, setForm] = useState({ title: '', description: '', assigned_to_id: '', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(null) // task being completed
  const [completeForm, setCompleteForm] = useState({ notes: '', completed_by_id: '', completed_by_name: '' })

  async function load() {
    const [tr, ar] = await Promise.all([api.get('/tasks/'), api.get('/tenants/')])
    setTasks(tr.data)
    const adminList = ar.data.filter(t => t.is_admin)
    setAdmins(adminList)
    if (!completeForm.completed_by_id && adminList.length > 0) {
      const me = adminList.find(a => a.phone === user?.phone) || adminList[0]
      setCompleteForm(f => ({ ...f, completed_by_id: me.id, completed_by_name: me.name }))
    }
  }

  useEffect(() => { load() }, [])

  async function addTask(e) {
    e.preventDefault()
    setSaving(true)
    const assignee = admins.find(a => String(a.id) === String(form.assigned_to_id))
    await api.post('/tasks/', {
      title: form.title,
      description: form.description || null,
      assigned_to_id: assignee?.id || null,
      assigned_to_name: assignee?.name || null,
      due_date: form.due_date || null,
    })
    setForm({ title: '', description: '', assigned_to_id: '', due_date: '' })
    load()
    setSaving(false)
  }

  async function doComplete(task) {
    await api.patch(`/tasks/${task.id}/complete`, {
      notes: completeForm.notes || null,
      completed_by_id: Number(completeForm.completed_by_id),
      completed_by_name: completeForm.completed_by_name,
    })
    setCompleting(null)
    setCompleteForm(f => ({ ...f, notes: '' }))
    load()
  }

  async function reopen(id) {
    await api.patch(`/tasks/${id}/reopen`)
    load()
  }

  async function del(id) {
    if (!confirm('למחוק משימה?')) return
    await api.delete(`/tasks/${id}`)
    load()
  }

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const inp = 'border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full'

  return (
    <div className="space-y-4">
      {/* Add task form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📋 הוספת משימה</h3>
        <form onSubmit={addTask} className="space-y-3">
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="כותרת המשימה *" required className={inp} />
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            placeholder="תיאור (אופציונלי)" rows={2} className={`${inp} resize-none`} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.assigned_to_id} onChange={e => setForm({...form, assigned_to_id: e.target.value})}
              className={inp}>
              <option value="">👥 כל המנהלים</option>
              {admins.map(a => <option key={a.id} value={a.id}>👤 {a.name}</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}
              className={inp} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
            style={{background:'#1B2A4A'}}>
            {saving ? 'שומר...' : '+ הוסף משימה'}
          </button>
        </form>
      </div>

      {/* Pending tasks */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          ממתינות ({pending.length})
        </h4>
        {pending.length === 0 && <p className="text-gray-400 text-sm text-center py-3">אין משימות ממתינות</p>}
        <div className="space-y-3">
          {pending.map(task => (
            <div key={task.id} className="border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setCompleting(task)}
                  className="mt-0.5 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-400 flex-shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{task.title}</p>
                  {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.assigned_to_name && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        👤 {task.assigned_to_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => del(task.id)} className="text-red-300 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
            בוצעו ({done.length})
          </h4>
          <div className="space-y-3">
            {done.map(task => (
              <div key={task.id} className="border border-green-100 bg-green-50 rounded-xl p-4 opacity-80">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-600 line-through">{task.title}</p>
                    {task.completed_by_name && (
                      <p className="text-xs text-green-700 mt-1">בוצע ע"י {task.completed_by_name}</p>
                    )}
                    {task.notes && <p className="text-sm text-gray-500 mt-1 bg-white rounded-lg px-3 py-1.5 border border-green-100">"{task.notes}"</p>}
                  </div>
                  <button onClick={() => reopen(task.id)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 border rounded px-2 py-1">פתח מחדש</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete dialog */}
      {completing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCompleting(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-1">✓ סימון ביצוע</h4>
            <p className="text-sm text-gray-500 mb-4">{completing.title}</p>
            <select value={completeForm.completed_by_id}
              onChange={e => {
                const a = admins.find(a => String(a.id) === e.target.value)
                setCompleteForm(f => ({ ...f, completed_by_id: e.target.value, completed_by_name: a?.name || '' }))
              }}
              className="border rounded-xl px-4 py-2.5 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400">
              {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <textarea value={completeForm.notes} onChange={e => setCompleteForm(f => ({...f, notes: e.target.value}))}
              placeholder="הערה (אופציונלי)" rows={2}
              className="border rounded-xl px-4 py-2.5 w-full resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => doComplete(completing)}
                className="flex-1 py-2.5 rounded-xl font-medium text-white" style={{background:'#22c55e'}}>
                אשר ביצוע ✓
              </button>
              <button onClick={() => setCompleting(null)}
                className="px-5 border rounded-xl text-gray-600 hover:bg-gray-50">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Signatures management ─── */
function SignaturesManager() {
  const [tenants, setTenants] = useState([])
  const [filterProject, setFilterProject] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const r = await api.get('/tenants/')
    setTenants(r.data.filter(t => !t.is_admin))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleSign(id) {
    const r = await api.patch(`/tenants/${id}/sign`)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, has_signed: r.data.has_signed } : t))
  }

  const projects = [...new Set(tenants.map(t => t.project).filter(Boolean))]
  const filtered = filterProject ? tenants.filter(t => t.project === filterProject) : tenants
  const signed = filtered.filter(t => t.has_signed).length
  const total = filtered.length
  const pct = total ? Math.round((signed / total) * 100) : 0

  if (loading) return <div className="text-center py-10 text-gray-400">טוען...</div>

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">סטטוס חתימות</h3>
          {projects.length > 0 && (
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">כל הפרויקטים</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-extrabold" style={{color:'#1B2A4A'}}>{pct}%</p>
            <p className="text-sm text-gray-400 mt-1">אחוז חתימות</p>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all duration-500"
                style={{width:`${pct}%`, background:'linear-gradient(90deg,#1B2A4A,#111d35)'}} />
            </div>
            <p className="text-sm text-gray-500 mt-2">{signed} מתוך {total} דיירים חתמו</p>
          </div>
        </div>
      </div>

      {/* Tenant list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-right py-3 px-4 font-medium text-gray-500">שם</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">טלפון</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">פרויקט</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">חתם</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(t => (
              <tr key={t.id} className={t.has_signed ? 'bg-green-50' : ''}>
                <td className="py-3 px-4 font-medium text-gray-800">{t.name}</td>
                <td className="py-3 px-4 text-gray-500" dir="ltr">{(t.phone || '').replace(/\D/g, '')}</td>
                <td className="py-3 px-4">
                  {t.project
                    ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t.project}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => toggleSign(t.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                      t.has_signed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}>
                    {t.has_signed && <span className="text-sm font-bold">✓</span>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Settings Manager ─── */
function SettingsManager() {
  const [form, setForm] = useState({ drive_folder_id: '', drive_api_key: '' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    api.get('/settings/').then(r => {
      setForm({
        drive_folder_id: r.data.drive_folder_id || '',
        drive_api_key: r.data.drive_api_key || '',
      })
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    await Promise.all([
      api.put('/settings/drive_folder_id', { value: form.drive_folder_id || null }),
      api.put('/settings/drive_api_key', { value: form.drive_api_key || null }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="text-gray-400 text-center py-10">טוען...</div>

  const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300'

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-bold text-gray-800">הגדרות Google Drive</h3>
        <p className="text-sm text-gray-500">
          הגדר פעם אחת כדי שייבוא האקסל יקשר תמונות תעודת זהות אוטומטית.
        </p>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Drive Folder ID</label>
          <input
            value={form.drive_folder_id}
            onChange={e => setForm({ ...form, drive_folder_id: e.target.value })}
            placeholder="קבל מ-URL של תיקיית Drive: .../folders/FOLDER_ID"
            className={inp}
            dir="ltr"
          />
          <p className="text-xs text-gray-400 mt-1">פתח את תיקיית "תעודת זהות" ב-Drive, העתק את ה-ID מה-URL</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Google Drive API Key</label>
          <div className="relative">
            <input
              value={form.drive_api_key}
              onChange={e => setForm({ ...form, drive_api_key: e.target.value })}
              placeholder="AIza..."
              className={inp + ' pr-16'}
              dir="ltr"
              type={showKey ? 'text' : 'password'}
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 px-2">
              {showKey ? 'הסתר' : 'הצג'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">console.cloud.google.com → APIs & Services → Credentials → Create API Key</p>
        </div>

        <button
          onClick={save}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {saved ? '✓ נשמר!' : 'שמור הגדרות'}
        </button>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">איך זה עובד?</p>
          <p>1. שמור Folder ID ו-API Key</p>
          <p>2. ייבא אקסל עם עמודת "תעודת זהות"</p>
          <p>3. המערכת תמצא אוטומטית את תמונת ת.ז. לכל דייר</p>
        </div>
      </div>
    </div>
  )
}

function TrashManager() {
  const [deleted, setDeleted] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const r = await api.get('/tenants/deleted')
    setDeleted(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function restore(id, name) {
    if (!window.confirm(`לשחזר את ${name}?`)) return
    await api.post(`/tenants/${id}/restore`)
    load()
  }

  async function deletePermanently(id, name) {
    if (!window.confirm(`למחוק לצמיתות את ${name}? לא ניתן לשחזר!`)) return
    await api.delete(`/tenants/${id}/permanent`)
    load()
  }

  if (loading) return <div className="text-center py-10 text-gray-400">טוען...</div>

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">🗑️ פח אשפה — דיירים מחוקים</h3>
      {deleted.length === 0 ? (
        <p className="text-gray-400 text-center py-8">פח האשפה ריק</p>
      ) : (
        <div className="space-y-3">
          {deleted.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              {t.avatar_url ? (
                <img src={t.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{t.name}</p>
                <p className="text-xs text-gray-400" dir="ltr">{t.phone}</p>
                {t.project && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t.project}</span>}
              </div>
              <button onClick={() => restore(t.id, t.name)}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors">
                ↩️ שחזר
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const tabs = [
  { id: 'stages', label: '📊 שלבים' },
  { id: 'announcements', label: '📢 הודעות' },
  { id: 'gallery', label: '📷 גלריה' },
  { id: 'plans', label: '📄 קבצים ותוכניות' },
  { id: 'contacts', label: '📞 אנשי קשר' },
  { id: 'professionals', label: '👷 אנשי מקצוע' },
  { id: 'tenants', label: '👥 דיירים' },
  { id: 'carousel', label: '🖼️ דף הבית' },
  { id: 'about', label: 'ℹ️ אודות אאורה' },
  { id: 'tasks', label: '📋 משימות' },
  { id: 'settings', label: '⚙️ הגדרות' },
  { id: 'trash', label: '🗑️ פח אשפה' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('stages')

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ פאנל ניהול</h2>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stages' && <StagesManager />}
      {tab === 'announcements' && <AnnouncementsManager />}
      {tab === 'gallery' && <GalleryManager />}
      {tab === 'plans' && <PlansManager />}
      {tab === 'contacts' && <ContactsManager />}
      {tab === 'professionals' && <ProfessionalsManager />}
      {tab === 'tenants' && <TenantsManager />}
      {tab === 'carousel' && <CarouselManager />}
      {tab === 'about' && <AboutManager />}
      {tab === 'tasks' && <TasksManager />}
      {tab === 'settings' && <SettingsManager />}
      {tab === 'trash' && <TrashManager />}
    </Layout>
  )
}

