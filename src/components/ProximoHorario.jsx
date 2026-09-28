import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function gerarHorariosDoDia(data) {
  const diaSemana = data.getDay()
  if (diaSemana === 0) return []
  const fechamento = diaSemana === 6 ? 18 : 19
  const slots = []
  let h = 9,
    m = 0
  while (h < fechamento) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 15
    if (m >= 60) {
      m -= 60
      h += 1
    }
  }
  return slots
}

function horarioParaMinutos(horario) {
  const [h, m] = horario.split(':').map(Number)
  return h * 60 + m
}

function formatarData(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function ProximoHorario() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [proximo, setProximo] = useState(null) // { label, data, horario }

  useEffect(() => {
    const calcular = async () => {
      const { data: barbeiros } = await supabase.from('barbeiros').select('id').eq('ativo', true)
      if (!barbeiros || barbeiros.length === 0) {
        setCarregando(false)
        return
      }

      const agora = new Date()
      const duracaoMinima = 30

      for (let diasAFrente = 0; diasAFrente <= 7; diasAFrente++) {
        const dataAlvo = new Date(agora)
        dataAlvo.setDate(dataAlvo.getDate() + diasAFrente)
        const dataStr = formatarData(dataAlvo)

        const horarios = gerarHorariosDoDia(dataAlvo)
        if (horarios.length === 0) continue

        const { data: agendamentosDoDia } = await supabase
          .from('agendamentos')
          .select('barbeiro_id, horario, servicos(duracao_min)')
          .eq('data', dataStr)
          .neq('status', 'cancelado')

        for (const h of horarios) {
          // Se for hoje, ignora horários que já passaram
          if (diasAFrente === 0) {
            const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
            if (horarioParaMinutos(h) <= minutosAgora) continue
          }

          const inicioSlot = horarioParaMinutos(h)
          const fimSlot = inicioSlot + duracaoMinima

          const algumBarbeiroLivre = barbeiros.some((b) => {
            const ocupacoes = (agendamentosDoDia || []).filter((a) => a.barbeiro_id === b.id)
            return !ocupacoes.some((a) => {
              const inicioExistente = horarioParaMinutos(a.horario.slice(0, 5))
              const fimExistente = inicioExistente + (a.servicos?.duracao_min || 30)
              return inicioSlot < fimExistente && fimSlot > inicioExistente
            })
          })

          if (algumBarbeiroLivre) {
            const label =
              diasAFrente === 0
                ? 'hoje'
                : diasAFrente === 1
                  ? 'amanhã'
                  : dataAlvo.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
            setProximo({ label, horario: h })
            setCarregando(false)
            return
          }
        }
      }

      setCarregando(false)
    }

    calcular()
  }, [])

  if (carregando || !proximo) return null

  return (
    <div className="rz-proximo-horario" onClick={() => navigate('/agendamento')}>
      <span className="rz-proximo-horario-pulso"></span>
      <span>
        Próximo horário livre:{' '}
        <strong>
          {proximo.label} às {proximo.horario}
        </strong>
      </span>
      <span className="rz-proximo-horario-seta">→</span>
    </div>
  )
}

export default ProximoHorario
