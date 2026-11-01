import 'server-only';
// The contact form sends from the site only when email delivery is switched on and configured; otherwise the form
// keeps opening the visitor's email app. The message goes to the contact email of Settings, with the visitor as reply-to.
export const contactFromEmail=()=>process.env.CONTACT_FROM_EMAIL||process.env.NEWSLETTER_FROM_EMAIL||'';
export const contactSendingReady=()=>process.env.ENCOUNTERS_EMAIL_ENABLED==='true'&&!!process.env.RESEND_API_KEY&&!!contactFromEmail();
