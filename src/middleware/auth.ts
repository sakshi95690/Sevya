import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db, isConnectionError } from '../db/index.ts';
import { users, temples, departments } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { isSuperAdminEmail } from '../utils/superAdmin.ts';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_PRIVATE_KEY || 'sevya_production_jwt_secret_key_2026_safe';

export interface DecodedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  templeId: string;
  departmentId?: string;
  parentId?: string;
  accountStatus: string;
  googleSubject?: string;
}

export interface AuthRequest extends Request {
  user?: DecodedUser;
}

// Helper to generate cryptographically signed JWT access tokens
export function generateAccessToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  templeId: string;
  accountStatus: string;
}): string {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role.toLowerCase(),
    templeId: user.templeId,
    accountStatus: user.accountStatus,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Helper to verify signed JWT access token
export function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Ensure at least one default temple exists
export async function ensureDefaultDepartments(templeId: string): Promise<void> {
  try {
    const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.templeId, templeId)).limit(1);
    if (existing.length === 0) {
      const defaultDepts = [
        { id: 'dept-1', name: 'Rituals & Puja (Pujari Seva)', code: 'PUJA', description: 'Deity worship, daily aartis, archana, and festivals', color: '#f97316', iconName: 'Flame' },
        { id: 'dept-2', name: 'Kitchen & Mahaprasadam', code: 'KITC', description: 'Bhog preparation, kitchen hygiene, prasadam distribution', color: '#eab308', iconName: 'Utensils' },
        { id: 'dept-3', name: 'Finance & Accounts', code: 'FINA', description: 'Donations, hundi collection, accounting, and budgeting', color: '#10b981', iconName: 'Coins' },
        { id: 'dept-4', name: 'Maintenance & Infrastructure', code: 'MAIN', description: 'Temple cleaning, electricity, civil repairs, groundskeeping', color: '#3b82f6', iconName: 'Wrench' },
        { id: 'dept-5', name: 'Devotee Care & Relations', code: 'CARE', description: 'Visitor helpdesk, queue management, volunteer guidance', color: '#8b5cf6', iconName: 'HeartHandshake' },
      ];
      for (const d of defaultDepts) {
        await db.insert(departments).values({
          id: d.id,
          templeId,
          name: d.name,
          code: d.code,
          description: d.description,
          color: d.color,
          iconName: d.iconName,
          status: 'ACTIVE',
          active: true,
        }).onConflictDoNothing().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[Sevya] Failed to ensure default departments:', err);
  }
}

let cachedDefaultTempleId: string | null = null;

export async function getOrCreateDefaultTemple(): Promise<string> {
  if (cachedDefaultTempleId && isValidUuid(cachedDefaultTempleId)) {
    return cachedDefaultTempleId;
  }
  try {
    const existing = await db.select().from(temples).limit(1);
    let templeId = '';
    if (existing.length > 0) {
      templeId = existing[0].id;
    } else {
      const inserted = await db.insert(temples).values({
        name: '',
        tagline: 'Organize Every Seva. Serve with Devotion.',
        address: 'Seva Kunj Road',
        city: 'Vrindavan Dham',
        state: 'Uttar Pradesh',
        pincode: '281121',
        contactPhone: '+91 9876543210',
        contactEmail: 'seva@sevya.org',
      }).returning();
      templeId = inserted[0].id;
    }
    cachedDefaultTempleId = templeId;
    await ensureDefaultDepartments(templeId).catch(() => {});
    return templeId;
  } catch (err) {
    console.error('Error ensuring default temple:', err);
    throw err;
  }
}

export const sendRfc7807Error = (
  res: Response,
  status: number,
  title: string,
  detail: string,
  type = 'about:blank',
  instance?: string
) => {
  return res.status(status).json({
    type,
    title,
    status,
    detail,
    instance: instance || res.req?.originalUrl || '',
  });
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendRfc7807Error(res, 401, 'Unauthorized', 'Authentication token is required.');
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return sendRfc7807Error(res, 401, 'Unauthorized', 'Malformed authorization header.');
  }

  try {
    const defaultTmplId = await getOrCreateDefaultTemple();

    // Helper to resolve & repair user's temple ID
    const resolveUserTempleId = async (u: any): Promise<string> => {
      let tid = u.templeId;
      if (tid && isValidUuid(tid)) {
        const check = await db.select({ id: temples.id }).from(temples).where(eq(temples.id, tid)).limit(1);
        if (check.length > 0) return tid;
      }
      // If user's templeId is invalid or missing, point to defaultTmplId
      await db.update(users).set({ templeId: defaultTmplId }).where(eq(users.id, u.id)).catch(() => {});
      return defaultTmplId;
    };

    // 1. Verify signed SEVYA JWT Access Token
    const claims = verifyAccessToken(token);
    if (claims && claims.sub) {
      const dbUsers = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
      if (dbUsers.length > 0) {
        const u = dbUsers[0];
        if (u.accountStatus === 'DISABLED' || u.accountStatus === 'SUSPENDED' || u.accountStatus === 'LOCKED' || u.status === 'inactive') {
          return sendRfc7807Error(res, 403, 'Forbidden', 'Your account is currently disabled or suspended. Please contact temple administration.');
        }
        const validTmplId = await resolveUserTempleId(u);
        let effectiveRole = u.role ? u.role.toLowerCase() : 'member';
        if (effectiveRole === 'leader' || effectiveRole === 'department_leader') effectiveRole = 'department_head';
        if (effectiveRole === 'facilitator' || effectiveRole === 'sevait') effectiveRole = 'coordinator';
        if (effectiveRole === 'volunteer' || effectiveRole === 'devotee') effectiveRole = 'member';

        if (isSuperAdminEmail(u.email)) {
          effectiveRole = 'super_admin';
          if (u.role !== 'super_admin') {
            db.update(users).set({ role: 'super_admin', updatedAt: new Date() }).where(eq(users.id, u.id)).catch(() => {});
          }
        } else if (effectiveRole === 'super_admin') {
          effectiveRole = 'member';
          db.update(users).set({ role: 'member', updatedAt: new Date() }).where(eq(users.id, u.id)).catch(() => {});
        }

        req.user = {
          id: u.id,
          email: u.email,
          name: u.name,
          role: effectiveRole as any,
          templeId: validTmplId,
          accountStatus: u.accountStatus,
          googleSubject: u.googleSubject || undefined,
        };
        return next();
      }
    }

    // 2. Fallback: Verify direct Firebase ID Token
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (decodedToken && decodedToken.email) {
        const normalizedEmail = decodedToken.email.toLowerCase();
        const dbUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
        if (dbUsers.length > 0) {
          const u = dbUsers[0];
          if (u.accountStatus === 'DISABLED' || u.accountStatus === 'SUSPENDED' || u.accountStatus === 'LOCKED' || u.status === 'inactive') {
            return sendRfc7807Error(res, 403, 'Forbidden', 'Your account is currently disabled or suspended.');
          }
          const validTmplId = await resolveUserTempleId(u);
          let effectiveRole = u.role ? u.role.toLowerCase() : 'member';
          if (effectiveRole === 'leader' || effectiveRole === 'department_leader') effectiveRole = 'department_head';
          if (effectiveRole === 'facilitator' || effectiveRole === 'sevait') effectiveRole = 'coordinator';
          if (effectiveRole === 'volunteer' || effectiveRole === 'devotee') effectiveRole = 'member';

          if (isSuperAdminEmail(u.email)) {
            effectiveRole = 'super_admin';
            if (u.role !== 'super_admin') {
              db.update(users).set({ role: 'super_admin', updatedAt: new Date() }).where(eq(users.id, u.id)).catch(() => {});
            }
          } else if (effectiveRole === 'super_admin') {
            effectiveRole = 'member';
            db.update(users).set({ role: 'member', updatedAt: new Date() }).where(eq(users.id, u.id)).catch(() => {});
          }

          req.user = {
            id: u.id,
            email: u.email,
            name: u.name,
            role: effectiveRole,
            templeId: validTmplId,
            departmentId: u.departmentId || undefined,
            accountStatus: u.accountStatus,
            googleSubject: u.googleSubject || decodedToken.sub || undefined,
          };
          return next();
        }
      }
    } catch {
      // Ignore Firebase Token verification error if token was invalid
    }

    return sendRfc7807Error(res, 401, 'Unauthorized', 'Invalid or expired authentication session. Please sign in again.');
  } catch (error: any) {
    console.error('Error in requireAuth middleware:', error);
    if (isConnectionError(error)) {
      return sendRfc7807Error(res, 503, 'Database Unavailable', 'The database connection is temporarily interrupted. Please retry in a few moments.');
    }
    return sendRfc7807Error(res, 401, 'Unauthorized', 'Invalid or missing authentication token.');
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendRfc7807Error(res, 401, 'Unauthorized', 'User not authenticated.');
    }
    let normalizedRole = req.user.role ? req.user.role.toLowerCase() : 'member';
    if (normalizedRole === 'leader' || normalizedRole === 'department_leader') normalizedRole = 'department_head';
    if (normalizedRole === 'facilitator' || normalizedRole === 'sevait') normalizedRole = 'coordinator';
    if (normalizedRole === 'volunteer' || normalizedRole === 'devotee') normalizedRole = 'member';

    const normalizedAllowed = allowedRoles.map(r => {
      const lower = r.toLowerCase();
      if (lower === 'leader' || lower === 'department_leader') return 'department_head';
      if (lower === 'facilitator' || lower === 'sevait') return 'coordinator';
      if (lower === 'volunteer' || lower === 'devotee') return 'member';
      return lower;
    });
    
    if (normalizedRole === 'super_admin' || normalizedAllowed.includes(normalizedRole)) {
      return next();
    }

    return sendRfc7807Error(
      res,
      403,
      'Forbidden',
      `Access denied. Role '${req.user.role}' does not have sufficient permissions for this operation.`
    );
  };
};

