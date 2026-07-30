import { useState, useEffect } from 'react'

function BotaoInstalarApp() {
  const [promptEvento, setPromptEvento] = useState(null)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    const aoTerPrompt = (e) => {
      e.preventDefault()
      setPromptEvento(e)
    }
    window.addEventListener('beforeinstallprompt', aoTerPrompt)

    const aoInstalar = () => setInstalado(true)
    window.addEventListener('appinstalled', aoInstalar)

    return () => {
      window.removeEventListener('beforeinstallprompt', aoTerPrompt)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  const instalar = async () => {
    if (!promptEvento) return
    promptEvento.prompt()
    await promptEvento.userChoice
    setPromptEvento(null)
  }

  if (!promptEvento || instalado) return null

  return (
    <button
      onClick={instalar}
      style={{
        position: 'fixed', bottom: 90, right: 20, zIndex: 998,
        background: '#161616', color: '#fff', border: '1px solid #F07B00',
        borderRadius: 30, padding: '10px 16px', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      }}
    >
      📲 Instalar app
    </button>
  )
}

export default BotaoInstalarApp