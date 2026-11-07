import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)

  // A Meta chama com GET uma vez pra confirmar que o endereço é nosso
  if (req.method === 'GET') {
    const modo = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const desafio = url.searchParams.get('hub.challenge')
    if (modo === 'subscribe' && token && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(desafio ?? '', { status: 200 })
    }
    return new Response('Proibido', { status: 403 })
  }

  // Depois manda POST com o status de cada mensagem
  if (req.method === 'POST') {
    const corpo = await req.json().catch(() => null)
    for (const entrada of corpo?.entry ?? []) {
      for (const mudanca of entrada.changes ?? []) {
        const valor = mudanca.value ?? {}
        for (const s of valor.statuses ?? []) {
          console.log(
            JSON.stringify({ tipo: 'status', status: s.status, para: s.recipient_id, id: s.id, erros: s.errors ?? null }),
          )
        }
        for (const m of valor.messages ?? []) {
          console.log(JSON.stringify({ tipo: 'mensagem_recebida', de: m.from, tipo_msg: m.type }))
        }
      }
    }
    return new Response('ok', { status: 200 })
  }

  return new Response('Método não permitido', { status: 405 })
})