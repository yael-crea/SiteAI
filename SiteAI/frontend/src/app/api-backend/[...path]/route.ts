import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendURL() {
  const backendURL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080";

  return backendURL.replace(/\/$/, "");
}

async function proxyRequest(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  try {
    const { path } = await context.params;

    const backendURL = getBackendURL();

    const targetURL = new URL(
      `${backendURL}/${path.join("/")}`,
    );

    request.nextUrl.searchParams.forEach(
      (value, key) => {
        targetURL.searchParams.append(
          key,
          value,
        );
      },
    );

    const headers =
      new Headers();

    const authorization =
      request.headers.get(
        "authorization",
      );

    const contentType =
      request.headers.get(
        "content-type",
      );

    const accept =
      request.headers.get(
        "accept",
      );

    if (authorization) {
      headers.set(
        "Authorization",
        authorization,
      );
    }

    if (contentType) {
      headers.set(
        "Content-Type",
        contentType,
      );
    }

    if (accept) {
      headers.set(
        "Accept",
        accept,
      );
    }

    let body:
      | ArrayBuffer
      | undefined;

    if (
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {
      body =
        await request.arrayBuffer();
    }

    const backendResponse =
      await fetch(
        targetURL.toString(),
        {
          method:
            request.method,
          headers,
          body:
            body &&
            body.byteLength > 0
              ? body
              : undefined,
          cache: "no-store",
          redirect: "manual",
        },
      );

    const responseBody =
      await backendResponse.arrayBuffer();

    const responseHeaders =
      new Headers();

    const backendContentType =
      backendResponse.headers.get(
        "content-type",
      );

    if (backendContentType) {
      responseHeaders.set(
        "Content-Type",
        backendContentType,
      );
    }

    const location =
      backendResponse.headers.get(
        "location",
      );

    if (location) {
      responseHeaders.set(
        "Location",
        location,
      );
    }

    responseHeaders.set(
      "Cache-Control",
      "no-store",
    );

    return new Response(
      responseBody,
      {
        status:
          backendResponse.status,
        statusText:
          backendResponse.statusText,
        headers:
          responseHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Erreur proxy backend :",
      error,
    );

    return new Response(
      "Impossible de contacter le backend.",
      {
        status: 502,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
        },
      },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function OPTIONS(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return proxyRequest(
    request,
    context,
  );
}