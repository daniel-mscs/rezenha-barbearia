import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paraEmail, nomeCliente, barbeiro, servico, data, horario, preco, agendamentoId } = await req.json()

    if (!paraEmail) throw new Error('E-mail do destinatário é obrigatório')

    const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })

    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rezenha Barbearia <onboarding@resend.dev>',
        to: [paraEmail],
        subject: 'Agendamento confirmado — Rezenha Barbearia',
        html: `
          <div style="font-family: Arial, sans-serif; background: #0d0d0d; padding: 32px; max-width: 480px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #fff;">RE<span style="color: #F07B00;">Z</span>ENHA</span>
            </div>
            <div style="width: 40px; height: 3px; background: #F07B00; margin: 0 auto 20px;"></div>
            <p style="color: #ccc; text-align: center; font-size: 15px; margin-bottom: 24px;">Seu agendamento foi recebido! ✂️</p>

            <div style="background: #161616; border: 1px solid #262626; border-radius: 10px; padding: 24px;">
              <table style="width: 100%; border-collapse: collapse; color: #fff; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #777; border-bottom: 1px solid #262626;">Cliente</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #262626;">${nomeCliente}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777; border-bottom: 1px solid #262626;">Barbeiro</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #262626;">${barbeiro}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777; border-bottom: 1px solid #262626;">Serviço</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #262626;">${servico}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777; border-bottom: 1px solid #262626;">Data</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #262626; text-transform: capitalize;">${dataFormatada}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777; border-bottom: 1px solid #262626;">Horário</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; border-bottom: 1px solid #262626;">${horario}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #777;">Valor</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #F07B00; font-size: 18px;">R$ ${preco}</td>
                </tr>
              </table>
            </div>

            ${
              agendamentoId
                ? `
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://xpxnoerayaqioyndlprf.supabase.co/functions/v1/confirmar-presenca?id=${agendamentoId}" style="display: inline-block; background: #F07B00; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Confirmar presença
                </a>
              </div>
            `
                : ''
            }

            <p style="color: #555; font-size: 12px; text-align: center; margin-top: 24px;">Precisa remarcar ou cancelar? Entre em contato com a barbearia.</p>
          </div>
        `,
      }),
    })

    if (!resposta.ok) {
      const erro = await resposta.text()
      throw new Error(erro)
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
