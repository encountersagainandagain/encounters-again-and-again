'use client';
import { useId, useState, type FormEvent } from 'react';
// Newsletter signup. It only records the subscription with consent; no email is sent from the site
// (campaign sending is disabled in the modules configuration).
export function NewsletterSignup({title='Stay in touch',body=''}:{title?:string;body?:string}) {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false); const [ok, setOk] = useState(false); const id = useId();
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    // Checked here first so the visitor reads the same messages as the server gives, in this line.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get('email')||'').trim())) { setOk(false); setMessage('Please enter a valid email address.'); return; }
    if (data.get('consent') !== 'on') { setOk(false); setMessage('Please tick the box to agree to receive the newsletter.'); return; }
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/newsletter/subscribe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),website:data.get('website'),source:'home',consent:data.get('consent')==='on'})});
      const result = await response.json(); setOk(response.ok); setMessage(response.ok ? 'Thank you. Your address is on the list. We do not send a confirmation email: the first newsletter arrives when we write one.' : result.error || 'We could not save your address. Please try again later.');
      if (response.ok) form.reset();
    } catch { setOk(false); setMessage('We could not reach the site. Check your connection and try again. Nothing was saved.'); }
    finally { setPending(false); }
  }
  return <div className="enc-newsletter"><h2 data-hseq="0.96,0.4">{title}</h2>{body&&<p className="enc-newsletter-body">{body}</p>}<form onSubmit={subscribe} noValidate aria-busy={pending}>
    <label htmlFor={`${id}-email`}>Email address</label><div className="enc-newsletter-row"><input id={`${id}-email`} name="email" type="email" autoComplete="email" required placeholder="you@somewhere.sea"/><button type="submit" disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button></div>
    <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    <label className="enc-newsletter-consent"><input type="checkbox" name="consent" required /> <span>I agree to receive the Encounters newsletter. I can unsubscribe at any time.</span></label>
    <p role="status" aria-live="polite" data-ok={ok}>{message}</p>
  </form></div>;
}
