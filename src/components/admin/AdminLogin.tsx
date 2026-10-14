'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/adminAccess';

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && await hasAdminAccess()) {
        router.replace('/admin');
      }
    }).catch(() => setErrorMessage('Administrator permissions could not be checked.'));
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Supabase is not configured yet.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace('/admin');
  };

  return (
    <div className="adm adm-login" style={{ display: 'grid' }}>
      <div className="adm-login-card">
        <span className="adm-kicker">Encounters again and again</span>
        <h1>Administration</h1>
        <p className="adm-lead">Sign in to manage content, media, site settings and newsletter.</p>
        {!isSupabaseConfigured && (
          <p className="adm-notice">
            Sign-in is not available in this environment yet: the database connection is not configured.
          </p>
        )}
        <form onSubmit={handleSubmit} className="adm-stack" style={{ gap: 16 }}>
          <label htmlFor="email" className="adm-field">
            Email
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label htmlFor="password" className="adm-field">
            Password
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          {errorMessage && <p className="adm-notice adm-notice--error" role="alert">{errorMessage}</p>}
          <button type="submit" disabled={isSubmitting || !isSupabaseConfigured} className="adm-btn">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <Link href="/" className="adm-help">Back to site</Link>
      </div>
    </div>
  );
}
