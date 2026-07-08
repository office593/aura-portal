import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api'
import { useAuth } from '../AuthContext'

function HeroCarousel({ user }) {
  const [images, setImages] = useState([])
  const [idx, setIdx] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    api.get('/carousel/').then(r => setImages(r.data)).catch(() => {})
  }, [])

  const slides = images.length > 0 ? images : [{ id: 0, url: '/bg.jpg' }]

  function go(dir) {
    setIdx(i => (i + dir + slides.length) % slides.length)
  }

  useEffect(() => {
    if (slides.length <= 1) return
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % slides.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [slides.length])

  return (
    <div className="relative rounded-2xl overflow-hidden mb-6 select-none" style={{ userSelect: 'none' }}>
      {slides.map((img, i) => (
        <img
          key={img.id}
          src={img.url}
          alt=""
          className="w-full object-contain transition-opacity duration-500"
          style={{ display: i === idx ? 'block' : 'none' }}
        />
      ))}

      {/* overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
        </>
      )}

      {/* dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}

      {/* text */}
      <div className="absolute bottom-0 right-0 left-0 z-10 px-6 py-5">
        <h2 className="text-3xl font-bold text-white drop-shadow">שלום, {user?.name} 👋</h2>
        <p className="text-white/80 mt-1 text-sm">הנה סיכום עדכני של הפרויקט שלך</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'הושלם', cls: 'bg-green-100 text-green-700' },
    active: { label: 'בביצוע', cls: 'bg-blue-100 text-blue-700' },
    pending: { label: 'טרם התחיל', cls: 'bg-gray-100 text-gray-500' },
  }
  const { label, cls } = map[status] || map.pending
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>{label}</span>
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stages, setStages] = useState([])
  const [overall, setOverall] = useState(0)
  const [announcement, setAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/project/stages'),
      api.get('/project/overall'),
      api.get('/announcements/'),
    ]).then(([s, o, a]) => {
      setStages(s.data)
      setOverall(o.data.overall_pct)
      setAnnouncement(a.data[0] || null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-lg">טוען...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <HeroCarousel user={user} />

      {/* Overall progress card */}
      {(() => {
        const activeStage = stages.find((s) => s.status === 'active')
        return (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-800">התקדמות כללית</h3>
              <span className="text-3xl font-extrabold" style={{color:'#1B2A4A'}}>{overall}%</span>
            </div>
            <div className="relative w-full bg-gray-100 rounded-full h-5 overflow-visible" style={{marginBottom:'18px'}}>
              <div
                className="progress-bar-fill bg-gradient-to-r from-blue-500 to-blue-700 h-5 rounded-full relative"
                style={{ width: `${overall}%` }}
              >
                {/* Logo circle at the tip of the bar */}
                <div className="absolute left-0 top-1/2 flex items-center justify-center z-10"
                  style={{transform:'translateX(-50%) translateY(-50%)'}}>
                  <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center"
                    style={{border:'3px solid #1B2A4A'}}>
                    <img src="/logo.jpg" alt="" className="w-10 h-10 object-contain" />
                  </div>
                </div>
                {/* Percentage text inside the bar */}
                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-extrabold" style={{right:'auto', left:'calc(50% + 28px)'}}>
                  {overall}%
                </span>
                {activeStage && (
                  <div className="absolute left-0 top-full mt-2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    {activeStage.name}
                  </div>
                )}
              </div>
            </div>
            {activeStage && (
              <p className="sm:hidden text-xs text-blue-600 font-medium mt-2 text-center">
                בביצוע: {activeStage.name}
              </p>
            )}
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>התחלה</span>
              <span>סיום</span>
            </div>
          </div>
        )
      })()}

      {/* Stages */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">שלבי הפרויקט</h3>
        <div className="space-y-4">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Step circle */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                stage.status === 'completed' ? 'bg-green-500 text-white' :
                stage.status === 'active' ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {stage.status === 'completed' ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{stage.name}</span>
                  <StatusBadge status={stage.status} />
                </div>
                {stage.target_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    יעד: {new Date(stage.target_date).toLocaleDateString('he-IL')}
                  </p>
                )}
                {stage.status !== 'pending' && (
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full progress-bar-fill"
                      style={{
                        width: `${Math.max(stage.completion_pct || 0, stage.status === 'active' ? 5 : 0)}%`,
                        background: stage.status === 'completed' ? '#22c55e' : '#1B2A4A'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest announcement */}
      {announcement && (
        <div className={`rounded-2xl p-5 mb-6 ${announcement.priority === 'urgent' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span>{announcement.priority === 'urgent' ? '⚠️' : '📢'}</span>
            <h4 className="font-bold text-gray-800">{announcement.title}</h4>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{announcement.body}</p>
          <Link to="/announcements" className="text-blue-600 text-xs mt-2 inline-block hover:underline">
            לכל ההודעות ←
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { to: '/gallery', icon: '📷', label: 'גלריית תמונות', color: 'bg-purple-50 text-purple-700' },
          { to: '/timeline', icon: '📅', label: 'לוח זמנים', color: 'bg-teal-50 text-teal-700' },
          { to: '/personal', icon: '🏠', label: 'דירה שלי', color: 'bg-orange-50 text-orange-700' },
          { to: '/announcements', icon: '📢', label: 'הודעות', color: 'bg-red-50 text-red-700' },
          { to: '/contacts', icon: '📞', label: 'אנשי קשר', color: 'bg-green-50 text-green-700' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`${item.color} rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity shadow-sm`}
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-sm font-medium text-center">{item.label}</span>
          </Link>
        ))}
      </div>
    </Layout>
  )
}


