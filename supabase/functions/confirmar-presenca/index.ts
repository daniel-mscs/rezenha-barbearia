import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function paginaResposta(titulo: string, mensagem: string, cor: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="5;url=https://rezenha-barbearia.vercel.app" />
    <title>Rezenha Barbearia</title>
  </head>
  <body style="font-family: Arial, sans-serif; background: #0d0d0d; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
    <div style="text-align: center; padding: 32px; max-width: 400px;">
      <div style="font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #fff; margin-bottom: 24px;">RE<span style="color: #F07B00;">Z</span>ENHA</div>
      <h1 style="color: ${cor}; font-size: 26px;">${titulo}</h1>
      <p style="color: #999; line-height: 1.6;">${mensagem}</p>
    </div>
  </body>
</html>`
}

serve(async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response(paginaResposta('Link inválido', 'Não encontramos esse agendamento.', '#e53935'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    })
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const { data: agendamento, error: erroBusca } = await supabaseAdmin.from('agendamentos').select('status').eq('id', id).maybeSingle()

  if (erroBusca || !agendamento) {
    return new Response(paginaResposta('Agendamento não encontrado', 'Esse link pode ter expirado.', '#e53935'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 404,
    })
  }

  if (agendamento.status === 'cancelado') {
    return new Response(
      paginaResposta('Agendamento cancelado', 'Esse agendamento já foi cancelado. Entre em contato com a barbearia.', '#e53935'),
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }

  await supabaseAdmin.from('agendamentos').update({ status: 'confirmado' }).eq('id', id)

  return new Response(paginaResposta('Presença confirmada! ✅', 'Te esperamos no horário combinado. Até lá!', '#4caf50'), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})
