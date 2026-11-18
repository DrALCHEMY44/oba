import { auth } from "@/lib/auth";

async function handler(request: Request) {
  if (!auth) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  const response = await auth.handler(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export { handler as GET, handler as POST };
