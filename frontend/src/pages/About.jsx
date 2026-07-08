import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api'

function Accordion({ title, icon, children, count }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-right">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span className="font-bold text-gray-800 text-base">{title}</span>
          {count > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
        </div>
        <span className={`text-gray-400 text-xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="border-t px-5 py-4">{children}</div>}
    </div>
  )
}

export default function About() {
  const [projects, setProjects] = useState([])
  const [press, setPress] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/about/projects'), api.get('/about/press'), api.get('/about/company')])
      .then(([p, pr, co]) => { setProjects(p.data); setPress(pr.data); setCompany(co.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Layout><div className="text-center py-20 text-gray-400">טוען...</div></Layout>

  const hasFounder = company && (company.founder_name || company.founder_description || company.founder_image_url)

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.jpg" alt="אאורה" className="h-12 object-contain" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">אודות אאורה</h2>
          <p className="text-sm text-gray-400">מחדשים את ישראל</p>
        </div>
      </div>

      {hasFounder && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span>👑</span> מייסד הקבוצה
          </h3>
          {company.founder_image_url && (
            <div className="flex justify-center mb-4">
              <img src={company.founder_image_url} alt={company.founder_name || ''}
                className="w-32 h-32 rounded-full object-cover border-4"
                style={{borderColor:'#1B2A4A'}} />
            </div>
          )}
          {company.founder_name && (
            <p className="text-xl font-bold text-gray-800 text-center">{company.founder_name}</p>
          )}
          {company.founder_title && (
            <p className="text-sm font-medium text-center mt-0.5" style={{color:'#1B2A4A'}}>{company.founder_title}</p>
          )}
          {company.founder_years && (
            <p className="text-sm text-gray-400 text-center mt-0.5">{company.founder_years}</p>
          )}
          {company.founder_description && (
            <p className="text-sm text-gray-600 leading-relaxed text-right mt-4 whitespace-pre-line">
              {company.founder_description}
            </p>
          )}
        </div>
      )}

      <Accordion title="רשימת פרויקטים" icon="🏗️" count={projects.length}>
        {projects.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">אין פרויקטים</p>
        ) : (
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-xl p-4">
                <p className="font-bold text-gray-800">{p.name}</p>
                {p.location && <p className="text-xs text-blue-600 mt-0.5">📍 {p.location}</p>}
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-xl hover:bg-blue-700 transition-colors">
                    🌐 כנס לאתר הפרויקט
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Accordion>

      <Accordion title="מן העיתונות" icon="📰" count={press.length}>
        {press.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">אין פריטים</p>
        ) : (
          <div className="space-y-3">
            {press.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                className="block bg-gray-50 rounded-xl p-4 hover:bg-blue-50 transition-colors">
                <p className="font-bold text-gray-800">{item.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {item.source && <span className="text-xs text-blue-600 font-medium">{item.source}</span>}
                  {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </Accordion>
    </Layout>
  )
}
