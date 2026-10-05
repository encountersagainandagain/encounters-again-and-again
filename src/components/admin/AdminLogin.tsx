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
    <div className="min-h-screen bg-gray-50 pt-24">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center px-6 py-12 md:px-8">
        <div className="grid w-full gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <div>
            <span className="mb-4 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Admin
            </span>
            <h1 className="mb-5 font-display text-5xl leading-tight text-black md:text-6xl">
              Encounters administration
            </h1>
            <p className="max-w-md font-body text-base leading-relaxed text-black/65">
              Sign in to manage content, media, site settings and newsletter.
            </p>
          </div>

          <div className="bg-white p-6 shadow-sm md:p-8">
            {!isSupabaseConfigured && (
              <div className="mb-6 border border-ocean/20 bg-sky-50 p-4 font-body text-sm leading-relaxed text-black/70">
                Supabase is ready in the code, but the environment variables are missing. Add
                <span className="font-medium"> NEXT_PUBLIC_SUPABASE_URL</span> and
                <span className="font-medium"> NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in this environment.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block font-body text-sm text-black/65">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base text-black outline-none transition-colors focus:border-ocean"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block font-body text-sm text-black/65">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base text-black outline-none transition-colors focus:border-ocean"
                />
              </div>

              {errorMessage && (
                <p className="font-body text-sm leading-relaxed text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="btn-ocean w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <Link
              href="/"
              className="mt-6 inline-block font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
            >
              Back to site
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
