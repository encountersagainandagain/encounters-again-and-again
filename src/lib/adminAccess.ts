const DEFAULT_ADMIN_EMAILS: string[] = [];

function parseAdminEmails() {
  const configuredEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const emails = configuredEmails
    ? configuredEmails.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;

  return new Set(emails);
}

const adminEmails = parseAdminEmails();

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return adminEmails.has(email.trim().toLowerCase());
}
