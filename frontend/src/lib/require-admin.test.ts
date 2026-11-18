import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("./auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

import { auth } from "./auth";
import { requireAdmin } from "./require-admin";

describe("admin write guard", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects unauthenticated actions", async () => {
    vi.mocked(auth!.api.getSession).mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects sessions belonging to anyone other than the treasurer", async () => {
    vi.mocked(auth!.api.getSession).mockResolvedValue({
      user: { id: "visitor" },
      session: { id: "session", expiresAt: new Date(Date.now() + 60_000) },
    } as Awaited<ReturnType<NonNullable<typeof auth>["api"]["getSession"]>>);
    await expect(requireAdmin()).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects an expired treasurer session", async () => {
    vi.mocked(auth!.api.getSession).mockResolvedValue({
      user: { id: "treasurer" },
      session: { id: "session", expiresAt: new Date(Date.now() - 60_000) },
    } as Awaited<ReturnType<NonNullable<typeof auth>["api"]["getSession"]>>);
    await expect(requireAdmin()).rejects.toThrow("UNAUTHORIZED");
  });

  it("allows a valid treasurer session", async () => {
    const session = {
      user: { id: "treasurer" },
      session: { id: "session", expiresAt: new Date(Date.now() + 60_000) },
    } as Awaited<ReturnType<NonNullable<typeof auth>["api"]["getSession"]>>;
    vi.mocked(auth!.api.getSession).mockResolvedValue(session);
    await expect(requireAdmin()).resolves.toBe(session);
  });
});
