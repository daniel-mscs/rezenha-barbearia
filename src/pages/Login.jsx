import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff, IconArrowLeft } from '../components/Icons'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [aba, setAba] = useState('entrar')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setCarregando(false)
      setErro('E-mail ou senha inválidos.')
      return
    }

    const user = data.user

    // Tenta vincular esse login a um cadastro já existente (feito manualmente pelo dono), casando pelo telefone
    await supabase.rpc('vincular_cliente_por_telefone')

    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (!clienteExistente) {
      await supabase.from('clientes').insert({
        nome: user.user_metadata?.nome || '',
        telefone: user.user_metadata?.telefone || '',
        email: user.email,
        auth_id: user.id,
      })
    }

    setCarregando(false)
    navigate('/agendamento')
  }

  const criarConta = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, telefone },
      },
    })

    setCarregando(false)

    if (error) {
      setErro(error.message === 'User already registered' ? 'Esse e-mail já está cadastrado.' : 'Não foi possível criar a conta.')
      return
    }

    setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.')
    setAba('entrar')
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
        <div className="rz-login-sub">Acesso do cliente</div>

        <div className="rz-tabs">
          <div className={`rz-tab ${aba === 'entrar' ? 'active' : ''}`} onClick={() => { setAba('entrar'); setErro(''); setSucesso('') }}>
            Entrar
          </div>
          <div className={`rz-tab ${aba === 'criar' ? 'active' : ''}`} onClick={() => { setAba('criar'); setErro(''); setSucesso('') }}>
            Criar conta
          </div>
        </div>

        {erro && <div className="rz-login-error">{erro}</div>}
        {sucesso && <div className="rz-login-success">{sucesso}</div>}

        {aba === 'entrar' ? (
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
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={criarConta}>
            <div className="rz-input-group">
              <div className="rz-field-label">Nome</div>
              <div className="rz-input-wrap">
                <input className="rz-input rz-input-sem-icone" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">Celular (WhatsApp)</div>
              <div className="rz-input-wrap">
                <input className="rz-input rz-input-sem-icone" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">E-mail</div>
              <div className="rz-input-wrap">
                <input className="rz-input rz-input-sem-icone" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">Senha</div>
              <div className="rz-input-wrap">
                <input className="rz-input rz-input-sem-icone" type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} autoComplete="new-password" style={{ paddingRight: 40 }} />
                <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                  {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            <button className="rz-btn-primary" type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login