import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import RoleHome from './pages/RoleHome'
import NewComplaint from './pages/NewComplaint'
import MyComplaints from './pages/MyComplaints'
import ComplaintDetail from './pages/ComplaintDetail'
import './App.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allow={['customer']} />}>
            <Route path="/customer" element={<RoleHome />} />
            <Route path="/complaints/new" element={<NewComplaint />} />
            <Route path="/complaints" element={<MyComplaints />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
          </Route>
          <Route element={<RoleRoute allow={['agent']} />}>
            <Route path="/agent" element={<RoleHome />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AppRoutes />
        </GoogleOAuthProvider>
      ) : (
        <AppRoutes />
      )}
    </AuthProvider>
  )
}

export default App
