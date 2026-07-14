import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  // Also clear the old fb_token just in case
  response.cookies.set('fb_token', '', {
    maxAge: 0,
    path: '/',
  });
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.set('session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('fb_token', '', {
    maxAge: 0,
    path: '/',
  });
  return response;
}
