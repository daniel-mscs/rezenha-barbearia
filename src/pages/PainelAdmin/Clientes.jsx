import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const OPCOES_ORDEM = [
  { valor: 'nome-asc', rotulo: 'Nome (A–Z)' },
  { valor: 'nome-desc', rotulo: 'Nome (Z–A)' },
  { valor: 'recentes', rotulo: 'Cadastrados recentemente' },
  { valor: 'sem-cortar', rotulo: 'Mais tempo sem cortar' },
  { valor: 'cortou-recente', rotulo: 'Cortou há pouco' },
  { valor: 'aniversario', rotulo: 'Aniversário mais próximo' },
]

function semAcento(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatarTelefoneExibicao(telefone) {
  if (!telefone) return '—'
  if (telefone.startsWith('+')) return telefone
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

function formatarDataBR(dataStr) {
  const [ano, mes, dia] = dataStr.split('-')
  return `${dia}/${mes}/${ano}`
}

function diasDesde(dataStr) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const data = new Date(dataStr + 'T00:00:00')
  return Math.max(0, Math.round((hoje - data) / 86400000))
}

function aniversarioCurto(dataStr) {
  const [, mes, dia] = dataStr.split('-')
  return `${dia} ${MESES_CURTOS[parseInt(mes, 10) - 1]}`
}

function diasAteAniversario(dataStr) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [, mes, dia] = dataStr.split('-').map(Number)
  let proximo = new Date(hoje.getFullYear(), mes - 1, dia)
  if (proximo < hoje) proximo = new Date(hoje.getFullYear() + 1, mes - 1, dia)
  return Math.round((proximo - hoje) / 86400000)
}

function compararNulosPorUltimo(a, b, comparar) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return comparar(a, b)
}

