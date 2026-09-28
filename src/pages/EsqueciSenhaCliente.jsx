import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../components/Icons'
import './Login.css'

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

function EsqueciSenhaCliente() {
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const solicitar = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const resposta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resetar-senha-cliente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: apenasNumeros(telefone) }),
    })

    setEnviando(false)

    if (!resposta.ok) {
      setErro('Não foi possível processar seu pedido. Tenta de novo em instantes.')
      return
    }

    setEnviado(true)
  }

  return (
    <div className="rz-login-body">
      <div className="rz-login-box">
        <Link to="/login" className="rz-login-voltar">
          <IconArrowLeft className="rz-icon-inline" /> Voltar para o login
        </Link>
        <div className="rz-login-logo">
          <div className="rz-logo-text">
            Re<span>Z</span>enha
          </div>
        </div>
        <div className="rz-login-sub">Recuperar senha</div>

        {enviado ? (
          <div className="rz-login-success">Se esse número estiver cadastrado, uma nova senha foi enviada pelo WhatsApp em instantes.</div>
        ) : (
          <>
            {erro && <div className="rz-login-error">{erro}</div>}
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              Digite seu WhatsApp cadastrado. Vamos gerar uma senha nova e te mandar por lá.
            </p>
            <form onSubmit={solicitar}>
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
              <button className="rz-btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default EsqueciSenhaCliente