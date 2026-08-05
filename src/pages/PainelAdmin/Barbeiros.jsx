import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { comprimirImagem } from '../../utils/comprimirImagem'
import '../PainelAdmin/PainelAdmin.css'

function Barbeiros() {
  const navigate = useNavigate()
  const [barbeiros, setBarbeiros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [especialidades, setEspecialidades] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [cor, setCor] = useState('#F07B00')
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const carregar = async () => {
    setCarregando(true)
    const { data } = await supabase.from('barbeiros').select('*').order('nome')
    setBarbeiros(data || [])
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
    setEditando(null)
    setNome('')
    setEspecialidades('')
    setEmail('')
    setSenha('')
    setErroModal('')
    setModalAberto(true)
  }

  const abrirEdicao = (b) => {
    setEditando(b)
    setNome(b.nome)
    setEspecialidades(b.especialidades || '')
    setFotoFile(null)
    setCor(b.cor || '#F07B00')
    setModalAberto(true)
  }

const salvar = async (e) => {
    e.preventDefault()
    setErroModal('')
    setSalvando(true)

    if (editando) {
      let fotoUrl = editando.foto_url

      if (fotoFile) {
        const fotoComprimida = await comprimirImagem(fotoFile)
        const nomeArquivo = `${editando.id}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage.from('barbeiros').upload(nomeArquivo, fotoComprimida, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('barbeiros').getPublicUrl(nomeArquivo)
          fotoUrl = urlData.publicUrl
        }
      }

      await supabase.from('barbeiros').update({ nome, especialidades, foto_url: fotoUrl, cor }).eq('id', editando.id)
      setSalvando(false)
      setModalAberto(false)
      carregar()
      return
    }

    // Barbeiro novo: chama a Edge Function, que cria o login e o cadastro de uma vez
    const { data: { session } } = await supabase.auth.getSession()

    const resposta = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-funcionario`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nome, especialidades, email, senha }),
      }
    )

    const resultado = await resposta.json()
    setSalvando(false)

    if (!resposta.ok) {
      setErroModal(resultado.erro || 'Não foi possível criar o funcionário.')
      return
    }

    setModalAberto(false)
    carregar()
  }

  const alternarAtivo = async (b) => {
    await supabase.from('barbeiros').update({ ativo: !b.ativo }).eq('id', b.id)
    carregar()
  }

  const excluir = async (b) => {
    if (!confirm(`Remover o barbeiro "${b.nome}"? Isso também derruba o acesso dele ao painel, se tiver login vinculado.`)) return
    await supabase.from('barbeiros').delete().eq('id', b.id)
    carregar()
  }

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

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
        <AdminSidebar ativa="barbeiros" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Nosso <span>time</span></div>
            <button className="rz-btn-primary" onClick={abrirNovo}>+ Novo barbeiro</button>
          </div>

          <div className="rz-table-wrap">
            {carregando ? (
              <div className="rz-empty-state">Carregando...</div>
            ) : barbeiros.length === 0 ? (
              <div className="rz-empty-state">Nenhum barbeiro cadastrado ainda.</div>
            ) : (
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Especialidades</th>
                    <th>Login vinculado</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {barbeiros.map((b) => (
                    <tr key={b.id}>
                      <td><strong style={{ color: '#fff' }}>{b.nome}</strong>{b.is_dono && ' 👑'}</td>
                      <td>{b.especialidades || '—'}</td>
                      <td>{b.auth_id ? 'Sim' : 'Não'}</td>
                      <td>{b.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td>
                        <button className="rz-action-btn" onClick={() => abrirEdicao(b)}>Editar</button>
                        <button className="rz-action-btn" onClick={() => alternarAtivo(b)}>{b.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button className="rz-action-btn danger" onClick={() => excluir(b)}>Excluir</button>
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
            <div className="rz-modal-title">{editando ? 'Editar barbeiro' : 'Novo barbeiro'}</div>
            {erroModal && (
              <div style={{ background: '#2b0d0d', border: '1px solid #e53935', color: '#ff6b6b', fontSize: 12, padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
                {erroModal}
              </div>
            )}
            <form onSubmit={salvar}>
              <label className="rz-field-label">Nome</label>
              <input className="rz-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <label className="rz-field-label">Especialidades</label>
              <input className="rz-input" type="text" placeholder="Ex: Degradê, barba" value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} />

              {editando && (
                <>
                  <label className="rz-field-label">Cor no painel</label>
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    style={{ width: '100%', height: 42, borderRadius: 8, border: '1px solid #262626', background: '#161616', marginBottom: 16, cursor: 'pointer' }}
                  />
                  <label className="rz-field-label">Foto</label>
                  {editando.foto_url && !fotoFile && (
                    <img src={editando.foto_url} alt="Foto atual" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginBottom: 10, display: 'block' }} />
                  )}
                  <input className="rz-input" type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files[0])} />
                  <p style={{ fontSize: 11, color: '#666', marginTop: -10, marginBottom: 16 }}>
                    💡 Pra foto não ficar cortada, use uma imagem no formato retrato (ex: 900x1200px, proporção 3:4).
                  </p>
                </>
              )}

              {!editando && (
                <>
                  <label className="rz-field-label">E-mail (login)</label>
                  <input className="rz-input" type="email" placeholder="funcionario@rezenha.com" value={email} onChange={(e) => setEmail(e.target.value)} required />

                  <label className="rz-field-label">Senha</label>
                  <input className="rz-input" type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
                </>
              )}


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

export default Barbeiros