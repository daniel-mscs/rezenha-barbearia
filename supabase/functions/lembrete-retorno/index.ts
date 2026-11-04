import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { headers: { 'Content-Type': 'application/json' }, status })

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(ate + 'T00:00:00Z') - Date.parse(de + 'T00:00:00Z')) / 86400000)
}

serve(async (req) => {
  const segredo = Deno.env.get('CRON_SECRET')
  if (!segredo || req.headers.get('x-cron-secret') !== segredo) return json({ erro: 'Não autorizado' }, 401)

  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const empresaId = Deno.env.get('WHATSAPP_EMPRESA_ID')
  const versao = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0'
  if (!token || !phoneId || !empresaId) return json({ erro: 'Configuração incompleta' }, 500)

  const { simular } = await req.json().catch(() => ({ simular: false }))
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  try {
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

    const { data: clientes, error: erroClientes } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, data_ultimo_corte, intervalo_lembrete_dias, lembrete_enviado_em')
      .eq('empresa_id', empresaId)
      .not('data_ultimo_corte', 'is', null)
    if (erroClientes) throw erroClientes

    const { data: futuros, error: erroFuturos } = await supabaseAdmin
      .from('agendamentos')
      .select('cliente_id')
      .eq('empresa_id', empresaId)
      .gte('data', hoje)
      .in('status', ['pendente', 'confirmado'])
    if (erroFuturos) throw erroFuturos
    const comHorarioMarcado = new Set((futuros || []).map((a) => a.cliente_id))

    const paraAvisar = (clientes || []).filter((c) => {
      if (comHorarioMarcado.has(c.id)) return false
      if (diasEntre(c.data_ultimo_corte, hoje) < (c.intervalo_lembrete_dias || 30)) return false
      if (c.lembrete_enviado_em && c.lembrete_enviado_em.slice(0, 10) >= c.data_ultimo_corte) return false
      return true
    })

    if (simular) {
      return json({
        hoje,
        simulacao: true,
        total: paraAvisar.length,
        clientes: paraAvisar.map((c) => ({ nome: c.nome, dias: diasEntre(c.data_ultimo_corte, hoje) })),
      })
    }

    let enviados = 0
    const falhas: { cliente_id: string; erro: string }[] = []

    for (const c of paraAvisar) {
      let telefone = (c.telefone || '').replace(/\D/g, '')
      if (!(c.telefone || '').startsWith('+') && telefone.length <= 11) telefone = '55' + telefone

      const resposta = await fetch(`https://graph.facebook.com/${versao}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefone,
          type: 'template',
          template: {
            name: 'lembrete_retorno',
            language: { code: 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: (c.nome || 'cliente').split(' ')[0] },
                  { type: 'text', text: String(diasEntre(c.data_ultimo_corte, hoje)) },
                ],
              },
            ],
          },
        }),
      })

      if (resposta.ok) {
        await supabaseAdmin.from('clientes').update({ lembrete_enviado_em: new Date().toISOString() }).eq('id', c.id)
        enviados++
      } else {
        falhas.push({ cliente_id: c.id, erro: await resposta.text() })
      }
    }

    return json({ hoje, total: paraAvisar.length, enviados, falhas })
  } catch (error) {
    console.error(error)
    return json({ erro: 'Falha ao processar lembretes' }, 500)
  }
})