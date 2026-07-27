import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Calendario from '../components/Calendario'
import './Agendamento.css'

function gerarHorarios(dataStr) {
  if (!dataStr) return []
  const diaSemana = new Date(dataStr + 'T00:00:00').getDay() // 0 = domingo, 6 = sábado
  if (diaSemana === 0) return [] // fechado aos domingos

  const fechamento = diaSemana === 6 ? 18 : 19 // sábado fecha 1h mais cedo
  const slots = []
  let h = 9, m = 0
  while (h < fechamento) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 15
    if (m >= 60) { m -= 60; h += 1 }
  }
  return slots
}

function horarioParaMinutos(horario) {
  const [h, m] = horario.split(':').map(Number)
  return h * 60 + m
}

// Verifica se um barbeiro está livre num horário, considerando a duração do serviço
// e os agendamentos que ele já tem naquele dia (que também ocupam um intervalo de tempo)
function barbeiroDisponivel(barbeiroId, slot, duracaoMin, agendamentosDoDia, fechamentoMin) {
  const inicioNovo = horarioParaMinutos(slot)
  const fimNovo = inicioNovo + duracaoMin

  if (fimNovo > fechamentoMin) return false // o serviço não cabe antes de fechar

  const ocupacoesDoBarbeiro = agendamentosDoDia.filter((a) => a.barbeiro_id === barbeiroId)

  for (const a of ocupacoesDoBarbeiro) {
    const inicioExistente = horarioParaMinutos(a.horario.slice(0, 5))
    const fimExistente = inicioExistente + (a.servicos?.duracao_min || 30)
    const sobrepoe = inicioNovo < fimExistente && fimNovo > inicioExistente
    if (sobrepoe) return false
  }

  return true
}

