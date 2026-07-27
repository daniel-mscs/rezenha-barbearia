import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './CookieBanner.css'

function CookieBanner() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const jaAceitou = localStorage.getItem('rz-cookies-aceitos')
    if (!jaAceitou) {
      setVisivel(true)
    }
  }, [])

  const aceitar = () => {
    localStorage.setItem('rz-cookies-aceitos', 'true')
    setVisivel(false)
  }

  if (!visivel) return null

  return (
    <div className="rz-cookie-banner">
      <p className="rz-cookie-texto">
        Usamos cookies essenciais para o funcionamento do site, como manter você conectado após o login. Ao continuar navegando, você concorda com isso. <Link to="/privacidade" style={{ color: '#F07B00' }}>Saiba mais</Link>.
      </p>
      <button className="rz-cookie-btn" onClick={aceitar}>Entendi</button>
    </div>
  )
}

export default CookieBanner