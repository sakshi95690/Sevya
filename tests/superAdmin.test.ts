import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfiguredSuperAdminEmails, isSuperAdminEmail } from '../src/utils/superAdmin.ts';

function restoreEnv(previous: NodeJS.ProcessEnv) {
  for (const key of ['SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_EMAILS']) {
    if (previous[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous[key];
    }
  }
}

test('recognizes configured super admin emails case-insensitively', () => {
  const previous = { ...process.env };
  process.env.SUPER_ADMIN_EMAIL = '  Admin@Example.com , another@example.com  ';

  try {
    const emails = getConfiguredSuperAdminEmails();
    assert.deepEqual(emails, ['admin@example.com', 'another@example.com']);
    assert.equal(isSuperAdminEmail('ADMIN@EXAMPLE.COM'), true);
    assert.equal(isSuperAdminEmail('another@example.com'), true);
    assert.equal(isSuperAdminEmail('someone.else@example.com'), false);
  } finally {
    restoreEnv(previous);
  }
});

test('returns empty array and false when no super admin email env is configured', () => {
  const previous = { ...process.env };
  delete process.env.SUPER_ADMIN_EMAIL;
  delete process.env.SUPER_ADMIN_EMAILS;

  try {
    const emails = getConfiguredSuperAdminEmails();
    assert.deepEqual(emails, []);
    assert.equal(isSuperAdminEmail('admin@example.com'), false);
    assert.equal(isSuperAdminEmail('random@example.com'), false);
  } finally {
    restoreEnv(previous);
  }
});
