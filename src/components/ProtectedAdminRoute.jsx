import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ProtectedAdminRoute({ children }) {
  const [verificando, setVerificando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const verificar = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: barbeiro } = await supabase
          .from('barbeiros')
          .select('id')
          .eq('auth_id', session.user.id)
          .maybeSingle()

        if (barbeiro) setAutorizado(true)
      }
      setVerificando(false)
    }
    verificar()
  }, [])

  if (verificando) return <div style={{ background: '#0d0d0d', minHeight: '100vh' }}></div>
  if (!autorizado) return <Navigate to="/admin/login" replace />

  return children
}

export default ProtectedAdminRoute