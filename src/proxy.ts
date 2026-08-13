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
    return NextResponse.rewrite(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
