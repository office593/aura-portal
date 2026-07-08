import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const statusConfig = {
  completed: { icon: '✅', label: 'הושלם', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  active: { icon: '🔵', label: 'בביצוע', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  pending: { icon: '⏳', label: 'צפוי', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-300' },
}

export default function Timeline() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/project/stages').then((r) => setStages(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">לוח זמנים</h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {stages.map((stage) => {
            const cfg = statusConfig[stage.status] || statusConfig.pending
            return (
              <div key={stage.id} className="flex gap-6 relative">
                {/* Dot */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${cfg.dot} flex items-center justify-center text-white text-sm font-bold shadow-md z-10`}>
                  {stage.status === 'completed' ? '✓' : stage.order}
                </div>

                {/* Card */}
                <div className={`flex-1 ${cfg.bg} border ${cfg.border} rounded-xl p-4 mb-2`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className={`font-bold text-gray-800`}>{stage.name}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {stage.description && (
                    <p className="text-gray-600 text-sm mt-2">{stage.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    {stage.target_date && (
                      <span className="text-xs text-gray-400">
                        📅 יעד: {new Date(stage.target_date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                    {stage.status !== 'pending' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${stage.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${stage.completion_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{stage.completion_pct}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
