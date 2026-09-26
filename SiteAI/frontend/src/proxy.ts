import {
  NextRequest,
  NextResponse,
} from "next/server";

function normalizeHost(
  host: string,
) {
  return host
    .toLowerCase()
    .split(":")[0]
    .trim();
}

function isSiteAIDomain(
  host: string,
) {
  if (
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return true;
  }

  if (
    host ===
    "site-ai-izjx.vercel.app"
  ) {
    return true;
  }

  if (
    host.endsWith(
      ".vercel.app",
    )
  ) {
    return true;
  }

  return false;
}

export function proxy(
  request: NextRequest,
) {
  const host =
    normalizeHost(
      request.headers.get(
        "host",
      ) ?? "",
    );

  if (!host) {
    return NextResponse.next();
  }

  if (
    isSiteAIDomain(host)
  ) {
    return NextResponse.next();
  }

  const url =
    request.nextUrl.clone();

  url.pathname =
    `/domain/${encodeURIComponent(
      host,
    )}`;

  return NextResponse.rewrite(
    url,
  );
}

export const config = {
  matcher: ["/"],
};