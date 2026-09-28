import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import { ICONES_DISPONIVEIS } from '../../components/Icons'
import { formatarDuracao } from '../../utils/formatarDuracao'
import '../PainelAdmin/PainelAdmin.css'

function Servicos() {
  const navigate = useNavigate()
  const [servicos, setServicos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null) // null = criar novo, objeto = editar
  const [nome, setNome] = useState('')
  const [duracao, setDuracao] = useState('')
  const [preco, setPreco] = useState('')
  const [iconesSelecionados, setIconesSelecionados] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [servicoParaExcluir, setServicoParaExcluir] = useState(null)

  const carregarServicos = async () => {
    setCarregando(true)
    const { data } = await supabase.from('servicos').select('*').order('nome')
    setServicos(data || [])
    setCarregando(false)
  }

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
      carregarServicos()
    }
    verificarPermissao()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setDuracao('')
    setPreco('')
    setIconesSelecionados([])
    setModalAberto(true)
  }

  const abrirEdicao = (servico) => {
    setEditando(servico)
    setNome(servico.nome)
    setDuracao(String(servico.duracao_min))
    setPreco(String(servico.preco))
    setIconesSelecionados(servico.icones || [])
    setModalAberto(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)

    const payload = {
      nome,
      duracao_min: parseInt(duracao, 10),
      preco: parseFloat(preco),
      icones: iconesSelecionados,
    }

    if (editando) {
      await supabase.from('servicos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('servicos').insert({ ...payload, ativo: true })
    }

    setSalvando(false)
    setModalAberto(false)
    carregarServicos()
  }

  const alternarAtivo = async (servico) => {
    await supabase.from('servicos').update({ ativo: !servico.ativo }).eq('id', servico.id)
    carregarServicos()
  }

  const confirmarExcluir = async () => {
    if (!servicoParaExcluir) return
    await supabase.from('servicos').delete().eq('id', servicoParaExcluir.id)
    setServicoParaExcluir(null)
    carregarServicos()
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
        <AdminSidebar ativa="servicos" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">
              Nossos <span>serviços</span>
            </div>
            <button className="rz-btn-primary" onClick={abrirNovo}>
              + Novo serviço
            </button>
          </div>

          <div className="rz-table-wrap">
            {carregando ? (
              <div className="rz-empty-state">Carregando...</div>
            ) : servicos.length === 0 ? (
              <div className="rz-empty-state">Nenhum serviço cadastrado ainda.</div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Duração</th>
                    <th>Preço</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {servicos.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong style={{ color: '#fff' }}>{s.nome}</strong>
                      </td>
                      <td>{formatarDuracao(s.duracao_min)}</td>
                      <td>R$ {Number(s.preco).toFixed(2)}</td>
                      <td>{s.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td>
                        <button className="rz-action-btn" onClick={() => abrirEdicao(s)}>
                          Editar
                        </button>
                        <button className="rz-action-btn" onClick={() => alternarAtivo(s)}>
                          {s.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="rz-action-btn danger" onClick={() => setServicoParaExcluir(s)}>
                          Excluir
                        </button>
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
            <div className="rz-modal-title">{editando ? 'Editar serviço' : 'Novo serviço'}</div>
            <form onSubmit={salvar}>
              <label className="rz-field-label">Nome</label>
              <input className="rz-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <label className="rz-field-label">Duração (minutos)</label>
              <input
                className="rz-input"
                type="number"
                min="5"
                step="5"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                required
              />

              <label className="rz-field-label">Preço (R$)</label>
              <input
                className="rz-input"
                type="number"
                min="0"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                required
              />

              <label className="rz-field-label">Ícones</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {Object.entries(ICONES_DISPONIVEIS).map(([chave, { componente: Icone, label }]) => {
                  const selecionado = iconesSelecionados.includes(chave)
                  return (
                    <button
                      key={chave}
                      type="button"
                      onClick={() => setIconesSelecionados((atual) => (selecionado ? atual.filter((i) => i !== chave) : [...atual, chave]))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: selecionado ? '#1a1000' : '#161616',
                        border: selecionado ? '1px solid #F07B00' : '1px solid #222',
                        color: selecionado ? '#F07B00' : '#888',
                        borderRadius: 6,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      <Icone />
                      {label}
                    </button>
                  )
                })}
              </div>

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

      {servicoParaExcluir && (
        <div className="rz-modal-overlay" onClick={() => setServicoParaExcluir(null)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="rz-modal-title" style={{ fontSize: 18 }}>
              Excluir "{servicoParaExcluir.nome}"?
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Essa ação não pode ser desfeita.</p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setServicoParaExcluir(null)}>
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

export default Servicos
