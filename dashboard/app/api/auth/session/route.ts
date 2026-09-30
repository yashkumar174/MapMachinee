import { NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { authLimiter, getClientIp } from '../../../../lib/ratelimit';

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limiting (authLimiter — 5/min per IP).
    // Throttles brute-force attempts against the session-cookie issuer.
    const ip = getClientIp(request);
    const { success } = await authLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ success: false, error: 'idToken is required' }, { status: 400 });
    }

    // Set session expiration to 14 days.
    const expiresIn = 60 * 60 * 24 * 14 * 1000;

    // Create the session cookie. This will also verify the ID token in the process.
    // The session cookie will have the same claims as the ID token.
    // Retry once on transient network failures ("fetch failed") reaching Google.
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    } catch (err: any) {
      if (isAuthError(err)) throw err;
      console.warn('createSessionCookie network error, retrying once:', err?.message, err?.cause ?? '');
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    }

    // Set the cookie securely on the Next.js server response
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Log the underlying cause — "fetch failed" alone hides the real network error.
    console.error('Error creating session cookie:', error?.message, error?.cause ?? '');
    // Only a rejected token is a 401; network/backend failures are 503.
    const status = isAuthError(error) ? 401 : 503;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

function isAuthError(err: any): boolean {
  const code = err?.code ?? err?.errorInfo?.code;
  return typeof code === 'string' && code.startsWith('auth/');
}
