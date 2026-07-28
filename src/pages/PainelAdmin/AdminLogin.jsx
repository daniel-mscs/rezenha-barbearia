import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowLeft } from '../../components/Icons'
import '../Login.css'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setCarregando(false)
      setErro('E-mail ou senha inválidos.')
      return
    }

    const { data: barbeiro } = await supabase
      .from('barbeiros')
      .select('id')
      .eq('auth_id', data.user.id)
      .maybeSingle()

    setCarregando(false)

    if (!barbeiro) {
      setErro('Esse login não tem acesso ao painel admin.')
      await supabase.auth.signOut()
      return
    }

    navigate('/admin')
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <Link to="/" className="rz-login-voltar">
          <IconArrowLeft className="rz-icon-inline" /> Voltar para o início
        </Link>
        <div className="rz-login-logo">
          <div className="rz-logo-text">Re<span>Z</span>enha</div>
        </div>
        <div className="rz-login-sub">Acesso restrito — painel interno</div>

        {erro && <div className="rz-login-error">{erro}</div>}

        <form onSubmit={entrar}>
          <div className="rz-input-group">
            <div className="rz-field-label">E-mail</div>
            <div className="rz-input-wrap">
              <input className="rz-input rz-input-sem-icone" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </div>
          </div>
          <div className="rz-input-group">
            <div className="rz-field-label">Senha</div>
            <div className="rz-input-wrap">
              <input className="rz-input rz-input-sem-icone" type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="new-password" style={{ paddingRight: 40 }} />
              <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                {mostrarSenha ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          <button className="rz-btn-primary" type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar no painel'}
          </button>
          <Link to="/esqueci-senha?origem=admin" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12, color: '#888', textDecoration: 'none' }}>Esqueceu a senha?</Link>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin