import { useState, useEffect } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { iconesParaExibir } from '../components/Icons'
import BotaoWhatsapp from '../components/BotaoWhatsapp'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [logado, setLogado] = useState(false)
  const [servicosLista, setServicosLista] = useState([])
  const [barbeirosLista, setBarbeirosLista] = useState([])
  const [barbeiroPopup, setBarbeiroPopup] = useState(null)
  const [fotosPopup, setFotosPopup] = useState([])
  const [carregandoFotos, setCarregandoFotos] = useState(false)

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

  const abrirPortfolio = async (barbeiro) => {
    setBarbeiroPopup(barbeiro)
    setCarregandoFotos(true)
    const { data } = await supabase
      .from('portfolio_fotos')
      .select('*')
      .eq('barbeiro_id', barbeiro.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setFotosPopup(data || [])
    setCarregandoFotos(false)
  }

  const fecharPortfolio = () => {
    setBarbeiroPopup(null)
    setFotosPopup([])
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

  const [refServicos, visivelServicos] = useScrollReveal()
  const [refBarbeiros, visivelBarbeiros] = useScrollReveal()
  const [refDepoimentos, visivelDepoimentos] = useScrollReveal()
  const [refLocalizacao, visivelLocalizacao] = useScrollReveal()

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
              <Link to="/login" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>Entrar / Login</Link>
              <Link to="/agendamento" className="rz-btn-nav">Agendar agora</Link>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="rz-hero">
        <div>
          <div className="rz-hero-badge">Desde 2021 · Santa Maria, RS</div>
          <h1>Tem corte, tem<br />futebol, tem Re<span>Z</span>enha</h1>
          <p>Na Rezenha o corte é só desculpa pro papo render. Estilo de verdade, com futebol na tela e cerveja gelada.</p>
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
          <div className="rz-stat-num">5+</div>
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
        <div className="rz-stat">
          <div className="rz-stat-num rz-stat-estrelas">★★★★★</div>
          <a href="https://maps.app.goo.gl/rXFTAv5M6u3CmFeF6" target="_blank" rel="noopener noreferrer" className="rz-stat-avalie">Avalie no Google</a>
        </div>
      </div>

      {/* HORÁRIO + INSTAGRAM */}
      <div className="rz-info-bar">
        <div className="rz-info-bar-horarios">
          <span><strong>Seg a Sex</strong> 9h às 19h (sem fechar ao meio-dia)</span>
          <span><strong>Sáb</strong> 9h às 18h (sem fechar ao meio-dia)</span>
          <span><strong>Dom</strong> Fechado</span>
        </div>
        <a href="https://www.instagram.com/rezenha_barbearia/" target="_blank" rel="noopener noreferrer" className="rz-info-bar-instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          @rezenha_barbearia
        </a>
      </div>

      {/* SERVIÇOS */}
      <section id="servicos" className={`rz-section rz-revelar ${visivelServicos ? 'rz-visivel' : ''}`} ref={refServicos}>
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
                {iconesParaExibir(s).map((Icone, i) => <Icone key={i} />)}
              </div>
              <div className="rz-service-name">{s.nome}</div>
              <div className="rz-service-desc">~{s.duracao_min} min</div>
              <div className="rz-service-price">R$ {Number(s.preco).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BARBEIROS */}
      <section id="barbeiros" className={`rz-section rz-revelar ${visivelBarbeiros ? 'rz-visivel' : ''}`} ref={refBarbeiros}>
        <div className="rz-divider"></div>
        <div className="rz-section-title">Nosso <span>time</span></div>
        <div className="rz-section-sub">Profissionais que entendem do assunto</div>
        <div className="rz-barbers">
          {barbeirosLista.map((b) => (
            <div key={b.id} className="rz-barber-card" onClick={() => abrirPortfolio(b)}>
              {b.foto_url ? (
                <img src={b.foto_url} alt={b.nome} className="rz-barber-avatar-img" />
              ) : (
                <div className="rz-barber-avatar">{b.nome.charAt(0).toUpperCase()}</div>
              )}
              <div className="rz-barber-info">
                <div className="rz-barber-name">{b.nome}</div>
                <div className="rz-barber-role">{b.especialidades || '—'}</div>
                <div className="rz-barber-vercortes">Ver cortes</div>
              </div>
            </div>
          ))}
        </div>

        {barbeiroPopup && (
          <div className="rz-portfolio-overlay" onClick={fecharPortfolio}>
            <div className="rz-portfolio-modal" onClick={(e) => e.stopPropagation()}>
              <button className="rz-portfolio-fechar" onClick={fecharPortfolio}>✕</button>
              <div className="rz-portfolio-titulo">Cortes de {barbeiroPopup.nome}</div>
              {carregandoFotos ? (
                <p style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Carregando...</p>
              ) : fotosPopup.length === 0 ? (
                <p style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Esse barbeiro ainda não subiu fotos dos trabalhos.</p>
              ) : (
                <div className="rz-portfolio-grid">
                  {fotosPopup.map((foto) => (
                    <img key={foto.id} src={foto.foto_url} alt="Trabalho do barbeiro" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* LOCALIZAÇÃO */}
      <section id="localizacao" className={`rz-section rz-revelar ${visivelLocalizacao ? 'rz-visivel' : ''}`} ref={refLocalizacao}>
        <div className="rz-divider"></div>
        <div className="rz-section-title">Onde <span>estamos</span></div>
        <div className="rz-section-sub">Vem nos visitar</div>
        <div className="rz-mapa-wrap">
          <iframe
            title="Localização da Rezenha Barbearia"
            src="https://www.google.com/maps?q=Barbearia+Rezenha+Santa+Maria+RS&z=17&output=embed"
            width="100%"
            height="320"
            style={{ border: 0 }}
            loading="lazy"
          ></iframe>
        </div>
        
          <a href="https://www.google.com/maps/place/Barbearia/@-29.6907022,-53.8058472,19z/data=!4m14!1m7!3m6!1s0x9503cb10dc5ba957:0xbe5c177552c6e5c1!2sBarbearia+Rezenha!8m2!3d-29.6910031!4d-53.8051259!16s%2Fg%2F11ny38jzty!3m5!1s0x9503cb6c78b3c6e1:0x17ecc4d687c18756!8m2!3d-29.6908914!4d-53.8050935!16s%2Fg%2F11vt9m_pt_?entry=ttu&g_ep=EgoyMDI2MDcyMi4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="rz-mapa-link">📍 Ver rota no Google Maps</a>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className={`rz-section rz-revelar ${visivelDepoimentos ? 'rz-visivel' : ''}`} ref={refDepoimentos}>
        <div className="rz-divider"></div>
        <div className="rz-section-title">O que dizem <span>sobre a gente</span></div>
        <div className="rz-section-sub">Avaliações reais de clientes no Google</div>
        <div className="rz-depoimentos">
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Excelente atendimento! Ambiente organizado, profissionais muito atenciosos e caprichosos no corte. Dá pra ver que trabalham com dedicação e cuidado em cada detalhe. Sem dúvida, uma das melhores barbearias da região - recomendo demais!"</p>
            <div className="rz-depoimento-autor">Nikolas Rodrigues</div>
            <div className="rz-depoimento-tempo">2 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Atendimento diferenciado, de alta qualidade! Preço justo! Boa localização, de fácil acesso!"</p>
            <div className="rz-depoimento-autor">Thiago Magoga</div>
            <div className="rz-depoimento-tempo">3 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Gurizada gente fina. Atendimento top, corte top. Recomendo."</p>
            <div className="rz-depoimento-autor">João Guilherme de Rosso Menezes</div>
            <div className="rz-depoimento-tempo">4 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Ótima barbearia, atendimento diferenciado e preço justo! Gurizada show de bola... Sucesso sempre"</p>
            <div className="rz-depoimento-autor">Allan B. Irassochio</div>
            <div className="rz-depoimento-tempo">11 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Melhor barbeiro da cidade, grande Matheus, sempre com horários bem acessíveis, com certeza vai dar boas risadas, ambiente top"</p>
            <div className="rz-depoimento-autor">Pablo de França</div>
            <div className="rz-depoimento-tempo">2 semanas atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Os mais topper da banda"</p>
            <div className="rz-depoimento-autor">Tcharles Ferrao</div>
            <div className="rz-depoimento-tempo">2 semanas atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Lugar muito show! Só chegar e ser bem recebido."</p>
            <div className="rz-depoimento-autor">Rafael Biondo Falk</div>
            <div className="rz-depoimento-tempo">2 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Ótimo atendimento, barbeiros profissionais e bem educados, serviço de qualidade recomendo."</p>
            <div className="rz-depoimento-autor">Gian Fortes</div>
            <div className="rz-depoimento-tempo">2 meses atrás</div>
          </div>
          <div className="rz-depoimento-card">
            <div className="rz-depoimento-estrelas">★★★★★</div>
            <p className="rz-depoimento-texto">"Corto cabelo lá tem mais de um ano e a gurizada nunca decepcionou. Recomendo demais!"</p>
            <div className="rz-depoimento-autor">Cristhian Vilagran</div>
            <div className="rz-depoimento-tempo">2 meses atrás</div>
          </div>
        </div>
        <a href="https://maps.app.goo.gl/rXFTAv5M6u3CmFeF6" target="_blank" rel="noopener noreferrer" className="rz-depoimentos-vermais">Ver todas as avaliações no Google →</a>
      </section>

      {/* CTA */}
      <section className="rz-cta">
        <div className="rz-cta-text">
          <h2>Pronto pra seu próximo <span>corte?</span></h2>
          <p>Agende online em menos de 1 minuto, sem precisar ligar</p>
        </div>
        <Link to="/agendamento" className="rz-btn-primary">Agendar agora</Link>
      </section>

      {/* FOOTER */}
      <footer className="rz-footer">
        <div className="rz-footer-coluna">
          <div className="rz-footer-text">© 2025 <span>ReZenha Barbearia</span> · Santa Maria, RS</div>
        </div>
        <a href="https://www.instagram.com/rezenha_barbearia/" target="_blank" rel="noopener noreferrer" className="rz-footer-instagram">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          @rezenha_barbearia
        </a>
      </footer>

      <BotaoWhatsapp />
    </div>
  )
}

export default Home