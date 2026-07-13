import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const statusConfig = {
  completed: { label: 'הושלם', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  active:    { label: 'בביצוע', color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-500'  },
  pending:   { label: 'צפוי',   color: 'text-gray-400',  bg: 'bg-gray-50',  border: 'border-gray-200',  dot: 'bg-gray-300'  },
}

const CATEGORY_ORDER = ['תב"ע', 'תכנית עיצוב אדריכלי', 'היתר בנייה']
const CATEGORY_STYLES = {
  'תב"ע':                    { header: 'bg-purple-600', bar: 'bg-purple-500' },
  'תכנית עיצוב אדריכלי':    { header: 'bg-blue-600',   bar: 'bg-blue-500'   },
  'היתר בנייה':              { header: 'bg-green-600',  bar: 'bg-green-500'  },
}

export default function Timeline() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/project/stages').then((r) => setStages(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: stages.filter(s => s.category === cat).sort((a, b) => a.order - b.order),
  })).filter(g => g.items.length > 0)

  const uncategorized = stages.filter(s => !s.category || !CATEGORY_ORDER.includes(s.category))

  function renderStage(stage, idx) {
    const cfg = statusConfig[stage.status] || statusConfig.pending
    return (
      <div key={stage.id} className="flex gap-4 relative">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full ${cfg.dot} flex items-center justify-center text-white text-sm font-bold shadow-md z-10`}>
          {stage.status === 'completed' ? '✓' : idx + 1}
        </div>
        <div className={`flex-1 ${cfg.bg} border ${cfg.border} rounded-xl p-4 mb-2`}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-gray-800">{stage.name}</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          {stage.description && <p className="text-gray-600 text-sm mt-2">{stage.description}</p>}
          {stage.target_date && (
            <p className="text-xs text-gray-400 mt-2">📅 יעד: {new Date(stage.target_date).toLocaleDateString('he-IL')}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">לוח זמנים</h2>

      <div className="space-y-6">
        {grouped.map(({ cat, items }) => {
          const style = CATEGORY_STYLES[cat] || { header: 'bg-gray-600', bar: 'bg-gray-500' }
          const pct = items.length ? Math.round(items.filter(s => s.status === 'completed').length / items.length * 100) : 0
          return (
            <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className={`${style.header} px-5 py-3 flex items-center justify-between`}>
                <h3 className="text-white font-bold">{cat}</h3>
                <span className="text-white text-sm bg-white/20 px-3 py-1 rounded-full">{pct}% הושלם</span>
              </div>
              <div className="h-1.5 bg-gray-100">
                <div className={`h-full ${style.bar} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="p-4 space-y-3 relative">
                <div className="absolute right-8 top-4 bottom-4 w-0.5 bg-gray-100" />
                {items.map((s, i) => renderStage(s, i))}
              </div>
            </div>
          )
        })}

        {uncategorized.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 relative">
            <div className="absolute right-8 top-4 bottom-4 w-0.5 bg-gray-100" />
            <h3 className="text-sm font-semibold text-gray-500 mb-3">שלבים נוספים</h3>
            {uncategorized.map((s, i) => renderStage(s, i))}
          </div>
        )}
      </div>
    </Layout>
  )
}
