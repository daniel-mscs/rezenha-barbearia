import { useState, useEffect } from 'react'

function detectarDispositivo() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function BotaoInstalarApp() {
  const [promptEvento, setPromptEvento] = useState(null)
  const [instalado, setInstalado] = useState(false)
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false)

  useEffect(() => {
    const aoTerPrompt = (e) => {
      e.preventDefault()
      setPromptEvento(e)
    }
    window.addEventListener('beforeinstallprompt', aoTerPrompt)

    const aoInstalar = () => setInstalado(true)
    window.addEventListener('appinstalled', aoInstalar)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalado(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', aoTerPrompt)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  const clicar = async () => {
    if (promptEvento) {
      promptEvento.prompt()
      await promptEvento.userChoice
      setPromptEvento(null)
      return
    }
    setMostrarInstrucoes(true)
  }

  if (instalado) return null

  const dispositivo = detectarDispositivo()

  return (
    <>
      <button
        onClick={clicar}
        style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 998,
          background: '#161616', color: '#fff', border: '1px solid #F07B00',
          borderRadius: 30, padding: '10px 16px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        📲 Instalar app
      </button>

      {mostrarInstrucoes && (
        <div
          onClick={() => setMostrarInstrucoes(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111', border: '1px solid #262626', borderRadius: 12,
              padding: 24, maxWidth: 340, width: '100%', color: '#fff',
            }}
          >
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 12 }}>
              Como instalar
            </div>

            {dispositivo === 'ios' && (
              <p style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7 }}>
                1. Toque no ícone de <strong>Compartilhar</strong> (o quadrado com a seta pra cima), na barra do Safari<br />
                2. Escolha <strong>"Adicionar à Tela de Início"</strong><br />
                3. Toque em <strong>"Adicionar"</strong>
              </p>
            )}

            {dispositivo === 'android' && (
              <p style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7 }}>
                1. Toque nos <strong>três pontinhos</strong> (⋮) no canto superior direito do Chrome<br />
                2. Escolha <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong><br />
                3. Confirme tocando em <strong>"Instalar"</strong>
              </p>
            )}

            {dispositivo === 'desktop' && (
              <p style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7 }}>
                1. Procure o ícone de <strong>instalação</strong> (geralmente um computador com uma seta) na barra de endereço do navegador<br />
                2. Clique nele e depois em <strong>"Instalar"</strong><br /><br />
                Se não aparecer, seu navegador pode não suportar essa função — tenta pelo Chrome ou Edge.
              </p>
            )}

            <button
              onClick={() => setMostrarInstrucoes(false)}
              style={{
                marginTop: 20, width: '100%', background: '#F07B00', color: '#fff',
                border: 'none', borderRadius: 8, padding: 12, fontWeight: 700,
                fontSize: 13, cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default BotaoInstalarApp