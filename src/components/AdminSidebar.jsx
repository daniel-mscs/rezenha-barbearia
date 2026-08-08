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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('barbeiros')
        .select('is_dono')
        .eq('auth_id', session.user.id)
        .maybeSingle()
      setIsDono(data?.is_dono || false)
    }
    verificar()
  }, [])

  const carregarPendentes = async () => {
    const { count } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
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
    <aside className="rz-sidebar">
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
        </>
      )}
      <Link to="/admin/relatorios" className={`rz-sidebar-item ${ativa === 'relatorios' ? 'active' : ''}`}>
        <i className="ti ti-chart-bar"></i> <span>Relatórios</span>
      </Link>
      <Link to="/admin/clientes" className={`rz-sidebar-item ${ativa === 'clientes' ? 'active' : ''}`}>
        <i className="ti ti-address-book"></i> <span>Clientes</span>
      </Link>
      <Link to="/admin/portfolio" className={`rz-sidebar-item ${ativa === 'portfolio' ? 'active' : ''}`}>
        <i className="ti ti-photo"></i> <span>Meu Portfólio</span>
      </Link>
    </aside>
  )
}

export default AdminSidebar