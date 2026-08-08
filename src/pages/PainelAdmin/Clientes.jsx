import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import '../PainelAdmin/PainelAdmin.css'

function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [obs, setObs] = useState('')
  const [diaNascimento, setDiaNascimento] = useState('')
  const [mesNascimento, setMesNascimento] = useState('')
  const [anoNascimento, setAnoNascimento] = useState('')
  const [intervaloLembrete, setIntervaloLembrete] = useState('30')
  const [salvando, setSalvando] = useState(false)
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null)

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

    const dataNascimentoMontada = diaNascimento && mesNascimento && anoNascimento
      ? `${anoNascimento}-${mesNascimento.padStart(2, '0')}-${diaNascimento.padStart(2, '0')}`
      : null

    const payload = { nome, telefone, cpf: cpf || null, obs, data_nascimento: dataNascimentoMontada, intervalo_lembrete_dias: parseInt(intervaloLembrete, 10) }

    if (editando) {
      await supabase.from('clientes').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert(payload)
    }

    setSalvando(false)
    setModalAberto(false)
    carregar()
  }

  const confirmarExcluir = async () => {
    if (!clienteParaExcluir) return
    await supabase.from('clientes').delete().eq('id', clienteParaExcluir.id)
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

    const { data: { session } } = await supabase.auth.getSession()
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
      `Oi ${clienteParaConvite.nome.split(' ')[0]}! Sua conta na Rezenha Barbearia já está pronta.\n\nEntre em https://rezenha-barbearia.vercel.app/login com:\nWhatsApp: ${clienteParaConvite.telefone}\nSenha: ${senhaConvite}`
    )
    window.open(`https://wa.me/55${telefoneLimpo}?text=${mensagem}`, '_blank')

    setClienteParaConvite(null)
    carregar()
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca)
  )

  return (
    <div className="rz-admin-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">Re<span>Z</span>enha <span className="rz-logo-sep">/ Painel</span></div>
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout"><i className="ti ti-logout"></i> Sair</button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="clientes" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Clientes</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="rz-input"
                style={{ margin: 0, width: 220 }}
                type="text"
                placeholder="Buscar por nome ou telefone"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <button className="rz-btn-primary" onClick={abrirNovo}>+ Novo cliente</button>
            </div>
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
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Observação</th>
                    <th>Nascimento</th>
                    <th>Último corte</th>
                    <th>Lembrete</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c) => (
                    <tr key={c.id}>
                      <td><strong style={{ color: '#fff' }}>{c.nome}</strong></td>
                      <td>{c.telefone}</td>
                      <td>{c.obs || '—'}</td>
                      <td>{c.data_nascimento ? new Date(c.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td>{c.data_ultimo_corte || '—'}</td>
                      <td>{c.intervalo_lembrete_dias || 30} dias</td>
                      <td>
                        <button className="rz-action-btn" onClick={() => abrirEdicao(c)}>Editar</button>
                        <button className="rz-action-btn" onClick={() => abrirConvite(c)}>Criar login</button>
                        <button className="rz-action-btn danger" onClick={() => setClienteParaExcluir(c)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {modalAberto && (
        <div className="rz-modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rz-modal-title">{editando ? 'Editar cliente' : 'Novo cliente'}</div>
            <form onSubmit={salvar}>
              <label className="rz-field-label">Nome</label>
              <input className="rz-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <label className="rz-field-label">Telefone</label>
              <input className="rz-input" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />

              <label className="rz-field-label">CPF</label>
              <input className="rz-input" type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />

              <label className="rz-field-label">Observação</label>
              <input className="rz-input" type="text" placeholder='Ex: "Mora tal bairro..."' value={obs} onChange={(e) => setObs(e.target.value)} />

              <label className="rz-field-label">Data de nascimento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 8, marginBottom: 16 }}>
                <select className="rz-input" style={{ marginBottom: 0 }} value={diaNascimento} onChange={(e) => setDiaNascimento(e.target.value)}>
                  <option value="">Dia</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select className="rz-input" style={{ marginBottom: 0 }} value={mesNascimento} onChange={(e) => setMesNascimento(e.target.value)}>
                  <option value="">Mês</option>
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select className="rz-input" style={{ marginBottom: 0 }} value={anoNascimento} onChange={(e) => setAnoNascimento(e.target.value)}>
                  <option value="">Ano</option>
                  {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <label className="rz-field-label">Lembrete a cada</label>
              <select className="rz-input" value={intervaloLembrete} onChange={(e) => setIntervaloLembrete(e.target.value)}>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
              </select>

              <div className="rz-modal-actions">
                <button type="button" className="rz-btn-outline" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="rz-btn-primary" style={{ flex: 1 }} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clienteParaConvite && (
        <div className="rz-modal-overlay" onClick={() => setClienteParaConvite(null)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rz-modal-title">Criar login para {clienteParaConvite.nome}</div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              Define uma senha (ou usa a sugerida) — a conta já nasce pronta, e o cliente recebe telefone+senha pelo WhatsApp pra entrar direto.
            </p>
            {erroConvite && (
              <div style={{ background: '#2b0d0d', border: '1px solid #e53935', color: '#ff6b6b', fontSize: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
                {erroConvite}
              </div>
            )}
            <label className="rz-field-label">Senha</label>
            <input className="rz-input" type="text" value={senhaConvite} onChange={(e) => setSenhaConvite(e.target.value)} />
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setClienteParaConvite(null)}>Cancelar</button>
              <button className="rz-btn-primary" style={{ flex: 1 }} onClick={confirmarConvite} disabled={enviandoConvite}>
                {enviandoConvite ? 'Criando...' : 'Criar e enviar pelo WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteParaExcluir && (
        <div className="rz-modal-overlay" onClick={() => setClienteParaExcluir(null)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="rz-modal-title" style={{ fontSize: 18 }}>Excluir {clienteParaExcluir.nome}?</div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              Isso apaga o cadastro do cliente e todo o histórico de agendamentos vinculado a ele. Essa ação não pode ser desfeita.
            </p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setClienteParaExcluir(null)}>Cancelar</button>
              <button className="rz-btn-primary" style={{ flex: 1, background: '#e53935' }} onClick={confirmarExcluir}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes