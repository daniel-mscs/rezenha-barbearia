import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff } from '../components/Icons'
import './Login.css'

function Convite() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [carregando, setCarregando] = useState(true)
  const [clienteInfo, setClienteInfo] = useState(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const buscar = async () => {
      const { data, error } = await supabase.rpc('buscar_cliente_por_convite', { p_token: token })
      if (error || !data || data.length === 0) {
        setClienteInfo(null)
      } else {
        setClienteInfo(data[0])
      }
      setCarregando(false)
    }
    buscar()
  }, [token])

  const criarConta = async (e) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6 || !/\d/.test(senha)) {
      setErro('A senha precisa ter no mínimo 6 caracteres e incluir pelo menos 1 número.')
      return
    }

    setEnviando(true)

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome: clienteInfo.nome, telefone: clienteInfo.telefone },
      },
    })

    setEnviando(false)

    if (error) {
      setErro(error.message === 'User already registered' ? 'Esse e-mail já está cadastrado.' : 'Não foi possível criar a conta.')
      return
    }

    setSucesso(true)
  }

  if (carregando) {
    return <div className="rz-login-body"><div style={{ color: '#666' }}>Carregando...</div></div>
  }

  if (!clienteInfo) {
    return (
      <div className="rz-login-body">
        <div className="rz-login-box">
          <div className="rz-login-sub">Convite inválido ou expirado.</div>
          <Link to="/" className="rz-login-voltar" style={{ marginTop: 16 }}>‹ Voltar para o início</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <div className="rz-login-logo">
          <div className="rz-logo-text">Re<span>Z</span>enha</div>
        </div>
        <div className="rz-login-sub">Bem-vindo(a), {clienteInfo.nome.split(' ')[0]}!</div>

        {sucesso ? (
          <div className="rz-login-success">
            Conta criada! Verifique seu e-mail para confirmar o cadastro, depois entre normalmente em /login.
          </div>
        ) : (
          <>
            {erro && <div className="rz-login-error">{erro}</div>}
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              Cria uma senha pra acompanhar seus agendamentos na Rezenha.
            </p>
            <form onSubmit={criarConta}>
              <div className="rz-input-group">
                <div className="rz-field-label">E-mail</div>
                <div className="rz-input-wrap">
                  <input className="rz-input rz-input-sem-icone" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="rz-input-group">
                <div className="rz-field-label">Senha</div>
                <div className="rz-input-wrap">
                  <input className="rz-input rz-input-sem-icone" type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} style={{ paddingRight: 40 }} />
                  <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                    {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
              <button className="rz-btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Criando...' : 'Criar minha conta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default Convite