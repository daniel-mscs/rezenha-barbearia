import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { nome, telefone, senha, email, cpf } = await req.json()
    if (!nome || !telefone || !senha) throw new Error("Nome, telefone e senha são obrigatórios")

    const telefoneLimpo = telefone.replace(/\D/g, "")
    const emailSintetico = `${telefoneLimpo}@whatsapp.cliente`

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: existente } = await supabaseAdmin
      .from("clientes")
      .select("id, auth_id")
      .or(`telefone.eq.${telefoneLimpo}${cpf ? `,cpf.eq.${cpf}` : ""}`)
      .maybeSingle()

    if (existente && existente.auth_id) {
      throw new Error("Esse telefone já tem uma conta. Faça login em vez de criar uma nova.")
    }

    const { data: novoUsuario, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email: emailSintetico,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, telefone: telefoneLimpo },
    })
    if (erroCriar) throw erroCriar

    if (existente) {
      await supabaseAdmin.from("clientes").update({ auth_id: novoUsuario.user.id, nome, email: email || null }).eq("id", existente.id)
    } else {
      await supabaseAdmin.from("clientes").insert({
        nome, telefone: telefoneLimpo, email: email || null, cpf: cpf || null, auth_id: novoUsuario.user.id,
      })
    }

    return new Response(JSON.stringify({ sucesso: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ erro: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    })
  }
})