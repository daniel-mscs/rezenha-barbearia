import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'

function formatarData(dataStr) {
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function Bloqueios() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [barbeiros, setBarbeiros] = useState([])
  const [bloqueios, setBloqueios] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [barbeiroId, setBarbeiroId] = useState('')
  const [data, setData] = useState('')
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('12:00')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const hoje = new Date().toLocaleDateString('en-CA')

  const carregarLista = async () => {
    const { data: lista } = await supabase
      .from('bloqueios_agenda')
      .select('*')
      .gte('data', hoje)
      .order('data')
      .order('hora_inicio')
    setBloqueios(lista || [])
  }

  useEffect(() => {
    const iniciar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/admin/login')
        return
      }
      const { data: eu } = await supabase.from('barbeiros').select('id, nome, is_dono').eq('auth_id', session.user.id).maybeSingle()
      if (!eu) {
        navigate('/admin/login')
        return
      }
      const { data: lista } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true).order('nome')
      setPerfil(eu)
      setBarbeiros(lista || [])
      if (!eu.is_dono) setBarbeiroId(eu.id)
      await carregarLista()
      setCarregando(false)
    }
    iniciar()
  }, [])

  const salvar = async (e) => {
    e.preventDefault()
    setErro('')
    setAviso('')

    if (!data) {
      setErro('Escolha a data.')
      return
    }

    const inicio = diaInteiro ? '00:00' : horaInicio
    const fim = diaInteiro ? '23:59' : horaFim
    if (fim <= inicio) {
      setErro('O horário final precisa ser depois do inicial.')
      return
    }

    setSalvando(true)
    const alvo = perfil.is_dono ? barbeiroId || null : perfil.id

    const { error } = await supabase.from('bloqueios_agenda').insert({
      barbeiro_id: alvo,
      data,
      hora_inicio: inicio,
      hora_fim: fim,
      motivo: motivo.trim() || null,
      criado_por: perfil.id,
    })

    if (error) {
      setSalvando(false)
      setErro('Não foi possível salvar o bloqueio.')
      return
    }

    let consulta = supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('data', data)
      .neq('status', 'cancelado')
      .gte('horario', inicio)
      .lt('horario', fim)
    if (alvo) consulta = consulta.eq('barbeiro_id', alvo)
    const { count } = await consulta

    if (count > 0) {
      setAviso(`Bloqueio salvo, mas já existem ${count} agendamento(s) nesse período. Eles não foram cancelados, confira na tela de Agendamentos.`)
    }

    setSalvando(false)
    setData('')
    setMotivo('')
    setDiaInteiro(false)
    carregarLista()
  }

  const remover = async (id) => {
    await supabase.from('bloqueios_agenda').delete().eq('id', id)
    carregarLista()
  }

  const nomeDoBarbeiro = (id) => {
    if (!id) return 'Todos os barbeiros'
    return barbeiros.find((b) => b.id === id)?.nome || '—'
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
        <AdminSidebar ativa="bloqueios" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Bloqueios de agenda</div>
          </div>

          {carregando ? (
            <div className="rz-empty-state">Carregando...</div>
          ) : (
            <>
              <div className="rz-table-wrap" style={{ padding: 24, marginBottom: 20 }}>
                <div className="rz-section-title-mini" style={{ fontSize: 15, marginBottom: 20 }}>
                  Novo bloqueio
                </div>

                {erro && (
                  <div
                    style={{
                      background: '#2b0d0d',
                      border: '1px solid #e53935',
                      color: '#ff6b6b',
                      fontSize: 12,
                      padding: '10px 14px',
                      borderRadius: 6,
                      marginBottom: 16,
                    }}
                  >
                    {erro}
                  </div>
                )}
                {aviso && (
                  <div
                    style={{
                      background: '#1a1206',
                      border: '1px solid #f07b00',
                      color: '#f0a040',
                      fontSize: 12,
                      padding: '10px 14px',
                      borderRadius: 6,
                      marginBottom: 16,
                    }}
                  >
                    {aviso}
                  </div>
                )}

                <form onSubmit={salvar}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="rz-field-label">Agenda</label>
                      {perfil.is_dono ? (
                        <select className="rz-input" value={barbeiroId} onChange={(e) => setBarbeiroId(e.target.value)}>
                          <option value="">Todos os barbeiros</option>
                          {barbeiros.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rz-input" style={{ color: '#aaa' }}>
                          Sua agenda
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="rz-field-label">Data</label>
                      <input
                        className="rz-input"
                        type="date"
                        min={hoje}
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    {!diaInteiro && (
                      <>
                        <div>
                          <label className="rz-field-label">Das</label>
                          <input
                            className="rz-input"
                            type="time"
                            value={horaInicio}
                            onChange={(e) => setHoraInicio(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                        <div>
                          <label className="rz-field-label">Até</label>
                          <input
                            className="rz-input"
                            type="time"
                            value={horaFim}
                            onChange={(e) => setHoraFim(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} />
                    Bloquear o dia inteiro
                  </label>

                  <label className="rz-field-label">Motivo (opcional, só a equipe vê)</label>
                  <input
                    className="rz-input"
                    type="text"
                    placeholder="Ex: consulta médica"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />

                  <button className="rz-btn-primary" type="submit" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Bloquear agenda'}
                  </button>
                </form>
              </div>

              <div className="rz-section-title-mini" style={{ fontSize: 15, marginBottom: 12 }}>
                Próximos bloqueios
              </div>
              <div className="rz-table-wrap" style={{ padding: bloqueios.length === 0 ? 0 : 12 }}>
                {bloqueios.length === 0 ? (
                  <div className="rz-empty-state" style={{ padding: 24 }}>
                    Nenhum bloqueio cadastrado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bloqueios.map((b) => {
                      const inicio = b.hora_inicio.slice(0, 5)
                      const fim = b.hora_fim.slice(0, 5)
                      const podeRemover = perfil.is_dono || b.barbeiro_id === perfil.id
                      return (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
                            background: '#161616',
                            border: '1px solid #222',
                            borderRadius: 8,
                            padding: '10px 16px',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#fff', fontSize: 13 }}>{formatarData(b.data)}</strong>
                            <span style={{ color: '#f07b00', fontSize: 12, marginLeft: 10 }}>
                              {inicio === '00:00' && fim === '23:59' ? 'Dia inteiro' : `${inicio} às ${fim}`}
                            </span>
                            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                              {nomeDoBarbeiro(b.barbeiro_id)}
                              {b.motivo ? ` · ${b.motivo}` : ''}
                            </div>
                          </div>
                          {podeRemover && (
                            <button className="rz-action-btn danger" onClick={() => remover(b.id)}>
                              Remover
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Bloqueios