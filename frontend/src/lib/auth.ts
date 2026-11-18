import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins";
import { getDb } from "@oba/backend/db";
import * as authSchema from "@oba/backend/auth-schema";

export const auth =
  process.env.DATABASE_URL &&
  process.env.BETTER_AUTH_URL &&
  (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32
    ? betterAuth({
        appName: "Association finances",
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),
        emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
        session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
        rateLimit: {
          enabled: true,
          storage: "database",
          window: 60,
          max: 30,
          customRules: { "/sign-in/email": { window: 60, max: 5 } },
        },
        plugins: [twoFactor({ issuer: "Association finances" })],
      })
    : null;
