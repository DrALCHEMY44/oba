import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";
import { isTreasurerSession } from "./lib/admin-access";

const internationalize = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(fr|en)\/admin(?:\/|$)/);
  if (match && process.env.DATABASE_URL) {
    const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
    if (!isTreasurerSession(session)) {
      const response = NextResponse.redirect(new URL(`/${match[1]}/login`, request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  const response = internationalize(request);
  if (match || /^\/(fr|en)\/login$/.test(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}
export const config = { matcher: "/((?!api|_next|_vercel|.*\\..*).*)" };
