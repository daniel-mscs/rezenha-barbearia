import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconArrowLeft } from '../components/Icons'
import './Login.css'

function EsqueciSenha() {
  const [searchParams] = useSearchParams()
  const ehAdmin = searchParams.get('origem') === 'admin'
  const linkVoltar = ehAdmin ? '/admin/login' : '/login'

  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const enviarLink = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    setEnviando(false)

    if (error) {
      setErro('Não foi possível enviar o link. Confere o e-mail e tenta de novo.')
      return
    }

    setEnviado(true)
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <Link to={linkVoltar} className="rz-login-voltar">
          <IconArrowLeft className="rz-icon-inline" /> Voltar para o login
        </Link>
        <div className="rz-login-logo">
          <div className="rz-login-logo-text">
            Re<span>Z</span>enha
          </div>
        </div>
        <div className="rz-login-sub">Recuperar acesso</div>

        {enviado ? (
          <div className="rz-login-success">
            Se esse e-mail estiver cadastrado, você vai receber um link pra redefinir sua senha em instantes.
          </div>
        ) : (
          <>
            {erro && <div className="rz-login-error">{erro}</div>}
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              Digite seu e-mail cadastrado e enviaremos um link pra você criar uma senha nova.
            </p>
            <form onSubmit={enviarLink}>
              <div className="rz-input-group">
                <div className="rz-field-label">E-mail</div>
                <div className="rz-input-wrap">
                  <input
                    className="rz-input rz-input-sem-icone"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button className="rz-btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default EsqueciSenha
