import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autenticado')

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autenticado')

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: chamador } = await supabaseAdmin.from('barbeiros').select('id').eq('auth_id', user.id).maybeSingle()
    if (!chamador) throw new Error('Sem permissão')

    const { cliente_id, senha } = await req.json()
    if (!cliente_id || !senha) throw new Error('Cliente e senha são obrigatórios')

    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from('clientes')
      .select('nome, telefone')
      .eq('id', cliente_id)
      .maybeSingle()
    if (erroCliente || !cliente) throw new Error('Cliente não encontrado')

    const telefoneLimpo = cliente.telefone.replace(/\D/g, '')
    const emailSintetico = `${telefoneLimpo}@${cliente.telefone.trim().startsWith('+') ? 'whatsapp.internacional' : 'whatsapp.cliente'}`

    // Se o cliente já tiver um auth_id (login já existe), só reseta a senha em vez de criar de novo
    const { data: clienteAtual } = await supabaseAdmin.from('clientes').select('auth_id').eq('id', cliente_id).maybeSingle()

    if (clienteAtual?.auth_id) {
      const { error: erroReset } = await supabaseAdmin.auth.admin.updateUserById(clienteAtual.auth_id, { password: senha })
      if (erroReset) throw erroReset
    } else {
      const { data: novoUsuario, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
        email: emailSintetico,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: cliente.nome, telefone: telefoneLimpo },
      })
      if (erroCriar) throw erroCriar

      await supabaseAdmin.from('clientes').update({ auth_id: novoUsuario.user.id }).eq('id', cliente_id)
    }

    return new Response(JSON.stringify({ sucesso: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ erro: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
