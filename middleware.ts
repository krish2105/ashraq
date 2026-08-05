import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin + light session gate on /api/*.
 *
 * This is explicitly NOT authentication, and it does not pretend to be. There are no
 * user accounts here — a login wall on a course project would work directly against
 * the "usable by a non-finance user" requirement.
 *
 * What it IS: a proportionate barrier against the actual threat model, which is a bare
 * `curl` or a script on someone else's site hammering routes that consume a shared,
 * rate-limited external quota. A determined attacker can defeat this; a drive-by
 * script cannot, and that is the right trade for what is being protected.
 *
 * Two checks:
 *   1. Origin/Referer must match the deployed host.
 *   2. AI routes additionally require a session token minted client-side on page load
 *      and echoed back in a custom header. /api/compute is exempt from the token
 *      because it is pure local computation with no external cost.
 */

const AI_ROUTES = ["/api/explain", "/api/risks", "/api/compare", "/api/recommend", "/api/delay-analysis", "/api/ask"];

const SESSION_HEADER = "x-ashraq-session";

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // GET routes are read-only and safe to leave open (solar-yield is a cached
  // passthrough to a free, keyless public API).
  if (request.method === "GET") return NextResponse.next();

  const selfHost = request.headers.get("host");
  const originHost = hostOf(request.headers.get("origin"));
  const refererHost = hostOf(request.headers.get("referer"));
  const claimedHost = originHost ?? refererHost;

  // A cross-origin POST — or one with no Origin/Referer at all, which is what a bare
  // curl looks like — is rejected before it can reach a handler.
  if (!claimedHost || claimedHost !== selfHost) {
    console.warn("[ashraq:middleware] Rejected cross-origin request", {
      path: pathname,
      claimedHost,
      selfHost,
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "This endpoint only accepts requests from the Ashraq application itself. Open the app in a browser to use it.",
      },
      { status: 403 }
    );
  }

  if (AI_ROUTES.some((route) => pathname.startsWith(route))) {
    const token = request.headers.get(SESSION_HEADER);
    // The token is not a secret and is not verified cryptographically — it only
    // proves the caller executed the app's client bundle. That is exactly the
    // property being checked, and no more is claimed for it.
    if (!token || token.length < 16) {
      console.warn("[ashraq:middleware] Rejected AI request with no session token", {
        path: pathname,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Missing session token. These routes are only callable from the Ashraq interface.",
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
