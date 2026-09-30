import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'

const hoje = () => new Date().toISOString().split('T')[0]
const CORES_BARBEIRO = ['#F07B00', '#4caf50', '#2196f3', '#ab47bc', '#ef5350']

function gerarHorariosDoDia(dataStr) {
  if (!dataStr) return []
  const diaSemana = new Date(dataStr + 'T00:00:00').getDay()
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

function horarioJaPassou(dataStr, horarioStr) {
  const agora = new Date()
  const dataHorario = new Date(`${dataStr}T${horarioStr}:00`)
  return dataHorario <= agora
}

function formatarDataExtenso(dataStr) {
  const data = new Date(dataStr + 'T00:00:00')
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function Agendamentos() {
  const navigate = useNavigate()
  const [agendamentos, setAgendamentos] = useState([])
  const [barbeiros, setBarbeiros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroData, setFiltroData] = useState(hoje())
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroBarbeiro, setFiltroBarbeiro] = useState(null)
  const [proximosBloqueios, setProximosBloqueios] = useState([])
  const [aniversariantes, setAniversariantes] = useState([])
  const [mostrarAniversariantes, setMostrarAniversariantes] = useState(false)
  const [visualizacao, setVisualizacao] = useState('tabela') // 'tabela' | 'agenda'

  const carregar = async () => {
    setCarregando(true)
    const { data } = await supabase
      .from('agendamentos')
      .select('*, clientes(nome, telefone), barbeiros(id, nome), servicos(nome, preco, duracao_min)')
      .eq('data', filtroData)
      .order('horario')

    setAgendamentos(data || [])

    if (barbeiros.length === 0) {
      const { data: barbeirosData } = await supabase.from('barbeiros').select('id, nome, cor').eq('ativo', true).order('nome')
      setBarbeiros(barbeirosData || [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [filtroData])

  useEffect(() => {
    const carregarAniversariantes = async () => {
      const { data } = await supabase.rpc('proximos_aniversarios', { p_dias: 7 })
      setAniversariantes((data || []).filter((c) => c.dias_ate_aniversario <= 7))
    }
    carregarAniversariantes()

    const carregarBloqueios = async () => {
      const hoje = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('dias_fechados').select('*').gte('data', hoje).order('data').limit(10)
      setProximosBloqueios(data || [])
    }
    carregarBloqueios()
  }, [])

  useEffect(() => {
    const intervalo = setInterval(
      () => {
        carregar()
      },
      2 * 60 * 1000,
    ) // atualiza a cada 2 minutos

    return () => clearInterval(intervalo)
  }, [filtroData])

  const [notificacao, setNotificacao] = useState(null)

  useEffect(() => {
    const canal = supabase
      .channel('agendamentos-tela')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, async (payload) => {
        // Busca os dados completos do agendamento novo pra mostrar na notificação
        const { data: completo } = await supabase
          .from('agendamentos')
          .select('data, horario, clientes(nome), barbeiros(nome)')
          .eq('id', payload.new.id)
          .maybeSingle()

        if (completo) {
          setNotificacao(
            `Novo agendamento: ${completo.clientes?.nome || 'Cliente'} com ${completo.barbeiros?.nome || '—'} às ${completo.horario?.slice(0, 5)}`,
          )
          setTimeout(() => setNotificacao(null), 6000)
        }

        // Se o agendamento novo é da data que está sendo visualizada, recarrega a lista
        if (payload.new.data === filtroData) {
          carregar()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agendamentos' }, (payload) => {
        if (payload.new.data === filtroData) {
          carregar()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [filtroData])

  const atualizarStatus = async (id, novoStatus) => {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id)
    if (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Não foi possível atualizar: ' + error.message)
      return
    }
    carregar()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const badgeClasse = (status) => {
    if (status === 'confirmado') return { background: '#0d2b0d', color: '#4caf50' }
    if (status === 'cancelado') return { background: '#2b0d0d', color: '#e53935' }
    return { background: '#2b1e00', color: '#F07B00' }
  }

  const corBarbeiro = (barbeiroId) => {
    const barbeiro = barbeiros.find((b) => b.id === barbeiroId)
    return barbeiro?.cor || '#666'
  }

  const agendamentosFiltrados = agendamentos.filter((a) => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
    if (filtroBarbeiro && a.barbeiros?.id !== filtroBarbeiro) return false
    return true
  })

  const pendentesAtrasados = agendamentos.filter((a) => a.status === 'pendente' && horarioJaPassou(filtroData, a.horario.slice(0, 5)))

  const totalHoje = agendamentos.length
  const confirmados = agendamentos.filter((a) => a.status === 'confirmado').length
  const pendentes = agendamentos.filter((a) => a.status === 'pendente').length
  const faturamento = agendamentos.filter((a) => a.status !== 'cancelado').reduce((soma, a) => soma + Number(a.servicos?.preco || 0), 0)

  return (
    <div className="rz-admin-root">
      {notificacao && (
        <div className="rz-toast-notificacao" onClick={() => setNotificacao(null)}>
          🔔 {notificacao}
        </div>
      )}
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
        <AdminSidebar ativa="agendamentos" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">
              Agendamentos de <span>{filtroData === hoje() ? 'hoje' : 'outra data'}</span>
            </div>
            <div className="rz-date-badge">
              <i className="ti ti-calendar" style={{ fontSize: 14 }}></i>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
            </div>
          </div>

          <div className="rz-stats-cards">
            <div className="rz-stat-card">
              <div className="rz-stat-label">Total</div>
              <div className="rz-stat-num">{totalHoje}</div>
              <div className="rz-stat-sub">agendamentos</div>
            </div>
            <div className="rz-stat-card">
              <div className="rz-stat-label">Confirmados</div>
              <div className="rz-stat-num" style={{ color: '#4caf50' }}>
                {confirmados}
              </div>
              <div className="rz-stat-sub">prontos pra atender</div>
            </div>
            <div className="rz-stat-card">
              <div className="rz-stat-label">Pendentes</div>
              <div className="rz-stat-num" style={{ color: '#F07B00' }}>
                {pendentes}
              </div>
              <div className="rz-stat-sub">aguardando</div>
            </div>
            <div className="rz-stat-card">
              <div className="rz-stat-label">Faturamento</div>
              <div className="rz-stat-num">R$ {faturamento.toFixed(0)}</div>
              <div className="rz-stat-sub">estimado nessa data</div>
            </div>
          </div>

          {pendentesAtrasados.length > 0 && (
            <div className="rz-bloqueios-futuros" style={{ borderColor: '#F07B00' }}>
              <div className="rz-bloqueios-futuros-titulo">⏰ Pendentes que já passaram do horário — revisar</div>
              <div className="rz-bloqueios-futuros-lista">
                {pendentesAtrasados.map((a) => (
                  <div key={a.id} className="rz-bloqueio-chip" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>
                      <strong>{a.horario?.slice(0, 5)}</strong> — {a.clientes?.nome || 'Cliente'} com {a.barbeiros?.nome || '—'}
                    </span>
                    <button className="rz-action-btn" onClick={() => atualizarStatus(a.id, 'confirmado')}>
                      Confirmar
                    </button>
                    <button className="rz-action-btn danger" onClick={() => atualizarStatus(a.id, 'cancelado')}>
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aniversariantes.length > 0 && (
            <div className="rz-bloqueios-futuros" style={{ borderColor: '#F07B00', background: '#1a1206' }}>
              <div
                className="rz-bloqueios-futuros-titulo"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setMostrarAniversariantes((v) => !v)}
              >
                <span>🎂 Ver aniversariantes da semana ({aniversariantes.length})</span>
                <span>{mostrarAniversariantes ? '▲' : '▼'}</span>
              </div>
              {mostrarAniversariantes && (
                <div className="rz-bloqueios-futuros-lista" style={{ marginTop: 10 }}>
                  {aniversariantes.map((c) => (
                    <div key={c.id} className="rz-bloqueio-chip">
                      <strong>{c.nome}</strong> — {c.dias_ate_aniversario === 0 ? 'hoje!' : `em ${c.dias_ate_aniversario}d`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {proximosBloqueios.length > 0 && (
            <div className="rz-bloqueios-futuros">
              <div className="rz-bloqueios-futuros-titulo">🚫 Próximos dias fechados</div>
              <div className="rz-bloqueios-futuros-lista">
                {proximosBloqueios.map((b) => (
                  <div key={b.id} className="rz-bloqueio-chip">
                    <strong>{new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong>
                    {b.motivo && <span> — {b.motivo}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rz-view-toggle">
            <button className={visualizacao === 'tabela' ? 'active' : ''} onClick={() => setVisualizacao('tabela')}>
              Tabela
            </button>
            <button className={visualizacao === 'agenda' ? 'active' : ''} onClick={() => setVisualizacao('agenda')}>
              Agenda por barbeiro
            </button>
          </div>

          <div className="rz-filters">
            <button className={`rz-filter-btn ${filtroStatus === 'todos' ? 'active' : ''}`} onClick={() => setFiltroStatus('todos')}>
              Todos
            </button>
            <button
              className={`rz-filter-btn ${filtroStatus === 'confirmado' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('confirmado')}
            >
              Confirmados
            </button>
            <button className={`rz-filter-btn ${filtroStatus === 'pendente' ? 'active' : ''}`} onClick={() => setFiltroStatus('pendente')}>
              Pendentes
            </button>
            <button
              className={`rz-filter-btn ${filtroStatus === 'cancelado' ? 'active' : ''}`}
              onClick={() => setFiltroStatus('cancelado')}
            >
              Cancelados
            </button>
            <div className="rz-filters-right">
              <button className={`rz-filter-btn ${filtroBarbeiro === null ? 'active' : ''}`} onClick={() => setFiltroBarbeiro(null)}>
                Todos
              </button>
              {barbeiros.map((b) => (
                <button
                  key={b.id}
                  className={`rz-filter-btn ${filtroBarbeiro === b.id ? 'active' : ''}`}
                  onClick={() => setFiltroBarbeiro(b.id)}
                >
                  {b.nome.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {visualizacao === 'tabela' && (
            <div className="rz-table-wrap">
              {carregando ? (
                <div className="rz-empty-state">Carregando...</div>
              ) : agendamentosFiltrados.length === 0 ? (
                <div className="rz-empty-state">Nenhum agendamento encontrado.</div>
              ) : (
                <table className="rz-table">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Cliente</th>
                      <th>Serviço</th>
                      <th>Barbeiro</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Agendado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosFiltrados.map((a) => (
                      <tr key={a.id}>
                        <td data-label="Horário">
                          <strong style={{ color: '#fff' }}>{a.horario?.slice(0, 5)}</strong>
                        </td>
                        <td data-label="Cliente">{a.clientes?.nome || '—'}</td>
                        <td data-label="Serviço">{a.servicos?.nome || '—'}</td>
                        <td data-label="Barbeiro">
                          <span className="rz-barber-dot" style={{ background: corBarbeiro(a.barbeiros?.id) }}></span>
                          {a.barbeiros?.nome || '—'}
                        </td>
                        <td data-label="Valor">R$ {Number(a.servicos?.preco || 0).toFixed(2)}</td>
                        <td data-label="Status">
                          <span className="rz-badge" style={badgeClasse(a.status)}>
                            {a.status}
                          </span>
                          {a.cliente_confirmou_em && (
                            <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#4caf50' }}>✓ cliente confirmou</span>
                          )}
                        </td>
                        <td data-label="Agendado em" style={{ fontSize: 12, color: '#888' }}>
                          {new Date(a.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td data-label="Ações">
                          {a.status !== 'confirmado' && (
                            <button className="rz-action-btn" onClick={() => atualizarStatus(a.id, 'confirmado')}>
                              Confirmar
                            </button>
                          )}
                          {a.status !== 'cancelado' && (
                            <button className="rz-action-btn danger" onClick={() => atualizarStatus(a.id, 'cancelado')}>
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {visualizacao === 'agenda' && (
            <div className="rz-agenda-wrap">
              {(() => {
                const horarios = gerarHorariosDoDia(filtroData)
                if (horarios.length === 0) {
                  return <div className="rz-empty-state">Fechado nesse dia.</div>
                }
                return (
                  <div className="rz-agenda-grid" style={{ gridTemplateColumns: `70px repeat(${barbeiros.length}, 1fr)` }}>
                    <div className="rz-agenda-time-header"></div>
                    {barbeiros.map((b) => (
                      <div key={b.id} className="rz-agenda-col-header">
                        {b.nome}
                      </div>
                    ))}

                    {horarios.map((h) => {
                      const inicioSlot = horarioParaMinutos(h)
                      return (
                        <div key={h} className="rz-agenda-header-row" style={{ display: 'contents' }}>
                          <div className="rz-agenda-time">{h}</div>
                          {barbeiros.map((b) => {
                            const agendamentoNesseSlot = agendamentos.find((a) => {
                              if (a.barbeiros?.id !== b.id || a.status === 'cancelado') return false
                              return horarioParaMinutos(a.horario.slice(0, 5)) === inicioSlot
                            })

                            const dentroDeOutro = agendamentos.find((a) => {
                              if (a.barbeiros?.id !== b.id || a.status === 'cancelado') return false
                              const ini = horarioParaMinutos(a.horario.slice(0, 5))
                              const fim = ini + (a.servicos?.duracao_min || 30)
                              return inicioSlot > ini && inicioSlot < fim
                            })

                            return (
                              <div key={b.id} className={`rz-agenda-cell ${!agendamentoNesseSlot && !dentroDeOutro ? 'livre' : ''}`}>
                                {agendamentoNesseSlot && (
                                  <div className={`rz-agenda-agendamento ${agendamentoNesseSlot.status}`}>
                                    <div className="rz-agenda-cliente">{agendamentoNesseSlot.clientes?.nome || '—'}</div>
                                    <div className="rz-agenda-servico">{agendamentoNesseSlot.servicos?.nome}</div>
                                  </div>
                                )}
                                {dentroDeOutro && <div className="rz-agenda-ocupado-continuacao"></div>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Agendamentos
