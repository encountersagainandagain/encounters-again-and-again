'use client';
import { useState, type FormEvent } from 'react';
export function NewsletterSignup() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const response = await fetch('/api/newsletter/subscribe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),website:data.get('website'),source:'home',consent:data.get('consent')==='on'})});
      const result = await response.json(); setMessage(response.ok ? 'Thank you for subscribing.' : result.error || 'Unable to subscribe.');
      if (response.ok) form.reset();
    } catch { setMessage('Unable to subscribe. Please try again.'); }
    finally { setPending(false); }
  }
  return <section className="enc-newsletter"><h2>Stay in touch</h2><form onSubmit={subscribe}>
    <label htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" autoComplete="email" required />
    <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    <label><input type="checkbox" name="consent" required /> I agree to receive the Encounters newsletter. I can unsubscribe at any time.</label>
    <button type="submit" disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button><p role="status">{message}</p>
  </form></section>;
}
