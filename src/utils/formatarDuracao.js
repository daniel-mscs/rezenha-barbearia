export function formatarDuracao(minutos) {
  if (!minutos) return '0min'
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  if (horas === 0) return `${mins}min`
  if (mins === 0) return `${horas}h`
  return `${horas}h${mins}min`
}