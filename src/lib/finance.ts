import {
  Home,
  Bus,
  UtensilsCrossed,
  HeartPulse,
  Film,
  ShoppingBag,
  PiggyBank,
  TrendingUp,
  Wallet,
  Repeat,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  "HOUSING","TRANSPORT","FOOD","HEALTH","ENTERTAINMENT","SHOPPING",
  "SAVINGS","INVESTMENT","SALARY","SUBSCRIPTION","OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; color: string }> = {
  HOUSING: { label: "Logement", icon: Home, color: "oklch(0.55 0.13 175)" },
  TRANSPORT: { label: "Transport", icon: Bus, color: "oklch(0.65 0.15 230)" },
  FOOD: { label: "Alimentation", icon: UtensilsCrossed, color: "oklch(0.7 0.16 50)" },
  HEALTH: { label: "Santé", icon: HeartPulse, color: "oklch(0.65 0.18 25)" },
  ENTERTAINMENT: { label: "Loisirs", icon: Film, color: "oklch(0.6 0.18 305)" },
  SHOPPING: { label: "Shopping", icon: ShoppingBag, color: "oklch(0.7 0.16 340)" },
  SAVINGS: { label: "Épargne", icon: PiggyBank, color: "oklch(0.65 0.16 155)" },
  INVESTMENT: { label: "Investissement", icon: TrendingUp, color: "oklch(0.55 0.13 175)" },
  SALARY: { label: "Salaire", icon: Wallet, color: "oklch(0.65 0.16 155)" },
  SUBSCRIPTION: { label: "Abonnement", icon: Repeat, color: "oklch(0.6 0.12 260)" },
  OTHER: { label: "Autre", icon: CircleHelp, color: "oklch(0.6 0.02 240)" },
};

const RULES: Record<Category, string[]> = {
  HOUSING: ["loyer","syndic","eau","electricite","edf","gaz","engie","internet","sfr","orange","free","bouygues","assurance habitation"],
  TRANSPORT: ["sncf","ratp","navigo","uber","bolt","heetch","total","bp","esso","parking","velib","cityscoot","air france","easyjet","train"],
  FOOD: ["carrefour","leclerc","franprix","monoprix","lidl","aldi","picard","casino","intermarche","super u","biocoop","naturalia"],
  HEALTH: ["pharmacie","medecin","docteur","dentiste","opticien","kine","mutuelle","secu","clinique","hopital"],
  ENTERTAINMENT: ["cinema","fnac","restaurant","bar","sushi","pizza","brasserie","cafe","concert","theatre","le zinc","big mamma","paul"],
  SHOPPING: ["zara","h&m","uniqlo","asos","amazon","cdiscount","darty","boulanger","ikea","maisons du monde"],
  SUBSCRIPTION: ["netflix","disney","canal","amazon prime","spotify","apple","google","microsoft","adobe","abonnement","salle de sport","fitarena","fitness"],
  SALARY: ["salaire","virement employeur","paie","remuneration","honoraires"],
  SAVINGS: ["livret","epargne","pel","cel","assurance vie"],
  INVESTMENT: ["bourse","pea","cto","etf","trade republic","bforbank","boursorama invest"],
  OTHER: [],
};

export function categorize(label: string): { category: Category; confidence: number } {
  const normalized = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [cat, keywords] of Object.entries(RULES) as [Category, string[]][]) {
    for (const k of keywords) if (k && normalized.includes(k)) return { category: cat, confidence: 0.85 };
  }
  return { category: "OTHER", confidence: 0.5 };
}

export function formatEUR(value: number, opts: { sign?: boolean } = {}) {
  const v = Number(value || 0);
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
  }).format(Math.abs(v));
  if (opts.sign) return v >= 0 ? `+${formatted}` : `-${formatted}`;
  return v < 0 ? `-${formatted}` : formatted;
}

export function calculateHealthScore(data: {
  totalIncome: number; totalExpenses: number; unexpectedExpenses: number;
  budgetExceededCategories: number; savingsAmount: number;
}) {
  let score = 100;
  let mainIssue: string | null = null;
  const savingsRate = data.totalIncome > 0 ? data.savingsAmount / data.totalIncome : 0;
  if (data.totalExpenses > data.totalIncome) { score -= 40; mainIssue = "Vos dépenses dépassent vos revenus ce mois-ci"; }
  if (savingsRate < 0.05) { score -= 25; if (!mainIssue) mainIssue = `Taux d'épargne très faible (${Math.round(savingsRate * 100)}%)`; }
  else if (savingsRate < 0.1) { score -= 10; }
  if (data.totalIncome > 0 && data.unexpectedExpenses > data.totalIncome * 0.15) { score -= 15; if (!mainIssue) mainIssue = "Beaucoup de dépenses imprévues ce mois"; }
  if (data.budgetExceededCategories >= 3) { score -= 15; if (!mainIssue) mainIssue = `${data.budgetExceededCategories} budgets dépassés`; }
  else if (data.budgetExceededCategories >= 1) { score -= 8; }
  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? "Excellente gestion" : score >= 60 ? "Bonne gestion" : score >= 40 ? "À améliorer" : "Situation difficile";
  const tone = score >= 80 ? "success" : score >= 60 ? "primary" : score >= 40 ? "warning" : "destructive";
  return { score, label, tone, mainIssue, savingsRate };
}

export type Transaction = {
  user_id: string; account_id: string; amount: number; label: string;
  category: Category; is_recurring: boolean; is_unexpected: boolean; transaction_date: string;
};

export function generateMockTransactions(userId: string, accountId: string): Transaction[] {
  const out: Transaction[] = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const day = d.getDate(); const month = d.getMonth();
    const dateStr = d.toISOString().split("T")[0];
    if (day === 28) out.push({ user_id: userId, account_id: accountId, amount: 2800, label: "Virement Salaire Employeur", category: "SALARY", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
    if (day === 1) out.push({ user_id: userId, account_id: accountId, amount: -950, label: "Loyer Appartement", category: "HOUSING", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
    if (day === 5) out.push({ user_id: userId, account_id: accountId, amount: -90, label: "RATP Navigo Mensuel", category: "TRANSPORT", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
    if (day === 10) {
      out.push({ user_id: userId, account_id: accountId, amount: -13.99, label: "Netflix", category: "SUBSCRIPTION", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
      out.push({ user_id: userId, account_id: accountId, amount: -9.99, label: "Spotify", category: "SUBSCRIPTION", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
      out.push({ user_id: userId, account_id: accountId, amount: -29.99, label: "Salle de sport FitArena", category: "SUBSCRIPTION", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
    }
    if (day % 3 === 0) {
      const m = [-42,-67,-38,-55,-71,-29,-83]; const e = ["Carrefour","Monoprix","Franprix","Lidl","Casino"];
      out.push({ user_id: userId, account_id: accountId, amount: m[day % m.length], label: e[day % e.length], category: "FOOD", is_recurring: false, is_unexpected: false, transaction_date: dateStr });
    }
    if (day % 7 === 3) {
      const r = ["Restaurant Le Zinc","Sushi Shop","Big Mamma","Paul Boulangerie"];
      out.push({ user_id: userId, account_id: accountId, amount: -(((day*7) % 30) + 15), label: r[day % r.length], category: "ENTERTAINMENT", is_recurring: false, is_unexpected: false, transaction_date: dateStr });
    }
    if (day === 17 && month % 2 === 0) {
      const imp: Array<{amount:number;label:string;category:Category}> = [
        { amount:-45, label:"Pharmacie Centrale", category:"HEALTH" },
        { amount:-120, label:"Zara Vêtements", category:"SHOPPING" },
        { amount:-85, label:"Réparation vélo", category:"OTHER" },
        { amount:-200, label:"Billet train Lyon", category:"TRANSPORT" },
      ];
      const x = imp[month % imp.length];
      out.push({ user_id: userId, account_id: accountId, amount: x.amount, label: x.label, category: x.category, is_recurring: false, is_unexpected: true, transaction_date: dateStr });
    }
    if (day === 29) out.push({ user_id: userId, account_id: accountId, amount: -200, label: "Virement Livret Épargne", category: "SAVINGS", is_recurring: true, is_unexpected: false, transaction_date: dateStr });
  }
  return out;
}

export const DEFAULT_BUDGETS: Array<{ category: Category; amount: number }> = [
  { category: "HOUSING", amount: 950 },
  { category: "FOOD", amount: 400 },
  { category: "TRANSPORT", amount: 120 },
  { category: "ENTERTAINMENT", amount: 150 },
  { category: "SHOPPING", amount: 150 },
  { category: "SUBSCRIPTION", amount: 60 },
  { category: "HEALTH", amount: 50 },
];

export const RISK_QUESTIONS = [
  { id: "horizon", question: "Sur quel horizon souhaitez-vous investir ?", options: [
    { label: "Moins de 2 ans", score: 1 },{ label: "2 à 5 ans", score: 2 },{ label: "5 à 10 ans", score: 3 },{ label: "Plus de 10 ans", score: 4 }] },
  { id: "loss", question: "Si votre placement perdait 20% en un mois, vous feriez quoi ?", options: [
    { label: "Je vends tout immédiatement", score: 1 },{ label: "Je vends une partie", score: 2 },{ label: "Je ne fais rien et j'attends", score: 3 },{ label: "J'en achète plus, c'est une opportunité", score: 4 }] },
  { id: "experience", question: "Quelle est votre expérience en placements ?", options: [
    { label: "Aucune", score: 1 },{ label: "Livret A et fonds euros", score: 2 },{ label: "ETF et actions de temps en temps", score: 3 },{ label: "Je suis investisseur actif", score: 4 }] },
  { id: "goal", question: "Quel est votre objectif principal ?", options: [
    { label: "Préserver mon capital", score: 1 },{ label: "Obtenir un revenu régulier", score: 2 },{ label: "Faire croître mon capital", score: 3 },{ label: "Maximiser la performance long terme", score: 4 }] },
] as const;

export function scoreToRiskLevel(score: number): "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" {
  if (score <= 8) return "CONSERVATIVE";
  if (score <= 12) return "MODERATE";
  return "AGGRESSIVE";
}

export const INVESTMENT_PRODUCTS = {
  CONSERVATIVE: [
    { name: "Livret A", type: "Épargne réglementée", yield: "3,0%", risk: 1, description: "Capital garanti, disponible à tout moment, plafond 22 950€." },
    { name: "LDDS", type: "Épargne réglementée", yield: "3,0%", risk: 1, description: "Livret de Développement Durable, plafond 12 000€." },
    { name: "Fonds euros (Assurance Vie)", type: "Assurance vie", yield: "2,5–3%", risk: 2, description: "Capital garanti, fiscalité avantageuse après 8 ans." },
    { name: "ETF Obligataire Euro", type: "ETF", yield: "~3,5%", risk: 2, description: "Diversifié sur des obligations européennes de qualité." },
  ],
  MODERATE: [
    { name: "ETF MSCI World", type: "ETF", yield: "~7%/an*", risk: 3, description: "1 600 entreprises mondiales, frais réduits, idéal long terme." },
    { name: "Assurance Vie multisupport", type: "Assurance vie", yield: "Variable", risk: 3, description: "Mix fonds euros + unités de compte, fiscalité douce." },
    { name: "PEA — ETF Europe", type: "PEA", yield: "~6%/an*", risk: 3, description: "Exonération d'impôt sur les gains après 5 ans." },
    { name: "SCPI", type: "Immobilier", yield: "~4,5%", risk: 3, description: "Pierre-papier, revenus locatifs trimestriels." },
  ],
  AGGRESSIVE: [
    { name: "ETF MSCI Emerging Markets", type: "ETF", yield: "~8%/an*", risk: 4, description: "Forte croissance attendue, volatilité élevée." },
    { name: "ETF Nasdaq 100", type: "ETF", yield: "~10%/an*", risk: 4, description: "Tech US, performance historique élevée mais volatile." },
    { name: "Actions individuelles", type: "PEA / CTO", yield: "Variable", risk: 4, description: "Sélection de valeurs, demande du temps et de l'analyse." },
    { name: "Crypto (BTC / ETH)", type: "Crypto", yield: "Très variable", risk: 4, description: "À limiter à 5–10% du portefeuille, très volatil." },
  ],
} as const;
