import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function saudacaoDoHorario() {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatarNome(nome) {
  const primeiro = (nome || '').trim().split(' ')[0]
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
}

function SaudacaoUsuario() {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const carregar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('barbeiros').select('nome, is_dono').eq('auth_id', session.user.id).maybeSingle()
      if (data) setUsuario(data)
    }
    carregar()
  }, [])

  if (!usuario) return null

  return (
    <div className="rz-saudacao">
      <span className="rz-saudacao-texto">
        {saudacaoDoHorario()}, <strong>{formatarNome(usuario.nome)}</strong>
      </span>
      <span className={`rz-saudacao-tag ${usuario.is_dono ? 'dono' : ''}`}>{usuario.is_dono ? 'Dono' : 'Barbeiro'}</span>
    </div>
  )
}

export default SaudacaoUsuario
