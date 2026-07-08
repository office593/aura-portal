import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

const CATEGORIES = ['יזם', 'מנהלת', 'עו"ד דיירים', 'שמאי דיירים']

const CATEGORY_ICONS = {
  'יזם': '🏗️',
  'מנהלת': '👩‍💼',
  'עו"ד דיירים': '⚖️',
  'שמאי דיירים': '📊',
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contacts/').then((r) => setContacts(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  const grouped = CATEGORIES.map(cat => ({
    cat,
    items: contacts.filter(c => c.category === cat)
  })).filter(g => g.items.length > 0)

  const uncategorized = contacts.filter(c => !c.category || !CATEGORIES.includes(c.category))

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">צור קשר</h2>

      {contacts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">📞</div>
          <p>אין אנשי קשר</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
              </h3>
              <div className="space-y-2">
                {items.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800">{c.name}</p>
                      {c.role && <p className="text-xs text-gray-400 mt-0.5">{c.role}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {c.phone && (
                        <a href={`tel:${c.phone}`}
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                          📞 {c.phone}
                        </a>
                      )}
                      {c.whatsapp && (
                        <a href={`https://wa.me/972${c.whatsapp.replace(/^0/, '')}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
                          💬 וואטסאפ
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`}
                          className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                          ✉️ מייל
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}
    </Layout>
  )
}
