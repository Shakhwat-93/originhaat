import { NextRequest, NextResponse } from 'next/server';

async function handleProxy(request: NextRequest, pathParams: string[]) {
  const targetHost = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!targetHost) {
    return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
  }

  // Force HTTP on backend-to-backend calls to avoid SSL/TLS verification issues with sslip.io
  const backendBase = targetHost.startsWith('https://')
    ? targetHost.replace('https://', 'http://')
    : targetHost;

  const subPath = pathParams.join('/');
  const searchParams = request.nextUrl.search;
  const targetUrl = `${backendBase}/${subPath}${searchParams}`;

  // Clone headers and omit Host header to prevent proxy mismatch
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  let body: any = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      body = await request.arrayBuffer();
    } catch (e) {
      // Request has no body
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // @ts-ignore
      duplex: 'half',
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      resHeaders.set(key, value);
    });

    const resData = await res.arrayBuffer();
    return new NextResponse(resData, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`Supabase Proxy Error forwarding to ${targetUrl}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return handleProxy(request, p.path);
}
