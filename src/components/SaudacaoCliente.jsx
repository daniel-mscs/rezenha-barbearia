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

function SaudacaoCliente() {
  const [nome, setNome] = useState(null)

  useEffect(() => {
    const carregar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('clientes').select('nome').eq('auth_id', session.user.id).maybeSingle()
      if (data) setNome(data.nome)
    }
    carregar()
  }, [])

  if (!nome) return null

  return (
    <span className="rz-saudacao-cliente">
      {saudacaoDoHorario()}, <strong>{formatarNome(nome)}</strong>
    </span>
  )
}

export default SaudacaoCliente
