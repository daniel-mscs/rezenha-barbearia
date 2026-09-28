import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconEye, IconEyeOff, IconArrowLeft } from '../components/Icons'
import './Login.css'

function telefoneParaEmail(telefone) {
  return `${telefone.replace(/\D/g, '')}@whatsapp.cliente`
}

function apenasNumeros(valor) {
  return valor.replace(/\D/g, '')
}

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)
  if (numeros.length === 0) return ''
  if (numeros.length <= 2) return numeros.replace(/(\d{0,2})/, '($1')
  if (numeros.length <= 3) return numeros.replace(/(\d{2})(\d{0,1})/, '($1) $2')
  if (numeros.length <= 7) return numeros.replace(/(\d{2})(\d{1})(\d{0,4})/, '($1) $2 $3')
  return numeros.replace(/(\d{2})(\d{1})(\d{4})(\d{0,4})/, '($1) $2 $3-$4')
}

function Login() {
  const navigate = useNavigate()
  const [aba, setAba] = useState('entrar')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: telefoneParaEmail(telefone),
      password: senha,
    })

    if (error) {
      setCarregando(false)
      setErro('Telefone ou senha inválidos.')
      return
    }

    const user = data.user
    const { data: clienteExistente } = await supabase.from('clientes').select('id').eq('auth_id', user.id).maybeSingle()

    if (!clienteExistente) {
      await supabase.from('clientes').insert({
        nome: user.user_metadata?.nome || '',
        telefone: user.user_metadata?.telefone || '',
        auth_id: user.id,
      })
    }

    setCarregando(false)
    navigate('/agendamento')
  }

  const criarConta = async (e) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6 || !/\d/.test(senha)) {
      setErro('A senha precisa ter no mínimo 6 caracteres e incluir pelo menos 1 número.')
      return
    }

    setCarregando(true)

    const resposta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-conta-cliente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone: telefone.replace(/\D/g, ''), senha }),
    })
    const resultado = await resposta.json()

    if (!resposta.ok) {
      setCarregando(false)
      setErro(resultado.erro?.includes('já tem uma conta') ? resultado.erro : 'Não foi possível criar a conta.')
      return
    }

    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email: telefoneParaEmail(telefone),
      password: senha,
    })

    setCarregando(false)

    if (erroLogin) {
      setAba('entrar')
      setErro('')
      return
    }

    navigate('/agendamento')
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <Link to="/" className="rz-login-voltar">
          <IconArrowLeft className="rz-icon-inline" /> Voltar para o início
        </Link>
        <div className="rz-login-logo">
          <div className="rz-logo-text">
            Re<span>Z</span>enha
          </div>
        </div>
        <div className="rz-login-sub">Acesso do cliente</div>

        <div className="rz-tabs">
          <div
            className={`rz-tab ${aba === 'entrar' ? 'active' : ''}`}
            onClick={() => {
              setAba('entrar')
              setErro('')
            }}
          >
            Entrar
          </div>
          <div
            className={`rz-tab ${aba === 'criar' ? 'active' : ''}`}
            onClick={() => {
              setAba('criar')
              setErro('')
            }}
          >
            Criar conta
          </div>
        </div>

        {erro && <div className="rz-login-error">{erro}</div>}

        {aba === 'entrar' ? (
          <form onSubmit={entrar}>
            <div className="rz-input-group">
              <div className="rz-field-label">WhatsApp</div>
              <div className="rz-input-wrap">
                <input
                  className="rz-input rz-input-sem-icone"
                  type="text"
                  placeholder="(55) 9 9999-9999"
                  value={formatarTelefone(telefone)}
                  onChange={(e) => setTelefone(apenasNumeros(e.target.value).slice(0, 11))}
                  maxLength={16}
                  required
                />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">Senha</div>
              <div className="rz-input-wrap">
                <input
                  className="rz-input rz-input-sem-icone"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                  {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            <button className="rz-btn-primary" type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
            <Link
              to="/recuperar-senha"
              style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12, color: '#888', textDecoration: 'none' }}
            >
              Esqueceu a senha?
            </Link>
            <div className="rz-seguranca-nota">🔒 Seus dados estão protegidos e seguros.</div>
          </form>
        ) : (
          <form onSubmit={criarConta}>
            <div className="rz-input-group">
              <div className="rz-field-label">Nome</div>
              <div className="rz-input-wrap">
                <input
                  className="rz-input rz-input-sem-icone"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">WhatsApp</div>
              <div className="rz-input-wrap">
                <input
                  className="rz-input rz-input-sem-icone"
                  type="text"
                  placeholder="(55) 9 9999-9999"
                  value={formatarTelefone(telefone)}
                  onChange={(e) => setTelefone(apenasNumeros(e.target.value).slice(0, 11))}
                  maxLength={16}
                  required
                />
              </div>
            </div>
            <div className="rz-input-group">
              <div className="rz-field-label">Senha</div>
              <div className="rz-input-wrap">
                <input
                  className="rz-input rz-input-sem-icone"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  style={{ paddingRight: 40 }}
                />
                <button type="button" className="rz-input-toggle-senha" onClick={() => setMostrarSenha((v) => !v)}>
                  {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            <button className="rz-btn-primary" type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar conta'}
            </button>
            <div className="rz-seguranca-nota">🔒 Seus dados estão protegidos e seguros.</div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login