import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Login.css'

function ConfirmarPresenca() {
  const { id } = useParams()
  const [estado, setEstado] = useState('carregando')

  useEffect(() => {
    const confirmar = async () => {
      const { data, error } = await supabase.rpc('confirmar_presenca_publico', { p_id: id })
      if (error || data === 'nao_encontrado') setEstado('erro')
      else if (data === 'cancelado') setEstado('cancelado')
      else setEstado('ok')
    }
    confirmar()
  }, [id])

  return (
    <div className="rz-login-body">
      <div className="rz-login-box" style={{ textAlign: 'center' }}>
        <div className="rz-login-logo">
          <div className="rz-logo-text">
            Re<span>Z</span>enha
          </div>
        </div>

        {estado === 'carregando' && <div className="rz-login-sub">Confirmando...</div>}

        {estado === 'ok' && (
          <>
            <div style={{ fontSize: 48, margin: '12px 0' }}>✅</div>
            <div className="rz-login-sub" style={{ color: '#4caf50' }}>
              Presença confirmada!
            </div>
            <p style={{ color: '#999', fontSize: 13 }}>Te esperamos no horário combinado. Até lá!</p>
          </>
        )}

        {estado === 'cancelado' && (
          <>
            <div className="rz-login-sub" style={{ color: '#e53935' }}>
              Agendamento cancelado
            </div>
            <p style={{ color: '#999', fontSize: 13 }}>Esse agendamento já foi cancelado. Fala com a barbearia pelo WhatsApp.</p>
          </>
        )}

        {estado === 'erro' && (
          <>
            <div className="rz-login-sub" style={{ color: '#e53935' }}>
              Link inválido
            </div>
            <p style={{ color: '#999', fontSize: 13 }}>Não encontramos esse agendamento.</p>
          </>
        )}

        <Link to="/" className="rz-login-voltar" style={{ marginTop: 16 }}>
          Ir para o início
        </Link>
      </div>
    </div>
  )
}

export default ConfirmarPresenca
