import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Não autenticado")

    // Cliente com a chave anon, só pra descobrir quem está chamando
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Não autenticado")

    // Cliente com a service_role — só existe aqui dentro do servidor, nunca no navegador
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Confirma que quem está chamando é um barbeiro/dono cadastrado
    const { data: chamador } = await supabaseAdmin
      .from("barbeiros")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle()

    if (!chamador) throw new Error("Sem permissão pra criar funcionários")

    const { nome, especialidades, email, senha } = await req.json()
    if (!nome || !email || !senha) throw new Error("Nome, e-mail e senha são obrigatórios")

    const { data: novoUsuario, error: criarError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (criarError) throw criarError

    const { error: insertError } = await supabaseAdmin.from("barbeiros").insert({
      nome,
      especialidades,
      auth_id: novoUsuario.user.id,
      ativo: true,
      is_dono: false,
    })
    if (insertError) throw insertError

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