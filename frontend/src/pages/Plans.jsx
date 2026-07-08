import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

export default function Plans() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tenant-docs/my').then((r) => setDocs(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">קבצים ותוכניות</h2>

      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-lg font-medium">אין קבצים להצגה כרגע</p>
          <p className="text-sm mt-1">המסמכים שלך יופיעו כאן לאחר שיועלו</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow">
              <span className="text-3xl flex-shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{doc.caption || doc.filename}</p>
                {doc.caption && <p className="text-xs text-gray-400 truncate mt-0.5">{doc.filename}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('he-IL')}
                </p>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors"
              >
                פתח PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
