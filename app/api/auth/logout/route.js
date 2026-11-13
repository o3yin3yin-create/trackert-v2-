import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const response = NextResponse.json({ success: true }, { headers: getCorsHeaders(req) });
  
  response.headers.append(
    'Set-Cookie',
    '__bokra_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );
  response.headers.append(
    'Set-Cookie',
    '__session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );

  return response;
}
