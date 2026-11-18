import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { closeDb, getDb } from "@oba/backend/db";
import { account, user } from "@oba/backend/auth-schema";
import { auditLog } from "@oba/backend/schema";

config({ path: [".env.local", "../backend/.env.local"] });

async function main() {
  const parsed = z
    .object({
      ADMIN_EMAIL: z.email(),
      ADMIN_PASSWORD: z.string().min(12).max(128),
    })
    .safeParse(process.env);
  if (!parsed.success)
    throw new Error("Set ADMIN_EMAIL and a 12–128 character ADMIN_PASSWORD before running setup.");
  const password = await hashPassword(parsed.data.ADMIN_PASSWORD);
  try {
    await getDb().transaction(async (tx) => {
      if ((await tx.select({ id: user.id }).from(user).limit(1)).length) {
        throw new Error("An admin account already exists. Setup does not overwrite accounts.");
      }
      const now = new Date();
      await tx.insert(user).values({
        id: "treasurer",
        name: "Treasurer",
        email: parsed.data.ADMIN_EMAIL.toLowerCase(),
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: "treasurer",
        providerId: "credential",
        userId: "treasurer",
        password,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(auditLog).values({
        actorId: "treasurer",
        action: "create",
        tableName: "user",
        recordId: "treasurer",
        newValues: { id: "treasurer" },
      });
    });
    console.log(
      "Treasurer account created. Remove ADMIN_PASSWORD from your environment after setup.",
    );
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error &&
    (error.message.startsWith("Set ADMIN_EMAIL") || error.message.startsWith("An admin account"))
      ? error.message
      : "Admin setup failed. Check DATABASE_URL and apply the migrations first.";
  console.error(message);
  process.exitCode = 1;
});
