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
      const y = now.getFullYear(), m = now.getMonth() + 1;
      const start = `${y}-${String(m).padStart(2,"0")}-01`;
      const [acc, tx, goals, prof, bud, alr, inv, recent] = await Promise.all([
        supa.from("bank_accounts").select("account_name,balance").eq("user_id", userId),
        supa.from("transactions").select("amount,category,is_unexpected,is_recurring,label,transaction_date").eq("user_id", userId).gte("transaction_date", start),
        supa.from("savings_goals").select("name,target_amount,current_amount,target_date,is_completed").eq("user_id", userId),
        supa.from("profiles").select("first_name,risk_level,monthly_income").eq("id", userId).maybeSingle(),
        supa.from("budgets").select("category,planned_amount").eq("user_id", userId).eq("year", y).eq("month", m),
        supa.from("alerts").select("type,title,message,is_read,created_at").eq("user_id", userId).order("created_at",{ascending:false}).limit(10),
        supa.from("investments").select("name,type,invested_amount,current_value,target_amount").eq("user_id", userId),
        supa.from("transactions").select("amount,category,label,transaction_date").eq("user_id", userId).order("transaction_date",{ascending:false}).limit(10),
      ]);

      const totalBal = (acc.data ?? []).reduce((s, a) => s + Number(a.balance), 0);
      const accStr = (acc.data ?? []).map(a => `${a.account_name}=${Number(a.balance).toFixed(0)}€`).join(", ") || "aucun";
      const income = (tx.data ?? []).filter(t => t.amount > 0).reduce((s,t) => s + Number(t.amount), 0);
      const expenses = (tx.data ?? []).filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(Number(t.amount)), 0);
      const unexpected = (tx.data ?? []).filter(t => t.is_unexpected && t.amount < 0).reduce((s,t) => s + Math.abs(Number(t.amount)), 0);
      const recurring = (tx.data ?? []).filter(t => t.is_recurring && t.amount < 0).reduce((s,t) => s + Math.abs(Number(t.amount)), 0);
      const byCat: Record<string, number> = {};
      for (const t of (tx.data ?? [])) if (t.amount < 0) byCat[t.category] = (byCat[t.category] ?? 0) + Math.abs(Number(t.amount));

      const budStr = (bud.data ?? []).map(b => {
        const spent = byCat[b.category] ?? 0;
        return `${b.category}: ${spent.toFixed(0)}/${Number(b.planned_amount).toFixed(0)}€`;
      }).join("; ") || "aucun budget défini";

      const goalsStr = (goals.data ?? []).map(g => `${g.name} ${Number(g.current_amount).toFixed(0)}/${Number(g.target_amount).toFixed(0)}€${g.is_completed?" ✓":""}${g.target_date?` (cible ${g.target_date})`:""}`).join("; ") || "aucun";

      const invStr = (inv.data ?? []).map(i => {
        const pnl = Number(i.current_value) - Number(i.invested_amount);
        return `${i.name} (${i.type}): investi ${Number(i.invested_amount).toFixed(0)}€, valeur ${Number(i.current_value).toFixed(0)}€ (${pnl>=0?"+":""}${pnl.toFixed(0)}€)`;
      }).join("; ") || "aucun";

      const unread = (alr.data ?? []).filter(a => !a.is_read);
      const alrStr = unread.length ? unread.slice(0,5).map(a => `[${a.type}] ${a.title}: ${a.message}`).join(" | ") : "aucune alerte non lue";

      const recentStr = (recent.data ?? []).slice(0,8).map(t => `${t.transaction_date} ${t.label} ${Number(t.amount).toFixed(0)}€ (${t.category})`).join(" | ") || "aucune";

      context = `Profil: ${prof.data?.first_name ?? "?"}, revenu mensuel ${prof.data?.monthly_income ?? "?"}€, profil de risque ${prof.data?.risk_level ?? "?"}.
Comptes (solde total ${totalBal.toFixed(0)}€): ${accStr}.
Mois en cours (${y}-${String(m).padStart(2,"0")}): revenus ${income.toFixed(0)}€, dépenses ${expenses.toFixed(0)}€, dont récurrentes ${recurring.toFixed(0)}€ et imprévues ${unexpected.toFixed(0)}€.
Dépenses par catégorie: ${Object.entries(byCat).map(([c,v]) => `${c}=${v.toFixed(0)}€`).join(", ") || "aucune"}.
Budgets du mois (réel/prévu): ${budStr}.
Objectifs d'épargne: ${goalsStr}.
Investissements: ${invStr}.
Alertes non lues: ${alrStr}.
Dernières transactions: ${recentStr}.`;
    }

    const sys = `Tu es Pécule, l'assistant financier intégré à FinanceApp pour des jeunes actifs francophones. Réponds en français, concis (2-5 phrases sauf demande de détail), avec des chiffres précis tirés des données ci-dessous. Tu connais en temps réel: profil, comptes, transactions du mois, budgets, objectifs d'épargne, investissements et alertes de l'utilisateur. Renvoie vers les pages de l'app quand pertinent (Tableau de bord, Transactions, Budget, Épargne, Investir, Alertes, Ma banque). Ne donne PAS de conseil en investissement personnalisé, mais explique les concepts. Données utilisateur:\n${context}`;

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
