// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, userId } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    let context = "";
    if (userId) {
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
      const [acc, tx, goals, prof] = await Promise.all([
        supa.from("bank_accounts").select("account_name,balance").eq("user_id", userId),
        supa.from("transactions").select("amount,category,is_unexpected,label").eq("user_id", userId).gte("transaction_date", start),
        supa.from("savings_goals").select("name,target_amount,current_amount").eq("user_id", userId).eq("is_completed", false),
        supa.from("profiles").select("first_name,risk_level,monthly_income").eq("id", userId).maybeSingle(),
      ]);
      const totalBal = (acc.data ?? []).reduce((s, a) => s + Number(a.balance), 0);
      const income = (tx.data ?? []).filter(t => t.amount > 0).reduce((s,t) => s + Number(t.amount), 0);
      const expenses = (tx.data ?? []).filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(Number(t.amount)), 0);
      const byCat: Record<string, number> = {};
      for (const t of (tx.data ?? [])) if (t.amount < 0) byCat[t.category] = (byCat[t.category] ?? 0) + Math.abs(Number(t.amount));
      context = `Profil: ${prof.data?.first_name ?? "?"}, revenu mensuel ${prof.data?.monthly_income ?? "?"}€, profil risque ${prof.data?.risk_level ?? "?"}.
Solde total: ${totalBal.toFixed(0)}€. Mois en cours: revenus ${income.toFixed(0)}€, dépenses ${expenses.toFixed(0)}€.
Dépenses par catégorie: ${Object.entries(byCat).map(([c,v]) => `${c}=${v.toFixed(0)}€`).join(", ")}.
Objectifs en cours: ${(goals.data ?? []).map(g => `${g.name} ${g.current_amount}/${g.target_amount}€`).join("; ") || "aucun"}.`;
    }

    const sys = `Tu es Pécule, un assistant financier bienveillant pour des jeunes actifs francophones. Réponds en français, concis (2-5 phrases), avec des chiffres précis quand possible. Ne donne PAS de conseil en investissement personnalisé, mais peux expliquer les concepts. Voici les données financières de l'utilisateur:\n${context}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: true,
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({error:"rate"}), {status:429,headers:{...corsHeaders,"Content-Type":"application/json"}});
    if (r.status === 402) return new Response(JSON.stringify({error:"credits"}), {status:402,headers:{...corsHeaders,"Content-Type":"application/json"}});
    if (!r.ok) return new Response(JSON.stringify({error:"gateway"}), {status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
    return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
