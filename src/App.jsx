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
import MeuPortfolio from './pages/PainelAdmin/MeuPortfolio'
import Estoque from './pages/PainelAdmin/Estoque'
import Aniversarios from './pages/PainelAdmin/Aniversarios'
import MeuPerfil from './pages/PainelAdmin/MeuPerfil'
import Relatorios from './pages/PainelAdmin/Relatorios'
import Configuracoes from './pages/PainelAdmin/Configuracoes'
import Caixa from './pages/PainelAdmin/Caixa'
import EsqueciSenha from './pages/EsqueciSenha'
import EsqueciSenhaCliente from './pages/EsqueciSenhaCliente'
import Jogo from './pages/Jogo'
import ConfirmarPresenca from './pages/ConfirmarPresenca'
import RedefinirSenha from './pages/RedefinirSenha'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/agendamento" element={<Agendamento />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <Agendamentos />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/servicos"
          element={
            <ProtectedAdminRoute>
              <Servicos />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/barbeiros"
          element={
            <ProtectedAdminRoute>
              <Barbeiros />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <ProtectedAdminRoute>
              <Clientes />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/portfolio"
          element={
            <ProtectedAdminRoute>
              <MeuPortfolio />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/relatorios"
          element={
            <ProtectedAdminRoute>
              <Relatorios />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/configuracoes"
          element={
            <ProtectedAdminRoute>
              <Configuracoes />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/caixa"
          element={
            <ProtectedAdminRoute>
              <Caixa />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/confirmar/:id" element={<ConfirmarPresenca />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route
          path="/admin/estoque"
          element={
            <ProtectedAdminRoute>
              <Estoque />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/meu-perfil"
          element={
            <ProtectedAdminRoute>
              <MeuPerfil />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/recuperar-senha" element={<EsqueciSenhaCliente />} />
        <Route path="/jogo" element={<Jogo />} />
  <Route path="/admin/aniversarios" element={<ProtectedAdminRoute><Aniversarios /></ProtectedAdminRoute>} />
</Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}

export default App