export function isValidUuid(val: string | undefined | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export function sanitizeUuid(val: any): string | undefined {
  if (typeof val === 'string' && isValidUuid(val)) {
    return val;
  }
  return undefined;
}

export function getEffectiveTenantId(reqUser: DecodedUser, requestedTempleId?: string): string {
  let normRole = reqUser?.role ? reqUser.role.toLowerCase() : 'volunteer';
  if (normRole === 'sevait') normRole = 'facilitator';
  if (normRole === 'devotee') normRole = 'volunteer';
  if (normRole === 'super_admin' && requestedTempleId && isValidUuid(requestedTempleId)) {
    return requestedTempleId;
  }
  if (reqUser?.templeId && isValidUuid(reqUser.templeId)) {
    return reqUser.templeId;
  }
  return cachedDefaultTempleId || '00000000-0000-0000-0000-000000000001';
}

export async function getEffectiveTenantIdAsync(reqUser: DecodedUser, requestedTempleId?: string): Promise<string> {
  const defaultTmplId = await getOrCreateDefaultTemple();
  
  // 1. Check requestedTempleId if provided
  if (requestedTempleId && isValidUuid(requestedTempleId)) {
    try {
      const check = await db.select({ id: temples.id }).from(temples).where(eq(temples.id, requestedTempleId)).limit(1);
      if (check.length > 0) return requestedTempleId;
    } catch (_e) {}
  }

  // 2. Check reqUser.templeId if valid
  if (reqUser?.templeId && isValidUuid(reqUser.templeId)) {
    try {
      const check = await db.select({ id: temples.id }).from(temples).where(eq(temples.id, reqUser.templeId)).limit(1);
      if (check.length > 0) return reqUser.templeId;
    } catch (_e) {}
  }

  return defaultTmplId;
}

