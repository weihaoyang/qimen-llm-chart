import { NextResponse, type NextRequest } from "next/server";
import { isPaipanHost } from "@/lib/product-host";

/**
 * `paipan.singseq.com/` is the public root of the professional chart product.
 * The rewrite is server-side, so the address bar stays clean and no client-side
 * redirect can briefly render the Agent product on the wrong domain.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && isPaipanHost(request.headers.get("host"))) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/paipan";
    // Rewrites must remain same-origin.  `request.nextUrl` can inherit the
    // forwarded HTTPS scheme from Nginx even though the Next process listens
    // on plain HTTP, which would make the internal proxy attempt TLS to itself.
    destination.protocol = "http:";
    destination.host = "127.0.0.1:3002";
    return NextResponse.rewrite(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
