import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { iconesDoServico } from '../components/Icons'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [logado, setLogado] = useState(false)
  const [servicosLista, setServicosLista] = useState([])
  const [barbeirosLista, setBarbeirosLista] = useState([])

  useEffect(() => {
    const carregarDados = async () => {
      const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_min, preco').eq('ativo', true).order('nome')
      const { data: barbeirosData } = await supabase.from('barbeiros').select('id, nome, foto_url, especialidades').eq('ativo', true).order('nome')
      setServicosLista(servicosData || [])
      setBarbeirosLista(barbeirosData || [])
    }
    carregarDados()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLogado(!!session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const sair = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const [cliquesLogo, setCliquesLogo] = useState(0)
  const handleLogoClick = () => {
    const novoTotal = cliquesLogo + 1
    setCliquesLogo(novoTotal)
    if (novoTotal >= 5) {
      navigate('/admin/login')
    }
    clearTimeout(window._logoClickTimer)
    window._logoClickTimer = setTimeout(() => setCliquesLogo(0), 1500)
  }

  return (
    <div className="rz-page-root">
      {/* TOPBAR */}
      <header className="rz-topbar">
        <div className="rz-logo-text" onClick={handleLogoClick} style={{ cursor: 'default' }}>Re<span>Z</span>enha</div>
        <div className="rz-topbar-right">
          <ul className="rz-nav">
            <li className="active"><a href="index.html">Início</a></li>
            <li><a href="#servicos">Serviços</a></li>
            <li><a href="#barbeiros">Barbeiros</a></li>
            <li><Link to="/agendamento">Agendar</Link></li>
          </ul>
          {logado ? (
            <button onClick={sair} className="rz-btn-nav" style={{ border: 'none', cursor: 'pointer' }}>Sair</button>
          ) : (
            <>
              <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Entrar</Link>
              <Link to="/agendamento" className="rz-btn-nav">Agendar agora</Link>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="rz-hero">
        <div>
          <div className="rz-hero-badge">Desde 2021 · Santa Maria, RS</div>
          <h1>Estilo que<br />fala por <span>você</span></h1>
          <p>Cortes precisos, atendimento de qualidade e um ambiente feito pra você relaxar.</p>
          <div className="rz-hero-actions">
            <Link to="/agendamento" className="rz-btn-primary">Agendar horário</Link>
            <a href="#servicos" className="rz-btn-outline">Ver serviços</a>
          </div>
        </div>
        <img className="rz-hero-logo" src="/logo.png" alt="Logo Rezenha Barbearia" />
      </section>

      {/* STATS */}
      <div className="rz-stats">
        <div className="rz-stat">
          <div className="rz-stat-num">3+</div>
          <div className="rz-stat-label">Anos de experiência</div>
        </div>
        <div className="rz-stat">
          <div className="rz-stat-num">3</div>
          <div className="rz-stat-label">Barbeiros especializados</div>
        </div>
        <div className="rz-stat">
          <div className="rz-stat-num">100%</div>
          <div className="rz-stat-label">Satisfação garantida</div>
        </div>
      </div>

      {/* SERVIÇOS */}
      <section id="servicos" className="rz-section">
        <div className="rz-divider"></div>
        <div className="rz-section-title">Nossos <span>serviços</span></div>
        <div className="rz-section-sub">Escolha o que você precisa</div>
        <div className="rz-services">
          {servicosLista.map((s) => (
            <div
              key={s.id}
              className="rz-service-card"
              onClick={() => navigate('/agendamento', { state: { servicoId: s.id } })}
            >
              <div className="rz-service-icon">
                {iconesDoServico(s.nome).map((Icone, i) => <Icone key={i} />)}
              </div>
              <div className="rz-service-name">{s.nome}</div>
              <div className="rz-service-desc">~{s.duracao_min} min</div>
              <div className="rz-service-price">R$ {Number(s.preco).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BARBEIROS */}
      <section id="barbeiros" className="rz-section">
        <div className="rz-divider"></div>
        <div className="rz-section-title">Nosso <span>time</span></div>
        <div className="rz-section-sub">Profissionais que entendem do assunto</div>
        <div className="rz-barbers">
          {barbeirosLista.map((b) => (
            <div key={b.id} className="rz-barber-card">
              {b.foto_url ? (
                <img src={b.foto_url} alt={b.nome} className="rz-barber-avatar-img" />
              ) : (
                <div className="rz-barber-avatar">{b.nome.charAt(0).toUpperCase()}</div>
              )}
              <div className="rz-barber-info">
                <div className="rz-barber-name">{b.nome}</div>
                <div className="rz-barber-role">{b.especialidades || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rz-cta">
        <div className="rz-cta-text">
          <h2>Pronto pra seu próximo <span>corte?</span></h2>
          <p>Agende online em menos de 1 minuto, sem precisar ligar</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://share.google/qobMCHQN469xM6JXU" target="_blank" rel="noopener noreferrer" className="rz-btn-outline">
            ⭐ Avalie no Google
          </a>
          <Link to="/agendamento" className="rz-btn-primary">Agendar agora</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="rz-footer">
        <div className="rz-footer-text">© 2025 <span>ReZenha Barbearia</span> · Santa Maria, RS</div>
        <div className="rz-footer-text">rezenhabarbearia.com.br</div>
      </footer>
    </div>
  )
}

export default Home