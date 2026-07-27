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
  const [obs, setObs] = useState('')
  const [intervaloLembrete, setIntervaloLembrete] = useState('30')
  const [salvando, setSalvando] = useState(false)

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
    setObs('')
    setIntervaloLembrete('30')
    setModalAberto(true)
  }

  const abrirEdicao = (c) => {
    setEditando(c)
    setNome(c.nome)
    setTelefone(c.telefone)
    setObs(c.obs || '')
    setIntervaloLembrete(String(c.intervalo_lembrete_dias || 30))
    setModalAberto(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)

    const payload = { nome, telefone, obs, intervalo_lembrete_dias: parseInt(intervaloLembrete, 10) }

    if (editando) {
      await supabase.from('clientes').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert(payload)
    }

    setSalvando(false)
    setModalAberto(false)
    carregar()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const compartilharConvite = (cliente) => {
    const link = `${window.location.origin}/convite/${cliente.convite_token}`
    const telefoneLimpo = cliente.telefone.replace(/\D/g, '')
    const mensagem = encodeURIComponent(`Oi ${cliente.nome.split(' ')[0]}! Cria sua conta na Rezenha Barbearia pra acompanhar seus agendamentos: ${link}`)
    window.open(`https://wa.me/55${telefoneLimpo}?text=${mensagem}`, '_blank')
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
                      <td>{c.data_ultimo_corte || '—'}</td>
                      <td>{c.intervalo_lembrete_dias || 30} dias</td>
                      <td>
                        <button className="rz-action-btn" onClick={() => abrirEdicao(c)}>Editar</button>
                        <button className="rz-action-btn" onClick={() => compartilharConvite(c)}>Convite</button>
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

              <label className="rz-field-label">Observação</label>
              <input className="rz-input" type="text" placeholder='Ex: "Daniel da Farmácia Caridade"' value={obs} onChange={(e) => setObs(e.target.value)} />

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
    </div>
  )
}

export default Clientes