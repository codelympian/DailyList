import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Where Supabase sends people back after Google (or an emailed link).
 *
 * Exchanges the one-time code for a session and writes the auth cookies, so
 * the browser lands on the dashboard already signed in. Runs on the server
 * because the exchange must not be visible to page JavaScript.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Supabase reports provider failures (declined consent, misconfiguration)
  // as query params rather than an exception.
  const error = searchParams.get('error_description') ?? searchParams.get('error');
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Sign-in was cancelled')}`,
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Could not complete sign-in. Please try again.')}`,
    );
  }

  return response;
}
