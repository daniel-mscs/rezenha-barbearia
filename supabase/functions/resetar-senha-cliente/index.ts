import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function gerarSenhaAleatoria() {
  const numeros = Math.floor(1000 + Math.random() * 9000)
  return `Rezenha${numeros}`
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    const { telefone } = await req.json()
    const telefoneLimpo = (telefone || "").replace(/\D/g, "")
    if (telefoneLimpo.length < 10) throw new Error("Telefone inválido")

    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("id, nome, auth_id")
      .eq("telefone", telefoneLimpo)
      .maybeSingle()

    // Não revela se o telefone existe ou não — sempre responde sucesso
    if (!cliente || !cliente.auth_id) {
      return new Response(JSON.stringify({ sucesso: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const novaSenha = gerarSenhaAleatoria()
    const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(cliente.auth_id, { password: novaSenha })
    if (erroSenha) throw erroSenha

    const token = Deno.env.get("WHATSAPP_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
    const versao = Deno.env.get("WHATSAPP_API_VERSION") ?? "v21.0"

    if (token && phoneId) {
      let telefoneEnvio = telefoneLimpo
      if (telefoneEnvio.length <= 11) telefoneEnvio = "55" + telefoneEnvio

      await fetch(`https://graph.facebook.com/${versao}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefoneEnvio,
          type: "template",
          template: {
            name: "nova_senha",
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: cliente.nome.split(" ")[0] },
                  { type: "text", text: novaSenha },
                ],
              },
            ],
          },
        }),
      })
    }

    return new Response(JSON.stringify({ sucesso: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ erro: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})