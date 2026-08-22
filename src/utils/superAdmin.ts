export function getConfiguredSuperAdminEmails(): string[] {
  const configured = (process.env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAILS || '').trim();

  if (!configured) {
    return [];
  }

  const list = configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(list)];
}

export function getPrimarySuperAdminEmail(): string | null {
  const emails = getConfiguredSuperAdminEmails();
  return emails.length > 0 ? emails[0] : null;
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowed = getConfiguredSuperAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(normalized);
}

export function isRootSuperAdminEmail(email?: string | null): boolean {
  return isSuperAdminEmail(email);
}

export function isRootSuperAdmin(user?: { email?: string } | null): boolean {
  if (!user || !user.email) return false;
  return isSuperAdminEmail(user.email);
}
