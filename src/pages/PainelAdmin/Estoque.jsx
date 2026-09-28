import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'

const ROTULO_TIPO = { entrada: 'Entrada', saida: 'Saída', venda: 'Venda' }
const COR_TIPO = { entrada: '#4caf50', saida: '#e53935', venda: '#F07B00' }

function Estoque() {
  const navigate = useNavigate()
  const [ehDono, setEhDono] = useState(false)
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [modalProduto, setModalProduto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [tipoProduto, setTipoProduto] = useState('revenda')
  const [precoVenda, setPrecoVenda] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('0')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [quantidadeInicial, setQuantidadeInicial] = useState('')
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [erroProduto, setErroProduto] = useState('')

  const [produtoMov, setProdutoMov] = useState(null)
  const [tipoMov, setTipoMov] = useState('saida')
  const [quantidadeMov, setQuantidadeMov] = useState('1')
  const [observacaoMov, setObservacaoMov] = useState('')
  const [salvandoMov, setSalvandoMov] = useState(false)
  const [erroMov, setErroMov] = useState('')

  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    const { data: prods } = await supabase.from('estoque_produtos').select('*').eq('ativo', true).order('nome')
    const { data: movs } = await supabase
      .from('estoque_movimentacoes')
      .select('*, estoque_produtos(nome), barbeiros(nome)')
      .order('created_at', { ascending: false })
      .limit(30)
    setProdutos(prods || [])
    setMovimentacoes(movs || [])
    setCarregando(false)
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
      const { data } = await supabase.from('barbeiros').select('is_dono').eq('auth_id', session.user.id).maybeSingle()
      if (!data) {
        navigate('/admin/login')
        return
      }
      setEhDono(data.is_dono)
      carregar()
    }
    iniciar()
  }, [])

  const abrirNovoProduto = () => {
    setEditando(null)
    setNome('')
    setTipoProduto('revenda')
    setPrecoVenda('')
    setEstoqueMinimo('0')
    setCodigoBarras('')
    setQuantidadeInicial('')
    setErroProduto('')
    setModalProduto(true)
  }

  const abrirEdicaoProduto = (p) => {
    setEditando(p)
    setNome(p.nome)
    setTipoProduto(p.tipo)
    setPrecoVenda(p.preco_venda ? String(p.preco_venda) : '')
    setEstoqueMinimo(String(p.estoque_minimo))
    setCodigoBarras(p.codigo_barras || '')
    setQuantidadeInicial('')
    setErroProduto('')
    setModalProduto(true)
  }

  const salvarProduto = async (e) => {
    e.preventDefault()
    setErroProduto('')
    setSalvandoProduto(true)

    const payload = {
      nome: nome.trim(),
      tipo: tipoProduto,
      preco_venda: tipoProduto === 'revenda' && precoVenda ? Number(precoVenda.replace(',', '.')) : null,
      estoque_minimo: parseInt(estoqueMinimo, 10) || 0,
      codigo_barras: codigoBarras.trim() || null,
    }

    if (editando) {
      const { error } = await supabase.from('estoque_produtos').update(payload).eq('id', editando.id)
      if (error) {
        setErroProduto(error.code === '23505' ? 'Já existe um produto com esse código de barras.' : 'Não foi possível salvar o produto.')
        setSalvandoProduto(false)
        return
      }
    } else {
      const { data: novo, error } = await supabase.from('estoque_produtos').insert(payload).select('id').single()
      if (error) {
        setErroProduto(error.code === '23505' ? 'Já existe um produto com esse código de barras.' : 'Não foi possível salvar o produto.')
        setSalvandoProduto(false)
        return
      }
      const qtd = parseInt(quantidadeInicial, 10)
      if (qtd > 0) {
        const { error: erroInicial } = await supabase
          .from('estoque_movimentacoes')
          .insert({ produto_id: novo.id, tipo: 'entrada', quantidade: qtd, observacao: 'Estoque inicial' })
        if (erroInicial) {
          setErroProduto('Produto criado, mas não foi possível registrar o estoque inicial. Faça uma entrada manual.')
          setSalvandoProduto(false)
          carregar()
          return
        }
      }
    }

    setSalvandoProduto(false)
    setModalProduto(false)
    carregar()
  }

  const confirmarExcluirProduto = async () => {
    if (!produtoParaExcluir) return
    await supabase.from('estoque_produtos').delete().eq('id', produtoParaExcluir.id)
    setProdutoParaExcluir(null)
    carregar()
  }

  const abrirMovimentacao = (p) => {
    setProdutoMov(p)
    setTipoMov('saida')
    setQuantidadeMov('1')
    setObservacaoMov('')
    setErroMov('')
  }

  const registrarMovimentacao = async (e) => {
    e.preventDefault()
    setErroMov('')

    const qtd = parseInt(quantidadeMov, 10)
    if (!qtd || qtd < 1) {
      setErroMov('Informe uma quantidade válida.')
      return
    }
    if (tipoMov === 'venda' && !produtoMov.preco_venda) {
      setErroMov('Esse produto não tem preço de venda cadastrado.')
      return
    }

    setSalvandoMov(true)
    const { error } = await supabase.from('estoque_movimentacoes').insert({
      produto_id: produtoMov.id,
      tipo: tipoMov,
      quantidade: qtd,
      valor_total: tipoMov === 'venda' ? Number(produtoMov.preco_venda) * qtd : null,
      observacao: observacaoMov.trim() || null,
    })
    setSalvandoMov(false)

    if (error) {
      setErroMov(error.message?.includes('Estoque insuficiente') ? error.message : 'Não foi possível registrar a movimentação.')
      return
    }

    setProdutoMov(null)
    carregar()
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
        <AdminSidebar ativa="estoque" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Estoque</div>
            {ehDono && (
              <button className="rz-btn-primary" style={{ width: 'auto' }} onClick={abrirNovoProduto}>
                + Novo produto
              </button>
            )}
          </div>

          <div className="rz-table-wrap" style={{ marginBottom: 28 }}>
            {carregando ? (
              <div className="rz-empty-state">Carregando...</div>
            ) : produtos.length === 0 ? (
              <div className="rz-empty-state" style={{ padding: 24 }}>
                Nenhum produto cadastrado{ehDono ? '. Clique em "+ Novo produto" pra começar.' : '.'}
              </div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Preço</th>
                    <th>Saldo</th>
                    <th>Mínimo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => {
                    const baixo = p.quantidade_atual <= p.estoque_minimo
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong style={{ color: '#fff' }}>{p.nome}</strong>
                        </td>
                        <td>{p.tipo === 'revenda' ? 'Revenda' : 'Uso'}</td>
                        <td>{p.preco_venda ? `R$ ${Number(p.preco_venda).toFixed(2)}` : '—'}</td>
                        <td>
                          <span
                            className="rz-badge"
                            style={
                              baixo
                                ? { background: '#2b0d0d', color: '#e53935', fontSize: 15, padding: '4px 12px' }
                                : { background: '#0d2b0d', color: '#4caf50', fontSize: 15, padding: '4px 12px' }
                            }
                          >
                            {p.quantidade_atual}
                          </span>
                          {baixo && <span style={{ marginLeft: 8, fontSize: 11, color: '#e53935' }}>baixo</span>}
                        </td>
                        <td>{p.estoque_minimo}</td>
                        <td>
                          <button className="rz-action-btn" onClick={() => abrirMovimentacao(p)}>
                            Movimentar
                          </button>
                          {ehDono && (
                            <>
                              <button className="rz-action-btn" onClick={() => abrirEdicaoProduto(p)}>
                                Editar
                              </button>
                              <button className="rz-action-btn danger" onClick={() => setProdutoParaExcluir(p)}>
                                Excluir
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="rz-section-title-mini" style={{ fontSize: 15, marginBottom: 12 }}>
            {ehDono ? 'Últimas movimentações' : 'Suas últimas movimentações'}
          </div>
          <div className="rz-table-wrap">
            {movimentacoes.length === 0 ? (
              <div className="rz-empty-state" style={{ padding: 24 }}>
                Nenhuma movimentação registrada.
              </div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Barbeiro</th>
                    <th>Valor</th>
                    <th>Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {new Date(m.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{m.estoque_produtos?.nome || '—'}</td>
                      <td style={{ color: COR_TIPO[m.tipo], fontWeight: 700 }}>{ROTULO_TIPO[m.tipo]}</td>
                      <td>{m.quantidade}</td>
                      <td>{m.barbeiros?.nome || '—'}</td>
                      <td>{m.valor_total ? `R$ ${Number(m.valor_total).toFixed(2)}` : '—'}</td>
                      <td>{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {modalProduto && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalProduto(false)
          }}
        >
          <div className="rz-modal">
            <div className="rz-modal-title">{editando ? 'Editar produto' : 'Novo produto'}</div>
            {erroProduto && (
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
                {erroProduto}
              </div>
            )}
            <form onSubmit={salvarProduto}>
              <label className="rz-field-label">Nome</label>
              <input className="rz-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <label className="rz-field-label">Tipo</label>
              <select className="rz-input" value={tipoProduto} onChange={(e) => setTipoProduto(e.target.value)}>
                <option value="revenda">Revenda (vendido ao cliente)</option>
                <option value="uso">Uso da barbearia</option>
              </select>

              {tipoProduto === 'revenda' && (
                <>
                  <label className="rz-field-label">Preço de venda (R$)</label>
                  <input
                    className="rz-input"
                    type="text"
                    placeholder="0,00"
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(e.target.value)}
                  />
                </>
              )}

              <label className="rz-field-label">Estoque mínimo (alerta)</label>
              <input className="rz-input" type="number" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />

              <label className="rz-field-label">Código de barras (opcional)</label>
              <input className="rz-input" type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />

              {!editando && (
                <>
                  <label className="rz-field-label">Quantidade inicial</label>
                  <input
                    className="rz-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={quantidadeInicial}
                    onChange={(e) => setQuantidadeInicial(e.target.value)}
                  />
                </>
              )}

              <div className="rz-modal-actions">
                <button type="button" className="rz-btn-outline" onClick={() => setModalProduto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="rz-btn-primary" style={{ flex: 1 }} disabled={salvandoProduto}>
                  {salvandoProduto ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {produtoMov && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProdutoMov(null)
          }}
        >
          <div className="rz-modal">
            <div className="rz-modal-title">Movimentar: {produtoMov.nome}</div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Saldo atual: {produtoMov.quantidade_atual}</p>
            {erroMov && (
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
                {erroMov}
              </div>
            )}
            <form onSubmit={registrarMovimentacao}>
              <label className="rz-field-label">Tipo</label>
              <select className="rz-input" value={tipoMov} onChange={(e) => setTipoMov(e.target.value)}>
                <option value="saida">Saída (uso, perda)</option>
                <option value="entrada">Entrada (chegou produto)</option>
                {produtoMov.tipo === 'revenda' && <option value="venda">Venda ao cliente</option>}
              </select>

              <label className="rz-field-label">Quantidade</label>
              <input
                className="rz-input"
                type="number"
                min="1"
                value={quantidadeMov}
                onChange={(e) => setQuantidadeMov(e.target.value)}
                required
              />

              {tipoMov === 'venda' && produtoMov.preco_venda && (
                <p style={{ color: '#F07B00', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                  Total: R$ {(Number(produtoMov.preco_venda) * (parseInt(quantidadeMov, 10) || 0)).toFixed(2)}
                </p>
              )}

              <label className="rz-field-label">Observação (opcional)</label>
              <input className="rz-input" type="text" value={observacaoMov} onChange={(e) => setObservacaoMov(e.target.value)} />

              <div className="rz-modal-actions">
                <button type="button" className="rz-btn-outline" onClick={() => setProdutoMov(null)}>
                  Cancelar
                </button>
                <button type="submit" className="rz-btn-primary" style={{ flex: 1 }} disabled={salvandoMov}>
                  {salvandoMov ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {produtoParaExcluir && (
        <div
          className="rz-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProdutoParaExcluir(null)
          }}
        >
          <div className="rz-modal" style={{ textAlign: 'center' }}>
            <div className="rz-modal-title" style={{ fontSize: 18 }}>
              Excluir "{produtoParaExcluir.nome}"?
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
              Isso apaga também todo o histórico de movimentações desse produto. Essa ação não pode ser desfeita.
            </p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setProdutoParaExcluir(null)}>
                Cancelar
              </button>
              <button className="rz-btn-primary" style={{ flex: 1, background: '#e53935' }} onClick={confirmarExcluirProduto}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Estoque
