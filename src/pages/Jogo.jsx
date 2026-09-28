import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IconArrowLeft } from '../components/Icons'
import './Jogo.css'

const LADOS = ['esquerda', 'centro', 'direita']

function Jogo() {
  const [fase, setFase] = useState('inicio')
  const [pontos, setPontos] = useState(0)
  const [tempoRestante, setTempoRestante] = useState(60)
  const [zonaBola, setZonaBola] = useState(null)
  const [chutando, setChutando] = useState(false)
  const [goleiroLado, setGoleiroLado] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ranking, setRanking] = useState([])
  const timerRef = useRef(null)
  const arrasteRef = useRef(null)

  const carregarRanking = async () => {
    const { data } = await supabase.from('jogo_penaltis').select('nome, pontuacao').order('pontuacao', { ascending: false }).limit(10)
    setRanking(data || [])
  }

  useEffect(() => {
    carregarRanking()
  }, [])

  useEffect(() => {
    if (fase !== 'jogando') return

    timerRef.current = setInterval(() => {
      setTempoRestante((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setFase('fim')
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [fase])

  const comecar = () => {
    setPontos(0)
    setTempoRestante(60)
    setResultado(null)
    setGoleiroLado(null)
    setZonaBola(null)
    setChutando(false)
    setFase('jogando')
  }

  const chutar = (zona) => {
    setChutando(true)
    setZonaBola(zona)

    setTimeout(() => {
      const ladoGoleiro = LADOS[Math.floor(Math.random() * 3)]
      setGoleiroLado(ladoGoleiro)

      if (zona === ladoGoleiro) {
        setResultado('defendeu')
      } else {
        setResultado('gol')
        setPontos((p) => p + 1)
      }

      setTimeout(() => {
        setZonaBola(null)
        setChutando(false)
        setGoleiroLado(null)
        setResultado(null)
      }, 700)
    }, 350)
  }

  const iniciarArraste = (e) => {
    if (fase !== 'jogando' || chutando) return
    arrasteRef.current = { x: e.clientX, y: e.clientY }
  }

  const finalizarArraste = (e) => {
    if (!arrasteRef.current || fase !== 'jogando' || chutando) return
    const deltaX = e.clientX - arrasteRef.current.x
    const deltaY = arrasteRef.current.y - e.clientY
    arrasteRef.current = null

    if (deltaY < 40) return

    const zona = deltaX < -30 ? 'esquerda' : deltaX > 30 ? 'direita' : 'centro'
    chutar(zona)
  }

  const enviarPontuacao = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return
    setEnviando(true)
    await supabase.from('jogo_penaltis').insert({ nome: nome.trim().slice(0, 30), pontuacao: pontos })
    setEnviando(false)
    setNome('')
    setFase('inicio')
    carregarRanking()
  }

  return (
    <div className="rz-page-root">
      <header className="rz-topbar">
        <div className="rz-logo-text">
          Re<span>Z</span>enha
        </div>
        <div className="rz-topbar-right">
          <Link to="/" className="rz-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <IconArrowLeft className="rz-icon-inline" /> Início
          </Link>
        </div>
      </header>

      <div className="rz-page">
        <div className="rz-divider"></div>
        <div className="rz-page-title">
          Pênalti da <span>Rezenha</span>
        </div>
        <div className="rz-page-sub">Enquanto espera o corte, testa sua mira!</div>

        <div className="rz-jogo-area">
          {fase === 'inicio' && (
            <>
              <p style={{ color: '#999', fontSize: 14, marginTop: 20 }}>
                Você tem 60 segundos. Arrasta a bola pra cima, na direção que quiser chutar — se o goleiro pular pro outro lado, é gol!
              </p>
              <button className="rz-btn-primary" style={{ marginTop: 20 }} onClick={comecar}>
                Começar
              </button>
            </>
          )}

          {(fase === 'jogando' || (fase === 'fim' && false)) && fase === 'jogando' && (
            <>
              <div className="rz-jogo-placar">
                <div className="rz-jogo-placar-item">
                  <div className="rz-jogo-placar-num">{pontos}</div>
                  <div className="rz-jogo-placar-label">Gols</div>
                </div>
                <div className="rz-jogo-placar-item">
                  <div className="rz-jogo-placar-num">{tempoRestante}</div>
                  <div className="rz-jogo-placar-label">Segundos</div>
                </div>
              </div>

              <div
                className="rz-jogo-campo"
                onPointerDown={iniciarArraste}
                onPointerUp={finalizarArraste}
              >
                <div className="rz-jogo-trave"></div>
                <div className={`rz-jogo-goleiro-indicador esquerda ${goleiroLado === 'esquerda' ? 'visivel' : ''}`}></div>
                <div className={`rz-jogo-goleiro-indicador centro ${goleiroLado === 'centro' ? 'visivel' : ''}`}></div>
                <div className={`rz-jogo-goleiro-indicador direita ${goleiroLado === 'direita' ? 'visivel' : ''}`}></div>
                <div className={`rz-jogo-bola ${zonaBola || ''}`}></div>
              </div>

              <div className="rz-jogo-resultado-wrap">
                {resultado && <div className={`rz-jogo-resultado ${resultado}`}>{resultado === 'gol' ? '⚽ GOL!' : '🧤 Defendeu!'}</div>}
              </div>
              <p className="rz-jogo-instrucao">Clica ou toca na bola e arrasta pra cima</p>
            </>
          )}

          {fase === 'fim' && (
            <>
              <div className="rz-jogo-placar">
                <div className="rz-jogo-placar-item">
                  <div className="rz-jogo-placar-num">{pontos}</div>
                  <div className="rz-jogo-placar-label">Gols no total</div>
                </div>
              </div>
              <p style={{ color: '#999', fontSize: 14 }}>Fim de jogo! Coloca seu nome pra entrar no ranking:</p>
              <form onSubmit={enviarPontuacao} style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                <input
                  className="rz-input"
                  style={{ marginBottom: 0, maxWidth: 220 }}
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={30}
                  required
                />
                <button className="rz-btn-primary" style={{ width: 'auto' }} type="submit" disabled={enviando}>
                  {enviando ? 'Salvando...' : 'Salvar'}
                </button>
              </form>
              <button className="rz-btn-outline" style={{ marginTop: 16, width: 'auto' }} onClick={() => setFase('inicio')}>
                Jogar de novo
              </button>
            </>
          )}

          <div className="rz-jogo-ranking">
            <div className="rz-field-label">🏆 Maiores pontuações</div>
            {ranking.length === 0 ? (
              <p style={{ color: '#666', fontSize: 13 }}>Ninguém jogou ainda. Seja o primeiro!</p>
            ) : (
              ranking.map((r, i) => (
                <div key={i} className="rz-jogo-ranking-item">
                  <span>
                    <span className="rz-jogo-ranking-pos">#{i + 1}</span>
                    {r.nome}
                  </span>
                  <strong style={{ color: '#F07B00' }}>{r.pontuacao} gols</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Jogo