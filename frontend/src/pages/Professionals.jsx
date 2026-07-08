import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-500', 'bg-teal-600', 'bg-rose-600', 'bg-indigo-600']

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Professionals() {
  const [pros, setPros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contacts/professionals').then(r => setPros(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">אנשי מקצוע</h2>

      <div className="space-y-3">
        {pros.map((p, idx) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.name} className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-100 flex-shrink-0 p-1" />
            ) : (
              <div className={`w-16 h-16 rounded-xl ${colors[idx % colors.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                {initials(p.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 mb-0.5">{p.role}</p>
              <p className="font-bold text-gray-800">{p.name}</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {p.whatsapp && (
                <a href={`https://wa.me/972${p.whatsapp.replace(/^0/, '')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-xl text-sm font-medium">
                  💬 וואטסאפ
                </a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded-xl text-sm font-medium">
                  ✉️ מייל
                </a>
              )}
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-xl text-sm font-medium">
                  🌐 אתר
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
