import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import '../PainelAdmin/PainelAdmin.css'

function Configuracoes() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [horarioSemanaAbertura, setHorarioSemanaAbertura] = useState('09:00')
  const [horarioSemanaFechamento, setHorarioSemanaFechamento] = useState('19:00')
  const [horarioSabadoAbertura, setHorarioSabadoAbertura] = useState('09:00')
  const [horarioSabadoFechamento, setHorarioSabadoFechamento] = useState('18:00')
  const [domingoAberto, setDomingoAberto] = useState(false)

  const [diasFechados, setDiasFechados] = useState([])
  const [novaData, setNovaData] = useState('')
  const [novoMotivo, setNovoMotivo] = useState('')

  useEffect(() => {
    const verificarPermissao = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const { data } = await supabase.from('barbeiros').select('is_dono').eq('auth_id', session.user.id).maybeSingle()
      if (!data?.is_dono) {
        navigate('/admin')
        return
      }
      carregarTudo()
    }
    verificarPermissao()
  }, [])

  const carregarTudo = async () => {
    setCarregando(true)
    const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle()
    if (config) {
      setHorarioSemanaAbertura(config.horario_semana_abertura)
      setHorarioSemanaFechamento(config.horario_semana_fechamento)
      setHorarioSabadoAbertura(config.horario_sabado_abertura)
      setHorarioSabadoFechamento(config.horario_sabado_fechamento)
      setDomingoAberto(config.domingo_aberto)
    }

    const { data: dias } = await supabase.from('dias_fechados').select('*').order('data')
    setDiasFechados(dias || [])

    setCarregando(false)
  }

  const salvarHorarios = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setSucesso(false)

    await supabase
      .from('configuracoes')
      .update({
        horario_semana_abertura: horarioSemanaAbertura,
        horario_semana_fechamento: horarioSemanaFechamento,
        horario_sabado_abertura: horarioSabadoAbertura,
        horario_sabado_fechamento: horarioSabadoFechamento,
        domingo_aberto: domingoAberto,
      })
      .eq('id', 1)

    setSalvando(false)
    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
  }

  const adicionarDiaFechado = async (e) => {
    e.preventDefault()
    if (!novaData) return
    await supabase.from('dias_fechados').insert({ data: novaData, motivo: novoMotivo || null })
    setNovaData('')
    setNovoMotivo('')
    carregarTudo()
  }

  const removerDiaFechado = async (id) => {
    await supabase.from('dias_fechados').delete().eq('id', id)
    carregarTudo()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  if (carregando) {
    return (
      <div className="rz-admin-root">
        <div className="rz-empty-state">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="rz-admin-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">
          Re<span>Z</span>enha <span className="rz-logo-sep">/ Painel</span>
        </div>
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="configuracoes" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Configurações</div>
          </div>

          <div className="rz-table-wrap" style={{ padding: 24, marginBottom: 20 }}>
            <div className="rz-section-title-mini" style={{ fontSize: 15, marginBottom: 20 }}>
              Horário de funcionamento
            </div>

            <form onSubmit={salvarHorarios}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="rz-field-label">Segunda a sexta — abre</label>
                  <input
                    className="rz-input"
                    type="time"
                    value={horarioSemanaAbertura}
                    onChange={(e) => setHorarioSemanaAbertura(e.target.value)}
                  />
                </div>
                <div>
                  <label className="rz-field-label">Segunda a sexta — fecha</label>
                  <input
                    className="rz-input"
                    type="time"
                    value={horarioSemanaFechamento}
                    onChange={(e) => setHorarioSemanaFechamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="rz-field-label">Sábado — abre</label>
                  <input
                    className="rz-input"
                    type="time"
                    value={horarioSabadoAbertura}
                    onChange={(e) => setHorarioSabadoAbertura(e.target.value)}
                  />
                </div>
                <div>
                  <label className="rz-field-label">Sábado — fecha</label>
                  <input
                    className="rz-input"
                    type="time"
                    value={horarioSabadoFechamento}
                    onChange={(e) => setHorarioSabadoFechamento(e.target.value)}
                  />
                </div>
              </div>

              <label
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#ccc', cursor: 'pointer' }}
              >
                <input type="checkbox" checked={domingoAberto} onChange={(e) => setDomingoAberto(e.target.checked)} />
                Abrir aos domingos
              </label>

              {sucesso && (
                <div
                  style={{
                    background: '#0d2b0d',
                    border: '1px solid #4caf50',
                    color: '#7ee787',
                    fontSize: 12,
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  Horários salvos com sucesso!
                </div>
              )}

              <button className="rz-btn-primary" type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar horários'}
              </button>
            </form>
          </div>

          <div className="rz-table-wrap" style={{ padding: 24 }}>
            <div className="rz-section-title-mini" style={{ fontSize: 15, marginBottom: 20 }}>
              Dias fechados (feriados, folgas)
            </div>

            <form
              onSubmit={adicionarDiaFechado}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 24, alignItems: 'end' }}
            >
              <div>
                <label className="rz-field-label">Data</label>
                <input
                  className="rz-input"
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  required
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div>
                <label className="rz-field-label">Motivo (opcional)</label>
                <input
                  className="rz-input"
                  type="text"
                  placeholder="Ex: Natal"
                  value={novoMotivo}
                  onChange={(e) => setNovoMotivo(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <button className="rz-btn-primary" type="submit" style={{ height: 44 }}>
                + Adicionar
              </button>
            </form>

            {diasFechados.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13 }}>Nenhum dia fechado cadastrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {diasFechados.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#161616',
                      border: '1px solid #222',
                      borderRadius: 8,
                      padding: '10px 16px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fff', fontSize: 13 }}>
                        {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </strong>
                      {d.motivo && <span style={{ color: '#888', fontSize: 12, marginLeft: 10 }}>— {d.motivo}</span>}
                    </div>
                    <button className="rz-action-btn danger" onClick={() => removerDiaFechado(d.id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Configuracoes