function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('nome-asc')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefoneInternacional, setTelefoneInternacional] = useState(false)
  const [barbeiroFavoritoId, setBarbeiroFavoritoId] = useState('')
  const [barbeirosAtivos, setBarbeirosAtivos] = useState([])
  const [obs, setObs] = useState('')
  const [diaNascimento, setDiaNascimento] = useState('')
  const [mesNascimento, setMesNascimento] = useState('')
  const [anoNascimento, setAnoNascimento] = useState('')
  const [intervaloLembrete, setIntervaloLembrete] = useState('30')
  const [salvando, setSalvando] = useState(false)
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null)

  useEffect(() => {
    const carregarBarbeirosAtivos = async () => {
      const { data } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true).order('nome')
      setBarbeirosAtivos(data || [])
    }
    carregarBarbeirosAtivos()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setTelefone('')
    setCpf('')
    setTelefoneInternacional(false)
    setBarbeiroFavoritoId('')
    setObs('')
    setDiaNascimento('')
    setMesNascimento('')
    setAnoNascimento('')
    setIntervaloLembrete('30')
    setModalAberto(true)
  }

  const abrirEdicao = (c) => {
    setEditando(c)
    setNome(c.nome)
    setTelefone(c.telefone)
    setCpf(c.cpf || '')
    setTelefoneInternacional((c.telefone || '').startsWith('+'))
    setBarbeiroFavoritoId(c.barbeiro_favorito_id || '')
    setObs(c.obs || '')
    if (c.data_nascimento) {
      const [ano, mes, dia] = c.data_nascimento.split('-')
      setAnoNascimento(ano)
      setMesNascimento(mes)
      setDiaNascimento(dia)
    } else {
      setAnoNascimento('')
      setMesNascimento('')
      setDiaNascimento('')
    }
    setIntervaloLembrete(String(c.intervalo_lembrete_dias || 30))
    setModalAberto(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)

    const dataNascimentoMontada =
      diaNascimento && mesNascimento && anoNascimento
        ? `${anoNascimento}-${mesNascimento.padStart(2, '0')}-${diaNascimento.padStart(2, '0')}`
        : null

    const payload = {
      nome,
      telefone,
      cpf: cpf || null,
      obs,
      data_nascimento: dataNascimentoMontada,
      intervalo_lembrete_dias: Math.min(365, Math.max(1, parseInt(intervaloLembrete, 10) || 30)),
      barbeiro_favorito_id: barbeiroFavoritoId || null,
    }

    const { error } = editando
      ? await supabase.from('clientes').update(payload).eq('id', editando.id)
      : await supabase.from('clientes').insert(payload)

    setSalvando(false)

    if (error) {
      alert('Não foi possível salvar: ' + error.message)
      return
    }

    setModalAberto(false)
    carregar()
  }

  const confirmarExcluir = async () => {
    if (!clienteParaExcluir) return
    const { error } = await supabase.from('clientes').delete().eq('id', clienteParaExcluir.id)
    if (error) {
      alert('Não foi possível excluir: ' + error.message)
      return
    }
    setClienteParaExcluir(null)
    carregar()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const [clienteParaConvite, setClienteParaConvite] = useState(null)
  const [senhaConvite, setSenhaConvite] = useState('')
  const [enviandoConvite, setEnviandoConvite] = useState(false)
  const [erroConvite, setErroConvite] = useState('')

  const gerarSenhaAleatoria = () => {
    const numeros = Math.floor(1000 + Math.random() * 9000)
    return `Rezenha${numeros}`
  }

  const abrirConvite = (cliente) => {
    setClienteParaConvite(cliente)
    setSenhaConvite(gerarSenhaAleatoria())
    setErroConvite('')
  }

  const confirmarConvite = async () => {
    if (!senhaConvite || senhaConvite.length < 6) {
      setErroConvite('A senha precisa ter no mínimo 6 caracteres.')
      return
    }
    setEnviandoConvite(true)
    setErroConvite('')

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const resposta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-login-cliente-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ cliente_id: clienteParaConvite.id, senha: senhaConvite }),
    })
    const resultado = await resposta.json()
    setEnviandoConvite(false)

    if (!resposta.ok) {
      setErroConvite(resultado.erro || 'Não foi possível criar o login.')
      return
    }

    const telefoneLimpo = clienteParaConvite.telefone.replace(/\D/g, '')
    const mensagem = encodeURIComponent(
      `Oi ${clienteParaConvite.nome.split(' ')[0]}! Sua conta na Rezenha Barbearia já está pronta.\n\nEntre em https://barbeariarezenha.com.br/login com:\nWhatsApp: ${formatarTelefoneExibicao(clienteParaConvite.telefone)}\nSenha: ${senhaConvite}`,
    )
    window.open(`https://wa.me/${clienteParaConvite.telefone.startsWith('+') ? '' : '55'}${telefoneLimpo}?text=${mensagem}`, '_blank')

    setClienteParaConvite(null)
    carregar()
  }

  const totalClientes = clientes.length
  const comLogin = clientes.filter((c) => c.auth_id).length
  const semLogin = totalClientes - comLogin
  const atrasadosLembrete = clientes.filter(
    (c) => c.data_ultimo_corte && diasDesde(c.data_ultimo_corte) > (c.intervalo_lembrete_dias || 30),
  ).length

  const buscaNormalizada = semAcento(busca.trim())
  const buscaEhNumero = /^[\d\s()+\-.]+$/.test(busca.trim())
  const buscaDigitos = busca.replace(/\D/g, '')

  const clientesFiltrados = clientes
    .filter((c) => {
      if (!buscaNormalizada) return true
      const porNome = semAcento(c.nome).includes(buscaNormalizada)
      const porTelefone = buscaEhNumero && buscaDigitos.length > 0 && (c.telefone || '').replace(/\D/g, '').includes(buscaDigitos)
      return porNome || porTelefone
    })
    .sort((a, b) => {
      switch (ordem) {
        case 'nome-desc':
          return b.nome.localeCompare(a.nome, 'pt-BR', { sensitivity: 'base' })
        case 'recentes':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        case 'sem-cortar':
          return compararNulosPorUltimo(a.data_ultimo_corte, b.data_ultimo_corte, (x, y) => x.localeCompare(y))
        case 'cortou-recente':
          return compararNulosPorUltimo(a.data_ultimo_corte, b.data_ultimo_corte, (x, y) => y.localeCompare(x))
        case 'aniversario':
          return compararNulosPorUltimo(
            a.data_nascimento ? diasAteAniversario(a.data_nascimento) : null,
            b.data_nascimento ? diasAteAniversario(b.data_nascimento) : null,
            (x, y) => x - y,
          )
        default:
          return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      }
    })

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
        <AdminSidebar ativa="clientes" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Clientes</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="rz-input"
                style={{ margin: 0, width: 220 }}
                type="text"
                placeholder="Buscar por nome ou telefone"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <select className="rz-input" style={{ margin: 0, width: 'auto' }} value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                {OPCOES_ORDEM.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
              <button className="rz-btn-primary" onClick={abrirNovo}>
                + Novo cliente
              </button>
            </div>
          </div>

          <div className="rz-cli-resumo">
            <div className="rz-cli-resumo-item">
              <strong>{totalClientes}</strong>
              <span>Cadastrados</span>
            </div>
            <div className="rz-cli-resumo-item">
              <strong>{comLogin}</strong>
              <span>Com login</span>
            </div>
            <div className="rz-cli-resumo-item">
              <strong>{semLogin}</strong>
              <span>Sem login</span>
            </div>
            <div className="rz-cli-resumo-item">
              <strong>{atrasadosLembrete}</strong>
              <span>Passaram do lembrete</span>
            </div>
          </div>

          <div className="rz-cli-legenda">
            <span>
              <span className="rz-cli-ponto ok"></span> Em dia
            </span>
            <span>
              <span className="rz-cli-ponto atrasado"></span> Passou do lembrete
            </span>
            <span>
              <span className="rz-cli-ponto sem"></span> Sem corte registrado
            </span>
          </div>

          <div className="rz-table-wrap">
            {carregando ? (
              <div className="rz-empty-state">Carregando...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="rz-empty-state">Nenhum cliente encontrado.</div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Favorito</th>
                    <th>Último corte</th>
                    <th>Aniversário</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c) => {
                    const favorito = barbeirosAtivos.find((b) => b.id === c.barbeiro_favorito_id)
                    const dias = c.data_ultimo_corte ? diasDesde(c.data_ultimo_corte) : null
                    const intervalo = c.intervalo_lembrete_dias || 30
                    const atrasado = dias !== null && dias > intervalo
                    const textoDias = dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
                    const status = dias === null ? 'sem' : atrasado ? 'atrasado' : 'ok'
                    const tituloStatus =
                      status === 'sem' ? 'Sem corte registrado' : status === 'atrasado' ? `Passou do lembrete de ${intervalo} dias` : 'Em dia'

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="rz-cli-nome">
                            <span className={`rz-cli-ponto ${status}`} title={tituloStatus}></span>
                            {c.nome}
                            {c.auth_id && <span className="rz-cli-tag-login">Com login</span>}
                          </div>
                          <div className="rz-cli-sub rz-cli-recuo">{formatarTelefoneExibicao(c.telefone)}</div>
                          {c.obs && <div className="rz-cli-obs rz-cli-recuo">{c.obs}</div>}
                        </td>
                        <td>{favorito ? <span className="rz-cli-fav">{favorito.nome}</span> : <span className="rz-cli-vazio">—</span>}</td>
                        <td>
                          {c.data_ultimo_corte ? (
                            <>
                              <div className="rz-cli-corte-data">{formatarDataBR(c.data_ultimo_corte)}</div>
                              <div
                                className={`rz-cli-corte-dias ${atrasado ? 'atrasado' : ''}`}
                                title={atrasado ? `Passou do lembrete de ${intervalo} dias` : ''}
                              >
                                {textoDias}
                                {atrasado ? ' · atrasado' : ''}
                              </div>
                            </>
                          ) : (
                            <span className="rz-cli-vazio">Sem corte ainda</span>
                          )}
                        </td>
                        <td>
                          {c.data_nascimento ? (
                            <span className="rz-cli-corte-data">{aniversarioCurto(c.data_nascimento)}</span>
                          ) : (
                            <span className="rz-cli-vazio">—</span>
                          )}
                        </td>
                        <td>
                          <div className="rz-cli-acoes">
                            <button className="rz-action-btn" onClick={() => abrirEdicao(c)}>
                              Editar
                            </button>
                            <button
                              className="rz-action-btn rz-cli-icone"
                              onClick={() => abrirConvite(c)}
                              title={c.auth_id ? 'Redefinir senha' : 'Criar login'}
                              aria-label={c.auth_id ? 'Redefinir senha' : 'Criar login'}
                            >
                              <i className="ti ti-key"></i>
                            </button>
                            <button
                              className="rz-action-btn danger rz-cli-icone"
                              onClick={() => setClienteParaExcluir(c)}
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {modalAberto && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalAberto(false)
          }}
        >
          <div className="rz-modal">
            <div className="rz-modal-title">{editando ? 'Editar cliente' : 'Novo cliente'}</div>
            <form onSubmit={salvar}>
              <label className="rz-field-label">Nome</label>
              <input className="rz-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="rz-field-label">Telefone</label>
                <button
                  type="button"
                  onClick={() => {
                    const proximo = !telefoneInternacional
                    setTelefoneInternacional(proximo)
                    const digitos = telefone.replace(/\D/g, '')
                    setTelefone(proximo && digitos ? '+' + digitos : digitos)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#555',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {telefoneInternacional ? 'Número do Brasil' : 'Outro país?'}
                </button>
              </div>
              {telefoneInternacional && (
                <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Digite com o código do país. Ex: +54 9 11 1234 5678</p>
              )}
              <input
                className="rz-input"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(telefoneInternacional ? '+' + e.target.value.replace(/\D/g, '') : e.target.value)}
                required
              />

              <label className="rz-field-label">CPF</label>
              <input
                className="rz-input"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                maxLength={14}
              />

              <label className="rz-field-label">Barbeiro favorito</label>
              <select className="rz-input" value={barbeiroFavoritoId} onChange={(e) => setBarbeiroFavoritoId(e.target.value)}>
                <option value="">Sem preferência</option>
                {barbeirosAtivos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>

              <label className="rz-field-label">Observação</label>
              <input
                className="rz-input"
                type="text"
                placeholder='Ex: "Mora tal bairro..."'
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />

              <label className="rz-field-label">Data de nascimento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 8, marginBottom: 16 }}>
                <select
                  className="rz-input"
                  style={{ marginBottom: 0 }}
                  value={diaNascimento}
                  onChange={(e) => setDiaNascimento(e.target.value)}
                >
                  <option value="">Dia</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  className="rz-input"
                  style={{ marginBottom: 0 }}
                  value={mesNascimento}
                  onChange={(e) => setMesNascimento(e.target.value)}
                >
                  <option value="">Mês</option>
                  {[
                    'Janeiro',
                    'Fevereiro',
                    'Março',
                    'Abril',
                    'Maio',
                    'Junho',
                    'Julho',
                    'Agosto',
                    'Setembro',
                    'Outubro',
                    'Novembro',
                    'Dezembro',
                  ].map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="rz-input"
                  style={{ marginBottom: 0 }}
                  value={anoNascimento}
                  onChange={(e) => setAnoNascimento(e.target.value)}
                >
                  <option value="">Ano</option>
                  {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <label className="rz-field-label">Lembrar de chamar a cada (dias)</label>
              <input
                className="rz-input"
                type="number"
                inputMode="numeric"
                min="1"
                max="365"
                list="opcoes-lembrete"
                placeholder="Ex: 30"
                value={intervaloLembrete}
                onChange={(e) => setIntervaloLembrete(e.target.value)}
                required
              />
              <datalist id="opcoes-lembrete">
                {[7, 10, 15, 20, 25, 30, 35, 40, 50, 60, 90].map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>

              <div className="rz-modal-actions">
                <button type="button" className="rz-btn-outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="rz-btn-primary" style={{ flex: 1 }} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clienteParaConvite && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setClienteParaConvite(null)
          }}
        >
          <div className="rz-modal">
            <div className="rz-modal-title">
              {clienteParaConvite.auth_id ? 'Redefinir senha de' : 'Criar login para'} {clienteParaConvite.nome}
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Define uma senha (ou usa a sugerida) — a conta já nasce pronta, e o cliente recebe telefone+senha pelo WhatsApp pra entrar
              direto.
            </p>
            {erroConvite && (
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
                {erroConvite}
              </div>
            )}
            <label className="rz-field-label">Senha</label>
            <input className="rz-input" type="text" value={senhaConvite} onChange={(e) => setSenhaConvite(e.target.value)} />
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setClienteParaConvite(null)}>
                Cancelar
              </button>
              <button className="rz-btn-primary" style={{ flex: 1 }} onClick={confirmarConvite} disabled={enviandoConvite}>
                {enviandoConvite ? 'Criando...' : 'Criar e enviar pelo WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteParaExcluir && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setClienteParaExcluir(null)
          }}
        >
          <div className="rz-modal" style={{ textAlign: 'center' }}>
            <div className="rz-modal-title" style={{ fontSize: 18 }}>
              Excluir {clienteParaExcluir.nome}?
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              Isso apaga o cadastro do cliente e todo o histórico de agendamentos vinculado a ele. Essa ação não pode ser desfeita.
            </p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setClienteParaExcluir(null)}>
                Cancelar
              </button>
              <button className="rz-btn-primary" style={{ flex: 1, background: '#e53935' }} onClick={confirmarExcluir}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes