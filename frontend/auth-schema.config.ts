import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

// Used only by the schema generator; runtime configuration is in src/lib/auth.ts.
export const auth = betterAuth({
  emailAndPassword: { enabled: true, disableSignUp: true },
  rateLimit: { enabled: true, storage: "database" },
  plugins: [twoFactor({ issuer: "Association finances" })],
});
