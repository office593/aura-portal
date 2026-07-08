import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

const navItems = [
  { path: '/', label: 'בית', icon: '🏠' },
  { path: '/personal', label: 'אזור אישי', icon: '👤' },
  { path: '/about', label: 'אודות אאורה', icon: 'ℹ️' },
  { path: '/gallery', label: 'גלריה', icon: '📷' },
  { path: '/timeline', label: 'לוח זמנים', icon: '📅' },
  { path: '/announcements', label: 'הודעות', icon: '📢' },
  { path: '/plans', label: 'קבצים ותוכניות', icon: '📄' },
  { path: '/professionals', label: 'אנשי מקצוע', icon: '👷' },
  { path: '/contacts', label: 'צור קשר', icon: '📞' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    if (user) {
      api.get('/tenants/me').then((r) => setAvatarUrl(r.data.avatar_url)).catch(() => {})
    }
  }, [user])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-lg min-h-screen fixed right-0 top-0 z-40">
        <div className="bg-white border-b px-4 py-3 flex flex-col items-center">
          <img src="/logo.jpg" alt="אאורה" className="h-16 object-contain mb-3" />
          <div className="w-full rounded-xl px-4 py-3 flex items-center gap-2" style={{background:'linear-gradient(135deg,#1B2A4A,#111d35)'}}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 border-2 border-white/40" style={{background:'rgba(255,255,255,0.2)'}}>
                {user?.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-bold text-white">{user?.is_admin ? 'ניהול' : user?.name}</p>
              {!user?.is_admin && <p className="text-xs" style={{color:'rgba(255,255,255,0.75)'}}>פורטל דיירים</p>}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {user?.is_admin ? (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors ${
                location.pathname === '/admin' ? 'bg-orange-50 text-orange-700 font-semibold border-l-4 border-orange-700' : ''
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span>ניהול</span>
            </Link>
          ) : (
            navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 text-gray-700 transition-colors ${
                  location.pathname === item.path ? 'font-semibold border-l-4' : 'hover:bg-amber-50'
                }`}
                style={location.pathname === item.path ? {background:'#eef1f7', color:'#1B2A4A', borderColor:'#1B2A4A'} : {}}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))
          )}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-right text-gray-500 hover:text-red-600 py-2 px-4 rounded hover:bg-red-50 transition-colors text-sm"
          >
            התנתק ←
          </button>
        </div>
      </aside>

      {/* Mobile top logo bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 bg-white border-b shadow-sm z-40 flex items-center justify-center py-2">
        <img src="/logo.jpg" alt="אאורה" className="h-10 object-contain" />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 right-0 left-0 bg-white border-t shadow-lg z-40 flex overflow-x-auto scrollbar-hide">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex-shrink-0 flex flex-col items-center py-2 px-3 text-xs transition-colors"
            style={{color: location.pathname === item.path ? '#1B2A4A' : '#6b7280'}}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex-shrink-0 flex flex-col items-center py-2 px-3 text-xs text-gray-500"
        >
          <span className="text-xl">🚪</span>
          <span className="mt-0.5">יציאה</span>
        </button>
      </nav>
    </>
  )
}


