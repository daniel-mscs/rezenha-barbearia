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

const MINUTOS_VALIDADE = 10
const MAX_TENTATIVAS = 5
const MAX_CODIGOS_POR_15_MIN = 3

async function gerarHash(texto: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function gerarCodigo() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  return String(n).padStart(6, '0')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const invalido = () => json({ erro: 'Código inválido ou expirado. Peça um novo.' }, 400)

  try {
    const { acao, telefone, empresa_id, codigo, nova_senha } = await req.json()
    const telefoneLimpo = String(telefone || '').replace(/\D/g, '')
    if (telefoneLimpo.length < 10) return json({ erro: 'Telefone inválido.' }, 400)
    if (!empresa_id) return json({ erro: 'Empresa não informada.' }, 400)

    // Mais de um cliente pode ter o mesmo telefone (família); o login é sempre um só
    const { data: cliente } = await supabaseAdmin
      .from('clientes')
      .select('id, auth_id, telefone')
      .eq('empresa_id', empresa_id)
      .in('telefone', [telefoneLimpo, '+' + telefoneLimpo])
      .not('auth_id', 'is', null)
      .limit(1)
      .maybeSingle()

    if (acao === 'enviar') {
      // Não revela se o telefone existe: sempre responde sucesso
      if (!cliente?.auth_id) return json({ sucesso: true })

      const quinzeMinAtras = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('codigos_recuperacao')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)
        .gte('created_at', quinzeMinAtras)
      if ((count ?? 0) >= MAX_CODIGOS_POR_15_MIN) return json({ sucesso: true })

      await supabaseAdmin.from('codigos_recuperacao').update({ usado: true }).eq('cliente_id', cliente.id).eq('usado', false)

      const novoCodigo = gerarCodigo()
      const { error: erroInsert } = await supabaseAdmin.from('codigos_recuperacao').insert({
        empresa_id,
        cliente_id: cliente.id,
        codigo_hash: await gerarHash(cliente.id + novoCodigo),
        expira_em: new Date(Date.now() + MINUTOS_VALIDADE * 60 * 1000).toISOString(),
      })
      if (erroInsert) throw erroInsert

      const token = Deno.env.get('WHATSAPP_TOKEN')
      const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
      const versao = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0'
      if (!token || !phoneId) throw new Error('WhatsApp ainda não configurado')

      let telefoneEnvio = cliente.telefone.replace(/\D/g, '')
      if (!cliente.telefone.startsWith('+') && telefoneEnvio.length <= 11) telefoneEnvio = '55' + telefoneEnvio

      const resposta = await fetch(`https://graph.facebook.com/${versao}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefoneEnvio,
          type: 'template',
          template: {
            name: 'codigo_senha',
            language: { code: 'pt_BR' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: novoCodigo }] },
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: novoCodigo }] },
            ],
          },
        }),
      })
      if (!resposta.ok) console.error('Erro WhatsApp:', await resposta.text())

      return json({ sucesso: true })
    }

    if (acao === 'confirmar') {
      const codigoLimpo = String(codigo || '').replace(/\D/g, '')
      if (codigoLimpo.length !== 6) return json({ erro: 'Digite o código de 6 números.' }, 400)
      if (!nova_senha || String(nova_senha).length < 6) return json({ erro: 'A senha precisa ter no mínimo 6 caracteres.' }, 400)
      if (!cliente?.auth_id) return invalido()

      const { data: registro } = await supabaseAdmin
        .from('codigos_recuperacao')
        .select('id, codigo_hash, tentativas')
        .eq('cliente_id', cliente.id)
        .eq('usado', false)
        .gt('expira_em', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!registro) return invalido()

      if (registro.tentativas >= MAX_TENTATIVAS) {
        await supabaseAdmin.from('codigos_recuperacao').update({ usado: true }).eq('id', registro.id)
        return json({ erro: 'Muitas tentativas. Peça um novo código.' }, 400)
      }

      if ((await gerarHash(cliente.id + codigoLimpo)) !== registro.codigo_hash) {
        await supabaseAdmin
          .from('codigos_recuperacao')
          .update({ tentativas: registro.tentativas + 1 })
          .eq('id', registro.id)
        return json({ erro: 'Código incorreto.' }, 400)
      }

      const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(cliente.auth_id, { password: String(nova_senha) })
      if (erroSenha) throw erroSenha

      await supabaseAdmin.from('codigos_recuperacao').update({ usado: true }).eq('id', registro.id)
      return json({ sucesso: true })
    }

    return json({ erro: 'Ação inválida.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ erro: 'Não foi possível concluir. Tente novamente.' }, 500)
  }
})