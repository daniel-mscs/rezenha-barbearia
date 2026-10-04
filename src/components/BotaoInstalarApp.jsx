import { useState, useEffect } from 'react'
import './BotaoInstalarApp.css'

const CHAVE_ADIADO = 'rz-instalar-adiado-ate'
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

function detectarDispositivo() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function BotaoInstalarApp() {
  const [promptEvento, setPromptEvento] = useState(null)
  const [instalado, setInstalado] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [botaoFechado, setBotaoFechado] = useState(false)
  const dispositivo = detectarDispositivo()

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalado(true)
      return
    }

    const aoTerPrompt = (e) => {
      e.preventDefault()
      setPromptEvento(e)
    }
    const aoInstalar = () => {
      setInstalado(true)
      setAberto(false)
    }
    window.addEventListener('beforeinstallprompt', aoTerPrompt)
    window.addEventListener('appinstalled', aoInstalar)

    let adiadoAte = 0
    try {
      adiadoAte = Number(localStorage.getItem(CHAVE_ADIADO)) || 0
    } catch {
      adiadoAte = 0
    }
    const timer = setTimeout(() => {
      if (dispositivo !== 'desktop' && Date.now() > adiadoAte) setAberto(true)
    }, 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', aoTerPrompt)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  const adiar = () => {
    try {
      localStorage.setItem(CHAVE_ADIADO, String(Date.now() + SETE_DIAS))
    } catch {
      // sem localStorage, só fecha
    }
    setAberto(false)
  }

  const instalar = async () => {
    if (!promptEvento) return
    promptEvento.prompt()
    await promptEvento.userChoice
    setPromptEvento(null)
    setAberto(false)
  }

  if (instalado) return null

  return (
    <>
      {!aberto && !botaoFechado && (
        <div className="rz-pwa-flutuante">
          <button className="rz-pwa-flutuante-x" onClick={() => setBotaoFechado(true)} aria-label="Fechar">
            ✕
          </button>
          <button className="rz-pwa-flutuante-btn" onClick={() => setAberto(true)}>
            📲 Instalar app
          </button>
        </div>
      )}

      {aberto && (
        <div
          className="rz-pwa-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) adiar()
          }}
        >
          <div className="rz-pwa-card">
            <img src="/logo.png" alt="Rezenha Barbearia" className="rz-pwa-logo" />
            <div className="rz-pwa-titulo">
              Instale o app da <span>Rezenha</span>
            </div>
            <p className="rz-pwa-texto">Agende mais rápido, direto da tela inicial do seu celular. Sem baixar nada na loja.</p>

            <ul className="rz-pwa-beneficios">
              <li>⚡ Abre em um toque</li>
              <li>📅 Agendamento mais rápido</li>
              <li>🔔 Tudo à mão, igual um app de verdade</li>
            </ul>

            {promptEvento ? (
              <button className="rz-pwa-instalar" onClick={instalar}>
                Instalar agora
              </button>
            ) : (
              <div className="rz-pwa-passos">
                {dispositivo === 'ios' && (
                  <>
                    <div>
                      1. Toque em <strong>Compartilhar</strong> (o quadrado com a seta pra cima)
                    </div>
                    <div>
                      2. Escolha <strong>Adicionar à Tela de Início</strong>
                    </div>
                    <div>
                      3. Toque em <strong>Adicionar</strong>
                    </div>
                  </>
                )}
                {dispositivo === 'android' && (
                  <>
                    <div>
                      1. Toque nos <strong>três pontinhos</strong> (⋮) do navegador
                    </div>
                    <div>
                      2. Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>
                    </div>
                  </>
                )}
                {dispositivo === 'desktop' && (
                  <div>
                    Procure o ícone de <strong>instalar</strong> na barra de endereço do navegador (Chrome ou Edge).
                  </div>
                )}
              </div>
            )}

            <button className="rz-pwa-agora-nao" onClick={adiar}>
              Agora não
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default BotaoInstalarApp