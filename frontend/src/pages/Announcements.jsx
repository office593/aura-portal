import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

export default function Announcements() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/announcements/').then((r) => setItems(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">לוח מודעות</h2>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📢</div>
          <p>אין הודעות כרגע</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm p-5 border-r-4 ${
                item.priority === 'urgent' ? 'border-red-500' : 'border-blue-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {item.priority === 'urgent' ? '⚠️' : '📢'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                    {item.priority === 'urgent' && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">דחוף</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-2 leading-relaxed">{item.body}</p>
                  <p className="text-gray-400 text-xs mt-3">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString('he-IL', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
