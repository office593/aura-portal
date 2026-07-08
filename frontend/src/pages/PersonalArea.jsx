import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

export default function PersonalArea() {
  const [profile, setProfile] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/tenants/me').then((r) => setProfile(r.data)),
      api.get('/tenant-docs/my').then((r) => setDocs(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  const specs = profile?.specs || {}

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">האזור האישי שלי</h2>

      {/* Old apartment info */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">דירה נוכחית</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="text-2xl mb-1">🧭</div>
          <p className="text-xs text-gray-400 mb-1">כיוון אוויר ישן</p>
          <p className="text-xl font-bold text-gray-800">{profile?.air_old || '—'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="text-2xl mb-1">🏢</div>
          <p className="text-xs text-gray-400 mb-1">קומה ישנה</p>
          <p className="text-xl font-bold text-gray-800">{profile?.floor_old ? `קומה ${profile.floor_old}` : '—'}</p>
        </div>
      </div>

      {/* New apartment info */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">דירה חדשה בשיבוץ ✨</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-600 rounded-2xl shadow-sm p-5 text-white">
          <div className="text-2xl mb-1">🧭</div>
          <p className="text-xs text-blue-200 mb-1">כיוון אוויר חדש</p>
          <p className="text-xl font-bold">{profile?.air_new || '—'}</p>
        </div>
        <div className="bg-blue-700 rounded-2xl shadow-sm p-5 text-white">
          <div className="text-2xl mb-1">🏠</div>
          <p className="text-xs text-blue-200 mb-1">קומה חדשה</p>
          <p className="text-xl font-bold">{profile?.floor_new ? `קומה ${profile.floor_new}` : '—'}</p>
        </div>
      </div>

      {/* Technical specs */}
      {Object.keys(specs).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">מפרט טכני — דירה חדשה</h3>
          <div className="divide-y">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="py-3 flex justify-between items-start gap-4">
                <span className="text-gray-500 text-sm font-medium w-32 flex-shrink-0">{key}</span>
                <span className="text-gray-800 text-sm text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* ID Card */}
      {profile?.id_image_url && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mt-6">
          <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span>📄</span> תעודת זהות
          </h3>
          {profile.id_image_url.includes('/preview') ? (
            <iframe
              src={profile.id_image_url}
              className="w-full rounded-xl border border-gray-100"
              style={{height: '500px'}}
              allow="autoplay"
            />
          ) : (
            <img src={profile.id_image_url} alt="תעודת זהות"
              className="w-full rounded-xl border border-gray-100" />
          )}
        </div>
      )}

      {/* Documents */}
      {docs.filter(d => d.is_personal).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">קבצים אישיים</h3>
          <div className="space-y-3">
            {docs.filter(d => d.is_personal).map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl shadow-sm flex items-center gap-4 px-5 py-4">
                <span className="text-3xl flex-shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{doc.caption || doc.filename}</p>
                  {doc.caption && <p className="text-xs text-gray-400 truncate mt-0.5">{doc.filename}</p>}
                </div>
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                  פתח PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
