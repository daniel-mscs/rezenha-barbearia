import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'
import './HorariosLivres.css'

function horarioParaMinutos(h) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}

function gerarHorariosHoje(config) {
  if (!config) return []
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  if (diaSemana === 0 && !config.domingo_aberto) return []

  const [hA, mA] = (diaSemana === 6 ? config.horario_sabado_abertura : config.horario_semana_abertura).split(':').map(Number)
  const [hF, mF] = (diaSemana === 6 ? config.horario_sabado_fechamento : config.horario_semana_fechamento).split(':').map(Number)
  const abertura = hA * 60 + mA
  const fechamento = hF * 60 + mF

  const slots = []
  let m = abertura
  while (m < fechamento) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
    m += 15
  }
  return slots
}

function jaPassou(horario) {
  const agora = new Date()
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
  return horarioParaMinutos(horario) <= minutosAgora
}

function barbeiroOcupado(barbeiroId, slot, agendamentosHoje) {
  const inicioSlot = horarioParaMinutos(slot)
  return agendamentosHoje.some((a) => {
    if (a.barbeiro_id !== barbeiroId) return false
    const inicio = horarioParaMinutos(a.horario.slice(0, 5))
    const fim = inicio + (a.servicos?.duracao_min || 30)
    return inicioSlot >= inicio && inicioSlot < fim
  })
}

function dataFormatadaHoje() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function HorariosLivres() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [barbeirosComVagas, setBarbeirosComVagas] = useState([])
  const cartaoRef = useRef(null)

  useEffect(() => {
    const carregar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/admin/login')
        return
      }

      const hojeStr = new Date().toISOString().split('T')[0]

      const { data: barbeiros } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true).order('nome')
      const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle()
      const { data: diasFechados } = await supabase.from('dias_fechados').select('data').eq('data', hojeStr)
      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('barbeiro_id, horario, servicos(duracao_min)')
        .eq('data', hojeStr)
        .neq('status', 'cancelado')

      if (diasFechados && diasFechados.length > 0) {
        setBarbeirosComVagas([])
        setCarregando(false)
        return
      }

      const slots = gerarHorariosHoje(config)

      const resultado = (barbeiros || [])
        .map((b) => {
          const livres = slots.filter((s) => !jaPassou(s) && !barbeiroOcupado(b.id, s, agendamentosHoje || []))
          return { ...b, livres }
        })
        .filter((b) => b.livres.length > 0)

      setBarbeirosComVagas(resultado)
      setCarregando(false)
    }
    carregar()
  }, [])

  const baixarImagem = async () => {
    if (!cartaoRef.current) return
    setExportando(true)
    const canvas = await html2canvas(cartaoRef.current, { backgroundColor: '#0d0d0d', scale: 2 })
    const link = document.createElement('a')
    link.download = `rezenha-horarios-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setExportando(false)
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="rz-admin-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">
          Re<span>Z</span>enha <span className="rz-logo-sep">/ Painel</span>
        </div>
        <SaudacaoUsuario />
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="horarios-livres" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Horários Livres</div>
            <button className="rz-btn-primary" style={{ width: 'auto' }} onClick={baixarImagem} disabled={exportando || carregando}>
              {exportando ? 'Gerando...' : '📥 Baixar imagem'}
            </button>
          </div>

          {carregando ? (
            <div className="rz-empty-state">Carregando...</div>
          ) : (
            <div className="rz-hl-preview-wrap">
              <div ref={cartaoRef} className="rz-hl-cartao">
                <div className="rz-hl-topo">
                  <div className="rz-hl-logo-wrap">
                    <img src="/logo.png" alt="Rezenha Barbearia" className="rz-hl-logo-img" crossOrigin="anonymous" />
                    <div className="rz-hl-logo">
                      Re<span>Z</span>enha
                    </div>
                  </div>
                  <div className="rz-hl-data">{dataFormatadaHoje()}</div>
                </div>

                <div className="rz-hl-titulo">
                  HORÁRIOS
                  <br />
                  LIVRES <span>HOJE</span>
                </div>

                {barbeirosComVagas.length === 0 ? (
                  <div className="rz-hl-sem-vagas">Agenda cheia hoje! 🔥</div>
                ) : (
                  <div className="rz-hl-lista">
                    {barbeirosComVagas.map((b) => (
                      <div key={b.id} className="rz-hl-barbeiro-bloco">
                        <div className="rz-hl-barbeiro-nome">{b.nome}</div>
                        <div className="rz-hl-chips">
                          {b.livres.map((h) => (
                            <span key={h} className="rz-hl-chip">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rz-hl-rodape">
                  <div className="rz-hl-cta">AGENDE AGORA</div>
                  <div className="rz-hl-link">barbeariarezenha.com.br</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default HorariosLivres
