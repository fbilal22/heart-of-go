import { categorize, type Category } from "@/lib/finance";

export type MockBank = {
  id: string;
  name: string;
  shortName: string;
  color: string; // gradient stops
  bg: string;
  initials: string;
  tagline: string;
};

export const MOCK_BANKS: MockBank[] = [
  { id: "bnp", name: "BNP Paribas", shortName: "BNP", color: "from-emerald-600 to-emerald-400", bg: "oklch(0.55 0.13 165)", initials: "BNP", tagline: "Compte courant + Livret A" },
  { id: "ca", name: "Crédit Agricole", shortName: "CA", color: "from-green-700 to-lime-500", bg: "oklch(0.5 0.14 145)", initials: "CA", tagline: "Compte de dépôt" },
  { id: "sg", name: "Société Générale", shortName: "SG", color: "from-red-700 to-red-500", bg: "oklch(0.52 0.18 25)", initials: "SG", tagline: "Compte Sobrio" },
  { id: "lcl", name: "LCL", shortName: "LCL", color: "from-yellow-500 to-amber-400", bg: "oklch(0.75 0.15 85)", initials: "LCL", tagline: "Compte particulier" },
  { id: "ce", name: "Caisse d'Épargne", shortName: "CE", color: "from-rose-600 to-pink-500", bg: "oklch(0.58 0.18 15)", initials: "CE", tagline: "Compte courant" },
  { id: "boursorama", name: "BoursoBank", shortName: "Bourso", color: "from-pink-500 to-fuchsia-500", bg: "oklch(0.6 0.22 350)", initials: "BB", tagline: "Banque en ligne" },
  { id: "revolut", name: "Revolut", shortName: "Revolut", color: "from-slate-800 to-slate-600", bg: "oklch(0.3 0.02 260)", initials: "R", tagline: "Compte multi-devises" },
  { id: "n26", name: "N26", shortName: "N26", color: "from-teal-500 to-cyan-400", bg: "oklch(0.7 0.13 200)", initials: "N26", tagline: "Banque mobile" },
  { id: "fortuneo", name: "Fortuneo", shortName: "Fortuneo", color: "from-blue-700 to-indigo-500", bg: "oklch(0.5 0.18 260)", initials: "F", tagline: "Banque en ligne" },
  { id: "hellobank", name: "Hello bank!", shortName: "Hello", color: "from-cyan-500 to-sky-400", bg: "oklch(0.7 0.14 220)", initials: "H!", tagline: "100% mobile" },
  { id: "monabanq", name: "Monabanq", shortName: "Monabanq", color: "from-orange-600 to-amber-500", bg: "oklch(0.65 0.18 55)", initials: "M", tagline: "Banque en ligne" },
  { id: "axa", name: "Axa Banque", shortName: "Axa", color: "from-blue-900 to-blue-700", bg: "oklch(0.4 0.15 260)", initials: "A", tagline: "Compte courant" },
];

const MERCHANTS: Array<{ label: string; min: number; max: number; recurring?: boolean }> = [
  { label: "Carrefour Market", min: -78, max: -12 },
  { label: "Monoprix", min: -45, max: -8 },
  { label: "Franprix", min: -32, max: -6 },
  { label: "Boulangerie Paul", min: -14, max: -3 },
  { label: "Uber", min: -22, max: -6 },
  { label: "SNCF Connect", min: -120, max: -15 },
  { label: "Navigo", min: -84.1, max: -84.1, recurring: true },
  { label: "Total Énergies", min: -75, max: -40 },
  { label: "Netflix", min: -13.49, max: -13.49, recurring: true },
  { label: "Spotify Premium", min: -10.99, max: -10.99, recurring: true },
  { label: "Apple iCloud", min: -2.99, max: -2.99, recurring: true },
  { label: "Salle de sport Fitness Park", min: -29.95, max: -29.95, recurring: true },
  { label: "Amazon", min: -120, max: -9 },
  { label: "Zara", min: -85, max: -25 },
  { label: "Decathlon", min: -90, max: -15 },
  { label: "Big Mamma", min: -65, max: -28 },
  { label: "Sushi Shop", min: -32, max: -15 },
  { label: "Le Zinc Café", min: -18, max: -6 },
  { label: "Cinéma UGC", min: -13.5, max: -10 },
  { label: "Pharmacie de la Mairie", min: -28, max: -5 },
  { label: "Loyer appartement", min: -1150, max: -1150, recurring: true },
  { label: "EDF", min: -68, max: -42, recurring: true },
  { label: "Free Mobile", min: -19.99, max: -19.99, recurring: true },
  { label: "Assurance habitation MAIF", min: -22.4, max: -22.4, recurring: true },
  { label: "FNAC", min: -55, max: -12 },
  { label: "Ikea", min: -210, max: -30 },
  { label: "Picard", min: -42, max: -12 },
  { label: "Biocoop", min: -55, max: -18 },
];

const INCOME: Array<{ label: string; amount: number; day: number }> = [
  { label: "Salaire Acme Corp", amount: 2850, day: 28 },
  { label: "Remboursement Sécu", amount: 47.5, day: 12 },
];

export type GeneratedTx = {
  amount: number;
  label: string;
  category: Category;
  transaction_date: string;
  is_recurring: boolean;
  is_unexpected: boolean;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate ~3 months of realistic transactions for a mock bank.
 */
export function generateMockTransactions(bankId: string, months = 3): GeneratedTx[] {
  const txs: GeneratedTx[] = [];
  const today = new Date();
  const seed = bankId.length; // tiny variation per bank

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    // Income (recurring)
    for (const inc of INCOME) {
      const day = Math.min(inc.day, daysInMonth);
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      if (d > today) continue;
      txs.push({
        amount: inc.amount + (inc.label.includes("Salaire") ? 0 : rand(-5, 5)),
        label: inc.label,
        category: categorize(inc.label).category,
        transaction_date: d.toISOString().slice(0, 10),
        is_recurring: true,
        is_unexpected: false,
      });
    }

    // Expenses
    const count = 28 + Math.floor(rand(0, 10)) + (seed % 4);
    for (let i = 0; i < count; i++) {
      const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      if (d > today) continue;
      const amount = merchant.min === merchant.max ? merchant.min : rand(merchant.min, merchant.max);
      const isUnexpected = !merchant.recurring && Math.abs(amount) > 150 && Math.random() < 0.3;
      txs.push({
        amount: Math.round(amount * 100) / 100,
        label: merchant.label,
        category: categorize(merchant.label).category,
        transaction_date: d.toISOString().slice(0, 10),
        is_recurring: !!merchant.recurring,
        is_unexpected: isUnexpected,
      });
    }
  }

  // Starting balance estimate
  return txs.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
}

export function estimateBalance(txs: GeneratedTx[], startingBalance = 1800): number {
  const sum = txs.reduce((s, t) => s + t.amount, 0);
  return Math.round((startingBalance + sum) * 100) / 100;
}
