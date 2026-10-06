import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

let contextoAudioGlobal = null

function obterContextoAudio() {
  if (!contextoAudioGlobal) {
    const AudioContextClasse = window.AudioContext || window.webkitAudioContext
    contextoAudioGlobal = new AudioContextClasse()
  }
  return contextoAudioGlobal
}

function tocarAlertaSonoro() {
  try {
    const contexto = obterContextoAudio()
    if (contexto.state === 'suspended') {
      contexto.resume()
    }
    const tocarBeep = (inicioEm) => {
      const oscilador = contexto.createOscillator()
      const ganho = contexto.createGain()
      oscilador.connect(ganho)
      ganho.connect(contexto.destination)
      oscilador.type = 'sine'
      oscilador.frequency.value = 880
      ganho.gain.setValueAtTime(0.2, contexto.currentTime + inicioEm)
      oscilador.start(contexto.currentTime + inicioEm)
      oscilador.stop(contexto.currentTime + inicioEm + 0.15)
    }
    tocarBeep(0)
    tocarBeep(0.2)
  } catch (e) {
    // navegador bloqueou áudio automático, ignora
  }
}

function AdminSidebar({ ativa }) {
  const [isDono, setIsDono] = useState(false)
  const [pendentes, setPendentes] = useState(0)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const destravarAudio = () => {
      obterContextoAudio()
      window.removeEventListener('click', destravarAudio)
      window.removeEventListener('touchstart', destravarAudio)
    }
    window.addEventListener('click', destravarAudio)
    window.addEventListener('touchstart', destravarAudio)
    return () => {
      window.removeEventListener('click', destravarAudio)
      window.removeEventListener('touchstart', destravarAudio)
    }
  }, [])

  useEffect(() => {
    const verificar = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('barbeiros').select('is_dono').eq('auth_id', session.user.id).maybeSingle()
      setIsDono(data?.is_dono || false)
    }
    verificar()
  }, [])

  const carregarPendentes = async () => {
    const { count } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('status', 'pendente')
    setPendentes(count || 0)
  }

  useEffect(() => {
    carregarPendentes()

    const canal = supabase
      .channel('agendamentos-novos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, () => {
        carregarPendentes()
        tocarAlertaSonoro()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agendamentos' }, () => {
        carregarPendentes()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="rz-menu-toggle"
        onClick={() => setMenuAberto((v) => !v)}
        aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {menuAberto ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
        {pendentes > 0 && <span className="rz-menu-toggle-badge">{pendentes}</span>}
      </button>
      {menuAberto && <div className="rz-sidebar-overlay" onClick={() => setMenuAberto(false)}></div>}
      <aside className={`rz-sidebar ${menuAberto ? 'aberto' : ''}`} onClick={() => setMenuAberto(false)}>
      <Link to="/admin" className={`rz-sidebar-item ${ativa === 'agendamentos' ? 'active' : ''}`}>
        <i className="ti ti-calendar"></i> <span>Agendamentos</span>
        {pendentes > 0 && <span className="rz-sidebar-badge">{pendentes}</span>}
      </Link>
      {isDono && (
        <>
          <Link to="/admin/barbeiros" className={`rz-sidebar-item ${ativa === 'barbeiros' ? 'active' : ''}`}>
            <i className="ti ti-users"></i> <span>Barbeiros</span>
          </Link>
          <Link to="/admin/servicos" className={`rz-sidebar-item ${ativa === 'servicos' ? 'active' : ''}`}>
            <i className="ti ti-cut"></i> <span>Serviços</span>
          </Link>
          <Link to="/admin/configuracoes" className={`rz-sidebar-item ${ativa === 'configuracoes' ? 'active' : ''}`}>
            <i className="ti ti-settings"></i> <span>Configurações</span>
          </Link>
          <Link to="/admin/caixa" className={`rz-sidebar-item ${ativa === 'caixa' ? 'active' : ''}`}>
            <i className="ti ti-cash"></i> <span>Caixa</span>
          </Link>
        </>
      )}
      <Link to="/admin/relatorios" className={`rz-sidebar-item ${ativa === 'relatorios' ? 'active' : ''}`}>
        <i className="ti ti-chart-bar"></i> <span>Relatórios</span>
      </Link>
      <Link to="/admin/clientes" className={`rz-sidebar-item ${ativa === 'clientes' ? 'active' : ''}`}>
        <i className="ti ti-address-book"></i> <span>Clientes</span>
      </Link>
      <Link to="/admin/horarios-livres" className={`rz-sidebar-item ${ativa === 'horarios-livres' ? 'active' : ''}`}>
        <i className="ti ti-share"></i> <span>Horários Livres</span>
      </Link>
      <Link to="/admin/bloqueios" className={`rz-sidebar-item ${ativa === 'bloqueios' ? 'active' : ''}`}>
        <i className="ti ti-calendar-off"></i> <span>Bloqueios</span>
      </Link>
      <Link to="/admin/aniversarios" className={`rz-sidebar-item ${ativa === 'aniversarios' ? 'active' : ''}`}>
        <i className="ti ti-cake"></i> <span>Aniversários</span>
      </Link>
      <Link to="/admin/meu-perfil" className={`rz-sidebar-item ${ativa === 'meu-perfil' ? 'active' : ''}`}>
        <i className="ti ti-user-circle"></i> <span>Meu Perfil</span>
      </Link>
      <Link to="/admin/estoque" className={`rz-sidebar-item ${ativa === 'estoque' ? 'active' : ''}`}>
        <i className="ti ti-package"></i> <span>Estoque</span>
      </Link>
      <Link to="/admin/portfolio" className={`rz-sidebar-item ${ativa === 'portfolio' ? 'active' : ''}`}>
        <i className="ti ti-photo"></i> <span>Meu Portfólio</span>
      </Link>
    </aside>
    </>
  )
}

export default AdminSidebar
