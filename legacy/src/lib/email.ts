const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.whatkatieseas.com';

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
  return process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
}

export function getNewsletterReplyToEmail() {
  return (
    process.env.NEWSLETTER_REPLY_TO_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    'whatkatieseas@gmail.com'
  );
}

export function getDonationNotificationEmail() {
  return process.env.DONATION_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || getNewsletterReplyToEmail();
}

export function getCommentNotificationEmail() {
  return process.env.COMMENT_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || getNewsletterReplyToEmail();
}

export function getManualOrderNotificationEmail() {
  return process.env.MANUAL_ORDER_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || getNewsletterReplyToEmail();
}

export function getNewsletterNotificationEmail() {
  return process.env.NEWSLETTER_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || getNewsletterReplyToEmail();
}

export function getSiteUrl() {
  return SITE_URL;
}

export function buildNewsletterUnsubscribeHeaders(unsubscribeToken: string) {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${unsubscribeToken}`;

  return {
    'List-Unsubscribe': `<mailto:unsubscribe@whatkatieseas.com>, <${unsubscribeUrl}>`,
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

export function buildNewsletterEmailLayout({
  preview,
  bodyHtml,
  footerHtml,
}: {
  preview: string;
  bodyHtml: string;
  footerHtml?: string;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(preview)}</title>
      </head>
      <body style="margin:0;background:#f4faf9;color:#111111;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
        <div style="max-width:620px;margin:0 auto;padding:34px 18px;">
          <div style="background:#ffffff;border:1px solid #d6ebe8;border-top:5px solid #0f6f7c;padding:28px 28px 0;">
            <p style="margin:0;color:#0f6f7c;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">What Katie Seas</p>
            <p style="margin:8px 0 28px;color:#5f7f82;font-size:13px;line-height:1.5;">Notes from the road and the water</p>
            <div style="color:#172121;font-size:16px;line-height:1.68;">
              ${bodyHtml}
            </div>
            ${
              footerHtml
                ? `<div style="margin:30px -28px 0;background:#eef8f7;border-top:1px solid #d6ebe8;padding:16px 28px;color:#5f6f72;font-size:12px;line-height:1.5;">${footerHtml}</div>`
                : ''
            }
          </div>
        </div>
      </body>
    </html>
  `;
}

export function buildWelcomeNewsletterEmail(
  unsubscribeToken: string,
  offer?: {
    code: string;
    discountPercent: number;
    expiresAt: string;
  }
) {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${unsubscribeToken}`;
  const offerExpiry = offer
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(offer.expiresAt)
      )
    : '';
  const offerHtml = offer
    ? `
      <div style="margin:24px 0;background:#eef8f7;border:1px solid #d6ebe8;padding:20px;text-align:center;">
        <p style="margin:0 0 8px;color:#0f6f7c;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Your first-order offer</p>
        <p style="margin:0 0 10px;font-size:30px;font-weight:700;letter-spacing:0.12em;">${escapeHtml(offer.code)}</p>
        <p style="margin:0;">Use it for ${offer.discountPercent}% off merchandise in your first shop order. Shipping is not discounted. One use only, through ${escapeHtml(offerExpiry)}.</p>
      </div>
      <p style="margin:0 0 16px;"><a href="${SITE_URL}/shop" style="color:#0f6f7c;font-weight:700;text-decoration:underline;">Visit the shop</a></p>
    `
    : '';
  const html = buildNewsletterEmailLayout({
    preview: offer ? `Your ${offer.discountPercent}% shop code is inside.` : 'I’m glad you’re here.',
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;">It’s Katie. Thanks for joining me here.</p>
      <p style="margin:0 0 16px;">I’ll send the occasional note from the road or the water: honest travel stories, diving tips, and small updates from the places I’m exploring.</p>
      ${offerHtml}
      <p style="margin:0 0 16px;">I’m really glad you’re following along.</p>
      <p style="margin:0 0 24px;">If you ever have a question, reply to this email and I’ll answer myself.</p>
      <p style="margin:0 0 28px;">Katie</p>
    `,
    footerHtml: `
      <p style="margin:0;">You’re receiving this because you subscribed to What Katie Seas.</p>
      <p style="margin:8px 0 0;">
        <a href="${unsubscribeUrl}" style="color:#0f6f7c;text-decoration:underline;">Unsubscribe</a>
      </p>
    `,
  });
  const text = [
    'Hi,',
    '',
    "It's Katie. Thanks for joining me here.",
    '',
    "I'll send the occasional note from the road or the water: honest travel stories, diving tips, and small updates from the places I'm exploring.",
    ...(offer
      ? [
          '',
          `Your first-order offer: ${offer.code}`,
          `${offer.discountPercent}% off merchandise. Shipping is not discounted. One use only, through ${offerExpiry}.`,
          `Shop: ${SITE_URL}/shop`,
        ]
      : []),
    '',
    "I'm really glad you're following along.",
    '',
    "If you ever have a question, reply to this email and I'll answer myself.",
    '',
    'Katie',
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return {
    subject: offer ? `Your ${offer.discountPercent}% What Katie Seas shop code` : 'A quick note from Katie',
    html,
    text,
  };
}

export function buildShopCampaignSignupNotification({
  subscriberEmail,
  campaignName,
  campaignCode,
  acquisitionPath,
  productSlug,
}: {
  subscriberEmail: string;
  campaignName: string;
  campaignCode: string;
  acquisitionPath: string;
  productSlug?: string | null;
}) {
  const bodyHtml = `
    <p style="margin:0 0 16px;">A reader joined the newsletter through the shop offer.</p>
    <p style="margin:0 0 8px;"><strong>Campaign:</strong> ${escapeHtml(campaignName)} (${escapeHtml(campaignCode)})</p>
    <p style="margin:0 0 8px;"><strong>Subscriber:</strong> ${escapeHtml(subscriberEmail)}</p>
    <p style="margin:0 0 8px;"><strong>Signup page:</strong> ${escapeHtml(acquisitionPath || 'not recorded')}</p>
    ${productSlug ? `<p style="margin:0 0 16px;"><strong>Product interest:</strong> ${escapeHtml(productSlug)}</p>` : ''}
    <p style="margin:20px 0 0;"><a href="${SITE_URL}/admin/newsletter" style="color:#0f6f7c;font-weight:700;">Open newsletter admin</a></p>
  `;

  return {
    subject: `New shop newsletter signup — ${campaignCode}`,
    html: buildNewsletterEmailLayout({
      preview: `New shop newsletter signup for ${campaignName}.`,
      bodyHtml,
    }),
    text: [
      'A reader joined the newsletter through the shop offer.',
      `Campaign: ${campaignName} (${campaignCode})`,
      `Subscriber: ${subscriberEmail}`,
      `Signup page: ${acquisitionPath || 'not recorded'}`,
      productSlug ? `Product interest: ${productSlug}` : '',
      `Admin: ${SITE_URL}/admin/newsletter`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
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
        <p style="margin:0;">You’re receiving this because you subscribed to What Katie Seas.</p>
        <p style="margin:8px 0 0;">
          <a href="${unsubscribeUrl}" style="color:#0f6f7c;text-decoration:underline;">Unsubscribe</a>
        </p>
      `,
    }),
    text: `${textBody}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
