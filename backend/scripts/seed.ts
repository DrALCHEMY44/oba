import { config } from "dotenv";
import { getDb, closeDb } from "../src/db";
import {
  appSettings,
  charges,
  expenseCategories,
  expenses,
  fineSchedule,
  kitRota,
  members,
  paymentAllocations,
  payments,
} from "../src/db/schema";

config({ path: ".env.local" });

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

function doualaDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("The sample seed is development-only");
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      if ((await tx.select({ id: members.id }).from(members).limit(1)).length) {
        throw new Error("Seed requires an empty members table");
      }

      const people = await tx
        .insert(members)
        .values(
          names.map((fullName) => ({
            fullName,
            joinedAt: "2026-01-04",
          })),
        )
        .returning({ id: members.id });

      const schedules = await tx
        .insert(fineSchedule)
        .values([
          { reasonEn: "Late arrival", reasonFr: "Retard", defaultAmount: 1000 },
          {
            reasonEn: "Missed kit duty",
            reasonFr: "Corvée de maillots manquée",
            defaultAmount: 2500,
          },
          { reasonEn: "Indiscipline", reasonFr: "Indiscipline", defaultAmount: 3000 },
        ])
        .returning({ id: fineSchedule.id });
      const categories = await tx
        .insert(expenseCategories)
        .values([
          { nameEn: "Equipment", nameFr: "Équipement" },
          { nameEn: "Venue", nameFr: "Terrain" },
          { nameEn: "Referees", nameFr: "Arbitres" },
          { nameEn: "Transport", nameFr: "Transport" },
          { nameEn: "Jerseys", nameFr: "Maillots" },
          { nameEn: "Other", nameFr: "Autre" },
        ])
        .returning({ id: expenseCategories.id });
      await tx.insert(appSettings).values({ missedDutyFineScheduleId: schedules[1].id });

      const today = doualaDate(new Date());
      const dues = await tx
        .insert(charges)
        .values(
          people.map((person) => ({
            memberId: person.id,
            type: "dues" as const,
            label: "Cotisation mensuelle / Monthly dues",
            amount: 10_000,
            issuedOn: today,
            dueDate: today,
            issuedBy: "development-seed",
          })),
        )
        .returning({ id: charges.id });
      await tx.insert(charges).values([
        {
          memberId: people[2].id,
          type: "fine",
          label: "Late arrival",
          amount: 1000,
          issuedOn: today,
          dueDate: today,
          fineScheduleId: schedules[0].id,
          issuedBy: "development-seed",
        },
        {
          memberId: people[7].id,
          type: "fine",
          label: "Indiscipline",
          amount: 3000,
          issuedOn: today,
          dueDate: today,
          fineScheduleId: schedules[2].id,
          issuedBy: "development-seed",
        },
      ]);

      for (let i = 0; i < 6; i++) {
        const [payment] = await tx
          .insert(payments)
          .values({
            memberId: people[i].id,
            amount: 5000,
            paidAt: new Date(),
          })
          .returning({ id: payments.id });
        await tx.insert(paymentAllocations).values({
          paymentId: payment.id,
          chargeId: dues[i].id,
          amount: 5000,
        });
      }
      await tx.insert(expenses).values([
        {
          categoryId: categories[0].id,
          amount: 12_000,
          spentAt: new Date(),
          description: "Training balls / Ballons d'entraînement",
        },
        {
          categoryId: categories[1].id,
          amount: 8_000,
          spentAt: new Date(),
          description: "Court hire / Location du terrain",
        },
      ]);

      const nextSunday = new Date(`${today}T12:00:00Z`);
      while (nextSunday.getUTCDay() !== 0) nextSunday.setUTCDate(nextSunday.getUTCDate() + 1);
      await tx.insert(kitRota).values(
        Array.from({ length: 4 }, (_, index) => {
          const date = new Date(nextSunday);
          date.setUTCDate(date.getUTCDate() + index * 7);
          return { dutyDate: doualaDate(date), memberId: people[index].id };
        }),
      );
    });
    console.log("Development seed added 20 fictional members and sample finance records.");
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
