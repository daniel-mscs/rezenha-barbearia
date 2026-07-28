import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import '../PainelAdmin/PainelAdmin.css'

const CORES = ['#F07B00', '#4caf50', '#2196f3', '#ab47bc', '#ef5350', '#26c6da']

function primeiroDiaDoMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

function Relatorios() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes())
  const [dataFim, setDataFim] = useState(hoje())
  const [agendamentos, setAgendamentos] = useState([])
  const [isDono, setIsDono] = useState(false)
  const [meuBarbeiroId, setMeuBarbeiroId] = useState(null)

  useEffect(() => {
    const iniciar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/admin/login'); return }

      const { data: barbeiro } = await supabase
        .from('barbeiros')
        .select('id, is_dono')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!barbeiro) { navigate('/admin/login'); return }

      setIsDono(barbeiro.is_dono)
      setMeuBarbeiroId(barbeiro.id)
    }
    iniciar()
  }, [])

  const carregarDados = async () => {
    setCarregando(true)
    let query = supabase
      .from('agendamentos')
      .select('cliente_id, horario, data, barbeiro_id, barbeiros(nome), servicos(nome, preco)')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .neq('status', 'cancelado')

    if (!isDono && meuBarbeiroId) {
      query = query.eq('barbeiro_id', meuBarbeiroId)
    }

    const { data } = await query
    setAgendamentos(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    if (meuBarbeiroId) carregarDados()
  }, [dataInicio, dataFim, meuBarbeiroId])

  const faturamentoTotal = agendamentos.reduce((soma, a) => soma + Number(a.servicos?.preco || 0), 0)
  const totalCortes = agendamentos.length
  const clientesUnicos = new Set(agendamentos.map((a) => a.cliente_id)).size

  const cortesPorBarbeiro = Object.values(
    agendamentos.reduce((acc, a) => {
      const nome = a.barbeiros?.nome || 'Sem barbeiro'
      if (!acc[nome]) acc[nome] = { nome, cortes: 0, clientes: new Set() }
      acc[nome].cortes += 1
      acc[nome].clientes.add(a.cliente_id)
      return acc
    }, {})
  ).map((b) => ({ nome: b.nome, cortes: b.cortes, clientes: b.clientes.size }))

  const servicoMaisPedido = Object.values(
    agendamentos.reduce((acc, a) => {
      const nome = a.servicos?.nome || 'Outro'
      if (!acc[nome]) acc[nome] = { nome, total: 0 }
      acc[nome].total += 1
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const horariosPico = Object.values(
    agendamentos.reduce((acc, a) => {
      const hora = a.horario?.slice(0, 2) + 'h'
      if (!acc[hora]) acc[hora] = { hora, total: 0 }
      acc[hora].total += 1
      return acc
    }, {})
  ).sort((a, b) => a.hora.localeCompare(b.hora))

  const nomesBarbeiros = [...new Set(agendamentos.map((a) => a.barbeiros?.nome).filter(Boolean))]

  const detalhesPorBarbeiro = nomesBarbeiros.map((nome) => {
    const doBarbeiro = agendamentos.filter((a) => a.barbeiros?.nome === nome)

    const faturamento = doBarbeiro.reduce((soma, a) => soma + Number(a.servicos?.preco || 0), 0)

    const contagemServicos = doBarbeiro.reduce((acc, a) => {
      const s = a.servicos?.nome || 'Outro'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
    const servicoTop = Object.entries(contagemServicos).sort((a, b) => b[1] - a[1])[0]

    const contagemHorarios = doBarbeiro.reduce((acc, a) => {
      const h = a.horario?.slice(0, 2) + 'h'
      acc[h] = (acc[h] || 0) + 1
      return acc
    }, {})
    const horarioTop = Object.entries(contagemHorarios).sort((a, b) => b[1] - a[1])[0]

    return {
      nome,
      totalAtendimentos: doBarbeiro.length,
      faturamento,
      servicoMaisPedido: servicoTop ? servicoTop[0] : '—',
      horarioPico: horarioTop ? horarioTop[0] : '—',
    }
  })

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="rz-admin-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">Re<span>Z</span>enha <span className="rz-logo-sep">/ Painel</span></div>
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout"><i className="ti ti-logout"></i> Sair</button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="relatorios" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Relatórios</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="rz-input" style={{ margin: 0, width: 'auto' }} type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <span style={{ color: '#666', fontSize: 12 }}>até</span>
              <input className="rz-input" style={{ margin: 0, width: 'auto' }} type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          {carregando ? (
            <div className="rz-empty-state">Carregando...</div>
          ) : agendamentos.length === 0 ? (
            <div className="rz-empty-state">Nenhum agendamento nesse período.</div>
          ) : (
            <>
              <div className="rz-stats-cards">
                <div className="rz-stat-card">
                  <div className="rz-stat-label">Faturamento</div>
                  <div className="rz-stat-num">R$ {faturamentoTotal.toFixed(0)}</div>
                  <div className="rz-stat-sub">no período selecionado</div>
                </div>
                <div className="rz-stat-card">
                  <div className="rz-stat-label">{isDono ? 'Cortes realizados' : 'Meus atendimentos'}</div>
                  <div className="rz-stat-num">{totalCortes}</div>
                  <div className="rz-stat-sub">{isDono ? 'atendimentos no total' : 'no período selecionado'}</div>
                </div>
                <div className="rz-stat-card">
                  <div className="rz-stat-label">Clientes atendidos</div>
                  <div className="rz-stat-num">{clientesUnicos}</div>
                  <div className="rz-stat-sub">clientes únicos</div>
                </div>
                <div className="rz-stat-card">
                  <div className="rz-stat-label">Serviço mais pedido</div>
                  <div className="rz-stat-num" style={{ fontSize: 18 }}>{servicoMaisPedido[0]?.nome || '—'}</div>
                  <div className="rz-stat-sub">{servicoMaisPedido[0]?.total || 0} pedidos</div>
                </div>
              </div>

              {isDono && (
              <>
              <div className="rz-section-title-mini" style={{ fontSize: 16, marginTop: 8 }}>Desempenho por barbeiro</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
                {detalhesPorBarbeiro.map((b) => (
                  <div key={b.nome} className="rz-stat-card">
                    <div className="rz-stat-label" style={{ fontSize: 13, color: '#fff', marginBottom: 14 }}>{b.nome}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#999' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Atendimentos</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{b.totalAtendimentos}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Faturamento</span>
                        <span style={{ color: '#F07B00', fontWeight: 700 }}>R$ {b.faturamento.toFixed(0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Serviço + pedido</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{b.servicoMaisPedido}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Horário de pico</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>{b.horarioPico}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="rz-table-wrap" style={{ padding: 20 }}>
                  <div className="rz-section-title-mini">Cortes por barbeiro</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={cortesPorBarbeiro}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="nome" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="cortes" radius={[6, 6, 0, 0]}>
                        {cortesPorBarbeiro.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rz-table-wrap" style={{ padding: 20 }}>
                  <div className="rz-section-title-mini">Clientes atendidos por barbeiro</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={cortesPorBarbeiro}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="nome" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="clientes" radius={[6, 6, 0, 0]}>
                        {cortesPorBarbeiro.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="rz-table-wrap" style={{ padding: 20 }}>
                  <div className="rz-section-title-mini">Serviços mais pedidos</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={servicoMaisPedido} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis type="number" stroke="#666" fontSize={12} allowDecimals={false} />
                      <YAxis type="category" dataKey="nome" stroke="#666" fontSize={11} width={140} />
                      <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="total" fill="#F07B00" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rz-table-wrap" style={{ padding: 20 }}>
                  <div className="rz-section-title-mini">Horários de pico</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={horariosPico}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="hora" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333', borderRadius: 8 }} />
                      <Bar dataKey="total" fill="#F07B00" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Relatorios