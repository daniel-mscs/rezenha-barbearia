import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff } from '../components/Icons'
import './Login.css'

function RedefinirSenha() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const salvarNovaSenha = async (e) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6 || !/\d/.test(senha)) {
      setErro('A senha precisa ter no mínimo 6 caracteres e incluir pelo menos 1 número.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)

    if (error) {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.')
      return
    }

    setSucesso(true)
    setTimeout(() => navigate('/login'), 2500)
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <div className="rz-login-logo">
          <div className="rz-logo-text">Re<span>Z</span>enha</div>
        </div>
        <div className="rz-login-sub">Criar nova senha</div>

        {sucesso ? (
          <div className="rz-login-success">Senha redefinida! Redirecionando para o login...</div>
        ) : (
          <>
            {erro && <div className="rz-login-error">{erro}</div>}
            <form onSubmit={salvarNovaSenha}>
              <div className="rz-input-group">
                <div className="rz-field-label">Nova senha</div>
                <div className="rz-input-wrap">
                  <input className="rz-input rz-input-sem-icone" type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ paddingRight: 40 }} />
                  <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                    {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
              <button className="rz-btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default RedefinirSenha