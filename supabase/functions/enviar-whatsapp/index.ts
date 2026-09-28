import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  let agendamentoId: string | undefined
  let reservado = false

  try {
    const body = await req.json()
    agendamentoId = body.agendamento_id
    if (!agendamentoId) throw new Error('agendamento_id é obrigatório')

    const token = Deno.env.get('WHATSAPP_TOKEN')
    const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const template = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'confirmacao_agendamento'
    const versao = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0'
    if (!token || !phoneId) throw new Error('WhatsApp ainda não configurado')

    // Só quem conseguir marcar como enviado primeiro segue adiante
    const { data: ag } = await supabaseAdmin
      .from('agendamentos')
      .update({ whatsapp_confirmacao_enviada: true })
      .eq('id', agendamentoId)
      .eq('whatsapp_confirmacao_enviada', false)
      .select('data, horario, clientes(nome, telefone), barbeiros(nome), servicos(nome)')
      .maybeSingle()

    if (!ag) return json({ ja_enviado: true })
    reservado = true

    let telefone = (ag.clientes?.telefone ?? '').replace(/\D/g, '')
    if (!telefone) throw new Error('Cliente sem telefone')
    if (telefone.length <= 11) telefone = '55' + telefone

    const dataFormatada = new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const primeiroNome = (ag.clientes?.nome ?? 'cliente').split(' ')[0]

    const valores = [
      primeiroNome,
      ag.servicos?.nome ?? '—',
      ag.barbeiros?.nome ?? '—',
      dataFormatada,
      (ag.horario ?? '').slice(0, 5) || '—',
    ]

    const resposta = await fetch(`https://graph.facebook.com/${versao}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefone,
        type: 'template',
        template: {
          name: template,
          language: { code: 'pt_BR' },
          components: [
            { type: 'body', parameters: valores.map((text) => ({ type: 'text', text })) },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: agendamentoId }] },
          ],
        },
      }),
    })

    if (!resposta.ok) throw new Error(await resposta.text())

    return json({ sucesso: true })
  } catch (error) {
    // Se falhou depois de reservar, libera pra poder tentar de novo
    if (reservado && agendamentoId) {
      await supabaseAdmin.from('agendamentos').update({ whatsapp_confirmacao_enviada: false }).eq('id', agendamentoId)
    }
    return json({ erro: error.message }, 400)
  }
})
