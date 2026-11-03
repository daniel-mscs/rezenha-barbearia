import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../components/Icons'
import './Login.css'

const URL_FUNCAO = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resetar-senha-cliente`
const EMPRESA_ID = import.meta.env.VITE_EMPRESA_ID

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

async function chamarFuncao(corpo) {
  const resposta = await fetch(URL_FUNCAO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, empresa_id: EMPRESA_ID }),
  })
  const dados = await resposta.json().catch(() => ({}))
  return { ok: resposta.ok, dados }
}

function EsqueciSenhaCliente() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState('telefone') // 'telefone' | 'codigo' | 'pronto'
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const pedirCodigo = async (e) => {
    if (e) e.preventDefault()
    setErro('')
    setAviso('')
    if (telefone.length < 10) {
      setErro('Digite o WhatsApp completo, com DDD.')
      return
    }
    setCarregando(true)
    const { ok } = await chamarFuncao({ acao: 'enviar', telefone })
    setCarregando(false)
    if (!ok) {
      setErro('Não foi possível enviar o código. Tenta de novo em instantes.')
      return
    }
    setCodigo('')
    setEtapa('codigo')
    setAviso('Se esse número estiver cadastrado, o código chega no seu WhatsApp em instantes.')
  }

  const confirmar = async (e) => {
    e.preventDefault()
    setErro('')
    if (codigo.length !== 6) {
      setErro('O código tem 6 números.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha precisa ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não são iguais.')
      return
    }
    setCarregando(true)
    const { ok, dados } = await chamarFuncao({ acao: 'confirmar', telefone, codigo, nova_senha: novaSenha })
    setCarregando(false)
    if (!ok) {
      setErro(dados.erro || 'Não foi possível trocar a senha.')
      return
    }
    setEtapa('pronto')
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <Link to="/login" className="rz-login-voltar">
          <IconArrowLeft className="rz-icon-inline" /> Voltar para o login
        </Link>
        <div className="rz-login-logo">
          <div className="rz-login-logo-text">
            Re<span>Z</span>enha
          </div>
        </div>
        <div className="rz-login-sub">Recuperar senha</div>

        {erro && <div className="rz-login-error">{erro}</div>}

        {etapa === 'telefone' && (
          <>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              Digite seu WhatsApp cadastrado. Vamos te mandar um código de 6 números por lá.
            </p>
            <form onSubmit={pedirCodigo}>
              <div className="rz-input-group">
                <div className="rz-field-label">WhatsApp</div>
                <div className="rz-input-wrap">
                  <input
                    className="rz-input rz-input-sem-icone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="(55) 9 9999-9999"
                    value={formatarTelefone(telefone)}
                    onChange={(e) => setTelefone(apenasNumeros(e.target.value).slice(0, 11))}
                    maxLength={16}
                    required
                  />
                </div>
              </div>
              <button className="rz-btn-primary" type="submit" disabled={carregando}>
                {carregando ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          </>
        )}

        {etapa === 'codigo' && (
          <>
            {aviso && <div className="rz-login-success">{aviso}</div>}
            <form onSubmit={confirmar}>
              <div className="rz-input-group">
                <div className="rz-field-label">Código recebido</div>
                <div className="rz-input-wrap">
                  <input
                    className="rz-input rz-input-sem-icone"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(apenasNumeros(e.target.value).slice(0, 6))}
                    maxLength={6}
                    style={{ letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
                    required
                  />
                </div>
              </div>
              <div className="rz-input-group">
                <div className="rz-field-label">Nova senha</div>
                <div className="rz-input-wrap">
                  <input
                    className="rz-input rz-input-sem-icone"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="rz-input-group">
                <div className="rz-field-label">Confirmar nova senha</div>
                <div className="rz-input-wrap">
                  <input
                    className="rz-input rz-input-sem-icone"
                    type="password"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button className="rz-btn-primary" type="submit" disabled={carregando}>
                {carregando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12 }}>
              <button
                type="button"
                onClick={() => pedirCodigo()}
                disabled={carregando}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={() => {
                  setEtapa('telefone')
                  setErro('')
                  setAviso('')
                }}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Trocar número
              </button>
            </div>
          </>
        )}

        {etapa === 'pronto' && (
          <>
            <div className="rz-login-success">Senha alterada! Agora é só entrar com seu WhatsApp e a senha nova.</div>
            <button className="rz-btn-primary" type="button" onClick={() => navigate('/login')}>
              Ir para o login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default EsqueciSenhaCliente