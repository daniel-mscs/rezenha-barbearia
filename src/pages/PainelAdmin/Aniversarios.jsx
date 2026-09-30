import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import SaudacaoUsuario from '../../components/SaudacaoUsuario'
import '../PainelAdmin/PainelAdmin.css'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatarDataCurta(dataStr) {
  const [, mes, dia] = dataStr.split('-')
  return `${dia} ${MESES[parseInt(mes, 10) - 1]}`
}

function mensagemParabens(nome) {
  return encodeURIComponent(
    `Parabéns, ${nome.split(' ')[0]}! 🎉 A Rezenha Barbearia deseja um feliz aniversário e já separou um brinde especial pra você. Te esperamos!`,
  )
}

function Aniversarios() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [lista, setLista] = useState([])

  useEffect(() => {
    const iniciar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        navigate('/admin/login')
        return
      }
      const { data } = await supabase.rpc('proximos_aniversarios', { p_dias: 31 })
      setLista((data || []).filter((c) => c.dias_ate_aniversario <= 31))
      setCarregando(false)
    }
    iniciar()
  }, [])

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
        <SaudacaoUsuario />
        <div className="rz-topbar-right">
          <button onClick={sair} className="rz-logout">
            <i className="ti ti-logout"></i> Sair
          </button>
        </div>
      </header>

      <div className="rz-body">
        <AdminSidebar ativa="aniversarios" />

        <main className="rz-main">
          <div className="rz-page-header">
            <div className="rz-page-title">Aniversários</div>
          </div>

          {carregando ? (
            <div className="rz-empty-state">Carregando...</div>
          ) : lista.length === 0 ? (
            <div className="rz-empty-state" style={{ padding: 24 }}>
              Nenhum aniversário nos próximos 31 dias.
            </div>
          ) : (
            <div className="rz-table-wrap">
              <table className="rz-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Faltam</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id}>
                      <td data-label="Cliente">
                        <strong style={{ color: '#fff' }}>{c.nome}</strong>
                      </td>
                      <td data-label="Data">{formatarDataCurta(c.data_nascimento)}</td>
                      <td data-label="Faltam">
                        {c.dias_ate_aniversario === 0 ? (
                          <span className="rz-badge" style={{ background: '#0d2b0d', color: '#4caf50' }}>
                            Hoje!
                          </span>
                        ) : (
                          `${c.dias_ate_aniversario} dia${c.dias_ate_aniversario > 1 ? 's' : ''}`
                        )}
                      </td>
                      <td data-label="Ações">
                        <a
                          className="rz-action-btn"
                          href={`https://wa.me/55${c.telefone}?text=${mensagemParabens(c.nome)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Mandar parabéns
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Aniversarios