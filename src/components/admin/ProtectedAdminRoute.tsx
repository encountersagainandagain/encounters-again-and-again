'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'not-configured' | 'unauthorized';

export function ProtectedAdminRoute({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'not-configured'
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // A session can briefly report as missing during a token refresh (a
    // backgrounded tab whose access token just expired, or a refresh token
    // already rotated by another open admin tab). Give it one grace-period
    // recheck before signing the admin out, so a transient blip doesn't
    // yank someone out of an in-progress post. An explicit sign-out (below)
    // bypasses this and stays instant.
    let pendingSignOutTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearPendingSignOut = () => {
      if (pendingSignOutTimeout) {
        clearTimeout(pendingSignOutTimeout);
        pendingSignOutTimeout = null;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setAuthStatus('guest');
        return;
      }

      setAuthStatus(
        isAllowedAdminEmail(data.session.user.email) ? 'authenticated' : 'unauthorized'
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearPendingSignOut();
        setAuthStatus(isAllowedAdminEmail(session.user.email) ? 'authenticated' : 'unauthorized');
        return;
      }

      clearPendingSignOut();
      pendingSignOutTimeout = setTimeout(() => {
        if (!supabase) return;

        supabase.auth.getSession().then(({ data: recheck }) => {
          if (!recheck.session) {
            setAuthStatus('guest');
            return;
          }

          setAuthStatus(
            isAllowedAdminEmail(recheck.session.user.email) ? 'authenticated' : 'unauthorized'
          );
        });
      }, 2000);
    });

    return () => {
      clearPendingSignOut();
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStatus === 'guest' || authStatus === 'not-configured') {
      router.replace('/admin/login');
    }
  }, [authStatus, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthStatus('guest');
  };

  if (!isSupabaseConfigured || authStatus === 'not-configured') {
    return null;
  }

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 pt-20">
        <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
          Checking session...
        </p>
      </div>
    );
  }

  if (authStatus === 'guest') {
    return null;
  }

  if (authStatus === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 pt-20 text-center">
        <div className="max-w-md">
          <p className="mb-4 font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Admin access
          </p>
          <h1 className="mb-4 font-display text-4xl text-black">Not allowed</h1>
          <p className="font-body text-base leading-relaxed text-black/60">
            This account is signed in, but it is not approved for the admin panel.
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="btn-ocean mt-6"
          >
            Sign out and try another account
          </button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
}
