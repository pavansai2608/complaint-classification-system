import { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  // Whether the initial silent-refresh attempt (on page load) has finished.
  const [ready, setReady] = useState(false)

  // Sets the header straight away, not in an effect: a page's own effects
  // run before this provider's, so on a reload the page's first request
  // would otherwise go out without the token and get a 401.
  function saveToken(token) {
    apiClient.defaults.headers.common.Authorization = token ? `Bearer ${token}` : undefined
    setAccessToken(token)
  }

  useEffect(() => {
    // The access token only ever lives in memory, so a page reload loses
    // it. Try to get a new one from the httpOnly refresh cookie instead of
    // forcing the user to log in again every time they refresh the page.
    apiClient
      .post('/api/auth/refresh')
      .then((res) => {
        setUser(res.data.user)
        saveToken(res.data.accessToken)
      })
      .catch(() => {
        // No valid session yet; that's fine, the user just isn't logged in.
      })
      .finally(() => setReady(true))
  }, [])

  async function login(email, password) {
    const res = await apiClient.post('/api/auth/login', { email, password })
    setUser(res.data.user)
    saveToken(res.data.accessToken)
  }

  async function loginWithGoogle(credential) {
    const res = await apiClient.post('/api/auth/google', { credential })
    setUser(res.data.user)
    saveToken(res.data.accessToken)
  }

  async function logout() {
    await apiClient.post('/api/auth/logout')
    setUser(null)
    saveToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, ready, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}

export { AuthProvider, useAuth }
