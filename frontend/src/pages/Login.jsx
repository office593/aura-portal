import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [devCode, setDevCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function sendOTP(e) {
    e.preventDefault()
    setError('')
    if (!phone.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/send-otp', { phone: phone.trim() })
      setDevCode(res.data.dev_code)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בשליחת הקוד')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-otp', { phone: phone.trim(), code: otp.trim() })
      login(res.data.access_token, { name: res.data.name, is_admin: res.data.is_admin, phone: phone.trim() })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'קוד שגוי')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg,#f0f2f7 0%,#ede8dc 100%)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border-4" style={{borderColor:'#1B2A4A', background:'#eef1f7'}}>
            <img src="/logo.jpg" alt="אאורה" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">פורטל דיירים</h1>
          <p className="text-gray-500 mt-1 text-sm">שקיפות, שקט נפשי, עדכונים בזמן אמת</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר טלפון</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                dir="ltr"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'שולח...' : 'שלח קוד אימות'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP} className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">שלחנו קוד אימות ל-</p>
              <p className="font-bold text-blue-700 mt-1" dir="ltr">{phone}</p>
            </div>

            {/* Dev mode: show the OTP code */}
            {devCode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                <p className="text-xs text-yellow-700 font-medium">מצב פיתוח — הקוד שלך:</p>
                <p className="text-2xl font-bold tracking-widest text-yellow-800 mt-1">{devCode}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קוד אימות (6 ספרות)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'מאמת...' : 'כניסה'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setError(''); setOtp(''); setDevCode('') }}
              className="w-full text-gray-500 text-sm hover:text-gray-700"
            >
              ← חזרה לשינוי מספר
            </button>
          </form>
        )}
      </div>
    </div>
  )
}


