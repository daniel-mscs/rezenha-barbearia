import { supabase } from '../lib/supabase'

function paraMinutos(hora) {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export async function buscarBloqueiosComoOcupacao(dataStr) {
  const { data } = await supabase
    .from('bloqueios_agenda_publico')
    .select('barbeiro_id, hora_inicio, hora_fim')
    .eq('data', dataStr)

  return (data || []).map((b) => ({
    barbeiro_id: b.barbeiro_id,
    horario: b.hora_inicio,
    servicos: { duracao_min: paraMinutos(b.hora_fim) - paraMinutos(b.hora_inicio) },
  }))
}