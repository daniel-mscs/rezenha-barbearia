import { useState } from 'react'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatarData(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function Calendario({ value, onChange }) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const dataSelecionada = value ? new Date(value + 'T00:00:00') : null
  const [mesAtual, setMesAtual] = useState(dataSelecionada || hoje)

  const primeiroDiaDoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
  const ultimoDiaDoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
  const diasNoMes = ultimoDiaDoMes.getDate()
  const diaSemanaInicio = primeiroDiaDoMes.getDay()

  const celulas = []
  for (let i = 0; i < diaSemanaInicio; i++) celulas.push(null)
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia)

  const mudarMes = (delta) => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + delta, 1))
  }

  return (
    <div className="rz-calendario">
      <div className="rz-calendario-header">
        <button type="button" className="rz-calendario-nav" onClick={() => mudarMes(-1)}>
          ‹
        </button>
        <div className="rz-calendario-mes">
          {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
        </div>
        <button type="button" className="rz-calendario-nav" onClick={() => mudarMes(1)}>
          ›
        </button>
      </div>
      <div className="rz-calendario-grid rz-calendario-dias-semana">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="rz-calendario-dia-semana">
            {d}
          </div>
        ))}
      </div>
      <div className="rz-calendario-grid">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i}></div>
          const dataCelula = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia)
          const passou = dataCelula < hoje
          const domingo = dataCelula.getDay() === 0
          const desabilitado = passou || domingo
          const selecionado = value === formatarData(dataCelula)
          return (
            <button
              type="button"
              key={i}
              className={`rz-calendario-dia ${selecionado ? 'selecionado' : ''} ${desabilitado ? 'desabilitado' : ''}`}
              disabled={desabilitado}
              onClick={() => onChange(formatarData(dataCelula))}
            >
              {dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Calendario
