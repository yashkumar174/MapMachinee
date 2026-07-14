// DEV-ONLY: Auto-login route that bypasses Google sign-in.
// Creates a Firebase custom token for an existing user, which the client
// can use to sign in without a password. DELETE THIS FILE before deploying.

import { NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Your Firebase UID from the database
    const uid = 'zrTfj7c6RENL9XFILB9hv9MqOvF2';

    // Create a custom token (this is an Admin SDK privilege — no password needed)
    const customToken = await adminAuth.createCustomToken(uid);

    // Return an HTML page that auto-signs in using the custom token,
    // exchanges it for a session cookie, and redirects to the dashboard.
    const html = `
<!DOCTYPE html>
<html>
<head><title>Dev Auto-Login</title></head>
<body>
<h2>Signing in...</h2>
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
  import { getAuth, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

  const app = initializeApp({
    apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
    authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  });
  const auth = getAuth(app);

  try {
    const cred = await signInWithCustomToken(auth, "${customToken}");
    const idToken = await cred.user.getIdToken();

    // Exchange for 14-day session cookie
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    // Sync user record
    await fetch('/api/auth/sync', { method: 'POST' });

    document.body.innerHTML = '<h2>✅ Logged in! Redirecting...</h2>';
    window.location.href = '/dashboard';
  } catch (e) {
    document.body.innerHTML = '<h2>❌ Error: ' + e.message + '</h2>';
    console.error(e);
  }
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