function Agendamento() {
  const navigate = useNavigate()
  const location = useLocation()

  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [clienteLogado, setClienteLogado] = useState(null)

  const [barbeirosLista, setBarbeirosLista] = useState([])
  const [servicosLista, setServicosLista] = useState([])
  const [agendamentosDoDia, setAgendamentosDoDia] = useState([])
  const [avisoConflito, setAvisoConflito] = useState(null)

  const [step, setStep] = useState(0)
  const [barbeiro, setBarbeiro] = useState(null)
  const [servico, setServico] = useState(null)
  const [data, setData] = useState('')
  const [horario, setHorario] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  useEffect(() => {
    const carregarOpcoes = async () => {
      const { data: barbeirosData } = await supabase.from('barbeiros').select('id, nome, especialidades, foto_url').eq('ativo', true).order('nome')
      const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_min, preco').eq('ativo', true).order('nome')
      setBarbeirosLista(barbeirosData || [])
      setServicosLista(servicosData || [])

      const servicoPreSelecionadoId = location.state?.servicoId
      if (servicoPreSelecionadoId) {
        const encontrado = (servicosData || []).find((s) => s.id === servicoPreSelecionadoId)
        if (encontrado) setServico(encontrado)
      }
    }
    carregarOpcoes()
  }, [])

  useEffect(() => {
    const verificarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id, nome, telefone, email')
          .eq('auth_id', session.user.id)
          .maybeSingle()
        if (cliente) {
          setClienteLogado(cliente)
          setStep(1)
        }
      }
      setVerificandoSessao(false)
    }
    verificarSessao()
  }, [])

  const buscarAgendamentosDoDia = async (dataParaBuscar) => {
    if (!dataParaBuscar) { setAgendamentosDoDia([]); return }
    const { data: existentes } = await supabase
      .from('agendamentos')
      .select('barbeiro_id, horario, servicos(duracao_min)')
      .eq('data', dataParaBuscar)
      .neq('status', 'cancelado')
    setAgendamentosDoDia(existentes || [])
  }

  // Busca TODOS os agendamentos do dia (de todos os barbeiros), com a duração do serviço de cada um
  useEffect(() => {
    buscarAgendamentosDoDia(data)
  }, [data])

  const irParaProximo = () => {
    if (step === 3 && clienteLogado) {
      setStep(5)
    } else {
      setStep((s) => s + 1)
    }
  }

  const voltar = () => {
    if (step === 5 && clienteLogado) {
      setStep(3)
    } else {
      setStep((s) => s - 1)
    }
  }

  const total = servico ? servico.preco : 0
  const nomeFinal = clienteLogado ? clienteLogado.nome : nome
  const telefoneFinal = clienteLogado ? clienteLogado.telefone : telefone
  const emailFinal = clienteLogado ? clienteLogado.email : email

  const diaSemana = data ? new Date(data + 'T00:00:00').getDay() : null
  const fechamentoMin = diaSemana === 6 ? 18 * 60 : 19 * 60

  const tentarSelecionarSlot = (slot) => {
    if (!servico || !barbeiro) return
    const disponivel = barbeiroDisponivel(barbeiro.id, slot, servico.duracao_min, agendamentosDoDia, fechamentoMin)

    if (disponivel) {
      setHorario(slot)
      setAvisoConflito(null)
      return
    }

    const alternativos = barbeirosLista.filter(
      (b) => b.id !== barbeiro.id && barbeiroDisponivel(b.id, slot, servico.duracao_min, agendamentosDoDia, fechamentoMin)
    )

    if (alternativos.length > 0) {
      setAvisoConflito(`${barbeiro.nome} está indisponível às ${slot}. ${alternativos.map((b) => b.nome).join(' e ')} ${alternativos.length > 1 ? 'estão' : 'está'} disponível nesse horário.`)
    } else {
      setAvisoConflito(`Nenhum barbeiro está disponível às ${slot} para esse serviço.`)
    }
  }

  const confirmarAgendamento = async () => {
    setErroEnvio('')
    setEnviando(true)

    let clienteId = clienteLogado?.id

    if (!clienteId) {
      const { data: existente } = await supabase.from('clientes').select('id').eq('telefone', telefoneFinal).maybeSingle()
      if (existente) {
        clienteId = existente.id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert({ nome: nomeFinal, telefone: telefoneFinal, email: emailFinal })
          .select('id')
          .single()
        if (erroCliente) {
          setEnviando(false)
          setErroEnvio('Não foi possível salvar seus dados. Tenta de novo.')
          return
        }
        clienteId = novoCliente.id
      }
    }

    const { data: novoAgendamento, error } = await supabase.from('agendamentos').insert({
      cliente_id: clienteId,
      barbeiro_id: barbeiro.id,
      servico_id: servico.id,
      data,
      horario,
      status: 'pendente',
    }).select('id').single()

    setEnviando(false)

    if (error) {
      if (error.message?.includes('já tem um agendamento')) {
        await buscarAgendamentosDoDia(data)
        setHorario(null)
        setStep(3)
        setAvisoConflito('Esse horário acabou de ser ocupado por outro cliente. Escolhe outro horário na grade abaixo.')
      } else {
        setErroEnvio('Não foi possível confirmar o agendamento. Tenta outro horário.')
      }
      return
    }

    // Dispara o e-mail de confirmação (não trava o fluxo se falhar)
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-confirmacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paraEmail: emailFinal,
        nomeCliente: nomeFinal,
        barbeiro: barbeiro.nome,
        servico: servico.nome,
        data,
        horario,
        preco: Number(total).toFixed(2),
        agendamentoId: novoAgendamento?.id,
      }),
    }).catch(() => {})

    setStep(6)
  }

  if (verificandoSessao) {
    return <div className="rz-page-root"><div className="rz-page" style={{ textAlign: 'center', paddingTop: 80 }}>Carregando...</div></div>
  }

  if (step === 0) {
    return (
      <div className="rz-page-root">
        <header className="rz-topbar">
          <Link to="/" className="rz-logo-text" style={{ textDecoration: 'none' }}>Re<span>Z</span>enha</Link>
          <div className="rz-topbar-right">
            <ul className="rz-nav">
              <li><Link to="/">Início</Link></li>
              <li className="active"><Link to="/agendamento">Agendar</Link></li>
            </ul>
            <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Entrar</Link>
          </div>
        </header>
        <div className="rz-page">
          <div className="rz-divider"></div>
          <div className="rz-page-title">Fazer <span>agendamento</span></div>
          <div className="rz-page-sub">Como você quer continuar?</div>
          <div className="rz-choice-grid">
            <Link to="/login" className="rz-choice-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="rz-choice-icon"><i className="ti ti-user-check"></i></div>
              <div className="rz-choice-title">Já sou cliente</div>
              <div className="rz-choice-desc">Entre com seu login e seus dados já vêm preenchidos automaticamente</div>
            </Link>
            <div className="rz-choice-card" onClick={() => setStep(1)}>
              <div className="rz-choice-icon"><i className="ti ti-user-plus"></i></div>
              <div className="rz-choice-title">Agendar sem cadastro</div>
              <div className="rz-choice-desc">Informe seus dados na hora, sem precisar criar conta</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="rz-page-root">
        <header className="rz-topbar">
          <div className="rz-logo-text">Re<span>Z</span>enha</div>
          <ul className="rz-nav"><li><Link to="/">Início</Link></li></ul>
        </header>
        <div className="rz-page" style={{ textAlign: 'center', paddingTop: 60 }}>
          <i className="ti ti-circle-check" style={{ fontSize: 56, color: '#4caf50' }}></i>
          <div className="rz-page-title" style={{ marginTop: 16 }}>Agendamento <span>confirmado!</span></div>
          <p style={{ color: '#888', marginTop: 8 }}>Você receberá a confirmação por e-mail em breve.</p>
          <Link to="/" className="rz-btn-primary" style={{ display: 'inline-block', marginTop: 24, width: 'auto', padding: '14px 32px' }}>Voltar ao início</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rz-page-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">Re<span>Z</span>enha</div>
        <div className="rz-topbar-right">
          <ul className="rz-nav">
            <li><Link to="/">Início</Link></li>
            <li className="active"><Link to="/agendamento">Agendar</Link></li>
          </ul>
          {clienteLogado ? (
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload() }} className="rz-btn-nav" style={{ border: 'none', cursor: 'pointer' }}>Sair</button>
          ) : (
            <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Entrar</Link>
          )}
        </div>
      </header>

      <div className="rz-page">
        <div className="rz-divider"></div>
        <div className="rz-page-title">Fazer <span>agendamento</span></div>
        <div className="rz-page-sub">
          {clienteLogado ? `Olá, ${clienteLogado.nome.split(' ')[0]}! Preencha as etapas abaixo` : 'Preencha as etapas abaixo'}
        </div>

        <div className="rz-steps">
          <div className={`rz-step ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
            <div className="rz-step-num">{step > 1 ? <i className="ti ti-check" style={{ fontSize: 13 }}></i> : 1}</div>
            <div className="rz-step-label">Barbeiro</div>
          </div>
          <div className="rz-step-arrow">›</div>
          <div className={`rz-step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
            <div className="rz-step-num">{step > 2 ? <i className="ti ti-check" style={{ fontSize: 13 }}></i> : 2}</div>
            <div className="rz-step-label">Serviço</div>
          </div>
          <div className="rz-step-arrow">›</div>
          <div className={`rz-step ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}>
            <div className="rz-step-num">{step > 3 ? <i className="ti ti-check" style={{ fontSize: 13 }}></i> : 3}</div>
            <div className="rz-step-label">Data e hora</div>
          </div>
          {!clienteLogado && (
            <>
              <div className="rz-step-arrow">›</div>
              <div className={`rz-step ${step === 4 ? 'active' : step > 4 ? 'done' : ''}`}>
                <div className="rz-step-num">{step > 4 ? <i className="ti ti-check" style={{ fontSize: 13 }}></i> : 4}</div>
                <div className="rz-step-label">Seus dados</div>
              </div>
            </>
          )}
          <div className="rz-step-arrow">›</div>
          <div className={`rz-step ${step === 5 ? 'active' : ''}`}>
            <div className="rz-step-num">5</div>
            <div className="rz-step-label">Confirmar</div>
          </div>
        </div>

        {step === 1 && (
          <div className="rz-section-block">
            <div className="rz-field-label">1. Escolha o barbeiro</div>
            {barbeirosLista.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13 }}>Nenhum barbeiro disponível no momento.</p>
            ) : (
              <div className="rz-barbers-grid">
                {barbeirosLista.map((b) => (
                  <div key={b.id} className={`rz-barber-card ${barbeiro?.id === b.id ? 'selected' : ''}`} onClick={() => setBarbeiro(b)}>
                    {b.foto_url ? (
                      <img src={b.foto_url} alt={b.nome} className="rz-barber-avatar-foto" />
                    ) : (
                      <div className="rz-barber-avatar">{b.nome.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="rz-barber-info-wrap">
                      <div className="rz-barber-name">{b.nome}</div>
                      <div className="rz-barber-role">{b.especialidades || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!barbeiro} onClick={irParaProximo}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>‹ Voltar</button>
            <div className="rz-field-label">2. Escolha o serviço</div>
            {servicosLista.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13 }}>Nenhum serviço disponível no momento.</p>
            ) : (
              <div className="rz-services-list">
                {servicosLista.map((s) => (
                  <div key={s.id} className={`rz-service-row ${servico?.id === s.id ? 'selected' : ''}`} onClick={() => setServico(s)}>
                    <div className="rz-service-info">
                      <div className="rz-service-name">{s.nome}</div>
                      <div className="rz-service-duration">~{s.duracao_min} min</div>
                    </div>
                    <div className="rz-service-price">R$ {Number(s.preco).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!servico} onClick={irParaProximo}>Continuar</button>
          </div>
        )}

        {step === 3 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>‹ Voltar</button>
            <div className="rz-field-label">3. Escolha a data e horário</div>
            <div className="rz-warning">
              <i className="ti ti-alert-circle" style={{ fontSize: 18, flexShrink: 0 }}></i>
              Agendamentos com menos de 2 horas de antecedência não são permitidos.
            </div>

            {avisoConflito && (
              <div style={{ background: '#2b1e00', border: '1px solid #F07B00', color: '#F07B00', fontSize: 13, padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>{avisoConflito}</span>
                <button onClick={() => setAvisoConflito(null)} style={{ background: 'none', border: 'none', color: '#F07B00', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            )}

            <div className="rz-datetime-grid">
              <div>
                <div className="rz-field-label">Data</div>
                <Calendario value={data} onChange={(novaData) => { setData(novaData); setHorario(null); setAvisoConflito(null) }} />
              </div>
              <div>
                <div className="rz-field-label">Horários disponíveis</div>
                {!data ? (
                  <p style={{ color: '#666', fontSize: 13 }}>Escolha uma data primeiro.</p>
                ) : gerarHorarios(data).length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13 }}>Fechado nesse dia.</p>
                ) : (
                  <div className="rz-slots">
                    {gerarHorarios(data).map((h) => {
                      const disponivel = barbeiroDisponivel(barbeiro.id, h, servico.duracao_min, agendamentosDoDia, fechamentoMin)
                      return (
                        <div
                          key={h}
                          className={`rz-slot ${horario === h ? 'selected' : ''} ${!disponivel ? 'blocked' : ''}`}
                          onClick={() => tentarSelecionarSlot(h)}
                        >
                          {h}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!data || !horario} onClick={irParaProximo}>Continuar</button>
          </div>
        )}

        {step === 4 && !clienteLogado && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>‹ Voltar</button>
            <div className="rz-field-label">4. Seus dados</div>
            <div className="rz-form-grid">
              <div className="rz-input-group">
                <div className="rz-field-label">Nome</div>
                <input className="rz-input" type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="rz-input-group">
                <div className="rz-field-label">Celular (WhatsApp)</div>
                <input className="rz-input" type="text" placeholder="(55) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div className="rz-input-group">
                <div className="rz-field-label">E-mail</div>
                <input className="rz-input" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!nome || !telefone || !email} onClick={irParaProximo}>Continuar</button>
          </div>
        )}

        {step === 5 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>‹ Voltar</button>
            <div className="rz-field-label">5. Confirme seu agendamento</div>
            {erroEnvio && (
              <div style={{ background: '#2b0d0d', border: '1px solid #e53935', color: '#ff6b6b', fontSize: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
                {erroEnvio}
              </div>
            )}
            <div className="rz-summary">
              <div className="rz-summary-title">Resumo do agendamento</div>
              <div className="rz-summary-row"><span>Nome</span><span>{nomeFinal}</span></div>
              <div className="rz-summary-row"><span>Barbeiro</span><span>{barbeiro?.nome}</span></div>
              <div className="rz-summary-row"><span>Serviço</span><span>{servico?.nome}</span></div>
              <div className="rz-summary-row"><span>Data</span><span>{data}</span></div>
              <div className="rz-summary-row"><span>Horário</span><span>{horario}</span></div>
              <div className="rz-summary-row total"><span>Total</span><span>R$ {Number(total).toFixed(2)}</span></div>
            </div>
            <button className="rz-btn-primary" disabled={enviando} onClick={confirmarAgendamento}>
              {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
            <div className="rz-wpp-note">
              <i className="ti ti-mail" style={{ fontSize: 16, color: '#F07B00' }}></i>
              Você receberá a confirmação por e-mail
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Agendamento