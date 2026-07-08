import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const CATEGORIES = ['הכל', 'הדמיות פרויקט', 'כנסים', 'מפגשים בשכונה']

const CAT_ICONS = {
  'הכל': '🖼️',
  'הדמיות פרויקט': '🏗️',
  'כנסים': '🎤',
  'מפגשים בשכונה': '🤝',
}

export default function Gallery() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('הכל')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/gallery/').then((r) => setItems(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  const filtered = activeTab === 'הכל' ? items : items.filter(i => i.category === activeTab)

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">גלריה</h2>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === cat
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            <span>{CAT_ICONS[cat]}</span>
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📷</div>
          <p>אין תמונות בקטגוריה זו</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-100 relative group"
              onClick={() => setSelected(item)}
            >
              <img src={item.url} alt={item.caption || ''} className="w-full h-full object-cover" loading="lazy" />
              {item.caption && (
                <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs">{item.caption}</p>
                </div>
              )}
              {item.category && (
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {CAT_ICONS[item.category]} {item.category}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (() => {
        const pool = activeTab === 'הכל' ? items : filtered
        const idx = pool.findIndex((i) => i.id === selected.id)
        const prev = pool[idx - 1]
        const next = pool[idx + 1]
        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={selected.url} alt={selected.caption || ''} className="w-full rounded-xl max-h-[70vh] object-contain" />
              {next && (
                <button onClick={() => setSelected(next)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
              {prev && (
                <button onClick={() => setSelected(prev)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                {idx + 1} / {pool.length}
              </div>
              {selected.caption && <p className="text-white text-center mt-3">{selected.caption}</p>}
              <button onClick={() => setSelected(null)} className="mt-3 w-full text-gray-300 hover:text-white text-center text-sm">
                סגור ✕
              </button>
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}
