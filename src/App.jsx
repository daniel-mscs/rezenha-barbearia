import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import Home from './pages/Home'
import Agendamento from './pages/Agendamento'
import Login from './pages/Login'
import AdminLogin from './pages/PainelAdmin/AdminLogin'
import Agendamentos from './pages/PainelAdmin/Agendamentos'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import Servicos from './pages/PainelAdmin/Servicos'
import Barbeiros from './pages/PainelAdmin/Barbeiros'
import Clientes from './pages/PainelAdmin/Clientes'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/agendamento" element={<Agendamento />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedAdminRoute><Agendamentos /></ProtectedAdminRoute>} />
        <Route path="/admin/servicos" element={<ProtectedAdminRoute><Servicos /></ProtectedAdminRoute>} />
        <Route path="/admin/barbeiros" element={<ProtectedAdminRoute><Barbeiros /></ProtectedAdminRoute>} />
        <Route path="/admin/clientes" element={<ProtectedAdminRoute><Clientes /></ProtectedAdminRoute>} />
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}

export default App