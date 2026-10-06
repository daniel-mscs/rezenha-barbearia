import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Calendario from '../components/Calendario'
import BotaoWhatsapp from '../components/BotaoWhatsapp'
import BotaoInstalarApp from '../components/BotaoInstalarApp'
import { iconesParaExibir } from '../components/Icons'
import { formatarDuracao } from '../utils/formatarDuracao'
import './Agendamento.css'

function gerarHorarios(dataStr, config, diasFechados) {
  if (!dataStr || !config) return []
  const diaSemana = new Date(dataStr + 'T00:00:00').getDay()
  if (diaSemana === 0 && !config.domingo_aberto) return []
  if (diasFechados.includes(dataStr)) return []

  const [hAberturaSemana, mAberturaSemana] = config.horario_semana_abertura.split(':').map(Number)
  const [hFechamentoSemana, mFechamentoSemana] = config.horario_semana_fechamento.split(':').map(Number)
  const [hAberturaSabado, mAberturaSabado] = config.horario_sabado_abertura.split(':').map(Number)
  const [hFechamentoSabado, mFechamentoSabado] = config.horario_sabado_fechamento.split(':').map(Number)

  const abertura = diaSemana === 6 ? hAberturaSabado * 60 + mAberturaSabado : hAberturaSemana * 60 + mAberturaSemana
  const fechamento = diaSemana === 6 ? hFechamentoSabado * 60 + mFechamentoSabado : hFechamentoSemana * 60 + mFechamentoSemana

  const slots = []
  let minutoAtual = abertura
  while (minutoAtual < fechamento) {
    const h = Math.floor(minutoAtual / 60)
    const m = minutoAtual % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    minutoAtual += 15
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

function barbeiroDisponivel(barbeiroId, slot, duracaoMin, agendamentosDoDia, fechamentoMin) {
  const inicioNovo = horarioParaMinutos(slot)
  const fimNovo = inicioNovo + duracaoMin
  if (fimNovo > fechamentoMin) return false

  const ocupacoesDoBarbeiro = agendamentosDoDia.filter((a) => a.barbeiro_id === barbeiroId)
  for (const a of ocupacoesDoBarbeiro) {
    const inicioExistente = horarioParaMinutos(a.horario.slice(0, 5))
    const fimExistente = inicioExistente + (a.servicos?.duracao_min || 30)
    const sobrepoe = inicioNovo < fimExistente && fimNovo > inicioExistente
    if (sobrepoe) return false
  }
  return true
}

function apenasLetras(valor) {
  return valor.replace(/[^A-Za-zÀ-ÿ\s]/g, '')
}

function apenasNumeros(valor) {
  return valor.replace(/\D/g, '')
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

function formatarCpf(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatarTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)
  if (numeros.length === 0) return ''
  if (numeros.length <= 2) return numeros.replace(/(\d{0,2})/, '($1')
  if (numeros.length <= 3) return numeros.replace(/(\d{2})(\d{0,1})/, '($1) $2')
  if (numeros.length <= 7) return numeros.replace(/(\d{2})(\d{1})(\d{0,4})/, '($1) $2 $3')
  return numeros.replace(/(\d{2})(\d{1})(\d{4})(\d{0,4})/, '($1) $2 $3-$4')
}

function Agendamento() {
  const navigate = useNavigate()
  const location = useLocation()

  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [clienteLogado, setClienteLogado] = useState(null)

  const [barbeirosLista, setBarbeirosLista] = useState([])
  const [servicosLista, setServicosLista] = useState([])
  const [agendamentosDoDia, setAgendamentosDoDia] = useState([])
  const [avisoConflito, setAvisoConflito] = useState(null) // { mensagem, horario, alternativos }
  const [config, setConfig] = useState(null)
  const [diasFechados, setDiasFechados] = useState([])

  const [step, setStep] = useState(0)
  const [barbeiro, setBarbeiro] = useState(null)
  const [servico, setServico] = useState(null)
  const [data, setData] = useState('')
  const [horario, setHorario] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  useEffect(() => {
    const carregarOpcoes = async () => {
      const { data: barbeirosData } = await supabase.from('barbeiros').select('id, nome, foto_url').eq('ativo', true).order('nome')
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('id, nome, duracao_min, preco, icones')
        .eq('ativo', true)
        .order('nome')
      const { data: configData } = await supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle()
      const { data: fechadosData } = await supabase.from('dias_fechados').select('data')
      setBarbeirosLista(barbeirosData || [])
      setServicosLista(servicosData || [])
      setConfig(configData)
      setDiasFechados((fechadosData || []).map((d) => d.data))

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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id, nome, telefone, email, barbeiro_favorito_id')
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

  useEffect(() => {
    if (!clienteLogado?.barbeiro_favorito_id || barbeirosLista.length === 0 || barbeiro) return
    const favorito = barbeirosLista.find((b) => b.id === clienteLogado.barbeiro_favorito_id)
    if (favorito) setBarbeiro(favorito)
  }, [clienteLogado, barbeirosLista])

  const buscarAgendamentosDoDia = async (dataParaBuscar) => {
    if (!dataParaBuscar) {
      setAgendamentosDoDia([])
      return
    }
    const { data: existentes } = await supabase
      .from('agendamentos')
      .select('barbeiro_id, horario, servicos(duracao_min)')
      .eq('data', dataParaBuscar)
      .neq('status', 'cancelado')
    setAgendamentosDoDia(existentes || [])
  }

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
  const fechamentoMin = (() => {
    if (!config) return 19 * 60
    const horarioStr = diaSemana === 6 ? config.horario_sabado_fechamento : config.horario_semana_fechamento
    const [h, m] = horarioStr.split(':').map(Number)
    return h * 60 + m
  })()

  const existeAlternativaNoDia = () => {
    if (!barbeiro || !servico) return false
    const horarios = gerarHorarios(data, config, diasFechados)
    return horarios.some((h) => {
      const indisponivelAqui = !barbeiroDisponivel(barbeiro.id, h, servico.duracao_min, agendamentosDoDia, fechamentoMin)
      if (!indisponivelAqui) return false
      return barbeirosLista.some(
        (b) => b.id !== barbeiro.id && barbeiroDisponivel(b.id, h, servico.duracao_min, agendamentosDoDia, fechamentoMin),
      )
    })
  }

  const tentarSelecionarSlot = (slot) => {
    if (!servico || !barbeiro) return

    if (horarioJaPassou(data, slot)) {
      setAvisoConflito({ mensagem: 'Esse horário já passou. Escolhe um horário futuro.', horario: null, alternativos: [] })
      return
    }

    const disponivel = barbeiroDisponivel(barbeiro.id, slot, servico.duracao_min, agendamentosDoDia, fechamentoMin)

    if (disponivel) {
      setHorario(slot)
      setAvisoConflito(null)
      return
    }

    const alternativos = barbeirosLista.filter(
      (b) => b.id !== barbeiro.id && barbeiroDisponivel(b.id, slot, servico.duracao_min, agendamentosDoDia, fechamentoMin),
    )

    setAvisoConflito({
      horario: slot,
      mensagem:
        alternativos.length > 0
          ? `${barbeiro.nome} está indisponível às ${slot}.`
          : `Nenhum barbeiro está disponível às ${slot} para esse serviço.`,
      alternativos,
    })
  }

  const trocarParaBarbeiroAlternativo = (novoBarbeiro) => {
    setBarbeiro(novoBarbeiro)
    setHorario(avisoConflito.horario)
    setAvisoConflito(null)
  }

  const confirmarAgendamento = async () => {
    setErroEnvio('')
    setEnviando(true)

    let clienteId = clienteLogado?.id

    if (!clienteId) {
      const { data: idCliente, error: erroCliente } = await supabase.rpc('criar_cliente_publico', {
        p_nome: nomeFinal,
        p_telefone: telefoneFinal,
        p_email: emailFinal,
        p_cpf: cpf || null,
      })
      if (erroCliente || !idCliente) {
        setEnviando(false)
        setErroEnvio('Não foi possível salvar seus dados. Tenta de novo.')
        return
      }
      clienteId = idCliente
    }

    const { data: novoAgendamento, error } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: clienteId,
        barbeiro_id: barbeiro.id,
        servico_id: servico.id,
        data,
        horario,
        status: 'pendente',
      })
      .select('id')
      .single()

    setEnviando(false)

    if (error) {
      if (error.message?.includes('já tem 3 agendamentos')) {
        setErroEnvio(error.message)
      } else if (error.message?.includes('já tem um agendamento')) {
        await buscarAgendamentosDoDia(data)
        setHorario(null)
        setStep(3)
        setAvisoConflito({
          mensagem: 'Esse horário acabou de ser ocupado por outro cliente. Escolhe outro horário na grade abaixo.',
          horario: null,
          alternativos: [],
        })
      } else {
        setErroEnvio('Não foi possível confirmar o agendamento. Tenta outro horário.')
      }
      return
    }

    // Confirmação por WhatsApp (não trava o fluxo se falhar)
    if (novoAgendamento?.id) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamento_id: novoAgendamento.id }),
      }).catch(() => {})
    }

    setStep(6)
  }

  if (verificandoSessao) {
    return (
      <div className="rz-page-root">
        <div className="rz-page" style={{ textAlign: 'center', paddingTop: 80 }}>
          Carregando...
        </div>
      </div>
    )
  }

  if (step === 0) {
    return (
      <div className="rz-page-root">
        <header className="rz-topbar">
          <div className="rz-logo-text">
            Re<span>Z</span>enha
          </div>
          <div className="rz-topbar-right">
            <ul className="rz-nav">
              <li>
                <Link to="/">Início</Link>
              </li>
              <li className="active">
                <Link to="/agendamento">Agendar</Link>
              </li>
            </ul>
            <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Entrar / Login
            </Link>
          </div>
        </header>
        <div className="rz-page">
          <div className="rz-divider"></div>
          <div className="rz-page-title">
            Fazer <span>agendamento</span>
          </div>
          <div className="rz-page-sub">Como você quer continuar?</div>
          <div className="rz-choice-grid">
            <Link to="/login" className="rz-choice-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="rz-choice-icon">
                <i className="ti ti-user-check"></i>
              </div>
              <div className="rz-choice-title">Já sou cliente</div>
              <div className="rz-choice-desc">Entre com seu login e seus dados já vêm preenchidos automaticamente</div>
            </Link>
            <div className="rz-choice-card" onClick={() => setStep(1)}>
              <div className="rz-choice-icon">
                <i className="ti ti-user-plus"></i>
              </div>
              <div className="rz-choice-title">Agendar sem cadastro</div>
              <div className="rz-choice-desc">Informe seus dados na hora, sem precisar criar conta</div>
            </div>
          </div>
        </div>
        <BotaoWhatsapp />
        <BotaoInstalarApp />
      </div>
    )
  }

  if (step === 6) {
    const dataFormatada = data
      ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : ''
    const linkAjuda = `https://wa.me/5555991975065?text=${encodeURIComponent(
      'Olá! Fiz um agendamento pelo site e não recebi a mensagem de confirmação no WhatsApp.',
    )}`

    return (
      <div className="rz-page-root">
        <header className="rz-topbar">
          <div className="rz-logo-text">
            Re<span>Z</span>enha
          </div>
          <ul className="rz-nav">
            <li>
              <Link to="/">Início</Link>
            </li>
          </ul>
        </header>
        <div className="rz-page" style={{ textAlign: 'center', paddingTop: 60 }}>
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 56, color: '#25d366' }}></i>
          <div className="rz-page-title" style={{ marginTop: 16 }}>
            Confirme seu <span>agendamento</span>
          </div>
          <p style={{ color: '#ccc', marginTop: 8, fontSize: 15 }}>
            Verifique seu WhatsApp! Enviamos uma mensagem para <strong style={{ color: '#fff' }}>{formatarTelefone(telefoneFinal)}</strong>.
          </p>
          <p style={{ color: '#888', marginTop: 4, fontSize: 14 }}>Toque em "Confirmar presença" na mensagem pra garantir seu horário.</p>

          <div className="rz-summary" style={{ maxWidth: 380, margin: '24px auto 0', textAlign: 'left' }}>
            <div className="rz-summary-row">
              <span>Barbeiro</span>
              <span>{barbeiro?.nome}</span>
            </div>
            <div className="rz-summary-row">
              <span>Serviço</span>
              <span>{servico?.nome}</span>
            </div>
            <div className="rz-summary-row">
              <span>Data</span>
              <span>{dataFormatada}</span>
            </div>
            <div className="rz-summary-row">
              <span>Horário</span>
              <span>{horario}</span>
            </div>
          </div>

          <Link to="/" className="rz-btn-primary" style={{ display: 'inline-block', marginTop: 24, width: 'auto', padding: '14px 32px' }}>
            Voltar ao início
          </Link>

          <div style={{ marginTop: 16 }}>
            <a href={linkAjuda} target="_blank" rel="noopener noreferrer" style={{ color: '#666', fontSize: 12, textDecoration: 'none' }}>
              Não recebeu a mensagem? Fale com a barbearia
            </a>
          </div>
        </div>
        <BotaoWhatsapp />
      </div>
    )
  }

  return (
    <div className="rz-page-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">
          Re<span>Z</span>enha
        </div>
        <div className="rz-topbar-right">
          <ul className="rz-nav">
            <li>
              <Link to="/">Início</Link>
            </li>
            <li className="active">
              <Link to="/agendamento">Agendar</Link>
            </li>
          </ul>
          {clienteLogado ? (
            <>
              <span className="rz-saudacao-cliente">
                Olá, <strong>{clienteLogado.nome.split(' ')[0]}</strong>
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.reload()
                }}
                className="rz-btn-nav"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Entrar / Login
            </Link>
          )}
        </div>
      </header>

      <div className="rz-page">
        <div className="rz-divider"></div>
        <div className="rz-page-title">
          Fazer <span>agendamento</span>
        </div>
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
                      <div className="rz-barber-name">
                        {b.nome}
                        {clienteLogado?.barbeiro_favorito_id === b.id ? ' ★' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!barbeiro} onClick={irParaProximo}>
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>
              ‹ Voltar
            </button>
            <div className="rz-field-label">2. Escolha o serviço</div>
            {servicosLista.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13 }}>Nenhum serviço disponível no momento.</p>
            ) : (
              <div className="rz-services-list">
                {servicosLista.map((s) => (
                  <div key={s.id} className={`rz-service-row ${servico?.id === s.id ? 'selected' : ''}`} onClick={() => setServico(s)}>
                    <div className="rz-service-row-icone">
                      {iconesParaExibir(s).map((Icone, i) => (
                        <Icone key={i} width={40} height={40} />
                      ))}
                    </div>
                    <div className="rz-service-info">
                      <div className="rz-service-name">{s.nome}</div>
                      <div className="rz-service-duration">~{formatarDuracao(s.duracao_min)}</div>
                    </div>
                    <div className="rz-service-price">R$ {Number(s.preco).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!servico} onClick={irParaProximo}>
              Continuar
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>
              ‹ Voltar
            </button>
            <div className="rz-field-label">3. Escolha a data e horário</div>
            <div className="rz-warning">
              <i className="ti ti-alert-circle" style={{ fontSize: 18, flexShrink: 0 }}></i>
              Agendamentos com menos de 30 minutos de antecedência não são permitidos.
            </div>

            <div className="rz-datetime-grid">
              <div>
                <div className="rz-field-label">Data</div>
                <Calendario
                  value={data}
                  onChange={(novaData) => {
                    setData(novaData)
                    setHorario(null)
                    setAvisoConflito(null)
                  }}
                />
              </div>
              <div>
                <div className="rz-field-label">Horários disponíveis</div>

                {avisoConflito && (
                  <div className="rz-conflito-box">
                    <div className="rz-conflito-texto">
                      <span>{avisoConflito.mensagem}</span>
                      <button className="rz-conflito-fechar" onClick={() => setAvisoConflito(null)}>
                        ✕
                      </button>
                    </div>
                    {avisoConflito.alternativos?.length > 0 && (
                      <>
                        <div className="rz-conflito-alternativas">
                          {avisoConflito.alternativos.map((alt) => (
                            <button key={alt.id} className="rz-conflito-btn" onClick={() => trocarParaBarbeiroAlternativo(alt)}>
                              {alt.foto_url ? (
                                <img src={alt.foto_url} alt={alt.nome} className="rz-conflito-btn-foto" />
                              ) : (
                                <span className="rz-conflito-btn-avatar">{alt.nome.charAt(0).toUpperCase()}</span>
                              )}
                              <span className="rz-conflito-btn-texto">
                                Marcar com {alt.nome} às {avisoConflito.horario}?
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {data && !avisoConflito && existeAlternativaNoDia() && (
                  <div className="rz-dica-alternativa">
                    💡 Alguns horários de {barbeiro.nome} estão ocupados hoje — outros barbeiros têm horários livres. Clica num horário
                    riscado pra ver as opções.
                  </div>
                )}
                {!data ? (
                  <p style={{ color: '#666', fontSize: 13 }}>Escolha uma data primeiro.</p>
                ) : gerarHorarios(data, config, diasFechados).length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13 }}>Fechado nesse dia.</p>
                ) : (
                  <div className="rz-slots">
                    {gerarHorarios(data, config, diasFechados).map((h) => {
                      const disponivel =
                        !horarioJaPassou(data, h) &&
                        barbeiroDisponivel(barbeiro.id, h, servico.duracao_min, agendamentosDoDia, fechamentoMin)
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
            <button className="rz-btn-primary" style={{ marginTop: 20 }} disabled={!data || !horario} onClick={irParaProximo}>
              Continuar
            </button>
          </div>
        )}

        {step === 4 && !clienteLogado && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>
              ‹ Voltar
            </button>
            <div className="rz-field-label rz-field-label-centro">4. Seus dados</div>
            <div className="rz-form-card">
              <div className="rz-form-grid">
                <div className="rz-input-group">
                  <div className="rz-field-label">Nome</div>
                  <input
                    className="rz-input"
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(apenasLetras(e.target.value))}
                    autoFocus
                  />
                </div>
                <div className="rz-input-group">
                  <div className="rz-field-label">Celular (WhatsApp)</div>
                  <input
                    className="rz-input"
                    type="text"
                    placeholder="(55) 9 9999-9999"
                    value={formatarTelefone(telefone)}
                    onChange={(e) => setTelefone(apenasNumeros(e.target.value).slice(0, 11))}
                    maxLength={16}
                  />
                </div>
                <div className="rz-input-group">
                  <div className="rz-field-label">CPF</div>
                  <input
                    className="rz-input"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                    maxLength={14}
                  />
                </div>
              </div>
              <div className="rz-seguranca-nota">
                🔒 Seus dados estão protegidos e seguros. Usamos suas informações só pra confirmar seu agendamento.
              </div>
            </div>
            <button
              className="rz-btn-primary"
              style={{ marginTop: 20, maxWidth: 500, margin: '20px auto 0', display: 'block' }}
              disabled={!nome || telefone.length < 11 || cpf.replace(/\D/g, '').length < 11}
              onClick={irParaProximo}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="rz-section-block">
            <button className="rz-btn-back" onClick={voltar}>
              ‹ Voltar
            </button>
            <div className="rz-field-label">5. Confirme seu agendamento</div>
            {erroEnvio && (
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
                {erroEnvio}
              </div>
            )}
            <div className="rz-summary">
              <div className="rz-summary-title">Resumo do agendamento</div>
              <div className="rz-summary-row">
                <span>Nome</span>
                <span>{nomeFinal}</span>
              </div>
              <div className="rz-summary-row">
                <span>Barbeiro</span>
                <span>{barbeiro?.nome}</span>
              </div>
              <div className="rz-summary-row">
                <span>Serviço</span>
                <span>{servico?.nome}</span>
              </div>
              <div className="rz-summary-row">
                <span>Data</span>
                <span>{data}</span>
              </div>
              <div className="rz-summary-row">
                <span>Horário</span>
                <span>{horario}</span>
              </div>
              <div className="rz-summary-row total">
                <span>Total</span>
                <span>R$ {Number(total).toFixed(2)}</span>
              </div>
            </div>
            <button className="rz-btn-primary" disabled={enviando} onClick={confirmarAgendamento}>
              {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </div>
        )}
      </div>
      <BotaoWhatsapp />
      <BotaoInstalarApp />
    </div>
  )
}

export default Agendamento
