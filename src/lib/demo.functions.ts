import { createServerFn } from "@tanstack/react-start";
import {
  generateMockTransactions,
  DEFAULT_BUDGETS,
  type Category,
} from "@/lib/finance";

/**
 * Create a fully-seeded demo account and return its credentials.
 * The client should then sign in with those credentials.
 */
export const createDemoAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rand = Math.random().toString(36).slice(2, 10);
    const email = `demo-${rand}@financeapp.demo`;
    const password = `Demo!${rand}${Math.floor(Math.random() * 9999)}`;

    // 1) Create confirmed auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Démo", last_name: "Utilisateur" },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create demo user");
    }
    const userId = created.user.id;

    // 2) Profile (upsert in case trigger already created a row)
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          first_name: "Démo",
          last_name: "Utilisateur",
          monthly_income: 2800,
          risk_level: "MODERATE",
          onboarding_completed: true,
        },
        { onConflict: "id" },
      );

    // 3) Bank accounts
    const now = new Date().toISOString();
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("bank_accounts")
      .insert([
        {
          user_id: userId,
          bank_name: "BoursoBank",
          account_name: "Compte courant Bourso",
          account_type: "CHECKING",
          balance: 2450.32,
          currency: "EUR",
          is_mock: true,
          last_sync_at: now,
        },
        {
          user_id: userId,
          bank_name: "Crédit Agricole",
          account_name: "Livret A",
          account_type: "SAVINGS",
          balance: 8200,
          currency: "EUR",
          is_mock: true,
          last_sync_at: now,
        },
      ])
      .select("id, account_type");
    if (accErr || !accounts) throw new Error(accErr?.message ?? "accounts");

    const checking = accounts.find((a) => a.account_type === "CHECKING")!;

    // 4) Transactions (90 days)
    const txs = generateMockTransactions(userId, checking.id);
    if (txs.length) {
      const { error } = await supabaseAdmin.from("transactions").insert(txs);
      if (error) throw new Error(error.message);
    }

    // 5) Budgets (current month)
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const budgetRows = DEFAULT_BUDGETS.map((b) => ({
      user_id: userId,
      year,
      month,
      category: b.category as Category,
      planned_amount: b.amount,
    }));
    await supabaseAdmin.from("budgets").insert(budgetRows);

    // 6) Savings goals
    await supabaseAdmin.from("savings_goals").insert([
      {
        user_id: userId,
        name: "Vacances été",
        emoji: "🏖️",
        target_amount: 2000,
        current_amount: 850,
      },
      {
        user_id: userId,
        name: "Apport appartement",
        emoji: "🏠",
        target_amount: 20000,
        current_amount: 6400,
      },
      {
        user_id: userId,
        name: "Fonds d'urgence",
        emoji: "🛟",
        target_amount: 5000,
        current_amount: 5000,
        is_completed: true,
      },
    ]);

    // 7) Investments
    await supabaseAdmin.from("investments").insert([
      {
        user_id: userId,
        name: "ETF MSCI World",
        type: "ETF",
        invested_amount: 3000,
        current_value: 3420,
        target_amount: 10000,
      },
      {
        user_id: userId,
        name: "PEA — ETF Europe",
        type: "PEA",
        invested_amount: 1500,
        current_value: 1610,
        target_amount: 5000,
      },
      {
        user_id: userId,
        name: "Bitcoin",
        type: "Crypto",
        invested_amount: 500,
        current_value: 420,
        target_amount: 2000,
      },
      {
        user_id: userId,
        name: "Livret A",
        type: "Épargne",
        invested_amount: 8000,
        current_value: 8200,
      },
    ]);

    // 8) Alerts
    await supabaseAdmin.from("alerts").insert([
      {
        user_id: userId,
        type: "BUDGET",
        title: "Budget Alimentation à 92%",
        message: "Vous avez utilisé 92% de votre budget Alimentation ce mois-ci.",
        is_read: false,
      },
      {
        user_id: userId,
        type: "UNEXPECTED",
        title: "Dépense imprévue détectée",
        message: "Une dépense inhabituelle de 200€ a été détectée (Billet train Lyon).",
        is_read: false,
      },
      {
        user_id: userId,
        type: "GOAL",
        title: "🎉 Objectif atteint !",
        message: "Votre fonds d'urgence de 5 000€ est complet. Bravo !",
        is_read: true,
      },
    ]);

    return { email, password };
  },
);
