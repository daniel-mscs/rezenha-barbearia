import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import '../PainelAdmin/PainelAdmin.css'

function mesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function Caixa() {
  const navigate = useNavigate()
  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mesFiltro, setMesFiltro] = useState(mesAtual())

  const [modalAberto, setModalAberto] = useState(false)
  const [tipo, setTipo] = useState('entrada')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const [paraExcluir, setParaExcluir] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    const { data: lancData } = await supabase
      .from('caixa_lancamentos')
      .select('*, caixa_categorias(nome)')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    const { data: catData } = await supabase
      .from('caixa_categorias')
      .select('*')
      .eq('ativo', true)
      .order('nome')
    setLancamentos(lancData || [])
    setCategorias(catData || [])
    setCarregando(false)
  }

  useEffect(() => {
    const verificarPermissao = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data } = await supabase
        .from('barbeiros')
        .select('is_dono')
        .eq('auth_id', session.user.id)
        .maybeSingle()
      if (!data?.is_dono) {
        navigate('/admin')
        return
      }
      carregar()
    }
    verificarPermissao()
  }, [])

  const abrirNovo = () => {
    setTipo('entrada')
    setValor('')
    setCategoriaId('')
    setNovaCategoria('')
    setDescricao('')
    setData(new Date().toISOString().split('T')[0])
    setErroModal('')
    setModalAberto(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setErroModal('')
    setSalvando(true)

    let categoriaFinalId = categoriaId || null

    if (categoriaId === 'nova' && novaCategoria.trim()) {
      const { data: novaCat, error: erroCat } = await supabase
        .from('caixa_categorias')
        .insert({ nome: novaCategoria.trim(), tipo })
        .select('id')
        .single()
      if (erroCat) {
        setErroModal('Não foi possível criar a categoria.')
        setSalvando(false)
        return
      }
      categoriaFinalId = novaCat.id
    }

    const { error } = await supabase.from('caixa_lancamentos').insert({
      tipo,
      valor: Number(valor.replace(',', '.')),
      categoria_id: categoriaFinalId === 'nova' ? null : categoriaFinalId,
      descricao: descricao || null,
      data,
      origem: 'manual',
    })

    setSalvando(false)

    if (error) {
      setErroModal('Não foi possível salvar o lançamento.')
      return
    }

    setModalAberto(false)
    carregar()
  }

  const confirmarExcluir = async () => {
    if (!paraExcluir) return
    await supabase.from('caixa_lancamentos').delete().eq('id', paraExcluir.id)
    setParaExcluir(null)
    carregar()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const lancamentosDoMes = lancamentos.filter((l) => l.data?.slice(0, 7) === mesFiltro)
  const totalEntradas = lancamentosDoMes.filter((l) => l.tipo === 'entrada').reduce((acc, l) => acc + Number(l.valor), 0)
  const totalSaidas = lancamentosDoMes.filter((l) => l.tipo === 'saida').reduce((acc, l) => acc + Number(l.valor), 0)
  const saldoMes = totalEntradas - totalSaidas

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo)

  return (
    <div className="rz-admin-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">Re<span>Z</span>enha <span className="rz-logo-sep">/ Painel</span></div>
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="caixa" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Caixa</div>
            <button className="rz-btn-primary" onClick={abrirNovo}>+ Novo lançamento</button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <label className="rz-field-label" style={{ margin: 0 }}>Mês</label>
            <input
              className="rz-input"
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div className="rz-summary" style={{ flex: 1, minWidth: 180 }}>
              <div className="rz-summary-title">Entradas</div>
              <div style={{ color: '#4caf50', fontFamily: "'Bebas Neue', sans-serif", fontSize: 28 }}>
                R$ {totalEntradas.toFixed(2)}
              </div>
            </div>
            <div className="rz-summary" style={{ flex: 1, minWidth: 180 }}>
              <div className="rz-summary-title">Saídas</div>
              <div style={{ color: '#e53935', fontFamily: "'Bebas Neue', sans-serif", fontSize: 28 }}>
                R$ {totalSaidas.toFixed(2)}
              </div>
            </div>
            <div className="rz-summary" style={{ flex: 1, minWidth: 180 }}>
              <div className="rz-summary-title">Saldo do mês</div>
              <div style={{ color: saldoMes >= 0 ? '#F07B00' : '#e53935', fontFamily: "'Bebas Neue', sans-serif", fontSize: 28 }}>
                R$ {saldoMes.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="rz-table-wrap">
            {carregando ? (
              <div className="rz-empty-state">Carregando...</div>
            ) : lancamentosDoMes.length === 0 ? (
              <div className="rz-empty-state">Nenhum lançamento nesse mês.</div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Origem</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosDoMes.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ color: l.tipo === 'entrada' ? '#4caf50' : '#e53935' }}>
                        {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </td>
                      <td>{l.caixa_categorias?.nome || '—'}</td>
                      <td>{l.descricao || '—'}</td>
                      <td>{l.origem === 'agendamento' ? 'Agendamento' : 'Manual'}</td>
                      <td style={{ color: l.tipo === 'entrada' ? '#4caf50' : '#e53935', fontWeight: 700 }}>
                        R$ {Number(l.valor).toFixed(2)}
                      </td>
                      <td>
                        {l.origem === 'manual' && (
                          <button className="rz-action-btn danger" onClick={() => setParaExcluir(l)}>Excluir</button>
                        )}
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
            <div className="rz-modal-title">Novo lançamento</div>
            {erroModal && (
              <div style={{ background: '#2b0d0d', border: '1px solid #e53935', color: '#ff6b6b', fontSize: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
                {erroModal}
              </div>
            )}
            <form onSubmit={salvar}>
              <label className="rz-field-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={tipo === 'entrada' ? 'rz-btn-primary' : 'rz-btn-outline'}
                  style={{ flex: 1 }}
                  onClick={() => { setTipo('entrada'); setCategoriaId('') }}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  className={tipo === 'saida' ? 'rz-btn-primary' : 'rz-btn-outline'}
                  style={{ flex: 1 }}
                  onClick={() => { setTipo('saida'); setCategoriaId('') }}
                >
                  Saída
                </button>
              </div>

              <label className="rz-field-label">Valor (R$)</label>
              <input className="rz-input" type="text" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required />

              <label className="rz-field-label">Categoria</label>
              <select className="rz-input" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
                <option value="nova">+ Nova categoria...</option>
              </select>

              {categoriaId === 'nova' && (
                <input
                  className="rz-input"
                  type="text"
                  placeholder="Nome da nova categoria"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  style={{ marginTop: 8 }}
                  required
                />
              )}

              <label className="rz-field-label">Descrição</label>
              <input className="rz-input" type="text" placeholder="Opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

              <label className="rz-field-label">Data</label>
              <input className="rz-input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

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

      {paraExcluir && (
        <div className="rz-modal-overlay" onClick={() => setParaExcluir(null)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="rz-modal-title" style={{ fontSize: 18 }}>Remover esse lançamento?</div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              R$ {Number(paraExcluir.valor).toFixed(2)} — {paraExcluir.descricao || 'sem descrição'}
            </p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setParaExcluir(null)}>Cancelar</button>
              <button className="rz-btn-primary" style={{ flex: 1, background: '#e53935' }} onClick={confirmarExcluir}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Caixa