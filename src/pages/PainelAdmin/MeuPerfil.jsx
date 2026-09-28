import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import { comprimirImagem } from '../../utils/comprimirImagem'
import '../PainelAdmin/PainelAdmin.css'

function MeuPerfil() {
  const navigate = useNavigate()
  const [meuBarbeiro, setMeuBarbeiro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/admin/login')
        return
      }
      const { data } = await supabase.from('barbeiros').select('id, nome, foto_url').eq('auth_id', session.user.id).maybeSingle()
      if (!data) {
        navigate('/admin/login')
        return
      }
      setMeuBarbeiro(data)
      setCarregando(false)
    }
    carregar()
  }, [])

  const trocarFoto = async (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo || !meuBarbeiro) return

    setErro('')
    setEnviando(true)

    const arquivoComprimido = await comprimirImagem(arquivo)
    const nomeArquivo = `${meuBarbeiro.id}-${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage.from('barbeiros').upload(nomeArquivo, arquivoComprimido, { upsert: true })
    if (uploadError) {
      setEnviando(false)
      setErro('Não foi possível enviar a foto. Tenta de novo.')
      return
    }

    const { data: urlData } = supabase.storage.from('barbeiros').getPublicUrl(nomeArquivo)
    const { error: erroSalvar } = await supabase.rpc('atualizar_minha_foto', { p_foto_url: urlData.publicUrl })

    setEnviando(false)

    if (erroSalvar) {
      setErro('A foto subiu, mas não foi possível salvar. Tenta de novo.')
      return
    }

    setMeuBarbeiro({ ...meuBarbeiro, foto_url: urlData.publicUrl })
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
        <SaudacaoUsuario />
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="meu-perfil" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Meu perfil</div>
          </div>

          <div className="rz-table-wrap" style={{ padding: 24, maxWidth: 380 }}>
            {meuBarbeiro.foto_url ? (
              <img
                src={meuBarbeiro.foto_url}
                alt={meuBarbeiro.nome}
                style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 20px' }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: '#1f1f1f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 48,
                  color: '#F07B00',
                  margin: '0 auto 20px',
                }}
              >
                {meuBarbeiro.nome.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ textAlign: 'center', color: '#fff', fontWeight: 700, marginBottom: 20 }}>{meuBarbeiro.nome}</div>

            {erro && (
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
                {erro}
              </div>
            )}

            <label className="rz-btn-primary" style={{ width: 'auto', display: 'inline-flex', margin: '0 auto', cursor: 'pointer' }}>
              {enviando ? 'Enviando...' : 'Trocar foto'}
              <input type="file" accept="image/*" onChange={trocarFoto} disabled={enviando} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: 11, color: '#666', marginTop: 10, textAlign: 'center' }}>
              💡 Pra foto não ficar cortada, use uma imagem no formato retrato (ex: 900x1200px, proporção 3:4).
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default MeuPerfil
