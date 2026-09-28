import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { comprimirImagem } from '../../utils/comprimirImagem'
import '../PainelAdmin/PainelAdmin.css'

function MeuPortfolio() {
  const navigate = useNavigate()
  const [meuBarbeiroId, setMeuBarbeiroId] = useState(null)
  const [fotos, setFotos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [fotoParaApagar, setFotoParaApagar] = useState(null)

  const carregarFotos = async (barbeiroId) => {
    const { data } = await supabase
      .from('portfolio_fotos')
      .select('*')
      .eq('barbeiro_id', barbeiroId)
      .order('created_at', { ascending: false })
    setFotos(data || [])
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

      const { data: barbeiro } = await supabase.from('barbeiros').select('id').eq('auth_id', session.user.id).maybeSingle()

      if (!barbeiro) {
        navigate('/admin/login')
        return
      }

      setMeuBarbeiroId(barbeiro.id)
      carregarFotos(barbeiro.id)
    }
    iniciar()
  }, [])

  const enviarFoto = async (e) => {
    const arquivo = e.target.files[0]
    if (!arquivo || !meuBarbeiroId) return

    if (fotos.length >= 5) {
      setErro('Você já atingiu o limite de 5 fotos. Apague uma para enviar outra.')
      e.target.value = ''
      return
    }

    setErro('')
    setEnviando(true)

    const arquivoComprimido = await comprimirImagem(arquivo)
    const nomeArquivo = `${meuBarbeiroId}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage.from('portfolio').upload(nomeArquivo, arquivoComprimido)

    if (uploadError) {
      setEnviando(false)
      setErro('Não foi possível enviar a foto. Tenta de novo.')
      return
    }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(nomeArquivo)

    await supabase.from('portfolio_fotos').insert({
      barbeiro_id: meuBarbeiroId,
      foto_url: urlData.publicUrl,
    })

    setEnviando(false)
    carregarFotos(meuBarbeiroId)
  }

  const confirmarApagarFoto = async () => {
    if (!fotoParaApagar) return
    await supabase.from('portfolio_fotos').delete().eq('id', fotoParaApagar.id)
    setFotoParaApagar(null)
    carregarFotos(meuBarbeiroId)
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
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="portfolio" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">
              Meu <span>portfólio</span>
            </div>
            <label
              className="rz-btn-primary"
              style={{ cursor: fotos.length >= 5 ? 'not-allowed' : 'pointer', opacity: fotos.length >= 5 ? 0.5 : 1 }}
            >
              {enviando ? 'Enviando...' : fotos.length >= 5 ? 'Limite de 5 fotos' : '+ Nova foto'}
              <input
                type="file"
                accept="image/*"
                onChange={enviarFoto}
                disabled={enviando || fotos.length >= 5}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <p style={{ fontSize: 11, color: '#666', marginTop: -12, marginBottom: 20 }}>
            💡 Pra foto não ficar cortada, use uma imagem quadrada (ex: 1080x1080px).
          </p>

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

          {carregando ? (
            <div className="rz-empty-state">Carregando...</div>
          ) : fotos.length === 0 ? (
            <div className="rz-empty-state">Você ainda não subiu nenhuma foto. Clica em "+ Nova foto" pra começar seu portfólio.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {fotos.map((foto) => (
                <div key={foto.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1 / 1' }}>
                  <img
                    src={foto.foto_url}
                    alt="Trabalho do barbeiro"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <button
                    onClick={() => setFotoParaApagar(foto)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Apagar
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {fotoParaApagar && (
        <div className="rz-modal-overlay" onClick={() => setFotoParaApagar(null)}>
          <div className="rz-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <img
              src={fotoParaApagar.foto_url}
              alt="Foto a apagar"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, margin: '0 auto 16px' }}
            />
            <div className="rz-modal-title" style={{ fontSize: 18 }}>
              Apagar essa foto?
            </div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Essa ação não pode ser desfeita.</p>
            <div className="rz-modal-actions">
              <button className="rz-btn-outline" onClick={() => setFotoParaApagar(null)}>
                Cancelar
              </button>
              <button className="rz-btn-primary" style={{ flex: 1, background: '#e53935' }} onClick={confirmarApagarFoto}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeuPortfolio
