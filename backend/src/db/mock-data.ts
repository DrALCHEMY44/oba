// Fictional demonstration records used only when DATABASE_URL is absent.
const names = [
  "Amina Meka",
  "Benoît Nguimfack",
  "Carine Ewane",
  "David Talla",
  "Estelle Ngono",
  "Fabrice Mbarga",
  "Grâce Fonkou",
  "Hervé Simo",
  "Inès Mvondo",
  "Jean Moundi",
  "Kariné Ndam",
  "Lionel Essomba",
  "Mireille Tchuente",
  "Nathan Fomba",
  "Olivia Ndzie",
  "Patrick Mbele",
  "Rose Njoume",
  "Samuel Ebong",
  "Thérèse Fopa",
  "Yannick Biko",
];
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = (offset: number) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};
const instant = (offset: number) => new Date(`${date(offset)}T11:00:00Z`);
const sunday = (week: number) => {
  const value = new Date(`${date(0)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + ((7 - value.getUTCDay()) % 7) + week * 7);
  return value.toISOString().slice(0, 10);
};
export const categories = [
  { id: uid(100), nameEn: "Equipment", nameFr: "Équipement" },
  { id: uid(101), nameEn: "Venue", nameFr: "Terrain" },
  { id: uid(102), nameEn: "Referees", nameFr: "Arbitres" },
  { id: uid(103), nameEn: "Transport", nameFr: "Transport" },
  { id: uid(104), nameEn: "Jerseys", nameFr: "Maillots" },
  { id: uid(105), nameEn: "Other", nameFr: "Autre" },
];
type MockCharge = {
  id: string;
  memberId: string;
  type: "dues" | "fine";
  label: string;
  amount: number;
  paidAmount: number;
  issuedOn: string;
  dueDate: string;
  reasonEn: string | null;
  reasonFr: string | null;
};
export const fineReasons = [
  { id: uid(600), reasonEn: "Late arrival", reasonFr: "Retard", defaultAmount: 1000 },
  {
    id: uid(601),
    reasonEn: "Missed kit duty",
    reasonFr: "Corvée de maillots manquée",
    defaultAmount: 2500,
  },
  { id: uid(602), reasonEn: "Indiscipline", reasonFr: "Indiscipline", defaultAmount: 3000 },
];
export const charges: MockCharge[] = [
  ...names.map((_, index) => ({
    id: uid(200 + index),
    memberId: uid(index + 1),
    type: "dues" as const,
    label: "Cotisation mensuelle / Monthly dues",
    amount: 10000,
    paidAmount: index < 4 ? 10000 : index < 10 ? 5000 : 0,
    issuedOn: date(-150),
    dueDate: date(-7),
    reasonEn: null,
    reasonFr: null,
  })),
  {
    id: uid(250),
    memberId: uid(3),
    type: "fine" as const,
    label: "Late arrival",
    amount: 1000,
    paidAmount: 0,
    issuedOn: date(-11),
    dueDate: date(-4),
    reasonEn: "Late arrival",
    reasonFr: "Retard",
  },
  {
    id: uid(251),
    memberId: uid(8),
    type: "fine" as const,
    label: "Indiscipline",
    amount: 3000,
    paidAmount: 1000,
    issuedOn: date(-15),
    dueDate: date(-8),
    reasonEn: "Indiscipline",
    reasonFr: "Indiscipline",
  },
];
export const payments = names
  .slice(0, 10)
  .map((_, index) => ({
    id: uid(300 + index),
    memberId: uid(index + 1),
    amount: index < 4 ? 10000 : 5000,
    paidAt: instant(-index * 12 - 1),
    receiptNumber: String(index + 1),
  }))
  .concat([
    { id: uid(310), memberId: uid(8), amount: 1000, paidAt: instant(-2), receiptNumber: "11" },
  ]);
export const expenses = [
  {
    id: uid(400),
    spentAt: instant(-2),
    amount: 12000,
    description: "Training balls / Ballons d’entraînement",
    categoryId: uid(100),
    categoryEn: "Equipment",
    categoryFr: "Équipement",
    receiptUrl: null,
  },
  {
    id: uid(401),
    spentAt: instant(-9),
    amount: 8000,
    description: "Court hire / Location du terrain",
    categoryId: uid(101),
    categoryEn: "Venue",
    categoryFr: "Terrain",
    receiptUrl: null,
  },
  {
    id: uid(402),
    spentAt: instant(-18),
    amount: 5000,
    description: "Match referees / Arbitres du match",
    categoryId: uid(102),
    categoryEn: "Referees",
    categoryFr: "Arbitres",
    receiptUrl: null,
  },
  {
    id: uid(403),
    spentAt: instant(-35),
    amount: 6500,
    description: "Away match transport / Transport",
    categoryId: uid(103),
    categoryEn: "Transport",
    categoryFr: "Transport",
    receiptUrl: null,
  },
  {
    id: uid(404),
    spentAt: instant(-48),
    amount: 15000,
    description: "Practice jerseys / Maillots d’entraînement",
    categoryId: uid(104),
    categoryEn: "Jerseys",
    categoryFr: "Maillots",
    receiptUrl: null,
  },
];
export const duties = Array.from({ length: 12 }, (_, index) => ({
  id: uid(500 + index),
  dutyDate: sunday(index - 3),
  status: index < 2 ? "done" : index === 2 ? "missed" : "scheduled",
  notes: null as string | null,
  memberName: names[index],
  swappedWith: null as string | null,
  memberId: uid(index + 1),
}));
export const members = names.map((fullName, index) => {
  const own = charges.filter((charge) => charge.memberId === uid(index + 1));
  const duesOutstanding = own
    .filter((charge) => charge.type === "dues")
    .reduce((sum, charge) => sum + charge.amount - charge.paidAmount, 0);
  const finesOutstanding = own
    .filter((charge) => charge.type === "fine")
    .reduce((sum, charge) => sum + charge.amount - charge.paidAmount, 0);
  const outstandingAmount = duesOutstanding + finesOutstanding;
  return {
    id: uid(index + 1),
    fullName,
    joinedAt: date(-180 - index * 3),
    isActive: index !== 19,
    outstandingAmount,
    duesOutstanding,
    finesOutstanding,
    status:
      outstandingAmount === 0
        ? ("up_to_date" as const)
        : own.some((charge) => charge.paidAmount > 0)
          ? ("partial" as const)
          : ("overdue" as const),
  };
});
export const financeTotals = {
  totalCollected: payments.reduce((sum, payment) => sum + payment.amount, 0),
  totalSpent: expenses.reduce((sum, expense) => sum + expense.amount, 0),
  totalOutstanding: charges.reduce((sum, charge) => sum + charge.amount - charge.paidAmount, 0),
  duesCollected: charges
    .filter((charge) => charge.type === "dues")
    .reduce((sum, charge) => sum + charge.paidAmount, 0),
  finesCollected: charges
    .filter((charge) => charge.type === "fine")
    .reduce((sum, charge) => sum + charge.paidAmount, 0),
  get balance() {
    return this.totalCollected - this.totalSpent;
  },
};
export const monthlyCashFlow = [
  ...new Set([
    ...payments.map((payment) => payment.paidAt.toISOString().slice(0, 7)),
    ...expenses.map((expense) => expense.spentAt.toISOString().slice(0, 7)),
  ]),
]
  .sort()
  .map((key) => ({
    month: `${key}-01`,
    collected: payments
      .filter((payment) => payment.paidAt.toISOString().startsWith(key))
      .reduce((sum, payment) => sum + payment.amount, 0),
    spent: expenses
      .filter((expense) => expense.spentAt.toISOString().startsWith(key))
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
export const expensesByCategory = categories.map((category) => ({
  categoryId: category.id,
  nameEn: category.nameEn,
  nameFr: category.nameFr,
  totalSpent: expenses
    .filter((expense) => expense.categoryId === category.id)
    .reduce((sum, expense) => sum + expense.amount, 0),
}));
export function memberDetails(id: string) {
  return {
    member: members.find((member) => member.id === id) ?? null,
    charges: charges
      .filter((charge) => charge.memberId === id)
      .map((charge) => ({ ...charge, outstandingAmount: charge.amount - charge.paidAmount })),
    payments: payments
      .filter((payment) => payment.memberId === id)
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime()),
    duties: duties
      .filter((duty) => duty.memberId === id)
      .map(({ dutyDate, status, notes }) => ({ dutyDate, status, notes })),
  };
}
