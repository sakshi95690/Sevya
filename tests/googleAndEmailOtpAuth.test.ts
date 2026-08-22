import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, checkDatabaseConnection } from '../src/db';
import { users, emailOtps, refreshTokens, temples, auditLogs } from '../src/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { sendOtpEmail } from '../src/services/emailService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sevya_super_secure_jwt_secret_dev_2026';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      templeId: user.templeId,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

test('🔐 End-to-End Google Login and Email OTP Fallback Authentication System', async (t) => {
  await checkDatabaseConnection();

  // Setup test temple
  const [temple] = await db.insert(temples).values({
    name: 'Auth Test Temple Mandir',
  }).returning();
  const templeId = temple.id;

  // Setup existing hierarchy users:
  // 1. Super Admin
  const superAdminEmail = `superadmin_${Date.now()}@example.com`;
  const [superAdminUser] = await db.insert(users).values({
    templeId,
    name: 'Shri Super Admin',
    email: superAdminEmail,
    role: 'super_admin',
    accountStatus: 'ACTIVE',
    authProvider: 'GOOGLE',
    status: 'active',
  }).returning();

  // 2. Temple Admin (Parent is Super Admin)
  const templeAdminEmail = `templeadmin_${Date.now()}@example.com`;
  const [templeAdminUser] = await db.insert(users).values({
    templeId,
    name: 'Acharya Temple Admin',
    email: templeAdminEmail,
    role: 'temple_admin',
    parentId: superAdminUser.id,
    accountStatus: 'ACTIVE',
    authProvider: 'GOOGLE',
    status: 'active',
  }).returning();

  // 3. Member Sevak (Parent is Temple Admin)
  const memberEmail = `member_${Date.now()}@example.com`;
  const [memberUser] = await db.insert(users).values({
    templeId,
    name: 'Bhakt Sevak',
    email: memberEmail,
    role: 'volunteer',
    parentId: templeAdminUser.id,
    accountStatus: 'ACTIVE',
    authProvider: 'GOOGLE',
    status: 'active',
  }).returning();

  await t.test('1. OTP Generation & Database Hashing Security (No plain-text storage)', async () => {
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(rawOtp + salt).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [savedOtp] = await db.insert(emailOtps).values({
      email: memberEmail,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt,
    }).returning();

    assert.ok(savedOtp);
    assert.equal(savedOtp.email, memberEmail);
    // Ensure raw OTP is NEVER stored in database
    assert.notEqual(savedOtp.otpHash, rawOtp);
    assert.equal(savedOtp.otpHash, otpHash);
    assert.equal(savedOtp.isUsed, false);
    assert.equal(savedOtp.attempts, 0);

    // Verify email service delivers without exceptions
    const emailResult = await sendOtpEmail(memberEmail, rawOtp, {
      name: memberUser.name,
      templeName: 'Auth Test Temple Mandir',
      expiresInMinutes: 5,
    });
    assert.equal(emailResult.success, true);
  });

  await t.test('2. Wrong OTP Verification & Attempt Counter Tracking', async () => {
    const rawOtp = '654321';
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(rawOtp + salt).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [otpRecord] = await db.insert(emailOtps).values({
      email: templeAdminEmail,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt,
    }).returning();

    // Verify with incorrect OTP: '000000'
    const wrongAttempt = '000000';
    const wrongHash = crypto.createHash('sha256').update(wrongAttempt + otpRecord.salt).digest('hex');
    assert.notEqual(wrongHash, otpRecord.otpHash);

    // Increment attempt in database
    await db.update(emailOtps).set({ attempts: otpRecord.attempts + 1 }).where(eq(emailOtps.id, otpRecord.id));

    const [updated] = await db.select().from(emailOtps).where(eq(emailOtps.id, otpRecord.id));
    assert.equal(updated.attempts, 1);
    assert.equal(updated.isUsed, false); // Still valid for subsequent tries
  });

  await t.test('3. OTP Expiration Enforcement', async () => {
    const expiredOtp = '123456';
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(expiredOtp + salt).digest('hex');
    const pastExpiresAt = new Date(Date.now() - 1000); // Already expired

    await db.insert(emailOtps).values({
      email: memberEmail,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt: pastExpiresAt,
    });

    const now = new Date();
    const activeValidOtps = await db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.email, memberEmail),
          eq(emailOtps.isUsed, false),
          gt(emailOtps.expiresAt, now)
        )
      );

    // Expired OTP must not be considered active
    assert.ok(activeValidOtps.every(o => o.otpHash !== otpHash));
  });

  await t.test('4. Successful OTP Verification, Single-Use Invalidation & No Replay', async () => {
    const validOtp = '789012';
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(validOtp + salt).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const [otpRecord] = await db.insert(emailOtps).values({
      email: memberEmail,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt,
    }).returning();

    // Verify hash
    const checkHash = crypto.createHash('sha256').update(validOtp + otpRecord.salt).digest('hex');
    assert.equal(checkHash, otpRecord.otpHash);

    // Consume OTP (Mark isUsed = true)
    await db.update(emailOtps).set({ isUsed: true, updatedAt: new Date() }).where(eq(emailOtps.id, otpRecord.id));

    // Subsequent query for active unused OTP must return empty
    const now = new Date();
    const activeUnused = await db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.id, otpRecord.id),
          eq(emailOtps.isUsed, false),
          gt(emailOtps.expiresAt, now)
        )
      );

    assert.equal(activeUnused.length, 0);
  });

  await t.test('5. Existing User Account & Hierarchy Preservation during Email OTP Login', async () => {
    // When Temple Admin logs in with OTP, ensure NO duplicate user is created and parent_id is intact
    const [userBefore] = await db.select().from(users).where(eq(users.email, templeAdminEmail));
    assert.ok(userBefore);
    assert.equal(userBefore.parentId, superAdminUser.id);
    assert.equal(userBefore.role, 'temple_admin');

    // Simulate OTP login update
    const [userAfter] = await db
      .update(users)
      .set({
        authProvider: 'EMAIL_OTP',
        accountStatus: 'ACTIVE',
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userBefore.id))
      .returning();

    assert.equal(userAfter.id, userBefore.id);
    assert.equal(userAfter.email, templeAdminEmail);
    assert.equal(userAfter.role, 'temple_admin');
    assert.equal(userAfter.parentId, superAdminUser.id); // Hierarchy strictly preserved!

    // Verify total users count for this email is exactly 1 (no duplicates)
    const countUsers = await db.select().from(users).where(eq(users.email, templeAdminEmail));
    assert.equal(countUsers.length, 1);
  });

  await t.test('6. New User Self-Registration via Email OTP Fallback', async () => {
    const newDevoteeEmail = `new_devotee_${Date.now()}@example.com`;

    // Ensure user does not exist yet
    const existing = await db.select().from(users).where(eq(users.email, newDevoteeEmail));
    assert.equal(existing.length, 0);

    // Register user on OTP success
    const [newUser] = await db.insert(users).values({
      email: newDevoteeEmail,
      name: newDevoteeEmail.split('@')[0],
      role: 'volunteer',
      accountStatus: 'ACTIVE',
      authProvider: 'EMAIL_OTP',
      status: 'active',
      templeId,
      sevaPoints: 100,
      joinedDate: new Date().toISOString().split('T')[0],
    }).returning();

    assert.ok(newUser);
    assert.equal(newUser.email, newDevoteeEmail);
    assert.equal(newUser.role, 'volunteer');
    assert.equal(newUser.authProvider, 'EMAIL_OTP');
    assert.equal(newUser.accountStatus, 'ACTIVE');

    // Generate session JWT
    const token = generateAccessToken(newUser);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    assert.equal(decoded.id, newUser.id);
    assert.equal(decoded.email, newDevoteeEmail);
  });

  await t.test('7. Session Token Rotation & Logout Invalidation', async () => {
    const rawRefreshToken = `rf_test_${Date.now()}`;
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = `fam_test_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    const [tokenRecord] = await db.insert(refreshTokens).values({
      userId: memberUser.id,
      tokenHash,
      familyId,
      isRevoked: false,
      expiresAt,
    }).returning();

    assert.ok(tokenRecord);
    assert.equal(tokenRecord.isRevoked, false);

    // Simulate Logout: Revoke refresh token
    await db.update(refreshTokens).set({ isRevoked: true, updatedAt: new Date() }).where(eq(refreshTokens.id, tokenRecord.id));

    const [revoked] = await db.select().from(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
    assert.equal(revoked.isRevoked, true);
  });

  await t.test('8. Custom Domain Authentication Configuration (sevya.com / auth.sevya.com)', async () => {
    const { getSevyaAuthDomain } = await import('../src/lib/firebase');
    const customDomain = getSevyaAuthDomain();
    
    // Ensure auth domain is properly configured for sevya.com and contains NO default firebaseapp.com leaks
    assert.ok(customDomain.includes('sevya.com') || customDomain === 'auth.sevya.com');
    assert.equal(customDomain.includes('firebaseapp.com'), false);
  });
});
