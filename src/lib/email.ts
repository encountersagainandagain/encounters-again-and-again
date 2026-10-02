import 'server-only';
import { brand, siteUrl as SITE_URL } from '@/config/brand';
import { assertModuleEnabled } from '@/config/modules';

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

type SendEmailBatchOptions = {
  idempotencyKey?: string;
};

function getResendErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';

  const record = payload as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  const name = typeof record.name === 'string' ? record.name : '';

  return [name, message].filter(Boolean).join(': ');
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getNewsletterFromEmail() {
  return process.env.NEWSLETTER_FROM_EMAIL;
}

export function getNewsletterReplyToEmail() {
  return (
    process.env.NEWSLETTER_REPLY_TO_EMAIL || ''
  );
}

export function getSiteUrl() {
  return SITE_URL;
}

export function buildNewsletterUnsubscribeHeaders(unsubscribeToken: string) {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${unsubscribeToken}`;

  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
  };
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: SendEmailInput) {
  assertModuleEnabled('newsletter');
  const apiKey = process.env.RESEND_API_KEY;
  const from = getNewsletterFromEmail();

  if (!apiKey || !from) {
    const missing = [
      !apiKey ? 'RESEND_API_KEY' : '',
      !from ? 'NEWSLETTER_FROM_EMAIL or CONTACT_FROM_EMAIL' : '',
    ].filter(Boolean);

    throw new Error(`Email is not configured yet. Missing: ${missing.join(', ')}.`);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo,
      headers,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const resendMessage = getResendErrorMessage(payload);
    throw new Error(
      resendMessage
        ? `Resend ${response.status}: ${resendMessage}`
        : `Resend ${response.status}: Unable to send email right now.`
    );
  }

  return response.json().catch(() => ({}));
}

export async function sendResendEmailBatch(
  emails: SendEmailInput[],
  { idempotencyKey }: SendEmailBatchOptions = {}
) {
  if (emails.length === 0) return { data: [] };
  if (emails.length > 100) {
    throw new Error('Resend batch email accepts at most 100 messages per request.');
  }

  assertModuleEnabled('newsletter');
  const apiKey = process.env.RESEND_API_KEY;
  const from = getNewsletterFromEmail();

  if (!apiKey || !from) {
    const missing = [
      !apiKey ? 'RESEND_API_KEY' : '',
      !from ? 'NEWSLETTER_FROM_EMAIL or CONTACT_FROM_EMAIL' : '',
    ].filter(Boolean);

    throw new Error(`Email is not configured yet. Missing: ${missing.join(', ')}.`);
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify(
      emails.map(({ to, subject, html, text, replyTo, headers }) => ({
        from,
        to,
        reply_to: replyTo,
        headers,
        subject,
        html,
        text,
      }))
    ),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const resendMessage = getResendErrorMessage(payload);
    throw new Error(
      resendMessage
        ? `Resend ${response.status}: ${resendMessage}`
        : `Resend ${response.status}: Unable to send the email batch right now.`
    );
  }

  return response.json().catch(() => ({ data: [] }));
}

export function buildNewsletterEmailLayout({preview, bodyHtml, footerHtml}: {preview: string; bodyHtml: string; footerHtml: string}) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.7"><span style="display:none">${escapeHtml(preview)}</span><h1>${escapeHtml(brand.name)}</h1>${bodyHtml}<footer>${footerHtml}</footer></div>`;
}
function normalizeNewsletterLinkUrl(value: string) {
  const url = value.trim();

  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  if (/^https?:\/\//i.test(url)) return url;

  return '';
}

function renderNewsletterInlineHtml(value: string) {
  return value
    .split(/(\[[^\]]+\]\s*\((?:https?:\/\/|\/)[^)]+\))/g)
    .filter(Boolean)
    .map((part) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\s*\(([^)]+)\)$/);

      if (!linkMatch) return escapeHtml(part);

      const [, label, href] = linkMatch;
      const normalizedHref = normalizeNewsletterLinkUrl(href);
      if (!normalizedHref) return escapeHtml(label);

      return `<a href="${escapeHtml(normalizedHref)}" style="color:#0f6f7c;text-decoration:underline;">${escapeHtml(label)}</a>`;
    })
    .join('');
}

function renderNewsletterText(value: string) {
  return value.replace(/\[([^\]]+)\]\s*\(((?:https?:\/\/|\/)[^)]+)\)/g, (_match, label, href) => {
    const normalizedHref = normalizeNewsletterLinkUrl(String(href));
    return normalizedHref ? `${label} (${normalizedHref})` : String(label);
  });
}

export function buildAdminNewsletterEmail({
  subject,
  body,
  unsubscribeToken,
}: {
  subject: string;
  body: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${unsubscribeToken}`;
  const previewText = body.split(/\s+/).slice(0, 16).join(' ') || subject;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;">${renderNewsletterInlineHtml(paragraph).replace(/\n/g, '<br />')}</p>`
    )
    .join('');
  const textBody = renderNewsletterText(body);

  return {
    html: buildNewsletterEmailLayout({
      preview: previewText,
      bodyHtml: paragraphs,
      footerHtml: `
        <p style="margin:0;">You’re receiving this because you subscribed to Encounters Again and Again.</p>
        <p style="margin:8px 0 0;">
          <a href="${unsubscribeUrl}" style="color:#0f6f7c;text-decoration:underline;">Unsubscribe</a>
        </p>
      `,
    }),
    text: `${textBody}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
